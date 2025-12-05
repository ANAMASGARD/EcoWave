'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as THREE from 'three';

export default function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const router = useRouter();
  const [isHovering, setIsHovering] = useState(false);
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ x: -100, y: -100 });
  const [cursorScale, setCursorScale] = useState(1);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    // Three.js Setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ 
      canvas: canvasRef.current, 
      antialias: true,
      alpha: true 
    });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 1);

    // Animated gradient background
    const bgGeometry = new THREE.PlaneGeometry(100, 100);
    const bgMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(0, 0) },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec2 uMouse;
        varying vec2 vUv;
        
        vec3 palette(float t) {
          vec3 a = vec3(0.02, 0.02, 0.05);
          vec3 b = vec3(0.03, 0.05, 0.03);
          vec3 c = vec3(0.5, 0.5, 0.5);
          vec3 d = vec3(0.0, 0.1, 0.2);
          return a + b * cos(6.28318 * (c * t + d));
        }
        
        void main() {
          vec2 center = vec2(0.5) + uMouse * 0.1;
          float dist = distance(vUv, center);
          
          float t = dist * 0.5 + uTime * 0.1;
          vec3 color = palette(t);
          
          // Add subtle aurora effect
          float aurora = sin(vUv.x * 10.0 + uTime) * sin(vUv.y * 8.0 + uTime * 0.7) * 0.03;
          color += vec3(0.0, aurora, aurora * 0.5);
          
          // Vignette
          float vignette = 1.0 - dist * 0.8;
          color *= vignette;
          
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      side: THREE.DoubleSide,
    });
    const bgMesh = new THREE.Mesh(bgGeometry, bgMaterial);
    bgMesh.position.z = -30;
    scene.add(bgMesh);

    // Main particle system - galaxy spiral
    const particleCount = 4000;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const randoms = new Float32Array(particleCount);

    const colorPalette = [
      new THREE.Color(0x22c55e),
      new THREE.Color(0x10b981),
      new THREE.Color(0x06b6d4),
      new THREE.Color(0x3b82f6),
      new THREE.Color(0x8b5cf6),
      new THREE.Color(0xec4899),
      new THREE.Color(0xf59e0b),
    ];

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // Create spiral galaxy pattern
      const angle = (i / particleCount) * Math.PI * 8;
      const radius = Math.sqrt(i / particleCount) * 20;
      const spiralX = Math.cos(angle) * radius;
      const spiralY = Math.sin(angle) * radius;
      const spiralZ = (Math.random() - 0.5) * 4;
      
      // Add some randomness
      positions[i3] = spiralX + (Math.random() - 0.5) * 3;
      positions[i3 + 1] = spiralY + (Math.random() - 0.5) * 3;
      positions[i3 + 2] = spiralZ - 10;
      
      const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
      
      sizes[i] = Math.random() * 4 + 1;
      randoms[i] = Math.random();
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(0, 0) },
        uHover: { value: 0 },
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        attribute float aRandom;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uTime;
        uniform vec2 uMouse;
        uniform float uHover;
        
        void main() {
          vColor = color;
          vec3 pos = position;
          
          // Spiral rotation
          float angle = uTime * 0.1 * (1.0 + aRandom * 0.5);
          float s = sin(angle);
          float c = cos(angle);
          pos.xy = mat2(c, -s, s, c) * pos.xy;
          
          // Breathing effect
          float breathe = sin(uTime * 0.5 + aRandom * 6.28) * 0.3;
          pos *= 1.0 + breathe * 0.1;
          
          // Wave
          pos.z += sin(pos.x * 0.3 + uTime) * cos(pos.y * 0.3 + uTime) * 0.5;
          
          // Mouse attraction/repulsion
          vec2 mousePos = uMouse * 12.0;
          float dist = distance(pos.xy, mousePos);
          float influence = smoothstep(8.0, 0.0, dist);
          
          // On hover, particles are attracted; otherwise repelled
          vec2 dir = normalize(pos.xy - mousePos + 0.001);
          float repelStrength = mix(3.0, -2.0, uHover);
          pos.xy += dir * influence * repelStrength;
          pos.z += influence * 4.0;
          
          vAlpha = smoothstep(-20.0, 5.0, pos.z) * (0.6 + influence * 0.4);
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * (200.0 / -mvPosition.z) * (1.0 + influence * 0.5);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        
        void main() {
          float dist = distance(gl_PointCoord, vec2(0.5));
          if (dist > 0.5) discard;
          
          float alpha = (1.0 - smoothstep(0.1, 0.5, dist)) * vAlpha;
          vec3 glow = vColor * (1.5 - dist);
          
          gl_FragColor = vec4(glow, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Floating 3D shapes with glow
    const shapes: THREE.Group[] = [];
    const shapeGeometries = [
      new THREE.IcosahedronGeometry(1, 1),
      new THREE.OctahedronGeometry(0.8, 0),
      new THREE.TorusGeometry(0.6, 0.2, 16, 32),
      new THREE.DodecahedronGeometry(0.7, 0),
    ];

    const shapePositions = [
      { x: -14, y: 7, z: -8 },
      { x: 15, y: -6, z: -6 },
      { x: -12, y: -8, z: -10 },
      { x: 14, y: 8, z: -7 },
      { x: -8, y: 2, z: -12 },
      { x: 10, y: -2, z: -9 },
      { x: -6, y: -5, z: -8 },
      { x: 8, y: 5, z: -10 },
    ];

    shapePositions.forEach((pos, i) => {
      const group = new THREE.Group();
      const geo = shapeGeometries[i % shapeGeometries.length];
      
      // Wireframe
      const wireMat = new THREE.MeshBasicMaterial({
        color: colorPalette[i % colorPalette.length],
        wireframe: true,
        transparent: true,
        opacity: 0.4,
      });
      const wireMesh = new THREE.Mesh(geo, wireMat);
      group.add(wireMesh);
      
      // Inner glow
      const glowMat = new THREE.MeshBasicMaterial({
        color: colorPalette[i % colorPalette.length],
        transparent: true,
        opacity: 0.1,
      });
      const glowMesh = new THREE.Mesh(geo, glowMat);
      glowMesh.scale.setScalar(0.8);
      group.add(glowMesh);
      
      group.position.set(pos.x, pos.y, pos.z);
      group.userData = {
        rotationSpeed: {
          x: (Math.random() - 0.5) * 0.02,
          y: (Math.random() - 0.5) * 0.02,
          z: (Math.random() - 0.5) * 0.02,
        },
        floatSpeed: Math.random() * 0.5 + 0.3,
        floatOffset: Math.random() * Math.PI * 2,
        originalY: pos.y,
        originalScale: 1,
      };
      shapes.push(group);
      scene.add(group);
    });

    camera.position.z = 15;

    // Mouse tracking
    const handleMouseMove = (event: MouseEvent) => {
      mouseRef.current.targetX = (event.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.targetY = -(event.clientY / window.innerHeight) * 2 + 1;
      setCursorPosition({ x: event.clientX, y: event.clientY });
    };

    // Resize handler
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);

    // Animation loop
    const clock = new THREE.Clock();
    
    const animate = () => {
      const elapsedTime = clock.getElapsedTime();
      
      // Smooth mouse follow
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;
      
      // Update uniforms
      material.uniforms.uTime.value = elapsedTime;
      material.uniforms.uMouse.value.set(mouseRef.current.x, mouseRef.current.y);
      bgMaterial.uniforms.uTime.value = elapsedTime;
      bgMaterial.uniforms.uMouse.value.set(mouseRef.current.x, mouseRef.current.y);
      
      // Animate shapes
      shapes.forEach((shape, i) => {
        shape.rotation.x += shape.userData.rotationSpeed.x;
        shape.rotation.y += shape.userData.rotationSpeed.y;
        shape.rotation.z += shape.userData.rotationSpeed.z;
        
        // Float up and down
        shape.position.y = shape.userData.originalY + 
          Math.sin(elapsedTime * shape.userData.floatSpeed + shape.userData.floatOffset) * 1.5;
        
        // Pulse scale
        const pulse = 1 + Math.sin(elapsedTime * 2 + i) * 0.1;
        shape.scale.setScalar(pulse);
        
        // React to mouse
        const dx = mouseRef.current.x * 10 - shape.position.x;
        const dy = mouseRef.current.y * 8 - shape.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 8) {
          const angle = Math.atan2(dy, dx);
          shape.position.x -= Math.cos(angle) * 0.1;
          shape.position.y -= Math.sin(angle) * 0.1;
        }
      });
      
      // Camera movement
      camera.position.x = mouseRef.current.x * 2;
      camera.position.y = mouseRef.current.y * 1.5;
      camera.lookAt(0, 0, -5);
      
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    
    animate();
    setTimeout(() => setIsLoaded(true), 300);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  const handleGetStarted = () => {
    router.push('/sign-in');
  };

  const features = [
    { icon: '📸', text: 'Receipt Scanner', color: 'from-blue-500 to-cyan-500' },
    { icon: '🎤', text: 'Voice AI', color: 'from-purple-500 to-pink-500' },
    { icon: '🏆', text: 'Leaderboards', color: 'from-amber-500 to-orange-500' },
    { icon: '🌱', text: 'Eco Tips', color: 'from-green-500 to-emerald-500' },
  ];

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-screen overflow-hidden bg-black"
      style={{ cursor: 'none' }}
    >
      {/* Three.js Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      
      {/* Custom Cursor */}
      <div
        className="fixed pointer-events-none z-[100] mix-blend-difference"
        style={{ 
          left: cursorPosition.x,
          top: cursorPosition.y,
          transform: `translate(-50%, -50%) scale(${cursorScale})`,
          transition: 'transform 0.2s ease-out',
        }}
      >
        <div className={`w-12 h-12 rounded-full border-2 transition-all duration-300 ${
          isHovering || hoveredFeature !== null
            ? 'border-green-400 bg-green-400/20 scale-150' 
            : 'border-white/80'
        }`}>
          {(isHovering || hoveredFeature !== null) && (
            <div className="absolute inset-0 rounded-full bg-green-400/30 animate-ping" />
          )}
        </div>
      </div>
      <div
        className="fixed pointer-events-none z-[100]"
        style={{ 
          left: cursorPosition.x,
          top: cursorPosition.y,
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div className={`w-2 h-2 rounded-full transition-all duration-150 ${
          isHovering || hoveredFeature !== null ? 'bg-green-400 scale-150' : 'bg-green-500'
        }`} />
      </div>

      {/* Content */}
      <div className={`absolute inset-0 flex flex-col items-center justify-center z-10 px-6 transition-all duration-1000 ${
        isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}>
        
        {/* Logo */}
        <div className="mb-6 group"
          onMouseEnter={() => setCursorScale(1.5)}
          onMouseLeave={() => setCursorScale(1)}
        >
          <div className="w-24 h-24 mx-auto relative">
            <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-cyan-500 rounded-full opacity-40 blur-2xl group-hover:opacity-60 group-hover:blur-3xl transition-all duration-500" />
            <div className="absolute inset-0 bg-gradient-to-br from-green-400 via-emerald-500 to-cyan-500 rounded-full animate-spin" style={{ animationDuration: '8s' }} />
            <div className="absolute inset-[3px] bg-black rounded-full flex items-center justify-center group-hover:inset-[2px] transition-all duration-300">
              <svg className="w-12 h-12 text-green-400 group-hover:text-green-300 group-hover:scale-110 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        
        {/* Title */}
        <h1 
          className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tight mb-4 text-center group"
          style={{ textShadow: '0 0 60px rgba(34, 197, 94, 0.3)' }}
          onMouseEnter={() => setCursorScale(2)}
          onMouseLeave={() => setCursorScale(1)}
        >
          <span className="bg-gradient-to-r from-green-400 via-emerald-300 to-green-400 bg-clip-text text-transparent bg-[length:200%_auto] hover:animate-gradient-x transition-all duration-300 inline-block hover:scale-105">
            Eco
          </span>
          <span className="bg-gradient-to-r from-cyan-400 via-blue-300 to-cyan-400 bg-clip-text text-transparent bg-[length:200%_auto] hover:animate-gradient-x transition-all duration-300 inline-block hover:scale-105">
            Track
          </span>
        </h1>
        
        {/* Tagline */}
        <div 
          className="text-2xl md:text-3xl lg:text-4xl font-light tracking-[0.2em] mb-4 text-center"
          style={{ textShadow: '0 2px 20px rgba(0,0,0,0.9)' }}
        >
          <span className="text-white/90 hover:text-white transition-colors duration-300">Snap</span>
          <span className="text-green-500 mx-3 animate-pulse">•</span>
          <span className="text-white/90 hover:text-white transition-colors duration-300">Track</span>
          <span className="text-green-500 mx-3 animate-pulse" style={{ animationDelay: '0.5s' }}>•</span>
          <span className="text-green-400 font-medium hover:text-green-300 transition-colors duration-300">Reduce</span>
        </div>
        
        {/* Description */}
        <p 
          className="text-base md:text-lg text-gray-300 max-w-md text-center mb-8 leading-relaxed"
          style={{ textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}
        >
          Your AI-powered carbon footprint companion.
          <br />
          <span className="text-gray-400">Built for students. Powered by voice.</span>
        </p>

        {/* Feature Pills with Hover Effects */}
        <div className="flex flex-wrap justify-center gap-4 mb-10 max-w-2xl">
          {features.map((feature, i) => (
            <div 
              key={i}
              className="relative group"
              onMouseEnter={() => { setHoveredFeature(i); setCursorScale(1.3); }}
              onMouseLeave={() => { setHoveredFeature(null); setCursorScale(1); }}
            >
              {/* Glow effect */}
              <div className={`absolute -inset-1 bg-gradient-to-r ${feature.color} rounded-full opacity-0 group-hover:opacity-70 blur-lg transition-all duration-500`} />
              
              <div className={`relative px-5 py-2.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-white text-sm font-medium transition-all duration-300 group-hover:bg-white/20 group-hover:border-white/40 group-hover:scale-110 group-hover:-translate-y-1`}>
                <span className="mr-2 group-hover:animate-bounce inline-block">{feature.icon}</span>
                {feature.text}
              </div>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <div className="relative group"
          onMouseEnter={() => { setIsHovering(true); setCursorScale(1.5); }}
          onMouseLeave={() => { setIsHovering(false); setCursorScale(1); }}
        >
          {/* Outer glow */}
          <div className="absolute -inset-2 bg-gradient-to-r from-green-500 via-emerald-500 to-cyan-500 rounded-full opacity-50 blur-xl group-hover:opacity-80 group-hover:blur-2xl transition-all duration-500 animate-pulse" />
          
          <button
            onClick={handleGetStarted}
            className="relative px-12 md:px-16 py-5 md:py-6 rounded-full text-white text-lg md:text-xl font-bold overflow-hidden transition-all duration-500 group-hover:scale-105"
            style={{ boxShadow: '0 0 40px rgba(34, 197, 94, 0.4)' }}
          >
            {/* Gradient background */}
            <div className="absolute inset-0 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500" />
            
            {/* Animated gradient on hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-green-400 via-cyan-400 to-blue-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            {/* Shine effect */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12" />
            </div>
            
            {/* Ripple effect */}
            <div className="absolute inset-0 overflow-hidden rounded-full">
              <div className="absolute inset-0 scale-0 group-hover:scale-100 bg-white/10 rounded-full transition-transform duration-500 origin-center" />
            </div>
            
            <span className="relative z-10 flex items-center gap-3">
              Get Started
              <svg className="w-6 h-6 group-hover:translate-x-2 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          </button>
        </div>

        {/* Stats */}
        <div className="mt-14 flex gap-12 md:gap-20 text-center">
          {[
            { value: '< 5s', label: 'Log Time', icon: '⚡' },
            { value: 'AI', label: 'Powered', icon: '🤖' },
            { value: '∞', label: 'Impact', icon: '🌍' },
          ].map((stat, i) => (
            <div 
              key={i} 
              className="group"
              onMouseEnter={() => setCursorScale(1.2)}
              onMouseLeave={() => setCursorScale(1)}
            >
              <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent group-hover:scale-110 transition-transform duration-300">
                <span className="mr-1 group-hover:animate-bounce inline-block">{stat.icon}</span>
                {stat.value}
              </div>
              <div className="text-xs md:text-sm text-gray-500 uppercase tracking-widest mt-1 group-hover:text-gray-400 transition-colors duration-300">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edge gradients */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/80 to-transparent pointer-events-none" />
      
      {/* Corners */}
      <div className="absolute top-6 left-8 text-gray-600 text-xs font-mono tracking-wider z-20 hover:text-gray-400 transition-colors">
        v2.0 // ECOTRACK
      </div>
      <div className="absolute top-6 right-8 flex items-center gap-2 z-20">
        <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <span className="text-gray-600 text-xs hover:text-gray-400 transition-colors">LIVE</span>
      </div>
      
      <div className="absolute bottom-6 left-8 text-gray-700 text-xs font-mono z-20 hidden md:block hover:text-gray-500 transition-colors">
        CARBON TRACKING
      </div>
      <div className="absolute bottom-6 right-8 text-gray-700 text-xs font-mono z-20 hidden md:block hover:text-gray-500 transition-colors">
        FOR STUDENTS
      </div>

      {/* Styles */}
      <style jsx global>{`
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient-x {
          animation: gradient-x 3s ease infinite;
        }
      `}</style>
    </div>
  );
}

'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import * as THREE from 'three';

export default function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const router = useRouter();
  const [isHovering, setIsHovering] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ x: -100, y: -100 });

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
    renderer.setClearColor(0x030712, 1);

    // Create gradient background mesh
    const bgGeometry = new THREE.PlaneGeometry(60, 60);
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
        
        void main() {
          vec2 center = vec2(0.5) + uMouse * 0.05;
          float dist = distance(vUv, center);
          
          // Darker, more subtle background
          vec3 color1 = vec3(0.008, 0.016, 0.035); // Very deep blue-black
          vec3 color2 = vec3(0.012, 0.04, 0.03);   // Dark teal tint
          vec3 color3 = vec3(0.025, 0.012, 0.04);  // Dark purple tint
          
          float noise = sin(vUv.x * 8.0 + uTime * 0.5) * cos(vUv.y * 6.0 + uTime * 0.4) * 0.015;
          
          vec3 finalColor = mix(color1, color2, vUv.y * 0.7 + noise);
          finalColor = mix(finalColor, color3, sin(dist * 2.5 + uTime * 0.2) * 0.2);
          
          // Add subtle vignette for depth
          float vignette = smoothstep(0.8, 0.2, dist);
          finalColor *= 0.7 + vignette * 0.3;
          
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
      side: THREE.DoubleSide,
    });
    const bgMesh = new THREE.Mesh(bgGeometry, bgMaterial);
    bgMesh.position.z = -20;
    scene.add(bgMesh);

    // Particle system - more spread out, less dense
    const particleCount = 1500;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    const colorPalette = [
      new THREE.Color(0x22c55e), // Green
      new THREE.Color(0x10b981), // Emerald
      new THREE.Color(0x06b6d4), // Cyan
      new THREE.Color(0x3b82f6), // Blue
      new THREE.Color(0xa855f7), // Purple
    ];

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      // Spread particles more to the edges, less in center
      const radius = Math.random() * 18 + 4;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      
      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi) - 8;
      
      const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
      
      sizes[i] = Math.random() * 3 + 0.5;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(0, 0) },
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uTime;
        uniform vec2 uMouse;
        
        void main() {
          vColor = color;
          vec3 pos = position;
          
          // Gentle wave movement
          float wave1 = sin(pos.y * 0.2 + uTime * 0.5) * 0.3;
          float wave2 = cos(pos.x * 0.3 + uTime * 0.4) * 0.25;
          
          pos.x += wave1;
          pos.y += wave2;
          
          // Mouse repulsion - stronger effect
          vec2 mousePos = uMouse * 10.0;
          float dist = distance(pos.xy, mousePos);
          float influence = smoothstep(5.0, 0.0, dist);
          vec2 dir = normalize(pos.xy - mousePos + 0.001);
          pos.xy += dir * influence * 4.0;
          pos.z += influence * 3.0;
          
          // Depth-based alpha
          vAlpha = smoothstep(-15.0, 5.0, pos.z) * 0.7;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * (180.0 / -mvPosition.z) * (1.0 + influence * 0.3);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        
        void main() {
          float dist = distance(gl_PointCoord, vec2(0.5));
          if (dist > 0.5) discard;
          
          float alpha = (1.0 - smoothstep(0.15, 0.5, dist)) * vAlpha;
          vec3 glow = vColor * (1.0 + (1.0 - dist * 2.0) * 0.3);
          
          gl_FragColor = vec4(glow, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Floating wireframe shapes - positioned at edges
    const shapes: THREE.Mesh[] = [];
    const shapeGeometries = [
      new THREE.IcosahedronGeometry(0.6, 1),
      new THREE.OctahedronGeometry(0.5, 0),
      new THREE.TetrahedronGeometry(0.55, 0),
    ];

    const shapePositions = [
      { x: -12, y: 6, z: -5 },
      { x: 12, y: -5, z: -4 },
      { x: -10, y: -7, z: -6 },
      { x: 11, y: 7, z: -5 },
      { x: -8, y: 0, z: -8 },
      { x: 9, y: 2, z: -7 },
    ];

    shapePositions.forEach((pos, i) => {
      const geo = shapeGeometries[i % shapeGeometries.length];
      const color = colorPalette[i % colorPalette.length];
      const mat = new THREE.MeshBasicMaterial({
        color: color,
        wireframe: true,
        transparent: true,
        opacity: 0.25,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(pos.x, pos.y, pos.z);
      mesh.userData = {
        rotationSpeed: {
          x: (Math.random() - 0.5) * 0.01,
          y: (Math.random() - 0.5) * 0.01,
          z: (Math.random() - 0.5) * 0.01,
        },
        floatSpeed: Math.random() * 0.3 + 0.3,
        floatOffset: Math.random() * Math.PI * 2,
        originalY: pos.y,
      };
      shapes.push(mesh);
      scene.add(mesh);
    });

    camera.position.z = 12;

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
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.06;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.06;
      
      // Update uniforms
      material.uniforms.uTime.value = elapsedTime;
      material.uniforms.uMouse.value.set(mouseRef.current.x, mouseRef.current.y);
      bgMaterial.uniforms.uTime.value = elapsedTime;
      bgMaterial.uniforms.uMouse.value.set(mouseRef.current.x, mouseRef.current.y);
      
      // Gentle particle rotation
      particles.rotation.y = elapsedTime * 0.02;
      particles.rotation.x = Math.sin(elapsedTime * 0.03) * 0.03;
      
      // Animate shapes
      shapes.forEach((shape) => {
        shape.rotation.x += shape.userData.rotationSpeed.x;
        shape.rotation.y += shape.userData.rotationSpeed.y;
        shape.rotation.z += shape.userData.rotationSpeed.z;
        shape.position.y = shape.userData.originalY + 
          Math.sin(elapsedTime * shape.userData.floatSpeed + shape.userData.floatOffset) * 0.5;
      });
      
      // Camera subtle movement
      camera.position.x = mouseRef.current.x * 1.0;
      camera.position.y = mouseRef.current.y * 0.8;
      camera.lookAt(0, 0, -3);
      
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    
    animate();
    
    setTimeout(() => setIsLoaded(true), 300);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      bgGeometry.dispose();
      bgMaterial.dispose();
    };
  }, []);

  const handleGetStarted = () => {
    router.push('/sign-in');
  };

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-screen overflow-hidden bg-[#030712]"
      style={{ cursor: 'none' }}
    >
      {/* Three.js Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      
      {/* Dark overlay for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50 pointer-events-none" />
      
      {/* Custom Cursor - Outer Ring */}
      <div
        className={`fixed pointer-events-none z-[100] transition-transform duration-200 ease-out ${
          isHovering ? 'scale-150' : 'scale-100'
        }`}
        style={{ 
          left: cursorPosition.x,
          top: cursorPosition.y,
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div className={`w-10 h-10 rounded-full border-2 transition-all duration-300 ${
          isHovering 
            ? 'border-green-400 bg-green-400/20' 
            : 'border-white/70'
        }`} />
      </div>
      
      {/* Custom Cursor - Inner Dot */}
      <div
        className="fixed pointer-events-none z-[100]"
        style={{ 
          left: cursorPosition.x,
          top: cursorPosition.y,
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div className={`w-2 h-2 rounded-full transition-all duration-150 ${
          isHovering ? 'bg-green-400 scale-150' : 'bg-green-400'
        }`} />
      </div>

      {/* Main Content */}
      <div className={`absolute inset-0 flex flex-col items-center justify-center z-10 px-6 transition-all duration-700 ${
        isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}>
        
        {/* Logo */}
        <div className="mb-8">
          <div className="w-20 h-20 md:w-24 md:h-24 mx-auto relative">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full opacity-40 blur-xl" />
            {/* Spinning ring */}
            <div 
              className="absolute inset-0 rounded-full bg-gradient-to-br from-green-400 via-emerald-500 to-cyan-500"
              style={{ animation: 'spin 10s linear infinite' }}
            />
            {/* Inner circle with icon */}
            <div className="absolute inset-[3px] bg-[#030712] rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 md:w-12 md:h-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        
        {/* Title */}
        <h1 
          className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tight mb-6 text-center"
          style={{ 
            textShadow: '0 0 40px rgba(34, 197, 94, 0.3), 0 4px 20px rgba(0,0,0,0.8)'
          }}
        >
          <span className="bg-gradient-to-r from-green-400 via-emerald-400 to-green-300 bg-clip-text text-transparent">
            Eco
          </span>
          <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent">
            Track
          </span>
        </h1>
        
        {/* Tagline */}
        <div 
          className="text-2xl md:text-4xl font-light tracking-[0.3em] mb-4 text-center"
          style={{ textShadow: '0 2px 20px rgba(0,0,0,0.9)' }}
        >
          <span className="text-white/90">Snap</span>
          <span className="text-white/40 mx-2">•</span>
          <span className="text-white/90">Track</span>
          <span className="text-white/40 mx-2">•</span>
          <span className="text-green-400 font-medium">Reduce</span>
        </div>
        
        {/* Description */}
        <p 
          className="text-base md:text-lg text-gray-300 max-w-md text-center mb-10 leading-relaxed px-4"
          style={{ textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}
        >
          Your AI-powered carbon footprint companion.
          <br />
          <span className="text-gray-400">Built for students. Powered by voice.</span>
        </p>

        {/* Feature Pills */}
        <div className="flex flex-wrap justify-center gap-3 mb-10 max-w-xl px-4">
          {[
            { icon: '📸', text: 'Receipt Scanner' },
            { icon: '🎤', text: 'Voice AI' },
            { icon: '🏆', text: 'Leaderboards' },
            { icon: '🌱', text: 'Eco Tips' },
          ].map((feature, i) => (
            <div 
              key={i}
              className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 text-white text-sm font-medium transition-all duration-300 hover:bg-white/15 hover:border-white/30 hover:scale-105"
              style={{ 
                animationDelay: `${i * 0.1}s`,
                textShadow: '0 1px 5px rgba(0,0,0,0.5)'
              }}
            >
              <span className="mr-2">{feature.icon}</span>
              {feature.text}
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <button
          onClick={handleGetStarted}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          className="group relative px-10 md:px-14 py-4 md:py-5 rounded-full text-white text-lg md:text-xl font-bold overflow-hidden transition-all duration-300 hover:scale-105 active:scale-95"
          style={{
            boxShadow: '0 0 30px rgba(34, 197, 94, 0.4), 0 10px 40px rgba(0,0,0,0.5)'
          }}
        >
          {/* Button gradient background */}
          <div className="absolute inset-0 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500" />
          
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-green-400 via-emerald-400 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Shine effect */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/25 to-transparent skew-x-12" />
          </div>
          
          <span className="relative z-10 flex items-center gap-3">
            Get Started
            <svg className="w-5 h-5 md:w-6 md:h-6 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </span>
        </button>

        {/* Stats */}
        <div className="mt-12 md:mt-16 flex gap-10 md:gap-16 text-center">
          {[
            { value: '< 5s', label: 'Log Time' },
            { value: 'AI', label: 'Powered' },
            { value: '∞', label: 'Impact' },
          ].map((stat, i) => (
            <div key={i}>
              <div 
                className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent"
                style={{ textShadow: '0 0 20px rgba(34, 197, 94, 0.3)' }}
              >
                {stat.value}
              </div>
              <div 
                className="text-xs md:text-sm text-gray-400 uppercase tracking-widest mt-1"
                style={{ textShadow: '0 1px 5px rgba(0,0,0,0.8)' }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Corner Elements */}
      <div 
        className="absolute top-6 left-6 md:left-8 text-gray-500 text-xs font-mono tracking-wider z-20"
        style={{ textShadow: '0 1px 5px rgba(0,0,0,0.8)' }}
      >
        v2.0 // ECOTRACK
      </div>
      
      <div className="absolute top-6 right-6 md:right-8 flex items-center gap-2 z-20">
        <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <span 
          className="text-gray-500 text-xs font-medium"
          style={{ textShadow: '0 1px 5px rgba(0,0,0,0.8)' }}
        >
          LIVE
        </span>
      </div>
      
      <div 
        className="absolute bottom-6 left-6 md:left-8 text-gray-600 text-xs font-mono z-20 hidden md:block"
        style={{ textShadow: '0 1px 5px rgba(0,0,0,0.8)' }}
      >
        CARBON TRACKING
      </div>
      
      <div 
        className="absolute bottom-6 right-6 md:right-8 text-gray-600 text-xs font-mono z-20 hidden md:block"
        style={{ textShadow: '0 1px 5px rgba(0,0,0,0.8)' }}
      >
        FOR STUDENTS
      </div>

      {/* Gradient overlays for depth */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#030712] via-[#030712]/60 to-transparent pointer-events-none z-5" />
      <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-[#030712]/80 to-transparent pointer-events-none z-5" />

      {/* Keyframes */}
      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

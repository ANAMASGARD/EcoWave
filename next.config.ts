import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env:{
       DATABASE_URL:process.env.DATABASE_URL,
       NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
       CLERK_SECRET_KEY:process.env.CLERK_SECRET_KEY,
      NEXT_PUBLIC_GEMINI_API_KEY:process.env.NEXT_PUBLIC_GEMINI_API_KEY,
       NEXT_PUBLIC_MAPTILER_KEY:process.env.NEXT_PUBLIC_MAPTILER_KEY,
  },
  images: {
    domains: ['images.unsplash.com', 'api.maptiler.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    unoptimized: true, // Allow data URLs
    dangerouslyAllowSVG: true,
  },
};

export default nextConfig;

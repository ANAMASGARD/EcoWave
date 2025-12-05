"use client"

import { ClerkProvider } from '@clerk/nextjs'
import { useState, useEffect } from "react"
import { Inter } from 'next/font/google'
import { usePathname } from 'next/navigation'
import "./globals.css"
import Header from "@/components/Header"
import Sidebar from "@/components/Sidebar"
import VoiceAssistant from "@/components/VoiceAssistant"
import 'leaflet/dist/leaflet.css'
import { Toaster } from 'react-hot-toast'
import { Providers } from "@/components/providers"

const inter = Inter({ subsets: ['latin'] })

// Component to handle user-dependent logic inside ClerkProvider
function LayoutContent({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Landing page should not have sidebar/header - render children directly
  const isLandingPage = pathname === '/landing';
  
  if (isLandingPage) {
    return <>{children}</>;
  }

  // Show loading state while mounting (prevents hydration mismatch)
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading EcoWave...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col transition-colors duration-300">
      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex flex-1">
        <Sidebar open={sidebarOpen} />
        <main className="flex-1 p-4 lg:p-8 ml-0 lg:ml-64 transition-all duration-300">
          {children}
        </main>
      </div>
      {/* Voice AI Assistant - Floating Button */}
      <VoiceAssistant />
    </div>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      appearance={{
        elements: {
          formButtonPrimary: 'bg-green-600 hover:bg-green-700',
        }
      }}
    >
      <html lang="en" suppressHydrationWarning>
        <body className={inter.className} suppressHydrationWarning>
          <Providers>
            <LayoutContent>
              {children}
            </LayoutContent>
          </Providers>
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  );
}

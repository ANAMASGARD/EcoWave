import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/landing',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/vapi(.*)',
])

const isLandingPage = createRouteMatcher(['/landing'])

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth()
  const url = req.nextUrl.clone()
  
  // If user is NOT logged in and trying to access protected routes, redirect to landing
  if (!userId && !isPublicRoute(req)) {
    url.pathname = '/landing'
    return NextResponse.redirect(url)
  }
  
  // If user IS logged in and on landing page, redirect to home
  if (userId && isLandingPage(req)) {
    url.pathname = '/'
    return NextResponse.redirect(url)
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
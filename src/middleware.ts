import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const isOnboardingRoute = createRouteMatcher(['/onboarding'])
const isLoadingRoute = createRouteMatcher(['/loading'])
const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)', '/api/webhooks(.*)', '/api/user/sync', '/api/user/update-metadata'])
const isAdminRoute = createRouteMatcher(['/dashboard/((?!financieel).*)'])  // All /dashboard/* except /dashboard/financieel/*
const isUserRoute = createRouteMatcher(['/dashboard/financieel(.*)'])       // Only /dashboard/financieel/*

// Create Supabase client for middleware
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const { userId, getToken, redirectToSignIn } = await auth()

  // For users visiting /onboarding or /loading, don't try to redirect
  if (userId && (isOnboardingRoute(req) || isLoadingRoute(req))) {
    console.log('✅ Allowing access to onboarding/loading route')
    return NextResponse.next()
  }

  // If the user isn't signed in and the route is private, redirect to sign-in
  if (!userId && !isPublicRoute(req)) {
    console.log('🚫 No user ID, redirecting to sign-in')
    return redirectToSignIn({ returnBackUrl: req.url })
  }

  // For protected routes, check onboarding status directly from Supabase
  if (userId && !isPublicRoute(req) && !isLoadingRoute(req)) {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('onboarding_complete, role')
        .eq('clerk_user_id', userId)
        .single()

      console.log('🔍 Middleware - Supabase Check:', {
        url: req.url,
        userId,
        profile: profile,
        error: error?.message
      })

      // If profile doesn't exist or onboarding not complete, redirect to onboarding
      if (!profile || !profile.onboarding_complete) {
        console.log('🔄 Onboarding not complete in Supabase, redirecting to onboarding')
        const onboardingUrl = new URL('/onboarding', req.url)
        return NextResponse.redirect(onboardingUrl)
      }

      // Role-based routing after onboarding is complete
      const userRole = profile.role
      const isAdmin = userRole === 'owner' || userRole === 'admin'
      const isUser = userRole === 'member' || userRole === 'viewer'

      // Check if user is trying to access admin routes
      if (isAdminRoute(req) && !isAdmin) {
        console.log(`🚫 User with role "${userRole}" trying to access admin route, redirecting to user dashboard`)
        const userDashboardUrl = new URL('/dashboard/financieel', req.url)
        return NextResponse.redirect(userDashboardUrl)
      }

      // Only redirect admins (not owners) from user routes - owners should have access to both
      if (isUserRoute(req) && userRole === 'admin') {
        console.log(`🔄 Admin with role "${userRole}" accessing user route, redirecting to admin dashboard`)
        const adminDashboardUrl = new URL('/dashboard', req.url)
        return NextResponse.redirect(adminDashboardUrl)
      }

      // Default redirect based on role if accessing /dashboard root
      if (req.nextUrl.pathname === '/dashboard') {
        if (isAdmin) {
          console.log(`✅ Admin role "${userRole}" accessing /dashboard - allowing access`)
          return NextResponse.next()
        } else {
          console.log(`🔄 User role "${userRole}" accessing /dashboard root, redirecting to financial dashboard`)
          const userDashboardUrl = new URL('/dashboard/financieel', req.url)
          return NextResponse.redirect(userDashboardUrl)
        }
      }

      console.log(`✅ User authenticated with role "${userRole}", allowing access to ${req.url}`)
      return NextResponse.next()

    } catch (error) {
      console.error('❌ Error checking Supabase profile:', error)
      // On error, redirect to onboarding to be safe
      const onboardingUrl = new URL('/onboarding', req.url)
      return NextResponse.redirect(onboardingUrl)
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
import { authMiddleware } from '@clerk/nextjs'

export default authMiddleware({
  // Public routes that don't require authentication
  publicRoutes: [
    '/',
    '/pricing',
    '/about',
    '/contact',
    '/privacy',
    '/terms',
    '/api/webhooks/clerk',
  ],
  // Routes that should be accessible without authentication but will still run middleware
  ignoredRoutes: [
    '/api/webhooks/clerk',
  ],
  // After sign in, redirect to dashboard
  afterAuth(auth, req) {
    // Handle organization-based routing
    if (auth.userId && auth.orgId && req.nextUrl.pathname === '/') {
      return Response.redirect(new URL('/dashboard', req.url))
    }
  },
})

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
}
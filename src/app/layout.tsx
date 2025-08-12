import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { QueryProvider } from '@/components/providers/query-provider'
import { AuthProvider } from '@/components/providers/auth-provider'
import { RouteGuard } from '@/components/auth/route-guard'
import { InactivityWarning } from '@/components/auth/inactivity-warning'
import { CookieConsent } from '@/components/cookie-consent'
import { ConsentAwareAnalytics } from '@/components/analytics/consent-aware-analytics'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SaaS Template - Build Your B2B SaaS 10x Faster | Production-Ready Next.js',
  description: 'Launch your B2B SaaS in days, not months. Production-ready template with Next.js, Supabase, Clerk authentication, multi-tenant architecture, and enterprise security. Join 2,500+ companies who saved 200+ hours.',
  keywords: ['B2B SaaS template', 'Next.js SaaS', 'multi-tenant SaaS', 'SaaS boilerplate', 'Supabase SaaS', 'Clerk authentication', 'enterprise SaaS'],
  authors: [{ name: 'SaaS Template Team' }],
  creator: 'SaaS Template',
  publisher: 'SaaS Template',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://saas-template.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    title: 'SaaS Template - Build Your B2B SaaS 10x Faster',
    description: 'Launch your B2B SaaS in days, not months. Production-ready template with Next.js, Supabase, Clerk authentication, and enterprise features.',
    siteName: 'SaaS Template',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'SaaS Template - Build Your B2B SaaS 10x Faster',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SaaS Template - Build Your B2B SaaS 10x Faster',
    description: 'Launch your B2B SaaS in days, not months. Production-ready template with enterprise features.',
    images: ['/og-image.jpg'],
    creator: '@saastemplate',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <ClerkProvider
        signUpForceRedirectUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL || "/onboarding"}
        signInForceRedirectUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL || "/dashboard"}
      >
        <body className={inter.className}>
          <QueryProvider>
            <AuthProvider>
              <RouteGuard requireAuth={false}>
                {children}
                <InactivityWarning />
              </RouteGuard>
            </AuthProvider>
            <CookieConsent />
            <ConsentAwareAnalytics 
              debug={process.env.NODE_ENV === 'development'}
            />
          </QueryProvider>
        </body>
      </ClerkProvider>
    </html>
  )
}
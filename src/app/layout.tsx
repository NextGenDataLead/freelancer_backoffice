import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { QueryProvider } from '@/components/providers/query-provider'
import { AuthProvider } from '@/components/providers/auth-provider'
import { RouteGuard } from '@/components/auth/route-guard'
import { InactivityWarning } from '@/components/auth/inactivity-warning'
import { CookieConsent } from '@/components/cookie-consent'
import { ConsentAwareAnalytics } from '@/components/analytics/consent-aware-analytics'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from 'sonner'
import { NotificationToastContainer } from '@/components/notifications/notification-toast'
import Script from 'next/script'
// LiveChat and HelpSystem components not yet implemented
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <ClerkProvider
        signUpForceRedirectUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL || "/onboarding"}
        signInForceRedirectUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL || "/dashboard"}
      >
        <body className={inter.className}>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={true}
            disableTransitionOnChange={false}
          >
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
              <Toaster position="top-right" />
              <NotificationToastContainer />
              {/* LiveChat and HelpSystem components not yet implemented */}
            </QueryProvider>
          </ThemeProvider>
          {/* Scripts for NovaWave template (financieel-v2) */}
          <Script src="https://unpkg.com/lucide@latest" strategy="beforeInteractive" />
          <Script src="https://cdn.jsdelivr.net/npm/chart.js" strategy="beforeInteractive" />
          <Script src="/js/utils.js" strategy="afterInteractive" />
          <Script src="/js/chart.js" strategy="afterInteractive" />
          <Script src="/js/interactions.js" strategy="afterInteractive" />
          <Script src="/js/mobile-interactions.js" strategy="afterInteractive" />
        </body>
      </ClerkProvider>
    </html>
  )
}
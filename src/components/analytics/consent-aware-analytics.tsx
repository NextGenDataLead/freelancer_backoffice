/**
 * Consent-aware analytics component that respects GDPR cookie preferences
 * Only loads and tracks when user has given proper consent
 */

"use client"

import { useEffect } from 'react'
import { useAnalyticsConsent, useConsentAwareTracking } from '@/hooks/use-cookie-consent'
import Script from 'next/script'
import { getCurrentDate } from '../../lib/current-date'

interface ConsentAwareAnalyticsProps {
  googleAnalyticsId?: string
  facebookPixelId?: string
  debug?: boolean
}

export function ConsentAwareAnalytics({
  googleAnalyticsId,
  facebookPixelId,
  debug = false
}: ConsentAwareAnalyticsProps) {
  const { canUseAnalytics, hasConsent, isLoading } = useAnalyticsConsent()
  const { trackEvent } = useConsentAwareTracking()

  // Initialize analytics when consent is given
  useEffect(() => {
    if (isLoading) return

    if (canUseAnalytics && googleAnalyticsId) {
      // Initialize Google Analytics with consent
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('consent', 'update', {
          analytics_storage: 'granted'
        })
        
        window.gtag('config', googleAnalyticsId, {
          page_title: document.title,
          page_location: window.location.href,
        })

        if (debug) {
          console.log('Google Analytics initialized with consent')
        }
      }
    }
  }, [canUseAnalytics, isLoading, googleAnalyticsId, debug])

  // Track page views when consent is given and route changes
  useEffect(() => {
    if (!canUseAnalytics || !hasConsent) return

    const handleRouteChange = () => {
      trackEvent('page_view', {
        page_title: document.title,
        page_location: window.location.href,
      })
    }

    // Track initial page load
    handleRouteChange()

    // Listen for route changes (works with Next.js router)
    window.addEventListener('popstate', handleRouteChange)

    return () => {
      window.removeEventListener('popstate', handleRouteChange)
    }
  }, [canUseAnalytics, hasConsent, trackEvent])

  if (isLoading || !hasConsent) {
    return null
  }

  return (
    <>
      {/* Google Analytics */}
      {canUseAnalytics && googleAnalyticsId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`}
            strategy="afterInteractive"
            onLoad={() => {
              if (debug) {
                console.log('Google Analytics script loaded')
              }
            }}
          />
          <Script
            id="google-analytics-init"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', getCurrentDate());
                
                // Set default consent to denied
                gtag('consent', 'default', {
                  analytics_storage: 'denied',
                  ad_storage: 'denied',
                  ad_user_data: 'denied',
                  ad_personalization: 'denied',
                });
                
                // Update consent based on user preferences
                gtag('consent', 'update', {
                  analytics_storage: 'granted'
                });
                
                gtag('config', '${googleAnalyticsId}', {
                  page_title: document.title,
                  page_location: window.location.href,
                });
              `,
            }}
          />
        </>
      )}

      {/* Facebook Pixel */}
      {canUseAnalytics && facebookPixelId && (
        <Script
          id="facebook-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${facebookPixelId}');
              fbq('track', 'PageView');
            `,
          }}
          onLoad={() => {
            if (debug) {
              console.log('Facebook Pixel script loaded')
            }
          }}
        />
      )}

      {debug && (
        <div
          style={{
            position: 'fixed',
            bottom: '100px',
            right: '20px',
            padding: '10px',
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            fontSize: '12px',
            borderRadius: '4px',
            zIndex: 1000,
          }}
        >
          Analytics: {canUseAnalytics ? '✅ Enabled' : '❌ Disabled'}
          <br />
          Consent: {hasConsent ? '✅ Given' : '❌ Not given'}
        </div>
      )}
    </>
  )
}

/**
 * Hook for tracking custom events with consent awareness
 */
export function useAnalyticsTracker(options?: { debug?: boolean }) {
  const { canUseAnalytics } = useAnalyticsConsent()
  const { trackEvent } = useConsentAwareTracking()

  const track = (eventName: string, properties?: Record<string, any>) => {
    if (!canUseAnalytics) {
      if (options?.debug) {
        console.log(`Analytics event "${eventName}" blocked due to consent`)
      }
      return
    }

    trackEvent(eventName, properties, { requiresAnalytics: true })

    // Send to Google Analytics
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', eventName, properties)
    }

    // Send to Facebook Pixel
    if (typeof window !== 'undefined' && window.fbq) {
      window.fbq('track', eventName, properties)
    }

    if (options?.debug) {
      console.log('Analytics event tracked:', eventName, properties)
    }
  }

  const trackPageView = (path?: string) => {
    track('page_view', {
      page_location: path || (typeof window !== 'undefined' ? window.location.href : ''),
      page_title: typeof document !== 'undefined' ? document.title : '',
    })
  }

  const trackClick = (elementName: string, properties?: Record<string, any>) => {
    track('click', {
      element_name: elementName,
      ...properties,
    })
  }

  const trackFormSubmit = (formName: string, properties?: Record<string, any>) => {
    track('form_submit', {
      form_name: formName,
      ...properties,
    })
  }

  const trackCustomEvent = (eventName: string, properties?: Record<string, any>) => {
    track(eventName, properties)
  }

  return {
    track,
    trackPageView,
    trackClick,
    trackFormSubmit,
    trackCustomEvent,
    canTrack: canUseAnalytics,
  }
}

// Global type declarations for analytics
declare global {
  interface Window {
    gtag?: (...args: any[]) => void
    dataLayer?: any[]
    fbq?: (...args: any[]) => void
  }
}
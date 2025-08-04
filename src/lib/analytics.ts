// Analytics tracking utilities for conversion events
import { useReportWebVitals } from 'next/web-vitals'

// Analytics event types for pricing page
export type PricingAnalyticsEvent = 
  | 'pricing_page_view'
  | 'pricing_tier_click' 
  | 'billing_toggle_click'
  | 'free_trial_click'
  | 'contact_sales_click'
  | 'faq_item_click'
  | 'pricing_conversion'

// Track custom events to analytics endpoint
export function trackEvent(
  event: PricingAnalyticsEvent,
  properties?: Record<string, any>
) {
  // In production, this would send to your analytics service
  if (typeof window !== 'undefined') {
    // Track to Google Analytics if available
    if (window.gtag) {
      window.gtag('event', event, {
        ...properties,
        event_category: 'pricing',
        non_interaction: false
      })
    }

    // Track to custom analytics endpoint
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event,
        properties: {
          ...properties,
          timestamp: Date.now(),
          url: window.location.href,
          referrer: document.referrer,
          user_agent: navigator.userAgent,
        }
      }),
      keepalive: true
    }).catch(error => {
      console.warn('Analytics tracking failed:', error)
    })
  }
}

// Track conversion events with A/B test variant
export function trackConversion(
  tier: string,
  variant?: string,
  properties?: Record<string, any>
) {
  trackEvent('pricing_conversion', {
    tier,
    variant,
    conversion_value: tier === 'starter' ? 29 : tier === 'professional' ? 79 : 199,
    ...properties
  })
}

// Web Vitals tracking configuration
export function configureWebVitals() {
  if (typeof window !== 'undefined') {
    // Track Web Vitals to analytics
    const reportWebVitals = (metric: any) => {
      // Send to Google Analytics
      if (window.gtag) {
        window.gtag('event', metric.name, {
          value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
          event_label: metric.id,
          non_interaction: true,
        })
      }

      // Send to custom analytics endpoint
      const body = JSON.stringify(metric)
      const url = '/api/analytics/vitals'

      if (navigator.sendBeacon) {
        navigator.sendBeacon(url, body)
      } else {
        fetch(url, { 
          body, 
          method: 'POST', 
          keepalive: true,
          headers: {
            'Content-Type': 'application/json',
          }
        }).catch(error => {
          console.warn('Web Vitals tracking failed:', error)
        })
      }
    }

    // Return the configuration for useReportWebVitals
    return reportWebVitals
  }
}

// Pricing page specific tracking helpers
export const pricingAnalytics = {
  // Track pricing page view with variant
  trackPageView: (variant?: string) => {
    trackEvent('pricing_page_view', { variant })
  },

  // Track tier selection
  trackTierClick: (tier: string, variant?: string) => {
    trackEvent('pricing_tier_click', { tier, variant })
  },

  // Track billing toggle
  trackBillingToggle: (billingType: 'monthly' | 'yearly', variant?: string) => {
    trackEvent('billing_toggle_click', { billing_type: billingType, variant })
  },

  // Track CTA clicks
  trackCTAClick: (cta: string, tier: string, variant?: string) => {
    trackEvent('free_trial_click', { cta_text: cta, tier, variant })
  },

  // Track contact sales clicks
  trackContactSales: (variant?: string) => {
    trackEvent('contact_sales_click', { variant })
  },

  // Track FAQ interactions
  trackFAQClick: (question: string, variant?: string) => {
    trackEvent('faq_item_click', { question, variant })
  }
}

// Type declarations for window.gtag
declare global {
  interface Window {
    gtag?: (...args: any[]) => void
  }
}
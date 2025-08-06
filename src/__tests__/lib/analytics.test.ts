import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { pricingAnalytics, trackEvent, trackConversion } from '@/lib/analytics'

// Mock fetch and window globals
global.fetch = vi.fn()
Object.defineProperty(window, 'location', {
  value: { href: 'http://localhost:3000/' },
})
Object.defineProperty(document, 'referrer', {
  value: '',
})
Object.defineProperty(navigator, 'userAgent', {
  value: 'Mozilla/5.0 (linux) AppleWebKit/537.36 (KHTML, like Gecko) jsdom/23.2.0',
})

describe('Analytics Tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock successful fetch response
    ;(fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('trackPageView', () => {
    it('sends correct page view event', () => {
      pricingAnalytics.trackPageView('control')

      expect(fetch).toHaveBeenCalledWith('/api/analytics/track', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('pricing_page_view'),
        keepalive: true,
      }))
    })

    it('handles fetch errors gracefully', () => {
      ;(fetch as any).mockRejectedValue(new Error('Network error'))
      
      // Should not throw
      expect(() => pricingAnalytics.trackPageView('control')).not.toThrow()
    })
  })

  describe('trackCTAClick', () => {
    it('sends correct CTA click event', () => {
      pricingAnalytics.trackCTAClick('Start Free Trial', 'professional', 'variant-a')

      expect(fetch).toHaveBeenCalledWith('/api/analytics/track', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('free_trial_click'),
        keepalive: true,
      }))
    })

    it('handles missing optional parameters', () => {
      pricingAnalytics.trackCTAClick('Get Started', 'starter')
      expect(fetch).toHaveBeenCalled()
    })
  })

  describe('trackTierClick', () => {
    it('sends correct tier click event', () => {
      pricingAnalytics.trackTierClick('enterprise', 'control')

      expect(fetch).toHaveBeenCalledWith('/api/analytics/track', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('pricing_tier_click'),
        keepalive: true,
      }))
    })
  })

  describe('trackBillingToggle', () => {
    it('sends correct billing toggle event', () => {
      pricingAnalytics.trackBillingToggle('yearly', 'variant-b')

      expect(fetch).toHaveBeenCalledWith('/api/analytics/track', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('billing_toggle_click'),
        keepalive: true,
      }))
    })
  })

  describe('trackContactSales', () => {
    it('sends correct contact sales event', () => {
      pricingAnalytics.trackContactSales('control')

      expect(fetch).toHaveBeenCalledWith('/api/analytics/track', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('contact_sales_click'),
        keepalive: true,
      }))
    })
  })

  describe('trackFAQClick', () => {
    it('sends correct FAQ click event', () => {
      pricingAnalytics.trackFAQClick('What is included in the free trial?', 'control')

      expect(fetch).toHaveBeenCalledWith('/api/analytics/track', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('faq_item_click'),
        keepalive: true,
      }))
    })
  })

  describe('trackConversion', () => {
    it('sends correct conversion event', () => {
      trackConversion('professional', 'variant-a', { source: 'pricing_page' })

      expect(fetch).toHaveBeenCalledWith('/api/analytics/track', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('pricing_conversion'),
        keepalive: true,
      }))
    })
  })

  describe('Error Handling', () => {
    it('handles network errors gracefully', () => {
      ;(fetch as any).mockRejectedValue(new Error('Network failed'))
      
      expect(() => trackEvent('pricing_page_view')).not.toThrow()
    })

    it('handles missing window gracefully', () => {
      // Mock server-side environment
      const originalWindow = global.window
      delete (global as any).window
      
      expect(() => trackEvent('pricing_page_view')).not.toThrow()
      
      // Restore window
      global.window = originalWindow
    })
  })
})
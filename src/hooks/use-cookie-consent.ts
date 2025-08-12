/**
 * React hook for managing cookie consent in components
 * Provides reactive access to cookie consent state and preferences
 */

import { useState, useEffect, useCallback } from 'react'
import {
  CookiePreferences,
  CookieConsentData,
  getCookieConsent,
  setCookieConsent,
  hasGivenConsent,
  hasConsentFor,
  getCurrentPreferences,
  clearCookieConsent,
  gdprUtils,
} from '@/lib/gdpr/cookie-manager'

export interface UseCookieConsentReturn {
  // State
  hasConsent: boolean
  preferences: CookiePreferences
  consentData: CookieConsentData | null
  isLoading: boolean
  
  // Actions
  acceptAll: () => void
  rejectAll: () => void
  updatePreferences: (preferences: CookiePreferences) => void
  clearConsent: () => void
  
  // Utilities
  canUse: (type: keyof CookiePreferences) => boolean
  shouldShowBanner: () => boolean
  getConsentRecord: () => string
  isConsentExpired: (maxAgeInDays?: number) => boolean
}

/**
 * Hook for managing cookie consent state and actions
 */
export function useCookieConsent(): UseCookieConsentReturn {
  const [hasConsent, setHasConsent] = useState(false)
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true,
    analytics: false,
    marketing: false,
  })
  const [consentData, setConsentData] = useState<CookieConsentData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load initial consent state
  useEffect(() => {
    const loadConsentState = () => {
      const consent = getCookieConsent()
      const hasGivenAnyConsent = hasGivenConsent()
      const currentPrefs = getCurrentPreferences()

      setHasConsent(hasGivenAnyConsent)
      setPreferences(currentPrefs)
      setConsentData(consent)
      setIsLoading(false)
    }

    // Load immediately
    loadConsentState()

    // Listen for consent changes from other components/windows
    const handleConsentChange = (event: CustomEvent) => {
      setConsentData(event.detail)
      setHasConsent(true)
      setPreferences(event.detail.preferences)
    }

    const handleConsentCleared = () => {
      setHasConsent(false)
      setPreferences({
        essential: true,
        analytics: false,
        marketing: false,
      })
      setConsentData(null)
    }

    window.addEventListener('cookieConsentChanged', handleConsentChange as EventListener)
    window.addEventListener('cookieConsentCleared', handleConsentCleared)

    return () => {
      window.removeEventListener('cookieConsentChanged', handleConsentChange as EventListener)
      window.removeEventListener('cookieConsentCleared', handleConsentCleared)
    }
  }, [])

  // Accept all cookies
  const acceptAll = useCallback(() => {
    const allPreferences: CookiePreferences = {
      essential: true,
      analytics: true,
      marketing: true,
    }
    setCookieConsent(allPreferences)
  }, [])

  // Reject all non-essential cookies
  const rejectAll = useCallback(() => {
    const minimalPreferences: CookiePreferences = {
      essential: true,
      analytics: false,
      marketing: false,
    }
    setCookieConsent(minimalPreferences)
  }, [])

  // Update specific preferences
  const updatePreferences = useCallback((newPreferences: CookiePreferences) => {
    // Ensure essential cookies are always enabled
    const safePreferences = {
      ...newPreferences,
      essential: true,
    }
    setCookieConsent(safePreferences)
  }, [])

  // Clear all consent data
  const clearConsent = useCallback(() => {
    clearCookieConsent()
  }, [])

  // Check if we can use specific cookie type
  const canUse = useCallback((type: keyof CookiePreferences): boolean => {
    return hasConsentFor(type)
  }, [])

  // Determine if we should show the consent banner
  const shouldShowBanner = useCallback((): boolean => {
    // Don't show if already has consent
    if (hasConsent) return false
    
    // Don't show during SSR
    if (typeof window === 'undefined') return false
    
    // Show by default for GDPR compliance
    // You could add geolocation logic here to only show for EU users
    return true
  }, [hasConsent])

  // Get consent record for audit purposes
  const getConsentRecord = useCallback((): string => {
    return gdprUtils.generateConsentRecord()
  }, [])

  // Check if consent is expired
  const isConsentExpired = useCallback((maxAgeInDays: number = 365): boolean => {
    return gdprUtils.isConsentExpired(maxAgeInDays)
  }, [])

  return {
    // State
    hasConsent,
    preferences,
    consentData,
    isLoading,
    
    // Actions
    acceptAll,
    rejectAll,
    updatePreferences,
    clearConsent,
    
    // Utilities
    canUse,
    shouldShowBanner,
    getConsentRecord,
    isConsentExpired,
  }
}

/**
 * Hook specifically for checking if analytics tracking is allowed
 * Useful for conditionally loading analytics scripts
 */
export function useAnalyticsConsent(): {
  canUseAnalytics: boolean
  hasConsent: boolean
  isLoading: boolean
} {
  const { canUse, hasConsent, isLoading } = useCookieConsent()
  
  return {
    canUseAnalytics: canUse('analytics'),
    hasConsent,
    isLoading,
  }
}

/**
 * Hook specifically for checking if marketing tracking is allowed
 * Useful for conditionally loading marketing/advertising scripts
 */
export function useMarketingConsent(): {
  canUseMarketing: boolean
  hasConsent: boolean
  isLoading: boolean
} {
  const { canUse, hasConsent, isLoading } = useCookieConsent()
  
  return {
    canUseMarketing: canUse('marketing'),
    hasConsent,
    isLoading,
  }
}

/**
 * Hook for components that need to track consent-dependent events
 * Automatically respects user consent preferences
 */
export function useConsentAwareTracking() {
  const { canUse } = useCookieConsent()
  
  const trackEvent = useCallback((
    eventName: string,
    properties?: Record<string, any>,
    options?: {
      requiresAnalytics?: boolean
      requiresMarketing?: boolean
    }
  ) => {
    const { requiresAnalytics = true, requiresMarketing = false } = options || {}
    
    // Check consent requirements
    if (requiresAnalytics && !canUse('analytics')) {
      console.log(`Analytics event "${eventName}" blocked due to consent preferences`)
      return
    }
    
    if (requiresMarketing && !canUse('marketing')) {
      console.log(`Marketing event "${eventName}" blocked due to consent preferences`)
      return
    }
    
    // Track the event (replace with your analytics implementation)
    console.log('Tracking event:', eventName, properties)
    
    // Example implementations:
    // if (window.gtag && requiresAnalytics) {
    //   window.gtag('event', eventName, properties)
    // }
    // 
    // if (window.fbq && requiresMarketing) {
    //   window.fbq('track', eventName, properties)
    // }
  }, [canUse])
  
  return { trackEvent }
}
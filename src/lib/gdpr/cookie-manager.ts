/**
 * GDPR-compliant cookie management utility
 * Handles cookie consent preferences and provides utilities for checking consent
 */

export interface CookiePreferences {
  essential: boolean
  analytics: boolean
  marketing: boolean
}

export interface CookieConsentData {
  preferences: CookiePreferences
  timestamp: string
  version: string
}

const COOKIE_CONSENT_KEY = 'cookie-consent'
const CONSENT_VERSION = '1.0'

/**
 * Default cookie preferences - only essential cookies enabled
 */
const DEFAULT_PREFERENCES: CookiePreferences = {
  essential: true,
  analytics: false,
  marketing: false,
}

/**
 * Get current cookie consent preferences from localStorage
 */
export function getCookieConsent(): CookieConsentData | null {
  if (typeof window === 'undefined') return null
  
  try {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY)
    if (!stored) return null
    
    const data = JSON.parse(stored) as CookieConsentData
    
    // Validate the data structure
    if (!data.preferences || typeof data.preferences !== 'object') {
      return null
    }
    
    return data
  } catch (error) {
    console.error('Error reading cookie consent:', error)
    return null
  }
}

/**
 * Save cookie consent preferences to localStorage
 */
export function setCookieConsent(preferences: CookiePreferences): void {
  if (typeof window === 'undefined') return
  
  try {
    const consentData: CookieConsentData = {
      preferences,
      timestamp: new Date().toISOString(),
      version: CONSENT_VERSION,
    }
    
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consentData))
    
    // Dispatch custom event for components that need to react to consent changes
    window.dispatchEvent(new CustomEvent('cookieConsentChanged', {
      detail: consentData
    }))
    
    // Apply consent preferences
    applyConsentPreferences(preferences)
  } catch (error) {
    console.error('Error saving cookie consent:', error)
  }
}

/**
 * Check if user has given consent (any consent, not specific type)
 */
export function hasGivenConsent(): boolean {
  return getCookieConsent() !== null
}

/**
 * Check if consent is given for specific cookie type
 */
export function hasConsentFor(type: keyof CookiePreferences): boolean {
  const consent = getCookieConsent()
  if (!consent) return type === 'essential' // Essential cookies are always allowed
  
  return consent.preferences[type] === true
}

/**
 * Get current preferences or defaults if no consent given
 */
export function getCurrentPreferences(): CookiePreferences {
  const consent = getCookieConsent()
  return consent ? consent.preferences : DEFAULT_PREFERENCES
}

/**
 * Clear all cookie consent data (for testing or reset purposes)
 */
export function clearCookieConsent(): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.removeItem(COOKIE_CONSENT_KEY)
    
    // Clear analytics cookies if they were set
    clearAnalyticsCookies()
    clearMarketingCookies()
    
    window.dispatchEvent(new CustomEvent('cookieConsentCleared'))
  } catch (error) {
    console.error('Error clearing cookie consent:', error)
  }
}

/**
 * Apply consent preferences by managing third-party scripts and cookies
 */
function applyConsentPreferences(preferences: CookiePreferences): void {
  if (preferences.analytics) {
    initializeAnalytics()
  } else {
    clearAnalyticsCookies()
  }
  
  if (preferences.marketing) {
    initializeMarketing()
  } else {
    clearMarketingCookies()
  }
}

/**
 * Initialize analytics tracking (Google Analytics, etc.)
 */
function initializeAnalytics(): void {
  // Initialize Google Analytics or other analytics services
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('consent', 'update', {
      analytics_storage: 'granted'
    })
  }
}

/**
 * Initialize marketing tracking (Facebook Pixel, etc.)
 */
function initializeMarketing(): void {
  // Initialize marketing/advertising tracking
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('consent', 'update', {
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted'
    })
  }
}

/**
 * Clear analytics cookies
 */
function clearAnalyticsCookies(): void {
  if (typeof window === 'undefined') return
  
  // Clear Google Analytics cookies
  const gaCookies = ['_ga', '_ga_', '_gid', '_gat']
  gaCookies.forEach(cookie => {
    document.cookie = `${cookie}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`
    document.cookie = `${cookie}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.${window.location.hostname};`
  })
  
  if (window.gtag) {
    window.gtag('consent', 'update', {
      analytics_storage: 'denied'
    })
  }
}

/**
 * Clear marketing cookies
 */
function clearMarketingCookies(): void {
  if (typeof window === 'undefined') return
  
  // Clear Facebook Pixel and other marketing cookies
  const marketingCookies = ['_fbp', '_fbc', 'fr']
  marketingCookies.forEach(cookie => {
    document.cookie = `${cookie}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`
    document.cookie = `${cookie}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.${window.location.hostname};`
  })
  
  if (window.gtag) {
    window.gtag('consent', 'update', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    })
  }
}

/**
 * Initialize consent on page load - apply stored preferences
 */
export function initializeCookieConsent(): void {
  const consent = getCookieConsent()
  if (consent) {
    applyConsentPreferences(consent.preferences)
  }
}

/**
 * GDPR utility functions
 */
export const gdprUtils = {
  /**
   * Check if user is in EU (basic implementation - you might want to use a more sophisticated service)
   */
  isEUUser(): boolean {
    if (typeof window === 'undefined') return true // Default to showing consent for safety
    
    // This is a basic implementation. In production, you might want to use
    // a geolocation service or IP-based detection
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const euTimezones = [
      'Europe/Amsterdam', 'Europe/Berlin', 'Europe/London', 'Europe/Paris',
      'Europe/Rome', 'Europe/Madrid', 'Europe/Vienna', 'Europe/Stockholm',
      // Add more EU timezones as needed
    ]
    
    return euTimezones.some(tz => timezone.includes(tz))
  },
  
  /**
   * Generate consent record for audit purposes
   */
  generateConsentRecord(): string {
    const consent = getCookieConsent()
    if (!consent) return 'No consent given'
    
    return `Consent given on ${consent.timestamp} (v${consent.version}): Essential=${consent.preferences.essential}, Analytics=${consent.preferences.analytics}, Marketing=${consent.preferences.marketing}`
  },
  
  /**
   * Check if consent is expired (optional - implement if you want consent to expire after a certain time)
   */
  isConsentExpired(maxAgeInDays: number = 365): boolean {
    const consent = getCookieConsent()
    if (!consent) return true
    
    const consentDate = new Date(consent.timestamp)
    const now = new Date()
    const daysDiff = (now.getTime() - consentDate.getTime()) / (1000 * 3600 * 24)
    
    return daysDiff > maxAgeInDays
  }
}

// Global type declarations for third-party tracking
declare global {
  interface Window {
    gtag?: (...args: any[]) => void
    ga?: (...args: any[]) => void
    fbq?: (...args: any[]) => void
  }
}
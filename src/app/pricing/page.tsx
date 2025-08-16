"use client"

import * as React from "react"
import { ArrowRight, Check, Star, Users, Shield, Award, Clock, X, Calculator, Slider, Gift } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAnalyticsConsent, useConsentAwareTracking } from "@/hooks/use-cookie-consent"
// Temporarily disable complex imports to isolate issue
// import { pricingAnalytics, configureWebVitals } from "@/lib/analytics"
// import { pricingPageVariantFlag, ctaButtonTextFlag, pricingDisplayFlag } from "@/lib/flags"
// import { WebVitals } from "@/components/web-vitals"

// Trust signals data from research
const trustSignals = [
  {
    icon: Users,
    stat: '2,500+',
    description: 'Active customers',
  },
  {
    icon: Shield,
    stat: '99.9%',
    description: 'Uptime SLA',
  },
  {
    icon: Award,
    stat: '4.9/5',
    description: 'Customer rating',
  },
  {
    icon: Clock,
    stat: '< 2hrs',
    description: 'Avg. response time',
  },
]

// Research-driven pricing tiers (3-tier with middle anchor)
const pricingTiers = [
  {
    id: 'starter',
    name: 'Starter',
    price: 29,
    yearlyPrice: 23, // 20% discount
    description: 'Perfect for small teams getting started',
    popular: false,
    features: [
      { name: 'Up to 5 team members', included: true },
      { name: '10GB storage', included: true },
      { name: 'Basic analytics', included: true },
      { name: 'Email support', included: true },
      { name: 'Core integrations', included: true },
      { name: 'Custom branding', included: false },
      { name: 'API access', included: false },
      { name: 'Advanced security', included: false },
    ],
    cta: 'Start Free Trial',
    ctaVariant: 'outline' as const,
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 79,
    yearlyPrice: 63, // 20% discount - ANCHORED MIDDLE TIER
    description: 'Best for growing businesses',
    popular: true, // Research shows highlighting middle tier boosts conversion 15%
    features: [
      { name: 'Up to 25 team members', included: true },
      { name: '100GB storage', included: true },
      { name: 'Advanced analytics', included: true },
      { name: 'Priority support', included: true },
      { name: 'All integrations', included: true },
      { name: 'Custom branding', included: true },
      { name: 'API access', included: true },
      { name: 'Advanced security', included: false },
    ],
    cta: 'Start Free Trial',
    ctaVariant: 'default' as const,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 199,
    yearlyPrice: 159,
    description: 'For large organizations',
    popular: false,
    features: [
      { name: 'Unlimited team members', included: true },
      { name: 'Unlimited storage', included: true },
      { name: 'Custom analytics', included: true },
      { name: 'Dedicated support', included: true },
      { name: 'White-label solution', included: true },
      { name: 'Advanced security', included: true },
      { name: 'Custom integrations', included: true },
      { name: 'SLA guarantee', included: true },
    ],
    cta: 'Contact Sales',
    ctaVariant: 'secondary' as const,
  },
]

const faqs = [
  {
    question: 'Can I change my plan at any time?',
    answer: 'Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, and we\'ll prorate any billing differences.',
  },
  {
    question: 'What happens to my data if I cancel?',
    answer: 'Your data remains accessible for 30 days after cancellation. You can export all your data at any time, and we\'ll permanently delete it after the retention period per GDPR requirements.',
  },
  {
    question: 'Do you offer refunds?',
    answer: 'We offer a 30-day money-back guarantee for annual plans. Monthly plans can be cancelled at any time without penalty.',
  },
  {
    question: 'Is my data secure?',
    answer: 'Absolutely. We use enterprise-grade security with end-to-end encryption, SOC 2 compliance, and regular security audits. Your data is stored in secure, geographically distributed data centers.',
  },
  {
    question: 'What kind of support do you provide?',
    answer: 'We offer email support for all plans, with priority support for Professional and dedicated support for Enterprise. Our average response time is under 2 hours.',
  },
  {
    question: 'Can I integrate with my existing tools?',
    answer: 'Yes, we offer integrations with 100+ popular business tools including Slack, Google Workspace, Microsoft 365, Zapier, and many more.',
  },
]

export default function PricingPage() {
  // Get consent status
  const { canUseAnalytics, isLoading: consentLoading } = useAnalyticsConsent()
  const { trackEvent } = useConsentAwareTracking()
  
  const [isYearly, setIsYearly] = React.useState(false)
  const [teamSize, setTeamSize] = React.useState(10)
  const [storageNeeds, setStorageNeeds] = React.useState(50) // GB
  const [showCalculator, setShowCalculator] = React.useState(false)
  const [userIntent, setUserIntent] = React.useState<'exploring' | 'comparing' | 'ready' | 'enterprise'>('exploring')
  const [showExitModal, setShowExitModal] = React.useState(false)
  const [exitModalShown, setExitModalShown] = React.useState(false)
  
  // A/B Testing Framework - only if analytics consent given
  const [abTestVariant, setAbTestVariant] = React.useState<'control' | 'variant-a' | 'variant-b'>('control')
  const [abTestSession] = React.useState(() => 
    canUseAnalytics ? Math.random().toString(36).substring(7) : 'no-consent'
  )
  
  // Heatmap tracking - only if analytics consent given
  const [heatmapData, setHeatmapData] = React.useState<Array<{x: number, y: number, timestamp: number, element: string}>>([])
  const [pageLoadTime] = React.useState(Date.now())
  
  // Data retention: Auto-cleanup old heatmap data (GDPR compliance)
  React.useEffect(() => {
    const cleanup = () => {
      const fifteenMinutesAgo = Date.now() - (15 * 60 * 1000) // 15 minutes
      setHeatmapData(prev => 
        prev.filter(point => (pageLoadTime + point.timestamp) > fifteenMinutesAgo)
      )
    }
    
    // Clean up every minute
    const interval = setInterval(cleanup, 60000)
    return () => clearInterval(interval)
  }, [pageLoadTime])

  // Clear all tracking data when consent is withdrawn
  React.useEffect(() => {
    if (!canUseAnalytics && !consentLoading) {
      setHeatmapData([])
      setAbTestVariant('control')
      // Note: abTestSession is not cleared as it's generated once per page load
    }
  }, [canUseAnalytics, consentLoading])

  // Dynamic pricing calculation based on usage
  const calculatePrice = (basePrice: number, members: number, storage: number) => {
    let price = basePrice
    
    // Additional member costs (above included limits)
    if (members > 5 && basePrice === 29) price += (members - 5) * 5 // Starter: $5/additional user
    if (members > 25 && basePrice === 79) price += (members - 25) * 3 // Professional: $3/additional user
    
    // Additional storage costs (above included limits)
    if (storage > 10 && basePrice === 29) price += Math.ceil((storage - 10) / 10) * 10 // Starter: $10/10GB
    if (storage > 100 && basePrice === 79) price += Math.ceil((storage - 100) / 50) * 15 // Professional: $15/50GB
    
    return price
  }

  const getRecommendedPlan = () => {
    if (teamSize <= 5 && storageNeeds <= 10) return 'starter'
    if (teamSize <= 25 && storageNeeds <= 100) return 'professional'
    return 'enterprise'
  }

  // Detect user intent based on interactions
  React.useEffect(() => {
    if (showCalculator) {
      if (teamSize > 50 || storageNeeds > 200) {
        setUserIntent('enterprise')
      } else if (teamSize > 10 || storageNeeds > 30) {
        setUserIntent('comparing')
      } else {
        setUserIntent('ready')
      }
    }
  }, [teamSize, storageNeeds, showCalculator])

  // Get contextual CTA text based on user intent and plan
  const getContextualCTA = (planId: string) => {
    const baseTexts = {
      starter: 'Start Free Trial',
      professional: 'Start Free Trial', 
      enterprise: 'Contact Sales'
    }

    if (planId === 'enterprise') {
      switch (userIntent) {
        case 'enterprise':
          return 'Schedule Enterprise Demo'
        case 'comparing':
          return 'Discuss Custom Pricing'
        default:
          return 'Contact Sales'
      }
    }

    const recommendedPlan = getRecommendedPlan()
    if (planId === recommendedPlan && showCalculator) {
      switch (userIntent) {
        case 'ready':
          return 'Start My Free Trial'
        case 'comparing':
          return 'Try This Plan Free'
        case 'enterprise':
          return 'Contact Sales Team'
        default:
          return baseTexts[planId as keyof typeof baseTexts]
      }
    }

    if (isYearly && planId !== 'enterprise') {
      return 'Start Annual Trial'
    }

    return baseTexts[planId as keyof typeof baseTexts]
  }

  // Get contextual urgency text
  const getUrgencyText = (planId: string) => {
    if (planId === getRecommendedPlan() && showCalculator) {
      return 'Recommended for your needs'
    }
    if (isYearly && planId !== 'enterprise') {
      return 'Save 20% with annual billing'
    }
    return null
  }

  // Exit-intent detection
  React.useEffect(() => {
    const handleMouseLeave = (e: MouseEvent) => {
      // Only trigger if mouse leaves from the top of the page and modal hasn't been shown
      if (e.clientY <= 0 && !exitModalShown && !showExitModal) {
        setShowExitModal(true)
        setExitModalShown(true)
      }
    }

    // Also trigger on tab visibility change (when user switches tabs)
    const handleVisibilityChange = () => {
      if (document.hidden && !exitModalShown && !showExitModal) {
        setShowExitModal(true)
        setExitModalShown(true)
      }
    }

    document.addEventListener('mouseleave', handleMouseLeave)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [exitModalShown, showExitModal])

  // Auto-trigger exit modal after time spent on page (fallback)
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (!exitModalShown && !showExitModal) {
        setShowExitModal(true)
        setExitModalShown(true)
      }
    }, 45000) // Show after 45 seconds

    return () => clearTimeout(timer)
  }, [exitModalShown, showExitModal])

  // A/B Testing initialization and tracking - only with consent
  React.useEffect(() => {
    if (!canUseAnalytics || consentLoading) return
    
    // Randomly assign user to test variant (33% each)
    const variants: Array<'control' | 'variant-a' | 'variant-b'> = ['control', 'variant-a', 'variant-b']
    const randomVariant = variants[Math.floor(Math.random() * variants.length)]
    setAbTestVariant(randomVariant)

    // Track A/B test assignment using consent-aware tracking
    trackEvent('ab_test_assigned', {
      session: abTestSession,
      variant: randomVariant,
      page: 'pricing'
    }, { requiresAnalytics: true })
  }, [abTestSession, canUseAnalytics, consentLoading, trackEvent])

  // Heatmap tracking setup - only with consent
  React.useEffect(() => {
    if (!canUseAnalytics || consentLoading) return
    
    let scrollDepthPoints = [25, 50, 75, 100]
    let trackedDepths = new Set<number>()

    // Global click tracking
    const handleGlobalClick = (event: MouseEvent) => {
      const target = event.target as Element
      const element = target.closest('[data-heatmap]')?.getAttribute('data-heatmap') || 
                     target.tagName.toLowerCase()
      
      trackHeatmapClick(event, element)
    }

    // Scroll depth tracking
    const handleScroll = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      const scrollPercent = Math.round((scrollTop / docHeight) * 100)

      scrollDepthPoints.forEach(depth => {
        if (scrollPercent >= depth && !trackedDepths.has(depth)) {
          trackedDepths.add(depth)
          trackScrollDepth(depth)
        }
      })
    }

    document.addEventListener('click', handleGlobalClick)
    window.addEventListener('scroll', handleScroll)

    return () => {
      document.removeEventListener('click', handleGlobalClick)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [canUseAnalytics, consentLoading])

  // A/B Test CTA variations
  const getABTestCTA = (planId: string, baseText: string) => {
    const variants = {
      control: baseText,
      'variant-a': planId === 'enterprise' ? 
        'Get Custom Quote' : 
        planId === 'final' ? 
        'Start Your Journey' :
        planId === 'exit-modal' ?
        'Yes, I\'m Interested!' :
        'Start 14-Day Trial',
      'variant-b': planId === 'enterprise' ? 
        'Schedule Consultation' : 
        planId === 'final' ?
        'Begin Free Trial' :
        planId === 'exit-modal' ?
        'Don\'t Miss Out!' :
        'Try Free for 2 Weeks'
    }
    return variants[abTestVariant]
  }

  // Track A/B test interactions - consent-aware
  const trackABTestInteraction = (action: string, planId: string) => {
    if (!canUseAnalytics) return
    
    trackEvent('ab_test_interaction', {
      session: abTestSession,
      variant: abTestVariant,
      action,
      plan: planId,
      page: 'pricing'
    }, { requiresAnalytics: true })
  }

  // Heatmap tracking functions - consent-aware
  const trackHeatmapClick = (event: MouseEvent, element: string) => {
    if (!canUseAnalytics) return
    
    const rect = (event.target as Element)?.getBoundingClientRect?.()
    if (rect) {
      const heatmapPoint = {
        x: event.clientX,
        y: event.clientY,
        timestamp: Date.now() - pageLoadTime,
        element: element
      }
      
      setHeatmapData(prev => [...prev.slice(-99), heatmapPoint]) // Keep last 100 points
      
      // Track using consent-aware system
      trackEvent('heatmap_click', {
        element,
        timestamp: heatmapPoint.timestamp,
        page: 'pricing'
      }, { requiresAnalytics: true })
    }
  }

  const trackScrollDepth = (depth: number) => {
    if (!canUseAnalytics) return
    
    trackEvent('scroll_depth', {
      depth,
      page: 'pricing',
      timestamp: Date.now() - pageLoadTime
    }, { requiresAnalytics: true })
  }

  return (
    <>
      {/* Privacy & Debug Info - Remove in production */}
      <div className="fixed top-4 right-4 bg-slate-800 text-white p-3 rounded-lg text-xs z-50 opacity-80">
        <div>Consent: {canUseAnalytics ? '✅ Analytics' : '❌ No Analytics'}</div>
        {canUseAnalytics && (
          <>
            <div>Session: {abTestSession}</div>
            <div>Variant: {abTestVariant}</div>
            <div>Clicks: {heatmapData.length}</div>
          </>
        )}
        {!canUseAnalytics && (
          <div className="text-yellow-300 text-xs mt-1">
            Accept analytics cookies to enable tracking
            <div className="mt-1">
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('openCookieSettings'))}
                className="text-blue-300 hover:text-blue-200 underline"
              >
                Manage Privacy Settings
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Heatmap visualization - Only with consent */}
      {canUseAnalytics && heatmapData.map((point, index) => (
        <div
          key={index}
          className="fixed pointer-events-none z-40"
          style={{
            left: point.x - 5,
            top: point.y - 5,
            width: 10,
            height: 10,
            background: `rgba(255, 0, 0, ${Math.max(0.1, 1 - (Date.now() - pageLoadTime - point.timestamp) / 10000)})`,
            borderRadius: '50%',
            animation: 'pulse 2s infinite'
          }}
        />
      ))}
      
      <main className="min-h-screen gradient-hero">
        {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-lg border-b border-slate-200 z-50" role="navigation" aria-label="Main navigation">
        <div className="section-container">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-violet-600 rounded-lg flex items-center justify-center" aria-hidden="true">
                <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-heading-xs text-slate-900">SaaS Template</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="/" className="text-slate-600 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md px-2 py-1">Home</a>
              <a href="#features" className="text-slate-600 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md px-2 py-1">Features</a>
              <a href="/pricing" className="text-blue-600 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md px-2 py-1">Pricing</a>
              <Button variant="outline" size="sm">Sign In</Button>
              <Button size="sm">Start Free Trial</Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="section-spacing-lg" aria-labelledby="pricing-heading">
        <div className="section-container">
          <div className="text-center space-y-12">
            <div className="space-y-6">
              <Badge variant="secondary" className="mb-4" role="text">
                <Star className="mr-1.5 h-4 w-4 fill-current" />
                Join 2,500+ growing businesses
              </Badge>
              <h1 id="pricing-heading" className="text-display-xl font-bold text-slate-900 leading-tight">
                Simple, transparent pricing
              </h1>
              <p className="text-body-lg text-slate-600 content-width-lg mx-auto">
                Choose the plan that fits your business. Start free, scale as you grow. 
                No hidden fees, no surprises.
              </p>
            </div>

            {/* Value propositions */}
            <div className="flex flex-wrap justify-center gap-8 mb-12">
              {[
                '14-day free trial',
                'Cancel anytime',
                'No setup fees',
                '24/7 support'
              ].map((item) => (
                <div key={item} className="flex items-center">
                  <Check className="h-5 w-5 text-green-600 mr-2" aria-hidden="true" />
                  <span className="text-slate-700 font-medium">{item}</span>
                </div>
              ))}
            </div>

            {/* Billing toggle - Research shows this increases engagement */}
            <div className="flex items-center justify-center space-x-4">
              <span className={`text-slate-700 ${!isYearly ? 'font-semibold' : ''}`}>Monthly</span>
              <button
                onClick={() => {
                  const newValue = !isYearly
                  setIsYearly(newValue)
                  
                  // Track billing toggle with consent awareness
                  trackEvent('billing_toggle', {
                    from: isYearly ? 'yearly' : 'monthly',
                    to: newValue ? 'yearly' : 'monthly',
                    page: 'pricing'
                  }, { requiresAnalytics: true })
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  isYearly ? 'bg-blue-600' : 'bg-slate-200'
                }`}
                aria-label={`Switch to ${isYearly ? 'monthly' : 'yearly'} billing`}
                data-heatmap="billing-toggle"
              >
                <span 
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isYearly ? 'translate-x-6' : 'translate-x-1'
                  }`} 
                />
              </button>
              <span className={`text-slate-700 ${isYearly ? 'font-semibold' : ''}`}>
                Yearly 
                <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                  Save 20%
                </span>
              </span>
            </div>

            {/* Usage Calculator Toggle */}
            <div className="flex justify-center">
              <button
                onClick={() => {
                  const newValue = !showCalculator
                  setShowCalculator(newValue)
                  
                  // Track calculator toggle with consent awareness
                  trackEvent('calculator_toggle', {
                    action: newValue ? 'show' : 'hide',
                    page: 'pricing'
                  }, { requiresAnalytics: true })
                }}
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
                data-heatmap="usage-calculator-toggle"
              >
                <Calculator className="h-4 w-4" />
                <span>{showCalculator ? 'Hide' : 'Show'} Usage Calculator</span>
              </button>
            </div>

            {/* Dynamic Usage Calculator */}
            {showCalculator && (
              <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 max-w-2xl mx-auto">
                <div className="text-center mb-6">
                  <h3 className="text-heading-xs font-semibold text-slate-900 mb-2">Calculate Your Custom Price</h3>
                  <p className="text-body-md text-slate-600">Adjust the sliders to see pricing for your specific needs</p>
                </div>
                
                <div className="space-y-8">
                  {/* Team Size Slider */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <label className="text-body-sm font-medium text-slate-700">Team Size</label>
                      <span className="text-body-sm font-semibold text-blue-600">{teamSize} members</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={teamSize}
                      onChange={(e) => {
                        const newValue = parseInt(e.target.value)
                        setTeamSize(newValue)
                        
                        // Track team size changes with consent awareness
                        trackEvent('team_size_change', {
                          value: newValue,
                          page: 'pricing'
                        }, { requiresAnalytics: true })
                      }}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                      <span>1</span>
                      <span>100+</span>
                    </div>
                  </div>

                  {/* Storage Needs Slider */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <label className="text-sm font-medium text-slate-700">Storage Needs</label>
                      <span className="text-sm font-semibold text-blue-600">{storageNeeds} GB</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="500"
                      value={storageNeeds}
                      onChange={(e) => {
                        const newValue = parseInt(e.target.value)
                        setStorageNeeds(newValue)
                        
                        // Track storage changes with consent awareness
                        trackEvent('storage_needs_change', {
                          value: newValue,
                          page: 'pricing'
                        }, { requiresAnalytics: true })
                      }}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                      <span>1 GB</span>
                      <span>500+ GB</span>
                    </div>
                  </div>

                  {/* Recommended Plan */}
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <div className="text-sm text-blue-600 font-medium mb-1">Recommended Plan</div>
                    <div className="text-lg font-bold text-blue-900 capitalize">{getRecommendedPlan()}</div>
                    {getRecommendedPlan() !== 'enterprise' && (
                      <div className="text-2xl font-bold text-slate-900 mt-2">
                        ${calculatePrice(
                          getRecommendedPlan() === 'starter' ? 29 : 79,
                          teamSize,
                          storageNeeds
                        )}/month
                      </div>
                    )}
                    {getRecommendedPlan() === 'enterprise' && (
                      <div className="text-lg text-slate-600 mt-2">Custom Pricing</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Trust Signals */}
      <section className="section-spacing-md bg-white border-t border-slate-100">
        <div className="section-container">
          <div className="flex-mobile-col grid grid-cols-2 gap-mobile md:grid-cols-4 section-spacing-sm">
            {trustSignals.map((signal) => (
              <div
                key={signal.description}
                className="text-center"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-blue-100 mb-4" aria-hidden="true">
                  <signal.icon className="w-6 h-6 text-blue-600" />
                </div>
                <div className="text-heading-sm text-slate-900 mb-1">
                  {signal.stat}
                </div>
                <div className="text-body-sm text-slate-600">
                  {signal.description}
                </div>
              </div>
            ))}
          </div>
          
          {/* Security badges - Research shows crucial for B2B pricing pages */}
          <div className="flex flex-wrap justify-center items-center gap-mobile pt-8 border-t border-slate-100">
            <div className="flex items-center space-x-2 bg-slate-50 rounded-lg px-4 py-2">
              <Shield className="h-4 w-4 text-green-600" />
              <span className="text-body-sm font-medium text-slate-700">SOC 2 Type II</span>
            </div>
            <div className="flex items-center space-x-2 bg-slate-50 rounded-lg px-4 py-2">
              <Shield className="h-4 w-4 text-blue-600" />
              <span className="text-body-sm font-medium text-slate-700">GDPR Compliant</span>
            </div>
            <div className="flex items-center space-x-2 bg-slate-50 rounded-lg px-4 py-2">
              <Shield className="h-4 w-4 text-purple-600" />
              <span className="text-body-sm font-medium text-slate-700">ISO 27001</span>
            </div>
            <div className="flex items-center space-x-2 bg-slate-50 rounded-lg px-4 py-2">
              <Shield className="h-4 w-4 text-orange-600" />
              <span className="text-body-sm font-medium text-slate-700">PCI DSS Level 1</span>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Tiers */}
      <section className="section-spacing-lg bg-slate-50" aria-labelledby="pricing-tiers-heading">
        <div className="section-container">
          <h2 
            id="pricing-tiers-heading"
            className="text-heading-lg font-bold text-center text-slate-900 section-spacing-sm"
          >
            Choose your plan
          </h2>
          
          <div className="grid grid-cols-1 gap-mobile lg:grid-cols-3">
            {pricingTiers.map((tier) => (
              <div
                key={tier.id}
                className={`relative rounded-2xl bg-white p-8 shadow-lg ring-1 ring-slate-900/10 ${
                  tier.popular 
                    ? 'ring-2 ring-blue-600 scale-105 shadow-2xl' 
                    : 'hover:ring-slate-300'
                } transition-all duration-300`}
              >
                {/* Savings badge for annual plans */}
                {isYearly && tier.id !== 'enterprise' && (
                  <div className={`absolute -top-4 z-10 ${tier.popular ? 'left-4' : 'left-1/2 transform -translate-x-1/2'}`}>
                    <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg">
                      <div className="flex items-center space-x-1">
                        <Award className="h-3 w-3" />
                        <span>Save 20%</span>
                      </div>
                    </div>
                  </div>
                )}
                {tier.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-20">
                    <Badge className="bg-blue-600 text-white px-4 py-1">
                      <Star className="w-3 h-3 mr-1 fill-current" />
                      Most Popular
                    </Badge>
                  </div>
                )}

                <div className="text-center">
                  <h3 className="text-heading-xs font-semibold text-slate-900 mb-2">
                    {tier.name}
                  </h3>
                  <p className="text-body-md text-slate-600 mb-6">{tier.description}</p>
                  
                  <div className="mb-8">
                    <span className="text-display-md font-bold text-slate-900">
                      ${isYearly ? tier.yearlyPrice : tier.price}
                    </span>
                    <span className="text-body-md text-slate-600 ml-2">/month</span>
                    {isYearly && tier.id !== 'enterprise' && (
                      <div className="flex items-center mt-2">
                        <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
                          <div className="flex items-center space-x-1">
                            <Award className="h-4 w-4 text-green-600" />
                            <span className="text-body-sm font-semibold text-green-700">
                              Save ${(tier.price - tier.yearlyPrice) * 12}/year
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 mb-8">
                    {getUrgencyText(tier.id) && (
                      <div className="text-center">
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-caption font-medium text-blue-700 border border-blue-200">
                          {getUrgencyText(tier.id)}
                        </span>
                      </div>
                    )}
                    <Button 
                      size="lg" 
                      variant={tier.ctaVariant}
                      className={`w-full transition-all duration-200 ${
                        tier.id === getRecommendedPlan() && showCalculator 
                          ? 'ring-2 ring-blue-500 ring-offset-2 shadow-lg scale-105' 
                          : ''
                      } ${abTestVariant === 'variant-b' ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700' : ''}`}
                      aria-label={`${getABTestCTA(tier.id, getContextualCTA(tier.id))} for ${tier.name} plan`}
                      data-heatmap={`pricing-cta-${tier.id}`}
                      onClick={() => {
                        trackABTestInteraction('cta_click', tier.id)
                        // Analytics tracking disabled temporarily
                      }}
                    >
                      {getABTestCTA(tier.id, getContextualCTA(tier.id))}
                      {tier.id !== 'enterprise' && <ArrowRight className="ml-2 h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <ul className="space-y-3" role="list">
                  {tier.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center">
                      {feature.included ? (
                        <Check className="h-5 w-5 text-green-600 mr-3 flex-shrink-0" aria-hidden="true" />
                      ) : (
                        <X className="h-5 w-5 text-slate-400 mr-3 flex-shrink-0" aria-hidden="true" />
                      )}
                      <span 
                        className={feature.included ? 'text-body-md text-slate-700' : 'text-body-md text-slate-400'}
                      >
                        {feature.name}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Enterprise contact section */}
          <div className="mt-16 text-center">
            <div className={`rounded-2xl p-8 max-w-2xl mx-auto transition-all duration-300 ${
              userIntent === 'enterprise' 
                ? 'bg-gradient-to-r from-blue-50 to-violet-50 ring-2 ring-blue-200' 
                : 'bg-blue-50'
            }`}>
              <h3 className="text-heading-md font-bold text-slate-900 mb-4">
                {userIntent === 'enterprise' ? 'Perfect! Let\'s discuss your enterprise needs' :
                 userIntent === 'comparing' ? 'Need help choosing the right plan?' :
                 'Need something custom?'}
              </h3>
              <p className="text-body-lg text-slate-600 mb-6">
                {userIntent === 'enterprise' ? 
                  'Your team size and storage needs indicate you\'ll benefit from our enterprise solutions with dedicated support, custom integrations, and volume pricing.' :
                 userIntent === 'comparing' ? 
                  'Our experts can help you find the perfect plan for your specific requirements and walk you through all features.' :
                  'We offer custom enterprise solutions with dedicated support, custom integrations, and volume discounts.'}
              </p>
              <Button 
                size="lg" 
                variant={userIntent === 'enterprise' ? 'default' : 'outline'}
                className={userIntent === 'enterprise' ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
                onClick={() => {
                  // Analytics tracking disabled temporarily
                }}
              >
                {userIntent === 'enterprise' ? 'Get Enterprise Pricing' :
                 userIntent === 'comparing' ? 'Schedule Plan Consultation' :
                 'Schedule a Demo'}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="section-spacing-lg bg-white" aria-labelledby="faq-heading">
        <div className="section-container-narrow">
          <div
            className="text-center mb-16"
          >
            <h2 id="faq-heading" className="text-heading-lg font-bold text-slate-900 mb-4">
              Frequently asked questions
            </h2>
            <p className="text-body-xl text-slate-600">
              Have a different question? Contact our support team.
            </p>
          </div>

          <div
            className="space-y-4"
          >
            {faqs.map((faq) => (
              <details
                key={faq.question}
                className="border border-slate-200 rounded-lg px-6 py-4 group"
                onToggle={(e) => {
                  // Analytics tracking disabled temporarily
                }}
              >
                <summary className="text-left text-body-md font-medium text-slate-900 cursor-pointer hover:text-blue-600 transition-colors touch-target">
                  {faq.question}
                </summary>
                <div className="mt-3 text-body-md text-slate-600 leading-relaxed">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="section-spacing-md bg-gradient-to-r from-blue-600 to-violet-600">
        <div className="section-container-narrow text-center">
          <div 
            className="space-y-8"
          >
            <div className="space-y-4">
              <h2 className="text-display-sm font-bold text-white">
                {userIntent === 'enterprise' ? 'Ready for enterprise scale?' : 
                 userIntent === 'comparing' ? 'Found the right plan?' :
                 userIntent === 'ready' ? 'Ready to get started?' :
                 'Ready to get started?'}
              </h2>
              <p className="text-body-xl text-blue-100">
                {userIntent === 'enterprise' ? 'Get a custom solution tailored to your organization\'s needs.' :
                 userIntent === 'comparing' ? 'Start your free trial and see the difference for yourself.' :
                 userIntent === 'ready' ? 'Join thousands of businesses already using our platform to grow faster.' :
                 'Join thousands of businesses already using our platform to grow faster.'}
              </p>
            </div>

            <div className="flex-mobile-col items-center justify-center gap-mobile">
              <Button 
                size="lg" 
                variant="secondary" 
                className={`text-body-lg px-8 py-6 h-auto touch-target ${
                  abTestVariant === 'variant-a' ? 'animate-pulse' : ''
                }`}
                data-heatmap="final-cta-primary"
                onClick={() => {
                  const ctaText = userIntent === 'enterprise' ? 'Contact Sales Team' :
                    userIntent === 'ready' && showCalculator ? `Start ${getRecommendedPlan()} Trial` :
                    'Start Free Trial'
                  trackABTestInteraction('final_cta_click', 'main')
                  // Analytics tracking disabled temporarily
                }}
              >
                {getABTestCTA('final', userIntent === 'enterprise' ? 'Contact Sales Team' :
                 userIntent === 'ready' && showCalculator ? `Start ${getRecommendedPlan()} Trial` :
                 'Start Free Trial')}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="text-body-lg px-8 py-6 h-auto touch-target border-white text-white hover:bg-white hover:text-blue-600"
                onClick={() => {
                  // Analytics tracking disabled temporarily
                }}
              >
                {userIntent === 'enterprise' ? 'Book Enterprise Demo' :
                 userIntent === 'comparing' ? 'Schedule Demo Call' :
                 'Schedule Demo'}
              </Button>
            </div>
            
            {/* Contextual urgency message */}
            {showCalculator && (
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 max-w-md mx-auto">
                <p className="text-body-sm text-blue-100">
                  {userIntent === 'enterprise' ? 
                    'Custom pricing available for teams over 50 members' :
                    userIntent === 'comparing' ? 
                    `Based on your usage, ${getRecommendedPlan()} plan is recommended` :
                    `Perfect for ${teamSize} team members with ${storageNeeds}GB storage`
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>

    {/* Exit-Intent Modal */}
    {showExitModal && (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-auto transform transition-all duration-300 scale-100">
          <div className="relative p-8">
            {/* Close button */}
            <button
              onClick={() => setShowExitModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Close modal"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Modal content based on user intent */}
            <div className="space-y-6">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-violet-500 rounded-full flex items-center justify-center mx-auto">
                  {userIntent === 'enterprise' ? (
                    <Shield className="h-8 w-8 text-white" />
                  ) : (
                    <Gift className="h-8 w-8 text-white" />
                  )}
                </div>
                
                <h3 className="text-heading-md font-bold text-slate-900">
                  {userIntent === 'enterprise' ? 'Wait! Let\'s discuss your enterprise needs' :
                   userIntent === 'comparing' ? 'Before you go...' :
                   'Don\'t miss out on your free trial!'}
                </h3>
                
                <p className="text-body-md text-slate-600">
                  {userIntent === 'enterprise' ? 
                    `With ${teamSize} team members, you qualify for custom enterprise pricing and dedicated support.` :
                   userIntent === 'comparing' ? 
                    'Get a personalized demo to see exactly how our platform fits your needs.' :
                   'Start your 14-day free trial today and see why thousands of teams choose our platform.'}
                </p>
              </div>

              {/* Special offer based on intent */}
              <div className="bg-gradient-to-r from-blue-50 to-violet-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center space-x-3">
                  <Clock className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  <div>
                    <p className="text-body-md font-semibold text-blue-900">
                      {userIntent === 'enterprise' ? 'Enterprise Consultation' :
                       userIntent === 'comparing' ? 'Free Personalized Demo' :
                       'Limited Time: Extended Trial'}
                    </p>
                    <p className="text-body-sm text-blue-700">
                      {userIntent === 'enterprise' ? 
                        'Schedule a 30-minute call to discuss custom pricing' :
                       userIntent === 'comparing' ? 
                        'Get a tailored demo based on your specific requirements' :
                       'Get 21 days free instead of 14 - expires in 24 hours'}
                    </p>
                  </div>
                </div>
              </div>

              {/* CTA buttons */}
              <div className="space-y-3">
                <Button
                  size="lg"
                  className="w-full bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700"
                  data-heatmap="exit-modal-primary-cta"
                  onClick={() => {
                    const baseText = userIntent === 'enterprise' ? 'Schedule Enterprise Call' :
                      userIntent === 'comparing' ? 'Book Free Demo' :
                      'Claim Extended Trial'
                    trackABTestInteraction('exit_modal_primary_click', 'exit-modal')
                    setShowExitModal(false)
                    // Analytics tracking disabled temporarily
                  }}
                >
                  {getABTestCTA('exit-modal', userIntent === 'enterprise' ? 'Schedule Enterprise Call' :
                   userIntent === 'comparing' ? 'Book Free Demo' :
                   'Claim Extended Trial')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full"
                  onClick={() => setShowExitModal(false)}
                >
                  {userIntent === 'enterprise' ? 'Maybe Later' :
                   'Continue Browsing'}
                </Button>
              </div>

              {/* Trust signals */}
              <div className="text-center">
                <p className="text-caption text-slate-500">
                  {userIntent === 'enterprise' ? 
                    'Join 500+ enterprise customers who trust our platform' :
                   'Join 10,000+ teams already using our platform'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
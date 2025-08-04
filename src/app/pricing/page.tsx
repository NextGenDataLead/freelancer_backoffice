"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { ArrowRight, Check, Star, Users, Shield, Award, Clock, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { pricingAnalytics, configureWebVitals } from "@/lib/analytics"
import { pricingPageVariantFlag, ctaButtonTextFlag, pricingDisplayFlag } from "@/lib/flags"
import { WebVitals } from "@/components/web-vitals"

export const metadata = {
  title: 'Pricing - SaaS Template | Transparent, Scalable Plans',
  description: 'Choose the perfect plan for your business. Start with our free trial and scale as you grow. No hidden fees, cancel anytime.',
}

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.6 } }
}

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
}

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
  const [isYearly, setIsYearly] = React.useState(false)
  const [variant, setVariant] = React.useState<string>('control')
  const [ctaText, setCTAText] = React.useState<string>('Start Free Trial')
  const [pricingDisplay, setPricingDisplay] = React.useState<string>('monthly-first')

  // Initialize A/B testing flags and analytics
  React.useEffect(() => {
    const initializeExperiments = async () => {
      try {
        // Get A/B test variants
        const variantResult = await pricingPageVariantFlag()
        const ctaResult = await ctaButtonTextFlag()
        const displayResult = await pricingDisplayFlag()
        
        setVariant(variantResult)
        setCTAText(ctaResult)
        setPricingDisplay(displayResult)
        
        // Set initial yearly state based on display flag
        if (displayResult === 'yearly-first') {
          setIsYearly(true)
        }
        
        // Track page view with variant
        pricingAnalytics.trackPageView(variantResult)
      } catch (error) {
        console.warn('Failed to initialize experiments:', error)
      }
    }

    // Configure Web Vitals tracking
    const reportWebVitals = configureWebVitals()
    if (reportWebVitals && typeof window !== 'undefined') {
      // Web Vitals will be automatically tracked
    }

    initializeExperiments()
  }, [])

  return (
    <>
      <WebVitals />
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-lg border-b border-slate-200 z-50" role="navigation" aria-label="Main navigation">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-violet-600 rounded-lg flex items-center justify-center" aria-hidden="true">
                <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-xl font-bold text-slate-900">SaaS Template</span>
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
      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8" aria-labelledby="pricing-heading">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            className="text-center space-y-12"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            <motion.div variants={fadeInUp} className="space-y-6">
              <Badge variant="secondary" className="mb-4" role="text">
                <Star className="mr-1.5 h-4 w-4 fill-current" />
                Join 2,500+ growing businesses
              </Badge>
              <h1 id="pricing-heading" className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight">
                Simple, transparent pricing
              </h1>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
                Choose the plan that fits your business. Start free, scale as you grow. 
                No hidden fees, no surprises.
              </p>
            </motion.div>

            {/* Value propositions */}
            <motion.div variants={fadeInUp} className="flex flex-wrap justify-center gap-8 mb-12">
              {[
                '14-day free trial',
                'Cancel anytime',
                'No setup fees',
                '24/7 support'
              ].map((item, index) => (
                <div key={item} className="flex items-center">
                  <Check className="h-5 w-5 text-green-600 mr-2" aria-hidden="true" />
                  <span className="text-slate-700 font-medium">{item}</span>
                </div>
              ))}
            </motion.div>

            {/* Billing toggle - Research shows this increases engagement */}
            <motion.div variants={fadeInUp} className="flex items-center justify-center space-x-4">
              <span className={`text-slate-700 ${!isYearly ? 'font-semibold' : ''}`}>Monthly</span>
              <button
                onClick={() => {
                  const newBilling = !isYearly
                  setIsYearly(newBilling)
                  pricingAnalytics.trackBillingToggle(newBilling ? 'yearly' : 'monthly', variant)
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  isYearly ? 'bg-blue-600' : 'bg-slate-200'
                }`}
                aria-label={`Switch to ${isYearly ? 'monthly' : 'yearly'} billing`}
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
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Trust Signals */}
      <section className="py-12 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4 mb-12">
            {trustSignals.map((signal, index) => (
              <motion.div
                key={signal.description}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-blue-100 mb-4" aria-hidden="true">
                  <signal.icon className="w-6 h-6 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-slate-900 mb-1">
                  {signal.stat}
                </div>
                <div className="text-slate-600 text-sm">
                  {signal.description}
                </div>
              </motion.div>
            ))}
          </div>
          
          {/* Security badges - Research shows crucial for B2B pricing pages */}
          <motion.div 
            className="flex flex-wrap justify-center items-center gap-4 pt-8 border-t border-slate-100"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center space-x-2 bg-slate-50 rounded-lg px-4 py-2">
              <Shield className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-slate-700">SOC 2 Type II</span>
            </div>
            <div className="flex items-center space-x-2 bg-slate-50 rounded-lg px-4 py-2">
              <Shield className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-slate-700">GDPR Compliant</span>
            </div>
            <div className="flex items-center space-x-2 bg-slate-50 rounded-lg px-4 py-2">
              <Shield className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-slate-700">ISO 27001</span>
            </div>
            <div className="flex items-center space-x-2 bg-slate-50 rounded-lg px-4 py-2">
              <Shield className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-slate-700">PCI DSS Level 1</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pricing Tiers */}
      <section className="py-24 bg-slate-50" aria-labelledby="pricing-tiers-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.h2 
            id="pricing-tiers-heading"
            className="text-3xl font-bold text-center text-slate-900 mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Choose your plan
          </motion.h2>
          
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {pricingTiers.map((tier, index) => (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className={`relative rounded-2xl bg-white p-8 shadow-lg ring-1 ring-slate-900/10 ${
                  tier.popular 
                    ? 'ring-2 ring-blue-600 scale-105 shadow-2xl' 
                    : 'hover:ring-slate-300'
                } transition-all duration-300`}
              >
                {tier.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-blue-600 text-white px-4 py-1">
                      <Star className="w-3 h-3 mr-1 fill-current" />
                      Most Popular
                    </Badge>
                  </div>
                )}

                <div className="text-center">
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">
                    {tier.name}
                  </h3>
                  <p className="text-slate-600 mb-6">{tier.description}</p>
                  
                  <div className="mb-8">
                    <span className="text-4xl font-bold text-slate-900">
                      ${isYearly ? tier.yearlyPrice : tier.price}
                    </span>
                    <span className="text-slate-600 ml-2">/month</span>
                    {isYearly && tier.id !== 'enterprise' && (
                      <div className="text-sm text-green-600 mt-1 font-medium">
                        Save ${(tier.price - tier.yearlyPrice) * 12}/year
                      </div>
                    )}
                  </div>

                  <Button 
                    size="lg" 
                    variant={tier.ctaVariant}
                    className="w-full mb-8"
                    aria-label={`${tier.cta} for ${tier.name} plan`}
                    onClick={() => {
                      pricingAnalytics.trackTierClick(tier.id, variant)
                      if (tier.id === 'enterprise') {
                        pricingAnalytics.trackContactSales(variant)
                      } else {
                        pricingAnalytics.trackCTAClick(ctaText, tier.id, variant)
                      }
                    }}
                  >
                    {tier.id === 'enterprise' ? tier.cta : ctaText}
                    {tier.id !== 'enterprise' && <ArrowRight className="ml-2 h-4 w-4" />}
                  </Button>
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
                        className={feature.included ? 'text-slate-700' : 'text-slate-400'}
                      >
                        {feature.name}
                      </span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>

          {/* Enterprise contact section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            viewport={{ once: true }}
            className="mt-16 text-center"
          >
            <div className="bg-blue-50 rounded-2xl p-8 max-w-2xl mx-auto">
              <h3 className="text-2xl font-bold text-slate-900 mb-4">
                Need something custom?
              </h3>
              <p className="text-slate-600 mb-6">
                We offer custom enterprise solutions with dedicated support, 
                custom integrations, and volume discounts.
              </p>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => {
                  pricingAnalytics.trackContactSales(variant)
                }}
              >
                Schedule a Demo
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 bg-white" aria-labelledby="faq-heading">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 id="faq-heading" className="text-3xl font-bold text-slate-900 mb-4">
              Frequently asked questions
            </h2>
            <p className="text-xl text-slate-600">
              Have a different question? Contact our support team.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            {faqs.map((faq, index) => (
              <details
                key={index}
                className="border border-slate-200 rounded-lg px-6 py-4 group"
                onToggle={(e) => {
                  if ((e.target as HTMLDetailsElement).open) {
                    pricingAnalytics.trackFAQClick(faq.question, variant)
                  }
                }}
              >
                <summary className="text-left font-medium text-slate-900 cursor-pointer hover:text-blue-600 transition-colors">
                  {faq.question}
                </summary>
                <div className="mt-3 text-slate-600 leading-relaxed">
                  {faq.answer}
                </div>
              </details>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-violet-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="space-y-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="space-y-4">
              <h2 className="text-4xl font-bold text-white">
                Ready to get started?
              </h2>
              <p className="text-xl text-blue-100">
                Join thousands of businesses already using our platform to grow faster.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                size="lg" 
                variant="secondary" 
                className="text-lg px-8 py-6 h-auto"
                onClick={() => {
                  pricingAnalytics.trackCTAClick(ctaText, 'footer', variant)
                }}
              >
                {ctaText}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="text-lg px-8 py-6 h-auto border-white text-white hover:bg-white hover:text-blue-600"
                onClick={() => {
                  pricingAnalytics.trackContactSales(variant)
                }}
              >
                Schedule Demo
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </main>
    </>
  )
}
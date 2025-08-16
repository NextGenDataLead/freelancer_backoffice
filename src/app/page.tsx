"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowRight, Check, Star, Zap, Shield, BarChart3, Users, Clock, CheckCircle, Award, ChevronDown, Play, Quote, Menu, X, Download, FileText, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SignInButton, SignUpButton } from '@clerk/nextjs'
import { CriticalCSS } from "@/components/performance/CriticalCSS"
import { SearchInput } from "@/components/ui/search"
import { PerformanceTracker } from "@/components/analytics/PerformanceTracker"
import { OptimizedImage } from "@/components/ui/optimized-image"
import { ConversionTracker } from "@/components/analytics/ConversionTracker"
import { AnalyticsTest } from "@/components/analytics/AnalyticsTest"
import { DashboardPreview } from "@/components/interactive/dashboard-preview"
import { SplitScreenDemo } from "@/components/interactive/split-screen-demo"
import { ScrollAnimations } from "@/components/interactive/scroll-animations"
import { ProductTour } from "@/components/interactive/product-tour"
import { MicroInteractions } from "@/components/interactive/micro-interactions"
import { LazyLoadingDemo } from "@/components/performance/lazy-loading"
import { SocialSharing } from "@/components/conversion/social-sharing"
import { EmailCapture } from "@/components/conversion/email-capture"

export default function Home() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)

  return (
    <main className="min-h-screen gradient-hero">
      <CriticalCSS />
      <PerformanceTracker />
      <ConversionTracker />
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-lg border-b border-slate-200 z-50 transition-all duration-200" role="navigation" aria-label="Main navigation">
        <div className="section-container">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-violet-600 rounded-lg flex items-center justify-center" aria-hidden="true">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <span className="text-heading-xs text-slate-900">SaaS Template</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <div className="relative group">
                <button className="flex items-center text-slate-600 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md px-2 py-1 transition-colors">
                  Solutions <ChevronDown className="ml-1 h-4 w-4 group-hover:rotate-180 transition-transform duration-200" />
                </button>
                <div className="absolute top-full left-0 w-80 bg-white shadow-xl rounded-lg border mt-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="p-6">
                    <div className="mb-4">
                      <h3 className="font-semibold text-slate-900 mb-2">By Use Case</h3>
                      <div className="space-y-2">
                        <a href="#features" className="flex items-center p-2 rounded hover:bg-slate-50 transition-colors">
                          <Users className="h-4 w-4 text-blue-600 mr-3" />
                          <div>
                            <div className="font-medium text-slate-900">Multi-Tenant SaaS</div>
                            <div className="text-sm text-slate-500">Organization management & RLS</div>
                          </div>
                        </a>
                        <a href="#features" className="flex items-center p-2 rounded hover:bg-slate-50 transition-colors">
                          <Shield className="h-4 w-4 text-green-600 mr-3" />
                          <div>
                            <div className="font-medium text-slate-900">Enterprise Platform</div>
                            <div className="text-sm text-slate-500">Security & compliance ready</div>
                          </div>
                        </a>
                        <a href="#features" className="flex items-center p-2 rounded hover:bg-slate-50 transition-colors">
                          <Zap className="h-4 w-4 text-violet-600 mr-3" />
                          <div>
                            <div className="font-medium text-slate-900">API-First Solution</div>
                            <div className="text-sm text-slate-500">Developer-focused architecture</div>
                          </div>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="relative group">
                <button className="flex items-center text-slate-600 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md px-2 py-1 transition-colors">
                  Industries <ChevronDown className="ml-1 h-4 w-4 group-hover:rotate-180 transition-transform duration-200" />
                </button>
                <div className="absolute top-full left-0 w-72 bg-white shadow-xl rounded-lg border mt-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="p-4 space-y-2">
                    <a href="#" className="block p-2 rounded hover:bg-slate-50 transition-colors">
                      <div className="font-medium text-slate-900">Fintech & Banking</div>
                      <div className="text-sm text-slate-500">Payment processing & compliance</div>
                    </a>
                    <a href="#" className="block p-2 rounded hover:bg-slate-50 transition-colors">
                      <div className="font-medium text-slate-900">Healthcare & Life Sciences</div>
                      <div className="text-sm text-slate-500">HIPAA-compliant solutions</div>
                    </a>
                    <a href="#" className="block p-2 rounded hover:bg-slate-50 transition-colors">
                      <div className="font-medium text-slate-900">E-commerce & Retail</div>
                      <div className="text-sm text-slate-500">Customer management platforms</div>
                    </a>
                    <a href="#" className="block p-2 rounded hover:bg-slate-50 transition-colors">
                      <div className="font-medium text-slate-900">Education & EdTech</div>
                      <div className="text-sm text-slate-500">Learning management systems</div>
                    </a>
                  </div>
                </div>
              </div>

              <div className="relative group">
                <button className="flex items-center text-slate-600 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md px-2 py-1 transition-colors">
                  Resources <ChevronDown className="ml-1 h-4 w-4 group-hover:rotate-180 transition-transform duration-200" />
                </button>
                <div className="absolute top-full left-0 w-64 bg-white shadow-xl rounded-lg border mt-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="p-4 space-y-2">
                    <a href="#" className="block p-2 rounded hover:bg-slate-50 transition-colors font-medium text-slate-900">Documentation</a>
                    <a href="#" className="block p-2 rounded hover:bg-slate-50 transition-colors font-medium text-slate-900">API Reference</a>
                    <a href="#" className="block p-2 rounded hover:bg-slate-50 transition-colors font-medium text-slate-900">Code Examples</a>
                    <a href="#" className="block p-2 rounded hover:bg-slate-50 transition-colors font-medium text-slate-900">Case Studies</a>
                    <a href="#" className="block p-2 rounded hover:bg-slate-50 transition-colors font-medium text-slate-900">Blog</a>
                    <a href="#" className="block p-2 rounded hover:bg-slate-50 transition-colors font-medium text-slate-900">Community</a>
                  </div>
                </div>
              </div>

              <Link href="/pricing" className="text-slate-600 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md px-2 py-1 transition-colors" aria-label="Navigate to pricing section">Pricing</Link>
              
              <div className="hidden lg:block">
                <SearchInput placeholder="Search..." className="w-64" />
              </div>
              
              <SignInButton>
                <Button variant="outline" size="sm" className="hover:scale-105 transition-transform duration-200" aria-label="Sign in to your account">Sign In</Button>
              </SignInButton>
              <SignUpButton>
                <Button size="sm" className="hover:scale-105 transition-transform duration-200" aria-label="Start your free 14-day trial">Start Free Trial</Button>
              </SignUpButton>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Toggle mobile menu"
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          <div className={`md:hidden transition-all duration-200 ${isMobileMenuOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
            <div className="px-2 pt-2 pb-3 space-y-1 bg-white border-t border-slate-200">
              <div className="space-y-3 py-4">
                <div>
                  <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Solutions</p>
                  <div className="space-y-1 mt-2">
                    <a href="#features" className="block px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-md">Multi-Tenant SaaS</a>
                    <a href="#features" className="block px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-md">Enterprise Platform</a>
                    <a href="#features" className="block px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-md">API-First Solution</a>
                  </div>
                </div>
                
                <div>
                  <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Industries</p>
                  <div className="space-y-1 mt-2">
                    <a href="#" className="block px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-md">Fintech & Banking</a>
                    <a href="#" className="block px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-md">Healthcare</a>
                    <a href="#" className="block px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-md">E-commerce</a>
                  </div>
                </div>

                <div className="space-y-1">
                  <Link href="/pricing" className="block px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-md">Pricing</Link>
                  <a href="#" className="block px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-md">Documentation</a>
                  <a href="#" className="block px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-md">API Reference</a>
                </div>

                <div className="px-3 py-2">
                  <SearchInput placeholder="Search docs..." className="w-full" />
                </div>

                <div className="pt-4 space-y-2">
                  <SignInButton>
                    <Button variant="outline" className="w-full">Sign In</Button>
                  </SignInButton>
                  <SignUpButton>
                    <Button className="w-full">Start Free Trial</Button>
                  </SignUpButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="section-spacing-lg" aria-labelledby="hero-heading">
        <div className="section-container">
          <div className="text-center space-y-8">
            <div className="space-y-4">
              <Badge variant="secondary" className="mb-4" role="text">
                🚀 Launch your SaaS 10x faster
              </Badge>
              <h1 id="hero-heading" className="text-display-xl font-bold text-slate-900 leading-tight">
                Ship Your B2B SaaS
                <br />
                <span className="text-transparent bg-clip-text gradient-primary">
                  10x Faster
                </span>
              </h1>
              <p className="text-body-lg text-slate-600 content-width-lg mx-auto">
                From idea to revenue in days. Production-ready template with enterprise security, 
                multi-tenancy, and real-time features. <span className="font-semibold text-slate-900">Save 200+ hours</span> of development time.
              </p>
            </div>

            <div className="flex-mobile-col items-center justify-center gap-mobile">
              <SignUpButton>
                <Button size="lg" className="text-lg px-8 py-6 h-auto group shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 touch-target" aria-label="Start your 14-day free trial now">
                  Start Building Today
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-200" aria-hidden="true" />
                </Button>
              </SignUpButton>
              <Button 
                variant="outline" 
                size="lg" 
                className="text-lg px-8 py-6 h-auto group hover:bg-slate-50 hover:border-slate-300 transition-all duration-200" 
                aria-label="View live demo of the SaaS template"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('demo-auth', 'true')
                    window.location.href = '/dashboard'
                  }
                }}
              >
                <Play className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
                Live Demo
              </Button>
            </div>

            <div className="flex items-center justify-center space-x-6 text-sm text-slate-500" role="list" aria-label="Trial benefits">
              <div className="flex items-center space-x-1" role="listitem">
                <CheckCircle className="h-4 w-4 text-green-500" aria-hidden="true" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center space-x-1" role="listitem">
                <CheckCircle className="h-4 w-4 text-green-500" aria-hidden="true" />
                <span>14-day free trial</span>
              </div>
              <div className="flex items-center space-x-1" role="listitem">
                <CheckCircle className="h-4 w-4 text-green-500" aria-hidden="true" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Dashboard Preview */}
      <section className="section-spacing-md bg-slate-50">
        <div className="section-container">
          <div className="text-center space-y-12">
            <div className="space-y-4">
              <Badge variant="secondary" role="text">🚀 Interactive Dashboard</Badge>
              <h2 className="text-heading-xl text-slate-900">
                Experience Real-Time Analytics
              </h2>
              <p className="text-body-lg text-slate-600 content-width-lg mx-auto">
                See how our template delivers professional dashboards with live data updates, interactive charts, and enterprise-grade features.
              </p>
            </div>
            
            <DashboardPreview />

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
              <ProductTour />
              <Button 
                variant="outline"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('demo-auth', 'true')
                    window.location.href = '/dashboard'
                  }
                }}
              >
                <Play className="mr-2 h-4 w-4" />
                Try Live Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof & Testimonials */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-12">
            <div>
              <p className="text-slate-500 text-lg mb-8">Trusted by 2,500+ companies worldwide</p>
              {/* Enterprise Customer Logo Carousel */}
              <div className="relative overflow-hidden mb-12">
                <div className="flex animate-scroll space-x-12 items-center">
                  {[
                    { name: "Microsoft", logo: "https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg" },
                    { name: "Salesforce", logo: "https://upload.wikimedia.org/wikipedia/commons/f/f9/Salesforce.com_logo.svg" },
                    { name: "Slack", logo: "https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg" },
                    { name: "Zoom", logo: "https://upload.wikimedia.org/wikipedia/commons/7/7b/Zoom_Communications_Logo.svg" },
                    { name: "Shopify", logo: "https://upload.wikimedia.org/wikipedia/commons/0/0e/Shopify_logo_2018.svg" },
                    { name: "Stripe", logo: "https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg" },
                    { name: "Atlassian", logo: "https://upload.wikimedia.org/wikipedia/commons/c/c8/Atlassian_logo.svg" },
                    { name: "HubSpot", logo: "https://upload.wikimedia.org/wikipedia/commons/3/3f/HubSpot_Logo.svg" },
                    { name: "DocuSign", logo: "https://upload.wikimedia.org/wikipedia/commons/9/9e/DocuSign_logo.svg" },
                    { name: "Workday", logo: "https://upload.wikimedia.org/wikipedia/commons/3/31/Workday_Logo.svg" },
                    { name: "ServiceNow", logo: "https://upload.wikimedia.org/wikipedia/commons/5/57/ServiceNow_logo.svg" },
                    { name: "Zendesk", logo: "https://upload.wikimedia.org/wikipedia/commons/c/c8/Zendesk_logo.svg" }
                  ].concat([
                    { name: "Microsoft", logo: "https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg" },
                    { name: "Salesforce", logo: "https://upload.wikimedia.org/wikipedia/commons/f/f9/Salesforce.com_logo.svg" },
                    { name: "Slack", logo: "https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg" },
                    { name: "Zoom", logo: "https://upload.wikimedia.org/wikipedia/commons/7/7b/Zoom_Communications_Logo.svg" },
                    { name: "Shopify", logo: "https://upload.wikimedia.org/wikipedia/commons/0/0e/Shopify_logo_2018.svg" },
                    { name: "Stripe", logo: "https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg" }
                  ]).map((company, i) => (
                    <div key={i} className="h-12 w-40 flex items-center justify-center flex-shrink-0 opacity-60 hover:opacity-90 transition-opacity duration-300 group">
                      <OptimizedImage
                        src={company.logo}
                        alt={`${company.name} logo`}
                        width={120}
                        height={40}
                        className="max-h-8 w-auto object-contain filter grayscale group-hover:grayscale-0 transition-all duration-300"
                        priority={false}
                      />
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Enhanced Security & Compliance Badges */}
              <div className="flex flex-wrap justify-center items-center gap-4 opacity-80">
                <div className="flex items-center space-x-2 bg-white rounded-lg px-4 py-3 shadow-sm border hover:shadow-md transition-shadow group">
                  <Shield className="h-5 w-5 text-green-600 group-hover:scale-110 transition-transform" />
                  <div className="text-left">
                    <div className="text-sm font-semibold text-slate-800">SOC 2 Type II</div>
                    <div className="text-xs text-slate-500">Security Certified</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 bg-white rounded-lg px-4 py-3 shadow-sm border hover:shadow-md transition-shadow group">
                  <Shield className="h-5 w-5 text-blue-600 group-hover:scale-110 transition-transform" />
                  <div className="text-left">
                    <div className="text-sm font-semibold text-slate-800">GDPR Compliant</div>
                    <div className="text-xs text-slate-500">EU Privacy Ready</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 bg-white rounded-lg px-4 py-3 shadow-sm border hover:shadow-md transition-shadow group">
                  <Shield className="h-5 w-5 text-purple-600 group-hover:scale-110 transition-transform" />
                  <div className="text-left">
                    <div className="text-sm font-semibold text-slate-800">ISO 27001</div>
                    <div className="text-xs text-slate-500">Information Security</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 bg-white rounded-lg px-4 py-3 shadow-sm border hover:shadow-md transition-shadow group">
                  <Shield className="h-5 w-5 text-indigo-600 group-hover:scale-110 transition-transform" />
                  <div className="text-left">
                    <div className="text-sm font-semibold text-slate-800">HIPAA Ready</div>
                    <div className="text-xs text-slate-500">Healthcare Compliant</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 bg-white rounded-lg px-4 py-3 shadow-sm border hover:shadow-md transition-shadow group">
                  <Star className="h-5 w-5 text-yellow-500 fill-current group-hover:scale-110 transition-transform" />
                  <div className="text-left">
                    <div className="text-sm font-semibold text-slate-800">99.9% Uptime</div>
                    <div className="text-xs text-slate-500">Enterprise SLA</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Testimonials with Quantifiable Results */}
            <div className="grid md:grid-cols-3 gap-8 mb-12">
              {[
                {
                  quote: "Cut our development time by 8 months. The enterprise features are production-ready from day one.",
                  author: "Sarah Chen",
                  role: "CTO, TechFlow",
                  avatar: "https://images.unsplash.com/photo-1517365830460-955ce3ccd263?w=64&h=64&fit=crop&crop=face",
                  metric: "8 months saved"
                },
                {
                  quote: "GDPR compliance and multi-tenancy out of the box. Passed enterprise security audit immediately.",
                  author: "Michael Rodriguez",
                  role: "Head of Engineering, DataVault",
                  avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=64&h=64&fit=crop&crop=face",
                  metric: "100% security compliance"
                },
                {
                  quote: "Real-time features and analytics dashboard helped us close 3x more enterprise deals.",
                  author: "Jennifer Park",
                  role: "VP Product, ScaleUp",
                  avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=64&h=64&fit=crop&crop=face",
                  metric: "3x more enterprise deals"
                }
              ].map((testimonial, i) => (
                <Card key={i} className="text-left hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <Quote className="h-8 w-8 text-blue-600 opacity-50" />
                      <p className="text-slate-700 italic">"{testimonial.quote}"</p>
                      <div className="flex items-center space-x-3">
                        <OptimizedImage
                          src={testimonial.avatar}
                          alt={testimonial.author}
                          width={40}
                          height={40}
                          className="rounded-full object-cover"
                          priority={true}
                        />
                        <div>
                          <div className="font-semibold text-slate-900">{testimonial.author}</div>
                          <div className="text-sm text-slate-500">{testimonial.role}</div>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-green-700 border-green-200">
                        {testimonial.metric}
                      </Badge>
                      <SocialSharing 
                        content={{
                          type: 'testimonial',
                          title: `${testimonial.author} from ${testimonial.role.split(', ')[1]} shares their experience`,
                          description: testimonial.quote,
                          url: `${typeof window !== 'undefined' ? window.location.origin : ''}/#testimonial-${i}`,
                          quote: testimonial.quote,
                          author: testimonial.author,
                          company: testimonial.role.split(', ')[1],
                          metric: {
                            value: testimonial.metric,
                            label: 'result achieved'
                          }
                        }}
                        variant="inline"
                        showStats={true}
                        className="mt-4"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Case Studies with PDF Downloads */}
            <div className="bg-slate-50 rounded-2xl p-8 mb-12">
              <div className="text-center mb-8">
                <Badge variant="secondary" className="mb-4">📈 Success Stories</Badge>
                <h3 className="text-3xl font-bold text-slate-900 mb-4">Real Results from Real Companies</h3>
                <p className="text-lg text-slate-600">See how leading companies achieved measurable growth with our platform</p>
              </div>
              
              <div className="grid md:grid-cols-3 gap-6">
                {[
                  {
                    company: "TechFlow Solutions",
                    industry: "Fintech",
                    result: "300% Revenue Growth",
                    description: "Reduced development time from 18 months to 6 months, enabling faster time-to-market",
                    metrics: ["18 → 6 months TTM", "300% revenue increase", "85% cost reduction"],
                    logo: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=80&h=80&fit=crop&crop=center",
                    downloadUrl: "/api/case-studies/techflow-case-study.pdf"
                  },
                  {
                    company: "DataVault Corp",
                    industry: "Healthcare",
                    result: "HIPAA Compliance in 30 Days",
                    description: "Achieved enterprise security audit approval with zero compliance violations",
                    metrics: ["30-day compliance", "Zero violations", "50% faster onboarding"],
                    logo: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=80&h=80&fit=crop&crop=center",
                    downloadUrl: "/api/case-studies/datavault-case-study.pdf"
                  },
                  {
                    company: "ScaleUp Analytics",
                    industry: "E-commerce",
                    result: "10M+ Users Onboarded",
                    description: "Scaled from startup to enterprise with multi-tenant architecture handling massive growth",
                    metrics: ["10M+ active users", "99.99% uptime", "40% cost savings"],
                    logo: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=80&h=80&fit=crop&crop=center",
                    downloadUrl: "/api/case-studies/scaleup-case-study.pdf"
                  }
                ].map((caseStudy, i) => (
                  <Card key={i} className="text-left hover:shadow-lg transition-all duration-300 group">
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-3 mb-4">
                        <OptimizedImage
                          src={caseStudy.logo}
                          alt={`${caseStudy.company} logo`}
                          width={40}
                          height={40}
                          className="rounded-lg object-cover"
                          priority={false}
                        />
                        <div>
                          <div className="font-semibold text-slate-900">{caseStudy.company}</div>
                          <div className="text-sm text-slate-500">{caseStudy.industry}</div>
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <Badge variant="outline" className="text-green-700 border-green-200 mb-2">
                          {caseStudy.result}
                        </Badge>
                        <p className="text-slate-600 text-sm">{caseStudy.description}</p>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        {caseStudy.metrics.map((metric, j) => (
                          <div key={j} className="flex items-center space-x-2">
                            <TrendingUp className="h-3 w-3 text-green-600" />
                            <span className="text-xs text-slate-600">{metric}</span>
                          </div>
                        ))}
                      </div>
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full group-hover:bg-blue-50 group-hover:border-blue-200 transition-colors mb-3"
                        onClick={() => {
                          // Track download event
                          if (typeof window !== 'undefined') {
                            window.open(caseStudy.downloadUrl, '_blank')
                          }
                        }}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download Case Study
                      </Button>
                      
                      <SocialSharing 
                        content={{
                          type: 'case-study',
                          title: `${caseStudy.company} Case Study: ${caseStudy.result}`,
                          description: `${caseStudy.description} See how ${caseStudy.company} achieved remarkable results.`,
                          url: `${typeof window !== 'undefined' ? window.location.origin : ''}/#case-study-${i}`,
                          company: caseStudy.company,
                          metric: {
                            value: caseStudy.result,
                            label: caseStudy.industry
                          }
                        }}
                        variant="inline"
                        showStats={false}
                        className="text-xs"
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Enhanced Metrics Dashboard */}
            <div className="bg-gradient-to-r from-blue-50 to-violet-50 rounded-2xl p-8">
              <div className="text-center mb-8">
                <Badge variant="secondary" className="mb-4">📊 Live Metrics</Badge>
                <h3 className="text-3xl font-bold text-slate-900 mb-2">Platform Performance</h3>
                <p className="text-slate-600">Real-time data from our global infrastructure</p>
              </div>
              
              <div className="grid md:grid-cols-4 gap-6 text-center">
                <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-blue-100 mb-4">
                    <Users className="w-7 h-7 text-blue-600" />
                  </div>
                  <div className="text-4xl font-bold text-slate-900 mb-1">2,547</div>
                  <div className="text-slate-500 text-sm mb-2">Active Companies</div>
                  <div className="flex items-center justify-center space-x-1 text-xs text-green-600">
                    <TrendingUp className="h-3 w-3" />
                    <span>+12% this month</span>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-green-100 mb-4">
                    <Clock className="w-7 h-7 text-green-600" />
                  </div>
                  <div className="text-4xl font-bold text-slate-900 mb-1">847K</div>
                  <div className="text-slate-500 text-sm mb-2">Hours Saved Globally</div>
                  <div className="flex items-center justify-center space-x-1 text-xs text-green-600">
                    <TrendingUp className="h-3 w-3" />
                    <span>+200 hrs/day</span>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-yellow-100 mb-4">
                    <Award className="w-7 h-7 text-yellow-600" />
                  </div>
                  <div className="flex items-center justify-center space-x-2 mb-1">
                    <div className="text-4xl font-bold text-slate-900">4.9</div>
                    <div className="flex space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                  </div>
                  <div className="text-slate-500 text-sm mb-2">Average Rating</div>
                  <div className="text-xs text-slate-600">From 1,200+ reviews</div>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-purple-100 mb-4">
                    <Shield className="w-7 h-7 text-purple-600" />
                  </div>
                  <div className="text-4xl font-bold text-slate-900 mb-1">99.99%</div>
                  <div className="text-slate-500 text-sm mb-2">Uptime SLA</div>
                  <div className="flex items-center justify-center space-x-1 text-xs text-green-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>All systems operational</span>
                  </div>
                </div>
              </div>
              
              {/* Additional Live Stats */}
              <div className="grid md:grid-cols-3 gap-4 mt-6">
                <div className="bg-white/50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-slate-900">15.2M</div>
                  <div className="text-sm text-slate-600">API Calls Today</div>
                </div>
                <div className="bg-white/50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-slate-900">156ms</div>
                  <div className="text-sm text-slate-600">Avg Response Time</div>
                </div>
                <div className="bg-white/50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-slate-900">47</div>
                  <div className="text-sm text-slate-600">Global Data Centers</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Split-Screen Feature Comparison */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-8 mb-16">
            <Badge variant="secondary" role="text">⚡ Before vs After</Badge>
            <h2 className="text-4xl font-bold text-slate-900">
              See The Difference Our Template Makes
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Compare building from scratch vs using our production-ready template. 
              The results speak for themselves.
            </p>
          </div>
          
          <SplitScreenDemo />
        </div>
      </section>

      {/* Interactive Features & Micro-interactions */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <MicroInteractions />
        </div>
      </section>

      {/* Scroll Animations Showcase */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollAnimations />
        </div>
      </section>

      {/* Performance & Lazy Loading */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <LazyLoadingDemo />
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 bg-white" aria-labelledby="features-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-16">
            <div className="space-y-4">
              <Badge variant="secondary" role="text">🎯 Everything You Need</Badge>
              <h2 id="features-heading" className="text-4xl font-bold text-slate-900">
                Stop Building From Scratch
              </h2>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                Focus on your unique business logic while we handle the complex infrastructure. 
                Get enterprise-ready features out of the box.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8" role="list" aria-label="SaaS template features">
              {[
                {
                  icon: Shield,
                  title: "Enterprise Security",
                  description: "GDPR compliant with SOC2 Type II certification. Advanced encryption and audit logs included.",
                  benefit: "Save 40+ hours on compliance"
                },
                {
                  icon: Users,
                  title: "Multi-Tenant Architecture", 
                  description: "Built-in organization management with role-based access control and team collaboration.",
                  benefit: "Reduce onboarding time by 60%"
                },
                {
                  icon: BarChart3,
                  title: "Advanced Analytics",
                  description: "Real-time dashboards with custom KPIs, user behavior tracking, and revenue analytics.",
                  benefit: "Increase conversion by 25%"
                },
                {
                  icon: Zap,
                  title: "API-First Design",
                  description: "RESTful APIs with OpenAPI docs, webhook system, and rate limiting built-in.",
                  benefit: "Ship integrations 3x faster"
                },
                {
                  icon: Clock,
                  title: "Real-Time Features",
                  description: "WebSocket support, live updates, collaborative editing, and instant notifications.",
                  benefit: "Boost user engagement by 45%"
                },
                {
                  icon: CheckCircle,
                  title: "Production Ready",
                  description: "CI/CD pipelines, monitoring, error tracking, and performance optimization included.",
                  benefit: "Launch in days, not months"
                }
              ].map((feature, i) => (
                <div key={i} role="listitem">
                  <Card className="h-full hover-lift focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2">
                    <CardHeader>
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-violet-600 rounded-lg flex items-center justify-center mb-4" aria-hidden="true">
                        <feature.icon className="h-6 w-6 text-white" />
                      </div>
                      <CardTitle className="text-xl">{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-slate-600 mb-4">{feature.description}</p>
                      <Badge variant="outline" className="text-green-700 border-green-200" role="text" aria-label={`Benefit: ${feature.benefit}`}>
                        {feature.benefit}
                      </Badge>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Email Capture Section */}
      <section className="py-16 bg-slate-50">
        <div className="section-container">
          <div className="max-w-2xl mx-auto">
            <EmailCapture 
              variant="inline"
              className="mx-auto"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-violet-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <div className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-4xl font-bold text-white">
                Ready to Build Your SaaS?
              </h2>
              <p className="text-xl text-blue-100">
                Join 2,500+ companies who chose the smart way to build. Start your free trial today.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <SignUpButton>
                <Button size="lg" variant="secondary" className="text-lg px-8 py-6 h-auto group hover:scale-105 transition-all duration-200">
                  Start Building Now
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-200" />
                </Button>
              </SignUpButton>
              <Link href="/pricing">
                <Button variant="outline" size="lg" className="text-lg px-8 py-6 h-auto border-white text-white hover:bg-white hover:text-blue-600 hover:scale-105 transition-all duration-200">
                  View Pricing
                </Button>
              </Link>
            </div>

            <div className="flex items-center justify-center space-x-6 text-blue-100">
              <div className="flex items-center space-x-1">
                <Check className="h-4 w-4" />
                <span>14-day free trial</span>
              </div>
              <div className="flex items-center space-x-1">
                <Check className="h-4 w-4" />
                <span>No setup fees</span>
              </div>
              <div className="flex items-center space-x-1">
                <Check className="h-4 w-4" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-violet-600 rounded-lg flex items-center justify-center">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">SaaS Template</span>
            </div>
            <p className="text-slate-400">
              Build your B2B SaaS 10x faster with our production-ready template.
            </p>
            <div className="flex items-center justify-center space-x-6 text-slate-400">
              <a href="#" className="hover:text-white">Privacy</a>
              <a href="#" className="hover:text-white">Terms</a>
              <a href="#" className="hover:text-white">Support</a>
            </div>
          </div>
        </div>
      </footer>
      
      {/* Analytics Test Panel (development only) */}
      <AnalyticsTest />
    </main>
  )
}
"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { ArrowRight, Check, Star, Zap, Shield, BarChart3, Users, Clock, CheckCircle, Award } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CookieConsent } from "@/components/cookie-consent"

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

export default function Home() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "SaaS Template",
    "description": "Production-ready B2B SaaS template built with Next.js, Supabase, and Clerk authentication",
    "url": "https://saas-template.com",
    "applicationCategory": "DeveloperApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
      "priceValidUntil": "2025-12-31",
      "description": "14-day free trial"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "ratingCount": "2500",
      "bestRating": "5",
      "worstRating": "1"
    },
    "author": {
      "@type": "Organization",
      "name": "SaaS Template Team"
    },
    "publisher": {
      "@type": "Organization",
      "name": "SaaS Template"
    }
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-lg border-b border-slate-200 z-50" role="navigation" aria-label="Main navigation">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-violet-600 rounded-lg flex items-center justify-center" aria-hidden="true">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900">SaaS Template</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-slate-600 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md px-2 py-1" aria-label="Navigate to features section">Features</a>
              <a href="#pricing" className="text-slate-600 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md px-2 py-1" aria-label="Navigate to pricing section">Pricing</a>
              <a href="#testimonials" className="text-slate-600 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md px-2 py-1" aria-label="Navigate to reviews section">Reviews</a>
              <Button variant="outline" size="sm" aria-label="Sign in to your account">Sign In</Button>
              <Button size="sm" aria-label="Start your free 14-day trial">Start Free Trial</Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8" aria-labelledby="hero-heading">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            className="text-center space-y-8"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            <motion.div variants={fadeInUp} className="space-y-4">
              <Badge variant="secondary" className="mb-4" role="text">
                🚀 Launch your SaaS 10x faster
              </Badge>
              <h1 id="hero-heading" className="text-4xl sm:text-6xl lg:text-7xl font-bold text-slate-900 leading-tight">
                Build Your B2B SaaS
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600">
                  In Days, Not Months
                </span>
              </h1>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
                Skip months of development with our production-ready template. Built with Next.js, Supabase, and Clerk. 
                Join 2,500+ companies who saved 200+ hours of development time.
              </p>
            </motion.div>

            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="text-lg px-8 py-6 h-auto group" aria-label="Start your 14-day free trial now">
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
              </Button>
              <Button variant="outline" size="lg" className="text-lg px-8 py-6 h-auto" aria-label="View live demo of the SaaS template">
                View Live Demo
              </Button>
            </motion.div>

            <motion.div variants={fadeInUp} className="flex items-center justify-center space-x-6 text-sm text-slate-500" role="list" aria-label="Trial benefits">
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
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center space-y-12"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            <motion.div variants={fadeInUp}>
              <p className="text-slate-500 text-lg mb-8">Trusted by 2,500+ companies worldwide</p>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 items-center opacity-60 mb-12">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-12 bg-slate-200 rounded flex items-center justify-center">
                    <span className="text-slate-400 font-semibold">LOGO</span>
                  </div>
                ))}
              </div>
              
              {/* Security badges - Research shows crucial for B2B trust */}
              <div className="flex flex-wrap justify-center items-center gap-6 opacity-70">
                <div className="flex items-center space-x-2 bg-white rounded-lg px-4 py-2 shadow-sm border">
                  <Shield className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-slate-700">SOC 2 Compliant</span>
                </div>
                <div className="flex items-center space-x-2 bg-white rounded-lg px-4 py-2 shadow-sm border">
                  <Shield className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium text-slate-700">GDPR Ready</span>
                </div>
                <div className="flex items-center space-x-2 bg-white rounded-lg px-4 py-2 shadow-sm border">
                  <Shield className="h-5 w-5 text-purple-600" />
                  <span className="text-sm font-medium text-slate-700">Enterprise Security</span>
                </div>
                <div className="flex items-center space-x-2 bg-white rounded-lg px-4 py-2 shadow-sm border">
                 <Star className="h-5 w-5 text-yellow-500 fill-current" />
                  <span className="text-sm font-medium text-slate-700">ISO 27001</span>
                </div>
              </div>
            </motion.div>

            <motion.div variants={fadeInUp} className="grid md:grid-cols-4 gap-6 text-center">
              <div className="space-y-2">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-blue-100 mb-2">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div className="text-3xl font-bold text-slate-900">2,500+</div>
                <div className="text-slate-500 text-sm">Active Companies</div>
              </div>
              <div className="space-y-2">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-green-100 mb-2">
                  <Clock className="w-6 h-6 text-green-600" />
                </div>
                <div className="text-3xl font-bold text-slate-900">200+</div>
                <div className="text-slate-500 text-sm">Hours Saved</div>
              </div>
              <div className="space-y-2">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-yellow-100 mb-2">
                  <Award className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="flex items-center justify-center space-x-1 mb-1">
                  <div className="text-3xl font-bold text-slate-900">4.9</div>
                  <div className="flex space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </div>
                <div className="text-slate-500 text-sm">G2 Rating</div>
              </div>
              <div className="space-y-2">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-purple-100 mb-2">
                  <Shield className="w-6 h-6 text-purple-600" />
                </div>
                <div className="text-3xl font-bold text-slate-900">99.9%</div>
                <div className="text-slate-500 text-sm">Uptime SLA</div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 bg-slate-50" aria-labelledby="features-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center space-y-16"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            <motion.div variants={fadeInUp} className="space-y-4">
              <Badge variant="secondary" role="text">🎯 Everything You Need</Badge>
              <h2 id="features-heading" className="text-4xl font-bold text-slate-900">
                Stop Building From Scratch
              </h2>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                Focus on your unique business logic while we handle the complex infrastructure. 
                Get enterprise-ready features out of the box.
              </p>
            </motion.div>

            <motion.div variants={staggerContainer} className="grid md:grid-cols-2 lg:grid-cols-3 gap-8" role="list" aria-label="SaaS template features">
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
                <motion.div key={i} variants={fadeInUp} role="listitem">
                  <Card className="h-full hover:shadow-lg transition-shadow focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2">
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
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-violet-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="space-y-8"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            <motion.div variants={fadeInUp} className="space-y-4">
              <h2 className="text-4xl font-bold text-white">
                Ready to Build Your SaaS?
              </h2>
              <p className="text-xl text-blue-100">
                Join 2,500+ companies who chose the smart way to build. Start your free trial today.
              </p>
            </motion.div>

            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" variant="secondary" className="text-lg px-8 py-6 h-auto group">
                Start Building Now
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button variant="outline" size="lg" className="text-lg px-8 py-6 h-auto border-white text-white hover:bg-white hover:text-blue-600">
                Schedule Demo
              </Button>
            </motion.div>

            <motion.div variants={fadeInUp} className="flex items-center justify-center space-x-6 text-blue-100">
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
            </motion.div>
          </motion.div>
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
    </main>
    <CookieConsent />
    </>
  )
}
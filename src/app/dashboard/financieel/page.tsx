'use client'

import { useAuth, useUser } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import { MetricsCards } from '@/components/dashboard/metrics-cards'
import { FinancialTabs } from '@/components/financial/financial-tabs'

interface UserProfile {
  id: string
  email: string
  role: string
  tenant_id: string
  onboarding_complete: boolean
  first_name?: string
  last_name?: string
}

export default function FinancialDashboard() {
  const { userId } = useAuth()
  const { user } = useUser()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userId && user) {
      fetchProfile()
    }
  }, [userId, user])

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/user/profile', { method: 'GET' })
      if (response.ok) {
        const data = await response.json()
        setProfile(data.profile)
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen mobile-safe-area">
        <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background mobile-safe-area">
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-6 lg:space-y-8 mobile-scroll-smooth">
        {/* Enhanced Metrics Cards - Always Visible */}
        <MetricsCards />

        {/* Financial Tabs - Main Content Area */}
        <FinancialTabs />

        {/* Mobile-optimized footer with enhanced styling */}
        <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-border/50">
          <div className="text-xs text-muted-foreground text-center space-y-2">
            <div className="flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="hidden sm:inline">All systems operational</span>
                <span className="sm:hidden">Online</span>
              </div>
              <div className="h-3 w-px bg-border hidden sm:block"></div>
              <span className="text-xs">Tenant: {profile?.tenant_id?.substring(0, 8)}...</span>
            </div>
            <p className="font-medium text-xs sm:text-sm">
              <span className="hidden sm:inline">Version 2.0 - Award-winning Financieel Dashboard</span>
              <span className="sm:hidden">v2.0 - Financieel Dashboard</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
'use client'

import { useAuth, useUser } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { FreelancerMetricsBar } from '@/components/dashboard/freelancer-metrics-bar'
import { FinancialOverview } from '@/components/dashboard/financial-overview'
import { TimeTrackingHub } from '@/components/dashboard/time-tracking-hub'
import { Settings, Users, BarChart3, Shield, UserPlus } from 'lucide-react'
import Link from 'next/link'

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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Financieel Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                Welcome back, {profile?.first_name || 'User'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="text-sm">
                <Shield className="h-3 w-3 mr-1" />
                {profile?.role?.toUpperCase()}
              </Badge>
              <ThemeToggle />
            </div>
          </div>
        </div>

        {/* Freelancer Metrics Bar */}
        <div className="mb-8">
          <FreelancerMetricsBar />
        </div>

        {/* Financial Overview Section */}
        <div className="mb-8">
          <FinancialOverview />
        </div>

        {/* Time Tracking Hub Section */}
        <div className="mb-8">
          <TimeTrackingHub />
        </div>

        <div className="mt-8 text-xs text-muted-foreground text-center space-y-1">
          <p>Tenant: {profile?.tenant_id?.substring(0, 8)}...</p>
          <p>Version 2.0 - Award-winning Financial Dashboard</p>
        </div>
      </div>
    </div>
  )
}
'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { UserButton } from '@clerk/nextjs'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Euro,
  TrendingUp,
  TrendingDown,
  Target,
  Users,
  Clock,
  Calendar,
  DollarSign,
  Activity,
  BarChart3,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  FileText,
  CreditCard
} from 'lucide-react'

// Dynamic import for chart components to avoid SSR issues
const RevenueChart = dynamic(() => 
  import('./revenue-chart').then(mod => ({ default: mod.RevenueChart })), 
  { 
    ssr: false, 
    loading: () => (
      <div className="h-24 flex items-center justify-center">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
      </div>
    )
  }
)

const HoursChart = dynamic(() => 
  import('./hours-chart').then(mod => ({ default: mod.HoursChart })), 
  { ssr: false, loading: () => <div className="h-16 flex items-center justify-center"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div></div> }
)

const RateChart = dynamic(() => 
  import('./rate-chart').then(mod => ({ default: mod.RateChart })), 
  { ssr: false, loading: () => <div className="h-16 flex items-center justify-center"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div></div> }
)

const SubscriptionChart = dynamic(() => 
  import('./subscription-chart').then(mod => ({ default: mod.SubscriptionChart })), 
  { ssr: false, loading: () => <div className="h-16 flex items-center justify-center"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div></div> }
)

// Cleaned up interfaces - removed unused mock data types

// API data interfaces
interface DashboardMetricsResponse {
  success: boolean
  data: {
    factureerbaar: number
    totale_registratie: number
    achterstallig: number
    achterstallig_count: number
  }
}

interface TimeStatsResponse {
  success: boolean
  data: {
    thisWeek: {
      hours: number
      difference: number
      trend: 'positive' | 'negative'
    }
    thisMonth: {
      hours: number
      revenue: number
    }
    unbilled: {
      hours: number
      revenue: number
    }
    projects: {
      count: number
      clients: number
    }
    subscription: {
      monthlyActiveUsers: {
        current: number
        previous: number
        growth: number
        trend: 'positive' | 'negative' | 'neutral'
      }
      averageSubscriptionFee: {
        current: number
        previous: number
        growth: number
        trend: 'positive' | 'negative' | 'neutral'
      }
      totalRevenue: number
    }
  }
}

// Utility functions for formatting
const formatCurrency = (amount: number) => `€${amount.toLocaleString()}`
const formatHours = (hours: number) => `${hours}h`

export function MetricsCards() {
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetricsResponse['data'] | null>(null)
  const [timeStats, setTimeStats] = useState<TimeStatsResponse['data'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionsOpen, setActionsOpen] = useState(true)

  // Fetch data from APIs
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true)
        console.log('🚀 Starting metrics fetch...')

        // Fetch dashboard metrics (revenue, invoices data)
        console.log('📊 Fetching dashboard metrics...')
        const dashboardResponse = await fetch('/api/invoices/dashboard-metrics')
        console.log('📊 Dashboard response status:', dashboardResponse.status)

        if (!dashboardResponse.ok) {
          const errorText = await dashboardResponse.text()
          console.error('❌ Dashboard metrics error:', errorText)
          throw new Error(`Failed to fetch dashboard metrics: ${dashboardResponse.status} - ${errorText}`)
        }

        const dashboardData: DashboardMetricsResponse = await dashboardResponse.json()
        console.log('✅ Dashboard metrics data:', dashboardData)
        console.log('📈 Dashboard metrics values:', {
          factureerbaar: dashboardData.data?.factureerbaar,
          totale_registratie: dashboardData.data?.totale_registratie,
          achterstallig: dashboardData.data?.achterstallig,
          achterstallig_count: dashboardData.data?.achterstallig_count
        })
        setDashboardMetrics(dashboardData.data)

        // Fetch time tracking stats (hours data)
        console.log('⏰ Fetching time stats...')
        const timeResponse = await fetch('/api/time-entries/stats')
        console.log('⏰ Time response status:', timeResponse.status)

        if (!timeResponse.ok) {
          const errorText = await timeResponse.text()
          console.error('❌ Time stats error:', errorText)
          throw new Error(`Failed to fetch time stats: ${timeResponse.status} - ${errorText}`)
        }

        const timeData: TimeStatsResponse = await timeResponse.json()
        console.log('✅ Time stats data:', timeData)
        console.log('⏰ Time stats values:', {
          thisMonth: timeData.data?.thisMonth,
          thisWeek: timeData.data?.thisWeek,
          unbilled: timeData.data?.unbilled,
          projects: timeData.data?.projects
        })
        setTimeStats(timeData.data)

        setError(null)
        console.log('🎉 Metrics fetch completed successfully!')
      } catch (err) {
        console.error('💥 Error fetching metrics:', err)
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchMetrics()

    // Refresh data every 5 minutes
    const interval = setInterval(fetchMetrics, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])
  


  // Show loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 sm:gap-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="mobile-card-glass space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg animate-pulse">
                    <div className="h-5 w-5 bg-muted-foreground/20 rounded"></div>
                  </div>
                  <div>
                    <div className="h-4 w-16 bg-muted-foreground/20 rounded animate-pulse mb-1"></div>
                    <div className="h-3 w-20 bg-muted-foreground/10 rounded animate-pulse"></div>
                  </div>
                </div>
                <div className="h-6 w-12 bg-muted-foreground/20 rounded-full animate-pulse"></div>
              </div>
              <div className="space-y-2">
                <div className="h-8 w-24 bg-muted-foreground/20 rounded animate-pulse"></div>
                <div className="h-4 bg-muted-foreground/10 rounded animate-pulse"></div>
                <div className="h-16 bg-muted-foreground/10 rounded animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="mobile-card-glass p-6 text-center">
          <div className="text-red-400 mb-2">Failed to load metrics</div>
          <div className="text-sm text-muted-foreground mb-4">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Return early if no data
  if (!dashboardMetrics || !timeStats) {
    return null
  }

  // Calculate metrics from real data
  const currentRevenue = dashboardMetrics.totale_registratie
  const mtdTarget = 12000 // Make this configurable later
  const revenueProgress = (currentRevenue / mtdTarget) * 100

  const currentHours = timeStats.thisMonth.hours
  const hoursTarget = 160 // Make this configurable later
  const hoursProgress = (currentHours / hoursTarget) * 100

  const hoursGrowth = timeStats.thisWeek.difference / (timeStats.thisWeek.hours - timeStats.thisWeek.difference) * 100 || 0
  const revenueGrowth = 0 // Calculate from historical data if available

  // Debug: Log calculated values
  console.log('🧮 Calculated metrics:', {
    currentRevenue,
    mtdTarget,
    revenueProgress,
    currentHours,
    hoursTarget,
    hoursProgress,
    unbilledRevenue: timeStats.unbilled.revenue,
    unbilledHours: timeStats.unbilled.hours,
    overdue: dashboardMetrics.achterstallig,
    overdueCount: dashboardMetrics.achterstallig_count
  })

  return (
    <div className="space-y-6">
      {/* Header with User Avatar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Financial Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor your financial performance and manage tasks
          </p>
        </div>
        <div className="flex items-center gap-3">
          <UserButton
            appearance={{
              elements: {
                userButtonAvatarBox: "w-9 h-9", // Slightly larger avatar
                userButtonPopoverCard: "border border-border",
                userButtonPopoverActionButton: "hover:bg-accent",
              }
            }}
            afterSignOutUrl="/sign-in"
          />
        </div>
      </div>

      {/* 5-Card Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 sm:gap-6">
        
        {/* Card 1: Revenue MTD - Using totale_registratie */}
        <div className="mobile-card-glass space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/20 rounded-lg">
                <Euro className="h-5 w-5 text-accent chart-glow-orange" />
              </div>
              <div>
                <h3 className="text-base font-semibold mobile-sharp-text">Revenue</h3>
                <p className="text-sm text-muted-foreground h-8 flex flex-col justify-center">
                  <span>Registered time</span>
                  <span>value</span>
                </p>
              </div>
            </div>
            <div className={`mobile-status-indicator ${
              revenueProgress >= 100 ? 'status-active' :
              revenueProgress >= 80 ? 'status-warning' : 'status-inactive'
            }`}>
              <span>{Math.round(revenueProgress)}%</span>
            </div>
          </div>

          {/* Revenue Display */}
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold metric-number text-accent">
                {formatCurrency(currentRevenue)}
              </span>
              <span className="text-sm text-muted-foreground">
                / {formatCurrency(mtdTarget)}
              </span>
            </div>
            <div className="flex items-center gap-2 h-8 flex-col justify-center">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-400" />
                <span className="text-sm font-medium text-green-400">Active</span>
                <span className="text-sm text-muted-foreground">this month</span>
              </div>
              <div></div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="relative progress-bar">
              <div
                className={`progress-fill ${
                  revenueProgress >= 100 ? 'progress-fill-success' :
                  revenueProgress >= 80 ? 'progress-fill-warning' : 'progress-fill-warning'
                }`}
                style={{ width: `${Math.min(revenueProgress, 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-center text-xs text-muted-foreground">
              <span>Progress to target</span>
            </div>
          </div>

          {/* Revenue Breakdown */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/20">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Billable</p>
              <p className="text-sm font-bold text-primary">
                {formatCurrency(dashboardMetrics.factureerbaar)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Overdue</p>
              <p className="text-sm font-bold text-red-400">
                {formatCurrency(dashboardMetrics.achterstallig)}
              </p>
            </div>
          </div>
        </div>
        
        {/* Card 2: Hours Tracking */}
        <div className="mobile-card-glass space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/20 rounded-lg">
                <Clock className="h-5 w-5 text-green-400 chart-glow-green" />
              </div>
              <div>
                <h3 className="text-base font-semibold mobile-sharp-text">Hours</h3>
                <p className="text-sm text-muted-foreground h-8 flex flex-col justify-center">
                  <span>This month</span>
                  <span>total</span>
                </p>
              </div>
            </div>
            <div className={`mobile-status-indicator ${
              hoursProgress >= 100 ? 'status-active' :
              hoursProgress >= 75 ? 'status-warning' : 'status-inactive'
            }`}>
              <span>{Math.round(hoursProgress)}%</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold metric-number text-green-400">{formatHours(currentHours)}</span>
              <span className="text-sm text-muted-foreground">/ {formatHours(hoursTarget)}</span>
            </div>
            <div className="flex items-center gap-2 h-8 flex-col justify-center">
              <div className="flex items-center gap-2">
                {timeStats.thisWeek.trend === 'positive' ? (
                  <TrendingUp className="h-4 w-4 text-green-400" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-400" />
                )}
                <span className={`text-sm font-medium ${
                  timeStats.thisWeek.trend === 'positive' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {timeStats.thisWeek.difference >= 0 ? '+' : ''}{timeStats.thisWeek.difference.toFixed(1)}h
                </span>
                <span className="text-sm text-muted-foreground">this week</span>
              </div>
              <div></div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="relative progress-bar">
              <div
                className={`progress-fill ${
                  hoursProgress >= 100 ? 'progress-fill-success' :
                  hoursProgress >= 75 ? 'progress-fill-warning' : 'progress-fill-primary'
                }`}
                style={{ width: `${Math.min(hoursProgress, 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-center text-xs text-muted-foreground">
              <span>Monthly target progress</span>
            </div>
          </div>

          {/* Hours Breakdown */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/20">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">This Week</p>
              <p className="text-sm font-bold text-primary">{formatHours(timeStats.thisWeek.hours)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Unbilled</p>
              <p className="text-sm font-bold text-orange-400">{formatHours(timeStats.unbilled.hours)}</p>
            </div>
          </div>
        </div>
        
        {/* Card 3: Average Hourly Rate */}
        <div className="mobile-card-glass space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <DollarSign className="h-5 w-5 text-blue-400 chart-glow-blue" />
              </div>
              <div>
                <h3 className="text-base font-semibold mobile-sharp-text">Avg Rate</h3>
                <p className="text-sm text-muted-foreground h-8 flex flex-col justify-center">
                  <span>Hourly</span>
                  <span>consultancy</span>
                </p>
              </div>
            </div>
            <div className={`mobile-status-indicator ${
              (timeStats.thisMonth.hours > 0 ? Math.round(timeStats.thisMonth.revenue / timeStats.thisMonth.hours) : 0) >= 80 ? 'status-active' :
              (timeStats.thisMonth.hours > 0 ? Math.round(timeStats.thisMonth.revenue / timeStats.thisMonth.hours) : 0) >= 60 ? 'status-warning' : 'status-inactive'
            }`}>
              <span>{Math.round(((timeStats.thisMonth.hours > 0 ? Math.round(timeStats.thisMonth.revenue / timeStats.thisMonth.hours) : 0) / 100) * 100)}%</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold metric-number text-blue-400">
                €{timeStats.thisMonth.hours > 0 ? Math.round(timeStats.thisMonth.revenue / timeStats.thisMonth.hours) : 0}
              </span>
              <span className="text-sm text-muted-foreground">/ €100 target</span>
            </div>
            <div className="flex items-center gap-2 h-8 flex-col justify-center">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-400" />
                <span className="text-sm font-medium text-green-400">Premium rate</span>
                <span className="text-sm text-muted-foreground">this month</span>
              </div>
              <div></div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="relative progress-bar">
              <div
                className={`progress-fill ${
                  (timeStats.thisMonth.hours > 0 ? Math.round(timeStats.thisMonth.revenue / timeStats.thisMonth.hours) : 0) >= 80 ? 'progress-fill-success' :
                  (timeStats.thisMonth.hours > 0 ? Math.round(timeStats.thisMonth.revenue / timeStats.thisMonth.hours) : 0) >= 60 ? 'progress-fill-warning' : 'progress-fill-primary'
                }`}
                style={{ width: `${Math.min((timeStats.thisMonth.hours > 0 ? Math.round(timeStats.thisMonth.revenue / timeStats.thisMonth.hours) : 0), 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-center text-xs text-muted-foreground">
              <span>Target: €100/hour</span>
            </div>
          </div>

          {/* Rate Breakdown */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/20">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Hours</p>
              <p className="text-sm font-bold text-primary">{formatHours(timeStats.thisMonth.hours)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Revenue</p>
              <p className="text-sm font-bold text-blue-400">{formatCurrency(timeStats.thisMonth.revenue)}</p>
            </div>
          </div>
        </div>
        
        {/* Card 4: Monthly Active Users */}
        <div className="mobile-card-glass space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Users className="h-5 w-5 text-purple-400 chart-glow-purple" />
              </div>
              <div>
                <h3 className="text-base font-semibold mobile-sharp-text">MAU</h3>
                <p className="text-sm text-muted-foreground h-8 flex flex-col justify-center">
                  <span>Monthly active</span>
                  <span>users</span>
                </p>
              </div>
            </div>
            <div className={`mobile-status-indicator ${
              timeStats.subscription.monthlyActiveUsers.current >= 50 ? 'status-active' :
              timeStats.subscription.monthlyActiveUsers.current >= 25 ? 'status-warning' : 'status-inactive'
            }`}>
              <span>{Math.round((timeStats.subscription.monthlyActiveUsers.current / 100) * 100)}%</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold metric-number text-purple-400">
                {timeStats.subscription.monthlyActiveUsers.current}
              </span>
              <span className="text-sm text-muted-foreground">/ 100 target</span>
            </div>
            <div className="flex items-center gap-2 h-8 flex-col justify-center">
              <div className="flex items-center gap-2">
                {timeStats.subscription.monthlyActiveUsers.trend === 'positive' ? (
                  <TrendingUp className="h-4 w-4 text-green-400" />
                ) : timeStats.subscription.monthlyActiveUsers.trend === 'negative' ? (
                  <TrendingDown className="h-4 w-4 text-red-400" />
                ) : (
                  <Activity className="h-4 w-4 text-gray-400" />
                )}
                <span className={`text-sm font-medium ${
                  timeStats.subscription.monthlyActiveUsers.trend === 'positive' ? 'text-green-400' :
                  timeStats.subscription.monthlyActiveUsers.trend === 'negative' ? 'text-red-400' : 'text-gray-400'
                }`}>
                  {timeStats.subscription.monthlyActiveUsers.growth >= 0 ? '+' : ''}{timeStats.subscription.monthlyActiveUsers.growth.toFixed(1)}% growth
                </span>
                <span className="text-sm text-muted-foreground">vs last month</span>
              </div>
              <div></div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="relative progress-bar">
              <div
                className={`progress-fill ${
                  timeStats.subscription.monthlyActiveUsers.current >= 50 ? 'progress-fill-success' :
                  timeStats.subscription.monthlyActiveUsers.current >= 25 ? 'progress-fill-warning' : 'progress-fill-primary'
                }`}
                style={{ width: `${Math.min(timeStats.subscription.monthlyActiveUsers.current, 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-center text-xs text-muted-foreground">
              <span>Growth to 100 users</span>
            </div>
          </div>

          {/* MAU Breakdown */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/20">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Current</p>
              <p className="text-sm font-bold text-green-400">{timeStats.subscription.monthlyActiveUsers.current}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Previous</p>
              <p className="text-sm font-bold text-purple-400">{timeStats.subscription.monthlyActiveUsers.previous}</p>
            </div>
          </div>
        </div>
        
        {/* Card 5: Average Subscription Fee */}
        <div className="mobile-card-glass space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <Euro className="h-5 w-5 text-emerald-400 chart-glow-emerald" />
              </div>
              <div>
                <h3 className="text-base font-semibold mobile-sharp-text">Avg Sub</h3>
                <p className="text-sm text-muted-foreground h-8 flex flex-col justify-center">
                  <span>Monthly</span>
                  <span>subscription</span>
                </p>
              </div>
            </div>
            <div className={`mobile-status-indicator ${
              timeStats.subscription.averageSubscriptionFee.current >= 60 ? 'status-active' :
              timeStats.subscription.averageSubscriptionFee.current >= 40 ? 'status-warning' : 'status-inactive'
            }`}>
              <span>{Math.round((timeStats.subscription.averageSubscriptionFee.current / 79) * 100)}%</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold metric-number text-emerald-400">
                {formatCurrency(timeStats.subscription.averageSubscriptionFee.current)}
              </span>
              <span className="text-sm text-muted-foreground">/ €79 target</span>
            </div>
            <div className="flex items-center gap-2 h-8 flex-col justify-center">
              <div className="flex items-center gap-2">
                {timeStats.subscription.averageSubscriptionFee.trend === 'positive' ? (
                  <TrendingUp className="h-4 w-4 text-green-400" />
                ) : timeStats.subscription.averageSubscriptionFee.trend === 'negative' ? (
                  <TrendingDown className="h-4 w-4 text-red-400" />
                ) : (
                  <Activity className="h-4 w-4 text-gray-400" />
                )}
                <span className={`text-sm font-medium ${
                  timeStats.subscription.averageSubscriptionFee.trend === 'positive' ? 'text-green-400' :
                  timeStats.subscription.averageSubscriptionFee.trend === 'negative' ? 'text-red-400' : 'text-gray-400'
                }`}>
                  {timeStats.subscription.averageSubscriptionFee.growth >= 0 ? '+' : ''}{timeStats.subscription.averageSubscriptionFee.growth.toFixed(1)}% change
                </span>
                <span className="text-sm text-muted-foreground">vs last month</span>
              </div>
              <div></div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="relative progress-bar">
              <div
                className={`progress-fill ${
                  timeStats.subscription.averageSubscriptionFee.current >= 60 ? 'progress-fill-success' :
                  timeStats.subscription.averageSubscriptionFee.current >= 40 ? 'progress-fill-warning' : 'progress-fill-primary'
                }`}
                style={{ width: `${Math.min((timeStats.subscription.averageSubscriptionFee.current / 79) * 100, 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-center text-xs text-muted-foreground">
              <span>Target: Professional tier</span>
            </div>
          </div>

          {/* Subscription Breakdown */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/20">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Active</p>
              <p className="text-sm font-bold text-emerald-400">{timeStats.subscription.monthlyActiveUsers.current}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">MRR</p>
              <p className="text-sm font-bold text-green-400">{formatCurrency(timeStats.subscription.totalRevenue)}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Actions Required - Collapsible */}
      <Collapsible open={actionsOpen} onOpenChange={setActionsOpen}>
        <div className="mobile-card-glass">
          <CollapsibleTrigger className="flex items-center justify-between w-full p-0 [&[data-state=open]>div>svg]:rotate-90">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              </div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium text-foreground">Actions Required</h4>
                {dashboardMetrics?.achterstallig_count > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {dashboardMetrics.achterstallig_count}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform duration-200" />
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent className="mt-3">
            <div className="space-y-3">
              {/* Overdue Invoices */}
              {dashboardMetrics && dashboardMetrics.achterstallig > 0 && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-red-500/20 rounded-lg">
                      <CreditCard className="h-4 w-4 text-red-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-red-600">Overdue Invoices</p>
                      <p className="text-xs text-muted-foreground">
                        {dashboardMetrics.achterstallig_count} invoice(s) worth {formatCurrency(dashboardMetrics.achterstallig)}
                      </p>
                    </div>
                  </div>
                  <button className="text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md transition-colors">
                    Review
                  </button>
                </div>
              )}

              {/* Unbilled Hours */}
              {timeStats && timeStats.unbilled.hours > 0 && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-orange-500/5 border border-orange-500/20">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-orange-500/20 rounded-lg">
                      <Clock className="h-4 w-4 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-orange-600">Unbilled Hours</p>
                      <p className="text-xs text-muted-foreground">
                        {formatHours(timeStats.unbilled.hours)} worth {formatCurrency(timeStats.unbilled.revenue)}
                      </p>
                    </div>
                  </div>
                  <button className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded-md transition-colors">
                    Create Invoice
                  </button>
                </div>
              )}

              {/* Missing Time Entries - Example action */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-blue-500/20 rounded-lg">
                    <FileText className="h-4 w-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-600">Time Entry Reminder</p>
                    <p className="text-xs text-muted-foreground">
                      Don't forget to log your hours for today
                    </p>
                  </div>
                </div>
                <button className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md transition-colors">
                  Log Time
                </button>
              </div>

              {/* No actions message */}
              {(!dashboardMetrics || dashboardMetrics.achterstallig === 0) &&
               (!timeStats || timeStats.unbilled.hours === 0) && (
                <div className="text-center py-4">
                  <div className="flex items-center justify-center mb-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  </div>
                  <p className="text-sm text-green-600 font-medium">All caught up!</p>
                  <p className="text-xs text-muted-foreground">No urgent actions required</p>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  )
}
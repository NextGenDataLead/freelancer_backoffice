'use client'

import { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { FinancialHealthScore } from './financial-health-score'
import { ActiveTimerWidget } from './active-timer-widget'
import { ClientHealthDashboard } from './client-health-dashboard'
import { CashFlowForecast } from './cash-flow-forecast'
import { FinancialCharts } from '../financial/charts/financial-charts'
import { smartRulesEngine, type BusinessData, type SmartAlert } from '@/lib/smart-rules-engine'
import { healthScoreEngine, type HealthScoreInputs, type HealthScoreOutputs } from '@/lib/health-score-engine'
import {
  Euro,
  TrendingUp,
  TrendingDown,
  Clock,
  DollarSign,
  Users,
  CreditCard,
  FileText,
  Activity,
  Target,
  BarChart3,
  Calendar,
  ChevronRight,
  ChevronDown,
  X,
  Info,
  LayoutDashboard,
  AlertTriangle,
  Award
} from 'lucide-react'

// Dynamic imports for chart components to avoid SSR issues
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

// Data interfaces
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

interface TodayStatsResponse {
  success: boolean
  data: Array<{
    id: string
    hours: number
    billable: boolean
    hourly_rate: number
    effective_hourly_rate: number
    description: string
    project_name: string
    entry_date: string
    client: {
      id: string
      name: string
      company_name?: string
    }
  }>
}

// Format helpers
const formatCurrency = (amount: number) => `€${amount.toLocaleString()}`
const formatHours = (hours: number) => `${hours}h`

export function UnifiedFinancialDashboard() {
  const router = useRouter()
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetricsResponse['data'] | null>(null)
  const [timeStats, setTimeStats] = useState<TimeStatsResponse['data'] | null>(null)
  const [todayStats, setTodayStats] = useState<{ totalHours: number; billableHours: number; entries: number; revenue: number } | null>(null)
  const [revenueTrend, setRevenueTrend] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [smartAlerts, setSmartAlerts] = useState<SmartAlert[]>([])
  const [healthScoreOpen, setHealthScoreOpen] = useState(false)
  const [showExplanation, setShowExplanation] = useState<string | null>(null)
  const [showHealthReport, setShowHealthReport] = useState(false)
  const [healthScoreResults, setHealthScoreResults] = useState<HealthScoreOutputs | null>(null)

  // Calculate month-to-date (MTD) benchmarks - centralized calculation
  const mtdCalculations = useMemo(() => {
    const now = new Date()
    const currentDay = now.getDate()
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const monthProgress = currentDay / daysInMonth

    return {
      currentDay,
      daysInMonth,
      monthProgress,
      mtdRevenueTarget: 12000 * monthProgress,
      mtdHoursTarget: Math.round(160 * monthProgress)
    }
  }, [])

  // Process health scores using centralized decision tree engine
  useEffect(() => {
    if (!dashboardMetrics || !timeStats) {
      setHealthScoreResults(null)
      return
    }

    const inputs: HealthScoreInputs = {
      dashboardMetrics: {
        totale_registratie: dashboardMetrics.totale_registratie || 0,
        achterstallig: dashboardMetrics.achterstallig || 0,
        achterstallig_count: dashboardMetrics.achterstallig_count || 0,
        factureerbaar: dashboardMetrics.factureerbaar || 0
      },
      timeStats: {
        thisMonth: {
          hours: timeStats.thisMonth?.hours || 0,
          revenue: timeStats.thisMonth?.revenue || 0
        },
        unbilled: {
          hours: timeStats.unbilled?.hours || 0,
          revenue: timeStats.unbilled?.revenue || 0,
          value: timeStats.unbilled?.value || 0
        },
        subscription: timeStats.subscription
      },
      mtdCalculations
    }

    const results = healthScoreEngine.process(inputs)
    setHealthScoreResults(results)
  }, [dashboardMetrics, timeStats, mtdCalculations])

  // MTD Comparison calculation using existing monthly data (as per optimization recommendation)
  const mtdComparison = useMemo(() => {
    if (!revenueTrend || revenueTrend.length < 2) {
      return {
        current: 0,
        previous: 0,
        difference: 0,
        trend: 'neutral' as const,
        percentageChange: 0
      }
    }

    const currentMonth = revenueTrend[revenueTrend.length - 1]
    const previousMonth = revenueTrend[revenueTrend.length - 2]

    // Calculate MTD portions (day X of 30 days = X/30 of monthly total)
    const { currentDay, daysInMonth } = mtdCalculations
    const mtdRatio = currentDay / daysInMonth

    const currentMTD = currentMonth.revenue * mtdRatio
    const previousMTD = previousMonth.revenue * mtdRatio
    const difference = currentMTD - previousMTD
    const percentageChange = previousMTD > 0 ? (difference / previousMTD) * 100 : 0

    return {
      current: currentMTD,
      previous: previousMTD,
      difference,
      trend: difference >= 0 ? 'positive' as const : 'negative' as const,
      percentageChange
    }
  }, [revenueTrend, mtdCalculations])

  // Average Rate comparison calculation using previous month's total average
  const rateComparison = useMemo(() => {
    if (!revenueTrend || revenueTrend.length < 2 || !timeStats?.thisMonth.hours) {
      return {
        current: 0,
        previous: 0,
        difference: 0,
        trend: 'neutral' as const,
        percentageChange: 0
      }
    }

    const currentMonth = revenueTrend[revenueTrend.length - 1]
    const previousMonth = revenueTrend[revenueTrend.length - 2]

    // Current rate = current time revenue / current hours
    const currentRate = timeStats.thisMonth.hours > 0 ?
      (dashboardMetrics?.totale_registratie || 0) / timeStats.thisMonth.hours : 0

    // Previous rate = previous month total time revenue / total hours
    const previousRate = previousMonth.totalHours > 0 ?
      previousMonth.timeRevenue / previousMonth.totalHours : 0

    const difference = currentRate - previousRate
    const percentageChange = previousRate > 0 ? (difference / previousRate) * 100 : 0

    return {
      current: currentRate,
      previous: previousRate,
      difference,
      trend: difference >= 0 ? 'positive' as const : 'negative' as const,
      percentageChange
    }
  }, [revenueTrend, timeStats, dashboardMetrics])

  // Get health scores from decision tree results
  const healthScores = useMemo(() => {
    if (!healthScoreResults) {
      return { total: 0, revenue: 0, cashflow: 0, efficiency: 0, risk: 0, totalRounded: 0 }
    }
    return healthScoreResults.scores
  }, [healthScoreResults])

  // Function to fetch all dashboard data
  const fetchAllData = async () => {
      try {
        setLoading(true)

        // Parallel fetch of all required data
        const [dashboardResponse, timeResponse, todayResponse, revenueTrendResponse] = await Promise.all([
          fetch('/api/invoices/dashboard-metrics'),
          fetch('/api/time-entries/stats'),
          fetch('/api/time-entries/today'),
          fetch('/api/financial/revenue-trend')
        ])

        if (!dashboardResponse.ok || !timeResponse.ok || !revenueTrendResponse.ok) {
          throw new Error('Failed to fetch dashboard data')
        }

        const dashboardData: DashboardMetricsResponse = await dashboardResponse.json()
        const timeData: TimeStatsResponse = await timeResponse.json()
        const revenueTrendData = await revenueTrendResponse.json()

        setDashboardMetrics(dashboardData.data)
        setTimeStats(timeData.data)
        setRevenueTrend(revenueTrendData.data || [])

        // Generate smart alerts
        if (dashboardData.data && timeData.data) {
          const businessData: BusinessData = {
            revenue: {
              current: dashboardData.data.totale_registratie,
              target: 12000,
              previousMonth: dashboardData.data.totale_registratie * 0.9
            },
            hours: {
              thisMonth: timeData.data.thisMonth.hours,
              thisWeek: timeData.data.thisWeek.hours,
              target: 160,
              unbilledHours: timeData.data.unbilled.hours,
              unbilledRevenue: timeData.data.unbilled.revenue
            },
            invoices: {
              overdue: {
                count: dashboardData.data.achterstallig_count,
                amount: dashboardData.data.achterstallig
              },
              pending: { count: 0, amount: 0 },
              averagePaymentDays: 25
            },
            clients: {
              total: 10,
              activeThisMonth: 6,
              topClient: { name: 'Main Client', revenueShare: 35 }
            },
            rate: {
              current: timeData.data.thisMonth.hours > 0
                ? Math.round(timeData.data.thisMonth.revenue / timeData.data.thisMonth.hours)
                : 0,
              target: 100
            }
          }

          const alerts = smartRulesEngine.analyzeData(businessData)
          setSmartAlerts(alerts)
        }

        setError(null)
      } catch (err) {
        console.error('Dashboard fetch error:', err)
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
      } finally {
        setLoading(false)
      }
  }

  // Initial data fetch and periodic refresh
  useEffect(() => {
    fetchAllData()

    // Refresh every 5 minutes
    const interval = setInterval(fetchAllData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  // Listen for time entry creation events from timer widget
  useEffect(() => {
    const handleTimeEntryCreated = () => {
      console.log('Time entry created, refreshing dashboard...')
      // Force a page refresh for now - this ensures all components update
      window.location.reload()
    }

    window.addEventListener('time-entry-created', handleTimeEntryCreated)
    return () => window.removeEventListener('time-entry-created', handleTimeEntryCreated)
  }, [])

  // Enhanced Action handlers (restored from MetricsCards)
  const handleCreateInvoice = async () => {
    if (timeStats && timeStats.unbilled.hours > 0) {
      // Pre-fill invoice with unbilled hours data
      const unbilledHours = timeStats.unbilled.hours
      const unbilledAmount = timeStats.unbilled.revenue

      // Navigate to invoice creation with pre-filled data
      router.push(`/dashboard/financieel?tab=facturen&action=create&unbilled_hours=${unbilledHours}&unbilled_amount=${unbilledAmount}`)
    } else {
      // Navigate to regular invoice creation
      router.push('/dashboard/financieel?tab=facturen&action=create')
    }
  }

  const handleReviewOverdue = () => {
    if (dashboardMetrics && dashboardMetrics.achterstallig_count > 0) {
      // Navigate to filtered invoice list showing only overdue
      router.push('/dashboard/financieel?tab=facturen&filter=overdue')
    }
  }

  const handleStartTimer = () => {
    // Navigate to time tracking tab and trigger timer start
    router.push('/dashboard/financieel?tab=tijd&action=start_timer')
  }

  const handleLogExpense = () => {
    // Navigate to expenses tab with OCR camera
    router.push('/dashboard/financieel?tab=uitgaven&action=add_expense')
  }

  const handleSmartAction = (alert: SmartAlert, actionIndex: number) => {
    const action = alert.actions[actionIndex]
    console.log(`🎯 Smart action triggered:`, action)

    switch (action.type) {
      case 'navigate':
        if (action.target) {
          router.push(action.target)
        }
        break
      case 'api_call':
        // TODO: Implement API calls
        console.log('API call action:', action.payload)
        break
      case 'external':
        if (action.target) {
          window.open(action.target, '_blank')
        }
        break
      case 'modal':
        // TODO: Implement modal system
        console.log('Modal action:', action.payload)
        break
    }
  }

  // Get explanation from decision tree results
  const getExplanation = (category: string) => {
    if (!healthScoreResults?.explanations) return null

    const explanation = healthScoreResults.explanations[category as keyof typeof healthScoreResults.explanations]
    if (!explanation) return null

    // Convert structured explanation to legacy format for compatibility
    const details: string[] = []

    explanation.details.forEach(section => {
      if (section.title) {
        details.push(section.title)
      }

      section.items.forEach(item => {
        switch (item.type) {
          case 'metric':
            const metricLine = item.description
              ? `${item.label}: ${item.value} (${item.description})`
              : `${item.label}: ${item.value}`
            details.push(metricLine)
            break

          case 'calculation':
            const calcLine = item.description
              ? `${item.label}: ${item.value} ${item.description}`
              : `${item.label}: ${item.value}`
            details.push(calcLine)
            break

          case 'standard':
            details.push(`   ${item.value}`)
            break

          case 'formula':
            details.push(item.formula || '')
            break

          case 'text':
            details.push(item.value || '')
            break
        }
      })

      // Add empty line between sections
      details.push('')
    })

    return {
      title: explanation.title,
      score: explanation.score,
      details: details.slice(0, -1) // Remove last empty line
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background mobile-safe-area">
        <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-6">
          <div className="animate-pulse space-y-6">
            <div className="h-20 bg-muted rounded-lg"></div>
            <div className="h-32 bg-muted rounded-lg"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 h-64 bg-muted rounded-lg"></div>
              <div className="space-y-4">
                <div className="h-32 bg-muted rounded-lg"></div>
                <div className="h-32 bg-muted rounded-lg"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background mobile-safe-area">
        <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <Card className="p-6 text-center">
            <div className="text-red-500 mb-2">Failed to load dashboard</div>
            <div className="text-sm text-muted-foreground mb-4">{error}</div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Retry
            </button>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 py-6 space-y-8">

        {/* Compact Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Financial Command Center</h1>
            <p className="text-sm text-muted-foreground">
              Your unified business intelligence dashboard
            </p>
          </div>
          <UserButton
            appearance={{
              elements: {
                userButtonAvatarBox: "w-8 h-8",
                userButtonPopoverCard: "border border-border",
                userButtonPopoverActionButton: "hover:bg-accent",
              }
            }}
            afterSignOutUrl="/sign-in"
          />
        </div>

        {/* Cohesive 3-Section Layout */}
        <div className="space-y-8">

          {/* Section 1: Collapsible Business Health Score + Key Metrics */}
          <div className="space-y-6">
            {/* Collapsible Business Health Score */}
            <Collapsible open={healthScoreOpen} onOpenChange={setHealthScoreOpen}>
              <Card className="p-4">
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Animated Health Icon */}
                      <div className={`relative p-3 rounded-xl transition-all duration-300 border-2 ${
                        healthScores.totalRounded >= 85 ? 'bg-gradient-to-br from-green-500/20 to-green-600/30 border-green-500/40' :
                        healthScores.totalRounded >= 70 ? 'bg-gradient-to-br from-blue-500/20 to-blue-600/30 border-blue-500/40' :
                        healthScores.totalRounded >= 50 ? 'bg-gradient-to-br from-orange-500/20 to-orange-600/30 border-orange-500/40' :
                        'bg-gradient-to-br from-red-500/20 to-red-600/30 border-red-500/40'
                      }`}
                      style={{
                        animation: healthScores.totalRounded < 70
                          ? 'pulse 1s ease-in-out 3' // Pulse 3 times (3 seconds total)
                          : undefined
                      }}>
                        <Activity className={`h-6 w-6 transition-colors duration-300 ${
                          healthScores.totalRounded >= 85 ? 'text-green-500' :
                          healthScores.totalRounded >= 70 ? 'text-blue-500' :
                          healthScores.totalRounded >= 50 ? 'text-orange-500' : 'text-red-500'
                        }`} />

                        {/* Achievement Ring */}
                        <div className="absolute -top-1 -right-1">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                            healthScores.totalRounded >= 85 ? 'bg-green-500 text-white' :
                            healthScores.totalRounded >= 70 ? 'bg-blue-500 text-white' :
                            healthScores.totalRounded >= 50 ? 'bg-orange-500 text-white' : 'bg-red-500 text-white'
                          }`}>
                            {healthScores.totalRounded >= 85 ? '👑' :
                             healthScores.totalRounded >= 70 ? '⭐' :
                             healthScores.totalRounded >= 50 ? '📊' : '⚠️'}
                          </div>
                        </div>
                      </div>

                      <div className="text-left">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-lg">Business Health Score</h3>
                          {/* Streak indicator - gamification prep */}
                          <div className="px-2 py-1 bg-primary/10 rounded-full">
                            <span className="text-xs font-semibold text-primary">Day 15</span>
                          </div>
                        </div>
                        <p className={`text-sm font-medium ${
                          healthScores.totalRounded >= 85 ? 'text-green-600' :
                          healthScores.totalRounded >= 70 ? 'text-blue-600' :
                          healthScores.totalRounded >= 50 ? 'text-orange-600' : 'text-red-600'
                        }`}>
                          {healthScores.totalRounded >= 85 ? '🚀 Crushing your targets! Keep it up!' :
                           healthScores.totalRounded >= 70 ? '💪 Strong performance this month' :
                           healthScores.totalRounded >= 50 ? '📈 Room for improvement - you got this!' :
                           '🎯 Let\'s turn this around together!'
                          }
                        </p>

                        {/* Next milestone indicator */}
                        <div className="mt-1">
                          {healthScores.totalRounded < 85 && (
                            <p className="text-xs text-muted-foreground">
                              {85 - healthScores.totalRounded} points to next level
                              {healthScores.totalRounded >= 70 ? ' 👑' : healthScores.totalRounded >= 50 ? ' ⭐' : ' 📊'}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Central Health Report Button */}
                      <button
                        onClick={() => setShowHealthReport(true)}
                        className="group relative px-6 py-3 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border-2 border-primary/20 hover:border-primary/40 transition-all duration-300 hover:scale-105 hover:shadow-lg"
                      >
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-primary/20 group-hover:bg-primary/30 transition-colors">
                            <FileText className="h-4 w-4 text-primary" />
                          </div>
                          <div className="text-left">
                            <div className="text-sm font-semibold text-primary">Health Report</div>
                            <div className="text-xs text-muted-foreground">Full Analysis</div>
                          </div>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" />
                      </button>

                      {/* Enhanced Score Display */}
                      <div className="text-right">
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`text-4xl font-black tracking-tight transition-all duration-500 ${
                            healthScores.totalRounded >= 85 ? 'text-green-500 drop-shadow-lg' :
                            healthScores.totalRounded >= 70 ? 'text-blue-500 drop-shadow-lg' :
                            healthScores.totalRounded >= 50 ? 'text-orange-500 drop-shadow-lg' : 'text-red-500 drop-shadow-lg'
                          }`}>
                            {healthScores.totalRounded}
                          </div>
                          <div className="text-xl text-muted-foreground font-medium">/100</div>
                        </div>

                        {/* Achievement Badge */}
                        <Badge className={`text-xs font-bold px-3 py-1 ${
                          healthScores.totalRounded >= 85 ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg' :
                          healthScores.totalRounded >= 70 ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg' :
                          healthScores.totalRounded >= 50 ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg' :
                          'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg'
                        }`}>
                          {healthScores.totalRounded >= 85 ? '👑 LEGEND' :
                           healthScores.totalRounded >= 70 ? '⭐ CHAMPION' :
                           healthScores.totalRounded >= 50 ? '📊 BUILDER' : '🎯 STARTER'
                          }
                        </Badge>
                      </div>

                      {/* Expand/Collapse with better animation */}
                      <div className="flex items-center">
                        <div className={`p-2 rounded-full transition-all duration-300 ${
                          healthScoreOpen ? 'bg-primary/10 rotate-180' : 'bg-muted/50 hover:bg-primary/10'
                        }`}>
                          <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-300" />
                        </div>
                      </div>
                    </div>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent className="space-y-6 mt-6">
                  {/* Enhanced Health Metrics - More Engaging & Gamified */}
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-3">
                    {/* Revenue Score Card */}
                    <button
                      onClick={() => setShowExplanation('revenue')}
                      className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 p-3 transition-all duration-300 hover:from-primary/10 hover:to-primary/20 hover:scale-105 hover:shadow-lg border border-primary/20 hover:border-primary/40"
                    >
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className="p-1 rounded-lg bg-primary/20 group-hover:bg-primary/30 transition-colors">
                              <DollarSign className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <div>
                              <p className="text-xs font-medium text-left leading-none">Total Revenue (MTD)</p>
                              <p className="text-xs text-muted-foreground leading-none">
                                {healthScores.revenue >= 20 ? 'Crushing it!' :
                                 healthScores.revenue >= 15 ? 'Strong performance' :
                                 healthScores.revenue >= 10 ? 'Room to grow' : 'Needs attention'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-baseline gap-1">
                              <span className="text-lg font-bold text-primary">{healthScores.revenue}</span>
                              <span className="text-xs text-muted-foreground">/25</span>
                            </div>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-primary/20 rounded-full h-1 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-primary to-primary/80 h-1 rounded-full transition-all duration-700 ease-out"
                            style={{ width: `${(healthScores.revenue / 25) * 100}%` }}
                          />
                        </div>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </button>

                    {/* Cash Flow Score Card */}
                    <button
                      onClick={() => setShowExplanation('cashflow')}
                      className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-green-500/5 to-green-500/10 p-3 transition-all duration-300 hover:from-green-500/10 hover:to-green-500/20 hover:scale-105 hover:shadow-lg border border-green-500/20 hover:border-green-500/40"
                    >
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className="p-1 rounded-lg bg-green-500/20 group-hover:bg-green-500/30 transition-colors">
                              <Activity className="h-3.5 w-3.5 text-green-500" />
                            </div>
                            <div>
                              <p className="text-xs font-medium text-left leading-none">Cash Flow</p>
                              <p className="text-xs text-muted-foreground leading-none">
                                {healthScores.cashflow >= 20 ? 'Money flowing!' :
                                 healthScores.cashflow >= 15 ? 'Healthy collections' :
                                 healthScores.cashflow >= 10 ? 'Some delays' : 'Collection issues'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-baseline gap-1">
                              <span className="text-lg font-bold text-green-600">{healthScores.cashflow}</span>
                              <span className="text-xs text-muted-foreground">/25</span>
                            </div>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-green-500/20 rounded-full h-1 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-green-500 to-green-400 h-1 rounded-full transition-all duration-700 ease-out"
                            style={{ width: `${(healthScores.cashflow / 25) * 100}%` }}
                          />
                        </div>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </button>

                    {/* Efficiency Score Card */}
                    <button
                      onClick={() => setShowExplanation('efficiency')}
                      className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500/5 to-blue-500/10 p-3 transition-all duration-300 hover:from-blue-500/10 hover:to-blue-500/20 hover:scale-105 hover:shadow-lg border border-blue-500/20 hover:border-blue-500/40"
                    >
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className="p-1 rounded-lg bg-blue-500/20 group-hover:bg-blue-500/30 transition-colors">
                              <Clock className="h-3.5 w-3.5 text-blue-500" />
                            </div>
                            <div>
                              <p className="text-xs font-medium text-left leading-none">Efficiency (MTD)</p>
                              <p className="text-xs text-muted-foreground leading-none">
                                {healthScores.efficiency >= 20 ? 'Peak productivity!' :
                                 healthScores.efficiency >= 15 ? 'Great momentum' :
                                 healthScores.efficiency >= 10 ? 'Building steam' : 'Ramp up needed'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-baseline gap-1">
                              <span className="text-lg font-bold text-blue-600">{healthScores.efficiency}</span>
                              <span className="text-xs text-muted-foreground">/25</span>
                            </div>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-blue-500/20 rounded-full h-1 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-blue-400 h-1 rounded-full transition-all duration-700 ease-out"
                            style={{ width: `${(healthScores.efficiency / 25) * 100}%` }}
                          />
                        </div>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </button>

                    {/* Risk Management Score Card */}
                    <button
                      onClick={() => setShowExplanation('risk')}
                      className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-500/5 to-purple-500/10 p-3 transition-all duration-300 hover:from-purple-500/10 hover:to-purple-500/20 hover:scale-105 hover:shadow-lg border border-purple-500/20 hover:border-purple-500/40"
                    >
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className="p-1 rounded-lg bg-purple-500/20 group-hover:bg-purple-500/30 transition-colors">
                              <Users className="h-3.5 w-3.5 text-purple-500" />
                            </div>
                            <div>
                              <p className="text-xs font-medium text-left leading-none">Risk Management</p>
                              <p className="text-xs text-muted-foreground leading-none">
                                {healthScores.risk >= 20 ? 'Well protected!' :
                                 healthScores.risk >= 15 ? 'Manageable risks' :
                                 healthScores.risk >= 10 ? 'Some concerns' : 'High risk areas'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-baseline gap-1">
                              <span className="text-lg font-bold text-purple-600">{healthScores.risk}</span>
                              <span className="text-xs text-muted-foreground">/25</span>
                            </div>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-purple-500/20 rounded-full h-1 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-purple-500 to-purple-400 h-1 rounded-full transition-all duration-700 ease-out"
                            style={{ width: `${(healthScores.risk / 25) * 100}%` }}
                          />
                        </div>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </button>
                  </div>

                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* 5-Card Metrics System - Restored from Backup */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 sm:gap-6">
              {/* Card 1: Revenue MTD */}
              <div className="mobile-card-glass space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-accent/20 rounded-lg">
                      <Euro className="h-5 w-5 text-accent chart-glow-orange" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold mobile-sharp-text">Revenue</h3>
                      <p className="text-sm text-muted-foreground h-8 flex flex-col justify-center">
                        <span>Total revenue</span>
                        <span>MTD</span>
                      </p>
                    </div>
                  </div>
                  <div className={`mobile-status-indicator ${
                    (((dashboardMetrics?.totale_registratie || 0) + ((timeStats?.subscription?.monthlyActiveUsers?.current || 0) * (timeStats?.subscription?.averageSubscriptionFee?.current || 0))) / mtdCalculations.mtdRevenueTarget) * 100 >= 100 ? 'status-active' :
                    (((dashboardMetrics?.totale_registratie || 0) + ((timeStats?.subscription?.monthlyActiveUsers?.current || 0) * (timeStats?.subscription?.averageSubscriptionFee?.current || 0))) / mtdCalculations.mtdRevenueTarget) * 100 >= 80 ? 'status-warning' : 'status-inactive'
                  }`}>
                    <span>{Math.round((((dashboardMetrics?.totale_registratie || 0) + ((timeStats?.subscription?.monthlyActiveUsers?.current || 0) * (timeStats?.subscription?.averageSubscriptionFee?.current || 0))) / mtdCalculations.mtdRevenueTarget) * 100)}%</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold metric-number text-accent">
                      {formatCurrency(Math.round((dashboardMetrics?.totale_registratie || 0) + ((timeStats?.subscription?.monthlyActiveUsers?.current || 0) * (timeStats?.subscription?.averageSubscriptionFee?.current || 0))))}
                    </span>
                    <span className="text-sm text-muted-foreground">/ €{Math.round(mtdCalculations.mtdRevenueTarget / 1000)}K MTD <span className="text-xs opacity-75">(€12K)</span></span>
                  </div>
                  <div className="flex items-center gap-2 h-8 flex-col justify-center">
                    <div className="flex items-center gap-2">
                      {mtdComparison.trend === 'positive' ? (
                        <TrendingUp className="h-4 w-4 text-green-400" />
                      ) : mtdComparison.trend === 'negative' ? (
                        <TrendingDown className="h-4 w-4 text-red-400" />
                      ) : (
                        <TrendingUp className="h-4 w-4 text-orange-400" />
                      )}
                      <span className={`text-sm font-medium ${
                        mtdComparison.trend === 'positive' ? 'text-green-400' :
                        mtdComparison.trend === 'negative' ? 'text-red-400' : 'text-orange-400'
                      }`}>
                        {mtdComparison.percentageChange >= 0 ? '+' : ''}{mtdComparison.percentageChange.toFixed(1)}%
                      </span>
                      <span className="text-sm text-muted-foreground">vs prev MTD</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="relative progress-bar">
                    <div
                      className={`progress-fill ${
                        (((dashboardMetrics?.totale_registratie || 0) + ((timeStats?.subscription?.monthlyActiveUsers?.current || 0) * (timeStats?.subscription?.averageSubscriptionFee?.current || 0))) / 12000) * 100 >= 100 ? 'progress-fill-success' :
                        (((dashboardMetrics?.totale_registratie || 0) + ((timeStats?.subscription?.monthlyActiveUsers?.current || 0) * (timeStats?.subscription?.averageSubscriptionFee?.current || 0))) / 12000) * 100 >= 80 ? 'progress-fill-warning' : 'progress-fill-warning'
                      }`}
                      style={{ width: `${Math.min((((dashboardMetrics?.totale_registratie || 0) + ((timeStats?.subscription?.monthlyActiveUsers?.current || 0) * (timeStats?.subscription?.averageSubscriptionFee?.current || 0))) / 12000) * 100, 100)}%` }}
                    />
                    {/* MTD Target Line */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-primary opacity-90"
                      style={{ left: `${Math.min((mtdCalculations.mtdRevenueTarget / 12000) * 100, 100)}%` }}
                      title={`MTD Target: ${formatCurrency(mtdCalculations.mtdRevenueTarget)}`}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/20">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Time Value</p>
                    <p className="text-sm font-bold text-primary">
                      {formatCurrency(dashboardMetrics?.totale_registratie || 0)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Subscriptions</p>
                    <p className="text-sm font-bold text-emerald-500">
                      {formatCurrency(Math.round((timeStats?.subscription?.monthlyActiveUsers?.current || 0) * (timeStats?.subscription?.averageSubscriptionFee?.current || 0)))}
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
                    ((timeStats?.thisMonth.hours || 0) / mtdCalculations.mtdHoursTarget) * 100 >= 100 ? 'status-active' :
                    ((timeStats?.thisMonth.hours || 0) / mtdCalculations.mtdHoursTarget) * 100 >= 75 ? 'status-warning' : 'status-inactive'
                  }`}>
                    <span>{Math.round(((timeStats?.thisMonth.hours || 0) / mtdCalculations.mtdHoursTarget) * 100)}%</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold metric-number text-green-400">{formatHours(timeStats?.thisMonth.hours || 0)}</span>
                    <span className="text-sm text-muted-foreground">/ {formatHours(mtdCalculations.mtdHoursTarget)} MTD <span className="text-xs opacity-75">({formatHours(160)})</span></span>
                  </div>
                  <div className="flex items-center gap-2 h-8 flex-col justify-center">
                    <div className="flex items-center gap-2">
                      {(timeStats?.thisWeek.trend === 'positive') ? (
                        <TrendingUp className="h-4 w-4 text-green-400" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-400" />
                      )}
                      <span className={`text-sm font-medium ${
                        (timeStats?.thisWeek.trend === 'positive') ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {(timeStats?.thisWeek.difference || 0) >= 0 ? '+' : ''}{(timeStats?.thisWeek.difference || 0).toFixed(1)}h
                      </span>
                      <span className="text-sm text-muted-foreground">this week</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="relative progress-bar">
                    <div
                      className={`progress-fill ${
                        ((timeStats?.thisMonth.hours || 0) / 160) * 100 >= 100 ? 'progress-fill-success' :
                        ((timeStats?.thisMonth.hours || 0) / 160) * 100 >= 75 ? 'progress-fill-warning' : 'progress-fill-primary'
                      }`}
                      style={{ width: `${Math.min(((timeStats?.thisMonth.hours || 0) / 160) * 100, 100)}%` }}
                    />
                    {/* MTD Target Line */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-green-500 opacity-90"
                      style={{ left: `${Math.min((mtdCalculations.mtdHoursTarget / 160) * 100, 100)}%` }}
                      title={`MTD Target: ${formatHours(mtdCalculations.mtdHoursTarget)}`}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/20">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">This Week</p>
                    <p className="text-sm font-bold text-primary">{formatHours(timeStats?.thisWeek.hours || 0)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Unbilled</p>
                    <p className="text-sm font-bold text-orange-400">{formatHours(timeStats?.unbilled.hours || 0)}</p>
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
                    ((timeStats?.thisMonth.hours || 0) > 0 ? Math.round((dashboardMetrics?.totale_registratie || 0) / timeStats.thisMonth.hours) : 0) >= 80 ? 'status-active' :
                    ((timeStats?.thisMonth.hours || 0) > 0 ? Math.round((dashboardMetrics?.totale_registratie || 0) / timeStats.thisMonth.hours) : 0) >= 60 ? 'status-warning' : 'status-inactive'
                  }`}>
                    <span>{Math.round((((timeStats?.thisMonth.hours || 0) > 0 ? Math.round((dashboardMetrics?.totale_registratie || 0) / timeStats.thisMonth.hours) : 0) / 100) * 100)}%</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold metric-number text-blue-400">
                      €{(timeStats?.thisMonth.hours || 0) > 0 ? ((dashboardMetrics?.totale_registratie || 0) / timeStats.thisMonth.hours).toFixed(1) : '0'}
                    </span>
                    <span className="text-sm text-muted-foreground">/ €100 target</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 h-8 flex-col justify-center">
                  <div className="flex items-center gap-2">
                    {rateComparison.trend === 'positive' ? (
                      <TrendingUp className="h-4 w-4 text-green-400" />
                    ) : rateComparison.trend === 'negative' ? (
                      <TrendingDown className="h-4 w-4 text-red-400" />
                    ) : (
                      <TrendingUp className="h-4 w-4 text-orange-400" />
                    )}
                    <span className={`text-sm font-medium ${
                      rateComparison.trend === 'positive' ? 'text-green-400' :
                      rateComparison.trend === 'negative' ? 'text-red-400' : 'text-orange-400'
                    }`}>
                      {rateComparison.percentageChange >= 0 ? '+' : ''}{rateComparison.percentageChange.toFixed(1)}%
                    </span>
                    <span className="text-sm text-muted-foreground">vs prev month</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="relative progress-bar">
                    <div
                      className={`progress-fill ${
                        ((timeStats?.thisMonth.hours || 0) > 0 ? Math.round((dashboardMetrics?.totale_registratie || 0) / timeStats.thisMonth.hours) : 0) >= 80 ? 'progress-fill-success' :
                        ((timeStats?.thisMonth.hours || 0) > 0 ? Math.round((dashboardMetrics?.totale_registratie || 0) / timeStats.thisMonth.hours) : 0) >= 60 ? 'progress-fill-warning' : 'progress-fill-primary'
                      }`}
                      style={{ width: `${Math.min(((timeStats?.thisMonth.hours || 0) > 0 ? Math.round((dashboardMetrics?.totale_registratie || 0) / timeStats.thisMonth.hours) : 0), 100)}%` }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/20">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Hours</p>
                    <p className="text-sm font-bold text-primary">{formatHours(timeStats?.thisMonth.hours || 0)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Revenue</p>
                    <p className="text-sm font-bold text-blue-400">{formatCurrency(dashboardMetrics?.totale_registratie || 0)}</p>
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
                        <span>Active</span>
                        <span>users</span>
                      </p>
                    </div>
                  </div>
                  <div className={`mobile-status-indicator ${
                    ((timeStats?.subscription?.monthlyActiveUsers?.current || 0) / 15) * 100 >= 100 ? 'status-active' :
                    ((timeStats?.subscription?.monthlyActiveUsers?.current || 0) / 15) * 100 >= 80 ? 'status-warning' : 'status-inactive'
                  }`}>
                    <span>{Math.round(((timeStats?.subscription?.monthlyActiveUsers?.current || 0) / 15) * 100)}%</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold metric-number text-purple-400">
                      {(timeStats?.subscription?.monthlyActiveUsers?.current || 0).toLocaleString()}
                    </span>
                    <span className="text-sm text-muted-foreground">/ 15 target</span>
                  </div>
                  <div className="flex items-center gap-2 h-8 flex-col justify-center">
                    <div className="flex items-center gap-2">
                      {(timeStats?.subscription?.monthlyActiveUsers?.trend === 'positive') ? (
                        <TrendingUp className="h-4 w-4 text-green-400" />
                      ) : (timeStats?.subscription?.monthlyActiveUsers?.trend === 'negative') ? (
                        <TrendingDown className="h-4 w-4 text-red-400" />
                      ) : (
                        <Activity className="h-4 w-4 text-orange-400" />
                      )}
                      <span className={`text-sm font-medium ${
                        (timeStats?.subscription?.monthlyActiveUsers?.trend === 'positive') ? 'text-green-400' :
                        (timeStats?.subscription?.monthlyActiveUsers?.trend === 'negative') ? 'text-red-400' : 'text-orange-400'
                      }`}>
                        {(timeStats?.subscription?.monthlyActiveUsers?.growth || 0) >= 0 ? '+' : ''}
                        {Math.round(timeStats?.subscription?.monthlyActiveUsers?.growth || 0)}%
                      </span>
                      <span className="text-sm text-muted-foreground">vs last month</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="relative progress-bar">
                    <div
                      className={`progress-fill ${
                        (timeStats?.subscription?.monthlyActiveUsers?.trend === 'positive') ? 'progress-fill-success' :
                        (timeStats?.subscription?.monthlyActiveUsers?.trend === 'neutral') ? 'progress-fill-warning' : 'progress-fill-primary'
                      }`}
                      style={{ width: `${Math.min(((timeStats?.subscription?.monthlyActiveUsers?.current || 0) / 15) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/20">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Current</p>
                    <p className="text-sm font-bold text-purple-400">{(timeStats?.subscription?.monthlyActiveUsers?.current || 0).toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Previous</p>
                    <p className="text-sm font-bold text-muted-foreground">{(timeStats?.subscription?.monthlyActiveUsers?.previous || 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Card 5: Average Subscription Fee */}
              <div className="mobile-card-glass space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/20 rounded-lg">
                      <Target className="h-5 w-5 text-emerald-400 chart-glow-emerald" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold mobile-sharp-text">Avg Fee</h3>
                      <p className="text-sm text-muted-foreground h-8 flex flex-col justify-center">
                        <span>Subscription</span>
                        <span>per user</span>
                      </p>
                    </div>
                  </div>
                  <div className={`mobile-status-indicator ${
                    ((timeStats?.subscription?.averageSubscriptionFee?.current || 0) / 75) * 100 >= 100 ? 'status-active' :
                    ((timeStats?.subscription?.averageSubscriptionFee?.current || 0) / 75) * 100 >= 80 ? 'status-warning' : 'status-inactive'
                  }`}>
                    <span>{Math.round(((timeStats?.subscription?.averageSubscriptionFee?.current || 0) / 75) * 100)}%</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold metric-number text-emerald-400">
                      €{(timeStats?.subscription?.averageSubscriptionFee?.current || 0).toFixed(1)}
                    </span>
                    <span className="text-sm text-muted-foreground">/ €75 target</span>
                  </div>
                  <div className="flex items-center gap-2 h-8 flex-col justify-center">
                    <div className="flex items-center gap-2">
                      {(timeStats?.subscription?.averageSubscriptionFee?.trend === 'positive') ? (
                        <TrendingUp className="h-4 w-4 text-green-400" />
                      ) : (timeStats?.subscription?.averageSubscriptionFee?.trend === 'negative') ? (
                        <TrendingDown className="h-4 w-4 text-red-400" />
                      ) : (
                        <Activity className="h-4 w-4 text-orange-400" />
                      )}
                      <span className={`text-sm font-medium ${
                        (timeStats?.subscription?.averageSubscriptionFee?.trend === 'positive') ? 'text-green-400' :
                        (timeStats?.subscription?.averageSubscriptionFee?.trend === 'negative') ? 'text-red-400' : 'text-orange-400'
                      }`}>
                        {(timeStats?.subscription?.averageSubscriptionFee?.growth || 0) >= 0 ? '+' : ''}
                        {Math.round(timeStats?.subscription?.averageSubscriptionFee?.growth || 0)}%
                      </span>
                      <span className="text-sm text-muted-foreground">vs last month</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="relative progress-bar">
                    <div
                      className={`progress-fill ${
                        (timeStats?.subscription?.averageSubscriptionFee?.trend === 'positive') ? 'progress-fill-success' :
                        (timeStats?.subscription?.averageSubscriptionFee?.trend === 'neutral') ? 'progress-fill-warning' : 'progress-fill-primary'
                      }`}
                      style={{ width: `${Math.min(((timeStats?.subscription?.averageSubscriptionFee?.current || 0) / 75) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/20">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Current</p>
                    <p className="text-sm font-bold text-emerald-400">€{(timeStats?.subscription?.averageSubscriptionFee?.current || 0).toFixed(1)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Previous</p>
                    <p className="text-sm font-bold text-muted-foreground">€{(timeStats?.subscription?.averageSubscriptionFee?.previous || 0).toFixed(1)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Management Dashboard - 3 Equal Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">

            {/* Active Timer Widget */}
            <div className="flex h-full">
              <ActiveTimerWidget
                onNavigateToTimer={() => router.push('/dashboard/financieel?tab=tijd')}
                className="w-full"
              />
            </div>

            {/* Client Health Dashboard */}
            <div className="flex h-full">
              <ClientHealthDashboard
                onViewAllClients={() => router.push('/dashboard/financieel?tab=klanten')}
                className="w-full"
              />
            </div>

            {/* Cash Flow Forecast */}
            <div className="flex h-full md:col-span-2 lg:col-span-1">
              <CashFlowForecast
                dashboardMetrics={dashboardMetrics}
                className="w-full"
              />
            </div>
          </div>

          {/* Section 3: Analysis & Charts */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Financial Analysis</h2>
                <p className="text-sm text-muted-foreground">Performance insights and trends</p>
              </div>
            </div>

            {/* 4-Column Analytics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground">Profit Margin</p>
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                <p className="text-lg font-bold text-primary">
                  {dashboardMetrics && timeStats ?
                    Math.round(((timeStats.thisMonth.revenue - 1200) / timeStats.thisMonth.revenue) * 100) : 0}%
                </p>
                <p className="text-xs text-muted-foreground">+3.2% improved</p>
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground">Efficiency</p>
                  <Target className="h-4 w-4 text-green-500" />
                </div>
                <p className="text-lg font-bold text-green-500">
                  {timeStats ? Math.round((timeStats.thisMonth.hours / 160) * 100) : 0}%
                </p>
                <p className="text-xs text-muted-foreground">On track</p>
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground">Collection</p>
                  <CreditCard className="h-4 w-4 text-blue-500" />
                </div>
                <p className="text-lg font-bold text-blue-500">
                  {dashboardMetrics ?
                    Math.round((1 - (dashboardMetrics.achterstallig / dashboardMetrics.totale_registratie)) * 100) : 100}%
                </p>
                <p className={`text-xs ${
                  (dashboardMetrics?.achterstallig || 0) === 0 ? 'text-green-500' : 'text-orange-500'
                }`}>
                  {(dashboardMetrics?.achterstallig || 0) === 0 ? 'All current' : 'Action needed'}
                </p>
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground">BTW Status</p>
                  <FileText className="h-4 w-4 text-purple-500" />
                </div>
                <p className="text-lg font-bold text-purple-500">Q4</p>
                <p className="text-xs text-green-500">Compliant</p>
              </Card>
            </div>

            {/* Charts */}
            <Card className="p-6">
              <div className="mb-4">
                <h3 className="font-semibold">Performance Trends</h3>
                <p className="text-sm text-muted-foreground">Revenue, hours, and efficiency over time</p>
              </div>
              <FinancialCharts />
            </Card>
          </div>
        </div>

        {/* Health Score Explanation Modal */}
        {showExplanation && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-card border rounded-xl max-w-md w-full max-h-[80vh] overflow-y-auto p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  {getExplanation(showExplanation)?.title}
                </h3>
                <button
                  onClick={() => setShowExplanation(null)}
                  className="p-1 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm text-muted-foreground">Current Score:</span>
                  <span className="text-lg font-bold text-primary">
                    {getExplanation(showExplanation)?.score}/25
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {(() => {
                  const details = getExplanation(showExplanation)?.details || []
                  const sections = []
                  let currentSection = []

                  // Group details into logical sections
                  for (const detail of details) {
                    if (detail === '') {
                      if (currentSection.length > 0) {
                        sections.push(currentSection)
                        currentSection = []
                      }
                    } else {
                      currentSection.push(detail)
                    }
                  }
                  if (currentSection.length > 0) {
                    sections.push(currentSection)
                  }

                  return sections.map((section, sectionIndex) => {
                    const isCalculationSection = section.some(detail =>
                      detail.startsWith('Calculation') ||
                      detail.startsWith('Official Accounting') ||
                      detail.includes('Official Revenue Metrics') ||
                      detail.includes('Efficiency Analysis') ||
                      detail.includes('Risk Assessment Analysis') ||
                      detail.startsWith('Frequency-Aware Risk')
                    )

                    if (isCalculationSection) {
                      return (
                        <div key={sectionIndex} className="bg-muted/50 rounded-lg p-4 border">
                          <h5 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                            {section[0].startsWith('📊') ? section[0] : `📊 ${section[0]}`}
                          </h5>
                          <div className="space-y-2">
                            {section.slice(1).map((detail, index) => (
                              <div key={index} className="flex items-start gap-3">
                                {detail.match(/^\d+\./) ? (
                                  <>
                                    <span className="flex-shrink-0 w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-semibold mt-0.5">
                                      {detail.charAt(0)}
                                    </span>
                                    <div className="flex-1">
                                      <div className="font-medium text-sm">{detail.split('→')[0]}</div>
                                      {detail.includes('→') && (
                                        <div className="text-primary font-semibold text-sm">→ {detail.split('→')[1]}</div>
                                      )}
                                      {detail.includes('Standard:') && (
                                        <div className="text-xs text-muted-foreground mt-1">
                                          {detail.split('Standard: ')[1]}
                                        </div>
                                      )}
                                    </div>
                                  </>
                                ) : detail.startsWith('Score =') || detail.includes('=') ? (
                                  <div className="w-full font-mono text-xs bg-background p-2 rounded border">
                                    {detail}
                                  </div>
                                ) : detail.startsWith('   ') ? (
                                  <div className="ml-9 text-xs text-muted-foreground">
                                    {detail.trim()}
                                  </div>
                                ) : (
                                  <div className="w-full text-sm text-muted-foreground">
                                    {detail}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    } else {
                      // Data section - show key metrics in cards
                      return (
                        <div key={sectionIndex} className="grid grid-cols-2 gap-3">
                          {section.map((detail, index) => {
                            if (detail.includes(':')) {
                              const [label, value] = detail.split(':').map(s => s.trim())
                              return (
                                <div key={index} className="bg-background rounded-lg p-3 border">
                                  <div className="text-xs text-muted-foreground mb-1">{label}</div>
                                  <div className="font-semibold text-sm">{value}</div>
                                </div>
                              )
                            } else {
                              return (
                                <div key={index} className="col-span-2 text-sm text-muted-foreground">
                                  {detail}
                                </div>
                              )
                            }
                          })}
                        </div>
                      )
                    }
                  })
                })()}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowExplanation(null)}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Comprehensive Health Report Modal */}
        {showHealthReport && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-card border rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    healthScores.totalRounded >= 85 ? 'bg-green-500/20' :
                    healthScores.totalRounded >= 70 ? 'bg-blue-500/20' :
                    healthScores.totalRounded >= 50 ? 'bg-orange-500/20' : 'bg-red-500/20'
                  }`}>
                    <FileText className={`h-6 w-6 ${
                      healthScores.totalRounded >= 85 ? 'text-green-500' :
                      healthScores.totalRounded >= 70 ? 'text-blue-500' :
                      healthScores.totalRounded >= 50 ? 'text-orange-500' : 'text-red-500'
                    }`} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Business Health Report</h2>
                    <p className="text-muted-foreground">Complete analysis & recommended actions</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowHealthReport(false)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Overall Score Summary */}
              <div className={`p-6 rounded-xl mb-6 ${
                healthScores.totalRounded >= 85 ? 'bg-gradient-to-r from-green-500/10 to-green-600/5 border border-green-500/20' :
                healthScores.totalRounded >= 70 ? 'bg-gradient-to-r from-blue-500/10 to-blue-600/5 border border-blue-500/20' :
                healthScores.totalRounded >= 50 ? 'bg-gradient-to-r from-orange-500/10 to-orange-600/5 border border-orange-500/20' :
                'bg-gradient-to-r from-red-500/10 to-red-600/5 border border-red-500/20'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold mb-2">Overall Business Health</h3>
                    <p className={`font-medium ${
                      healthScores.totalRounded >= 85 ? 'text-green-600' :
                      healthScores.totalRounded >= 70 ? 'text-blue-600' :
                      healthScores.totalRounded >= 50 ? 'text-orange-600' : 'text-red-600'
                    }`}>
                      {healthScores.totalRounded >= 85 ? '🚀 Exceptional Performance - You\'re crushing it!' :
                       healthScores.totalRounded >= 70 ? '💪 Strong Performance - Keep up the great work!' :
                       healthScores.totalRounded >= 50 ? '📈 Room for Growth - You\'re on the right track!' :
                       '🎯 Action Required - Let\'s turn this around together!'
                      }
                    </p>
                  </div>
                  <div className="text-right">
                    <div className={`text-4xl font-black ${
                      healthScores.totalRounded >= 85 ? 'text-green-500' :
                      healthScores.totalRounded >= 70 ? 'text-blue-500' :
                      healthScores.totalRounded >= 50 ? 'text-orange-500' : 'text-red-500'
                    }`}>
                      {healthScores.totalRounded}/100
                    </div>
                    <Badge className={`${
                      healthScores.totalRounded >= 85 ? 'bg-green-500 text-white' :
                      healthScores.totalRounded >= 70 ? 'bg-blue-500 text-white' :
                      healthScores.totalRounded >= 50 ? 'bg-orange-500 text-white' : 'bg-red-500 text-white'
                    }`}>
                      {healthScores.totalRounded >= 85 ? '👑 LEGEND' :
                       healthScores.totalRounded >= 70 ? '⭐ CHAMPION' :
                       healthScores.totalRounded >= 50 ? '📊 BUILDER' : '🎯 STARTER'
                      }
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Detailed Score Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Revenue Health */}
                <button
                  onClick={() => setShowExplanation('revenue')}
                  className="p-4 border rounded-lg hover:shadow-md hover:border-primary/40 transition-all duration-200 text-left w-full"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-primary" />
                      <h4 className="font-semibold">Revenue Health (MTD)</h4>
                    </div>
                    <span className="text-lg font-bold text-primary">{healthScores.revenue}/25</span>
                  </div>
                  <div className="w-full bg-primary/20 rounded-full h-2 mb-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-500"
                      style={{ width: `${(healthScores.revenue / 25) * 100}%` }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {healthScores.revenue >= 20 ? 'Excellent revenue performance!' :
                     healthScores.revenue >= 15 ? 'Strong revenue growth' :
                     healthScores.revenue >= 10 ? 'Steady progress, room to improve' : 'Revenue needs immediate attention'}
                  </p>
                </button>

                {/* Cash Flow Health */}
                <button
                  onClick={() => setShowExplanation('cashflow')}
                  className="p-4 border rounded-lg hover:shadow-md hover:border-green-500/40 transition-all duration-200 text-left w-full"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-green-500" />
                      <h4 className="font-semibold">Cash Flow Health</h4>
                    </div>
                    <span className="text-lg font-bold text-green-600">{healthScores.cashflow}/25</span>
                  </div>
                  <div className="w-full bg-green-500/20 rounded-full h-2 mb-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${(healthScores.cashflow / 25) * 100}%` }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {healthScores.cashflow >= 20 ? 'Outstanding cash management!' :
                     healthScores.cashflow >= 15 ? 'Healthy cash flow patterns' :
                     healthScores.cashflow >= 10 ? 'Some collection delays' : 'Cash flow requires urgent attention'}
                  </p>
                </button>

                {/* Efficiency Health */}
                <button
                  onClick={() => setShowExplanation('efficiency')}
                  className="p-4 border rounded-lg hover:shadow-md hover:border-blue-500/40 transition-all duration-200 text-left w-full"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-blue-500" />
                      <h4 className="font-semibold">Efficiency Health (MTD)</h4>
                    </div>
                    <span className="text-lg font-bold text-blue-600">{healthScores.efficiency}/25</span>
                  </div>
                  <div className="w-full bg-blue-500/20 rounded-full h-2 mb-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${(healthScores.efficiency / 25) * 100}%` }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {healthScores.efficiency >= 20 ? 'Peak productivity achieved!' :
                     healthScores.efficiency >= 15 ? 'Strong efficiency levels' :
                     healthScores.efficiency >= 10 ? 'Building momentum' : 'Efficiency needs improvement'}
                  </p>
                </button>

                {/* Risk Management */}
                <button
                  onClick={() => setShowExplanation('risk')}
                  className="p-4 border rounded-lg hover:shadow-md hover:border-purple-500/40 transition-all duration-200 text-left w-full"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-purple-500" />
                      <h4 className="font-semibold">Risk Management</h4>
                    </div>
                    <span className="text-lg font-bold text-purple-600">{healthScores.risk}/25</span>
                  </div>
                  <div className="w-full bg-purple-500/20 rounded-full h-2 mb-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${(healthScores.risk / 25) * 100}%` }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {healthScores.risk >= 20 ? 'Well-protected business!' :
                     healthScores.risk >= 15 ? 'Manageable risk levels' :
                     healthScores.risk >= 10 ? 'Some risk concerns' : 'High-risk areas need attention'}
                  </p>
                </button>
              </div>

              {/* Recommended Actions */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Recommended Actions
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Priority Actions based on scores */}
                  {/* Cash Flow - Always show with dynamic priority */}
                  <div className={`p-4 rounded-lg ${
                    healthScores.cashflow < 15
                      ? 'bg-red-500/10 border border-red-500/20'
                      : healthScores.cashflow < 20
                        ? 'bg-yellow-500/10 border border-yellow-500/20'
                        : 'bg-green-500/10 border border-green-500/20'
                  }`}>
                    <h4 className={`font-semibold mb-2 flex items-center gap-2 ${
                      healthScores.cashflow < 15
                        ? 'text-red-600'
                        : healthScores.cashflow < 20
                          ? 'text-yellow-600'
                          : 'text-green-600'
                    }`}>
                      {healthScores.cashflow < 15 ? '🚨' : healthScores.cashflow < 20 ? '⚠️' : '✅'}
                      Cash Flow Management
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        healthScores.cashflow < 15
                          ? 'bg-red-500/20 text-red-600'
                          : healthScores.cashflow < 20
                            ? 'bg-yellow-500/20 text-yellow-600'
                            : 'bg-green-500/20 text-green-600'
                      }`}>
                        {healthScores.cashflow < 15 ? 'HIGH PRIORITY' : healthScores.cashflow < 20 ? 'MONITOR' : 'OPTIMIZED'}
                      </span>
                    </h4>
                      <div className="space-y-3 mb-4">
                        {(() => {
                          const recommendations = []
                          const overdueAmount = dashboardMetrics?.achterstallig || 0
                          const totalRevenue = (dashboardMetrics?.totale_registratie || 0)
                          const paidAmount = totalRevenue - overdueAmount
                          const overdueCount = dashboardMetrics?.achterstallig_count || 0

                          // Calculate current score components (ranked by point impact)
                          const operatingCashFlowRatio = totalRevenue > 0 ? paidAmount / totalRevenue : 1
                          const dsoEquivalent = totalRevenue > 0 ? (overdueAmount / totalRevenue) * 30 : 0

                          // Rank by potential point gain (highest impact first)

                          // 1. Operating Cash Flow Ratio (up to 10 points) - HIGHEST IMPACT
                          if (operatingCashFlowRatio < 0.90) {
                            const targetCollection = totalRevenue * 0.90
                            const needToCollect = targetCollection - paidAmount
                            const currentOcfScore = operatingCashFlowRatio >= 0.75 ? 7 : operatingCashFlowRatio >= 0.60 ? 5 : 3
                            const targetOcfScore = 10
                            recommendations.push(`🎯 Collect €${Math.round(needToCollect)} overdue to reach 90% ratio (+${targetOcfScore - currentOcfScore} pts)`)
                          }

                          // 2. DSO Equivalent (up to 4 points) - MEDIUM IMPACT
                          if (dsoEquivalent > 15) {
                            const maxAllowedOverdue = totalRevenue * (15/30) // 15 days = 50% of 30-day period
                            const excessOverdue = overdueAmount - maxAllowedOverdue
                            const currentDsoScore = dsoEquivalent <= 30 ? 3 : dsoEquivalent <= 45 ? 2 : 1
                            recommendations.push(`⏰ Reduce overdue by €${Math.round(Math.max(excessOverdue, 0))} to achieve <15 day DSO (+${4 - currentDsoScore} pts)`)
                          }

                          // 3. Collection Risk by count (up to 3 points) - LOWER IMPACT
                          if (overdueCount > 2) {
                            const currentRiskScore = overdueCount <= 4 ? 2 : overdueCount <= 6 ? 1 : 0
                            recommendations.push(`📋 Clear ${overdueCount - 2} overdue invoices to minimize collection risk (+${3 - currentRiskScore} pts)`)
                          }

                          // If already optimized, suggest maintenance
                          if (recommendations.length === 0) {
                            recommendations.push('✅ Excellent cash flow - maintain current collection efficiency')
                            recommendations.push('💡 Consider offering early payment discounts for further optimization')
                          }

                          // Ensure we have 3 recommendations
                          if (recommendations.length < 3) {
                            if (operatingCashFlowRatio >= 0.75) {
                              recommendations.push('📈 Implement automated payment reminders to maintain performance')
                            } else {
                              recommendations.push('🚨 Critical: Focus on immediate collections - cash flow below safe levels')
                            }
                          }

                          return recommendations.slice(0, 3).map((rec, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold mt-0.5 ${
                                healthScores.cashflow < 15
                                  ? 'bg-red-500/20 text-red-600'
                                  : healthScores.cashflow < 20
                                    ? 'bg-yellow-500/20 text-yellow-600'
                                    : 'bg-green-500/20 text-green-600'
                              }`}>
                                {i + 1}
                              </span>
                              <span className="flex-1">{rec}</span>
                            </div>
                          ))
                        })()}
                      </div>
                      <div className="flex justify-center">
                        <button
                          onClick={() => {
                            setShowHealthReport(false)
                            const params = new URLSearchParams(window.location.search)
                            params.set('tab', 'facturen')
                            window.history.pushState({}, '', `${window.location.pathname}?${params}`)
                          }}
                          className={`flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors ${
                            healthScores.cashflow < 15
                              ? 'bg-red-500 hover:bg-red-600'
                              : healthScores.cashflow < 20
                                ? 'bg-yellow-500 hover:bg-yellow-600'
                                : 'bg-green-500 hover:bg-green-600'
                          }`}
                        >
                          <FileText className="h-4 w-4" />
                          {(dashboardMetrics?.achterstallig || 0) > 0 ? 'Manage Overdue Invoices' : 'Review Invoice Status'}
                        </button>
                      </div>
                    </div>

                  {/* Revenue Growth - Always show with dynamic priority */}
                  <div className={`p-4 rounded-lg ${
                    healthScores.revenue < 15
                      ? 'bg-red-500/10 border border-red-500/20'
                      : healthScores.revenue < 20
                        ? 'bg-yellow-500/10 border border-yellow-500/20'
                        : 'bg-green-500/10 border border-green-500/20'
                  }`}>
                    <h4 className={`font-semibold mb-2 flex items-center gap-2 ${
                      healthScores.revenue < 15
                        ? 'text-red-600'
                        : healthScores.revenue < 20
                          ? 'text-yellow-600'
                          : 'text-green-600'
                    }`}>
                      {healthScores.revenue < 15 ? '🚨' : healthScores.revenue < 20 ? '⚠️' : '✅'}
                      Revenue Growth
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        healthScores.revenue < 15
                          ? 'bg-red-500/20 text-red-600'
                          : healthScores.revenue < 20
                            ? 'bg-yellow-500/20 text-yellow-600'
                            : 'bg-green-500/20 text-green-600'
                      }`}>
                        {healthScores.revenue < 15 ? 'HIGH PRIORITY' : healthScores.revenue < 20 ? 'MONITOR' : 'OPTIMIZED'}
                      </span>
                    </h4>
                      <div className="space-y-3 mb-4">
                        {(() => {
                          const recommendations = []
                          const registeredRevenue = dashboardMetrics?.totale_registratie || 0
                          const subscriptionRevenue = (timeStats?.subscription?.monthlyActiveUsers?.current || 0) * (timeStats?.subscription?.averageSubscriptionFee?.current || 0)
                          const currentRevenue = registeredRevenue + subscriptionRevenue
                          const mtdTarget = mtdCalculations.mtdRevenueTarget
                          const progressPercentage = mtdTarget > 0 ? (currentRevenue / mtdTarget) * 100 : 0
                          const shortfall = Math.max(0, mtdTarget - currentRevenue)

                          // Current score calculation: (currentRevenue / mtdTarget) * 25
                          const currentScore = Math.min(Math.round((currentRevenue / mtdTarget) * 25), 25)
                          const maxScore = 25

                          // Rank recommendations by revenue impact and point potential

                          // 1. Direct revenue gap closure (highest impact)
                          if (shortfall > 0) {
                            const pointsToGain = Math.min(Math.round((shortfall / mtdTarget) * 25), maxScore - currentScore)
                            recommendations.push(`💰 Generate €${Math.round(shortfall)} more revenue to hit MTD target (+${pointsToGain} pts to ${Math.min(currentScore + pointsToGain, 25)}/25)`)
                          }

                          // 2. Focus on highest-leverage revenue source
                          if (progressPercentage < 100) {
                            const currentRate = timeStats?.thisMonth.hours > 0 ? Math.round(registeredRevenue / timeStats.thisMonth.hours) : 0
                            const hoursNeeded = shortfall > 0 && currentRate > 0 ? Math.round(shortfall / currentRate) : 0

                            if (currentRate > 0 && hoursNeeded > 0 && hoursNeeded <= 40) {
                              recommendations.push(`⏱️ Log ${hoursNeeded}h more billable time at €${currentRate}/h to close revenue gap`)
                            } else if (currentRate < 75) {
                              const rateIncrease = 75 - currentRate
                              const additionalRevenue = timeStats?.thisMonth.hours ? timeStats.thisMonth.hours * rateIncrease : 0
                              recommendations.push(`📈 Increase rates by €${rateIncrease}/h to generate €${Math.round(additionalRevenue)} additional MTD revenue`)
                            } else {
                              recommendations.push(`🎯 Focus on high-value client work to maximize revenue per hour`)
                            }
                          }

                          // 3. Subscription revenue optimization (if applicable)
                          if (subscriptionRevenue < 1000 && timeStats?.subscription?.monthlyActiveUsers?.current) {
                            const targetUsers = 15
                            const targetFee = 75
                            const targetTotal = targetUsers * targetFee
                            const currentUsers = timeStats.subscription.monthlyActiveUsers.current
                            const currentFee = timeStats.subscription.averageSubscriptionFee?.current || 0
                            const currentTotal = currentUsers * currentFee
                            const additionalPotential = targetTotal - currentTotal
                            recommendations.push(`📊 Optimize subscription pricing: €${Math.round(additionalPotential)} additional potential (target ${targetUsers} users × €${targetFee} vs current ${currentUsers} users × €${Math.round(currentFee)})`)
                          }

                          // 4. Excellence maintenance
                          if (progressPercentage >= 100) {
                            recommendations.push(`🎉 Exceeding MTD target by ${Math.round(progressPercentage - 100)}% - maintain momentum`)
                            if (currentScore === maxScore) {
                              recommendations.push(`🚀 Perfect revenue score! Consider raising monthly targets for growth`)
                            }
                          }

                          // Ensure we have actionable recommendations
                          if (recommendations.length === 0) {
                            recommendations.push('🔄 Monitor revenue streams and optimize high-performing channels')
                          }

                          return recommendations.slice(0, 3).map((rec, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold mt-0.5 ${
                                healthScores.revenue < 15
                                  ? 'bg-red-500/20 text-red-600'
                                  : healthScores.revenue < 20
                                    ? 'bg-yellow-500/20 text-yellow-600'
                                    : 'bg-green-500/20 text-green-600'
                              }`}>
                                {i + 1}
                              </span>
                              <span className="flex-1">{rec}</span>
                            </div>
                          ))
                        })()}
                      </div>
                    </div>

                  {/* Risk Management - Always show with dynamic priority */}
                  <div className={`p-4 rounded-lg ${
                    healthScores.risk < 15
                      ? 'bg-red-500/10 border border-red-500/20'
                      : healthScores.risk < 20
                        ? 'bg-yellow-500/10 border border-yellow-500/20'
                        : 'bg-green-500/10 border border-green-500/20'
                  }`}>
                    <h4 className={`font-semibold mb-2 flex items-center gap-2 ${
                      healthScores.risk < 15
                        ? 'text-red-600'
                        : healthScores.risk < 20
                          ? 'text-yellow-600'
                          : 'text-green-600'
                    }`}>
                      {healthScores.risk < 15 ? '🚨' : healthScores.risk < 20 ? '⚠️' : '✅'}
                      Risk Management
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        healthScores.risk < 15
                          ? 'bg-red-500/20 text-red-600'
                          : healthScores.risk < 20
                            ? 'bg-yellow-500/20 text-yellow-600'
                            : 'bg-green-500/20 text-green-600'
                      }`}>
                        {healthScores.risk < 15 ? 'HIGH PRIORITY' : healthScores.risk < 20 ? 'MONITOR' : 'OPTIMIZED'}
                      </span>
                    </h4>
                      <div className="space-y-3 mb-4">
                        {(() => {
                          const recommendations = []
                          // Calculate exact score components from Risk Management scoring: 25 - readyToBillRisk - workloadRisk - clientConcentrationRisk
                          const readyToBillAmount = dashboardMetrics?.factureerbaar || 0
                          const currentHours = timeStats?.thisMonth.hours || 0

                          // Score calculation components (rank by point penalty impact)
                          const readyToBillRisk = Math.round(Math.min((readyToBillAmount / 3000) * 12, 12)) // Max 12 points penalty
                          const workloadRisk = currentHours > 200 ? 5 : currentHours < 80 ? 3 : 0 // Max 5 points penalty
                          const clientConcentrationRisk = 3 // Fixed 3 points (moderate risk assumption)

                          const currentScore = Math.max(0, 25 - readyToBillRisk - workloadRisk - clientConcentrationRisk)

                          // Rank by potential point recovery (highest impact first)

                          // 1. Ready-to-Bill Risk (up to 12 points) - HIGHEST IMPACT
                          if (readyToBillRisk > 0) {
                            const targetReduction = Math.min(readyToBillAmount - 3000, readyToBillAmount)
                            const pointsToGain = Math.min(readyToBillRisk, 12)
                            recommendations.push(`📋 Invoice €${Math.round(Math.max(targetReduction, 0))} ready-to-bill to reduce invoice processing risk (+${pointsToGain} pts)`)
                          }

                          // 2. Workload Risk (up to 5 points) - MEDIUM IMPACT
                          if (workloadRisk > 0) {
                            // Workload recommendations now handled by centralized decision tree engine
                          }

                          // 3. Client Concentration Risk (3 points) - FIXED RISK
                          recommendations.push(`🎯 Diversify client portfolio to reduce concentration risk (currently -3 pts fixed)`)

                          // 4. Excellence maintenance
                          if (currentScore >= 22) {
                            recommendations.push(`✅ Excellent risk management - maintain billing discipline and workload balance`)
                          }

                          // Specific thresholds with point impact
                          if (readyToBillAmount > 6000) {
                            recommendations.push(`🚨 Critical: €${Math.round(readyToBillAmount)} ready-to-bill creates maximum risk penalty (-12 pts)`)
                          } else if (readyToBillAmount > 3000) {
                            const riskPenalty = Math.round((readyToBillAmount / 3000) * 12)
                            recommendations.push(`⚠️ High billing backlog creating ${riskPenalty} point penalty`)
                          }

                          // Ensure we have actionable recommendations
                          if (recommendations.length === 0) {
                            recommendations.push('🔄 Monitor billing cycles and maintain operational balance')
                          }

                          return recommendations.slice(0, 3).map((rec, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold mt-0.5 ${
                                healthScores.risk < 15
                                  ? 'bg-red-500/20 text-red-600'
                                  : healthScores.risk < 20
                                    ? 'bg-yellow-500/20 text-yellow-600'
                                    : 'bg-green-500/20 text-green-600'
                              }`}>
                                {i + 1}
                              </span>
                              <span className="flex-1">{rec}</span>
                            </div>
                          ))
                        })()}
                      </div>
                      <div className="flex justify-center">
                        <button
                          onClick={() => {
                            setShowHealthReport(false)
                            const params = new URLSearchParams(window.location.search)
                            const readyToBillValue = dashboardMetrics?.factureerbaar || 0
                            // Risk Management focuses on billing processes, not collections
                            if (readyToBillValue > 500) {
                              params.set('tab', 'facturen')
                            } else {
                              params.set('tab', 'klanten')
                            }
                            window.history.pushState({}, '', `${window.location.pathname}?${params}`)
                          }}
                          className={`flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors ${
                            healthScores.risk < 15
                              ? 'bg-red-500 hover:bg-red-600'
                              : healthScores.risk < 20
                                ? 'bg-yellow-500 hover:bg-yellow-600'
                                : 'bg-green-500 hover:bg-green-600'
                          }`}
                        >
                          {(dashboardMetrics?.factureerbaar || 0) > 500 ? (
                            <>
                              <FileText className="h-4 w-4" />
                              Process Ready Invoices
                            </>
                          ) : (
                            <>
                              <Users className="h-4 w-4" />
                              Review Client Portfolio
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                  {/* Efficiency - Always show with dynamic priority */}
                  <div className={`p-4 rounded-lg ${
                    healthScores.efficiency < 15
                      ? 'bg-red-500/10 border border-red-500/20'
                      : healthScores.efficiency < 20
                        ? 'bg-yellow-500/10 border border-yellow-500/20'
                        : 'bg-green-500/10 border border-green-500/20'
                  }`}>
                    <h4 className={`font-semibold mb-2 flex items-center gap-2 ${
                      healthScores.efficiency < 15
                        ? 'text-red-600'
                        : healthScores.efficiency < 20
                          ? 'text-yellow-600'
                          : 'text-green-600'
                    }`}>
                      {healthScores.efficiency < 15 ? '🚨' : healthScores.efficiency < 20 ? '⚠️' : '✅'}
                      Efficiency & Productivity
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        healthScores.efficiency < 15
                          ? 'bg-red-500/20 text-red-600'
                          : healthScores.efficiency < 20
                            ? 'bg-yellow-500/20 text-yellow-600'
                            : 'bg-green-500/20 text-green-600'
                      }`}>
                        {healthScores.efficiency < 15 ? 'HIGH PRIORITY' : healthScores.efficiency < 20 ? 'MONITOR' : 'OPTIMIZED'}
                      </span>
                    </h4>
                      <div className="space-y-3 mb-4">
                        {(() => {
                          const recommendations = []
                          const currentHours = timeStats?.thisMonth.hours || 0
                          const mtdHoursTarget = mtdCalculations.mtdHoursTarget
                          const hoursProgressPercentage = mtdHoursTarget > 0 ? (currentHours / mtdHoursTarget) * 100 : 0
                          const hoursShortfall = Math.max(0, mtdHoursTarget - currentHours)

                          // Current score calculation: (currentHours / mtdHoursTarget) * 25
                          const currentScore = Math.min(Math.round((currentHours / mtdHoursTarget) * 25), 25)
                          const maxScore = 25

                          // Rank recommendations by direct hours impact on score

                          // 1. Direct hours gap closure (highest impact)
                          if (hoursShortfall > 0) {
                            const pointsToGain = Math.min(Math.round((hoursShortfall / mtdHoursTarget) * 25), maxScore - currentScore)
                            const daysRemaining = mtdCalculations.daysInMonth - mtdCalculations.currentDay
                            const dailyHoursNeeded = daysRemaining > 0 ? hoursShortfall / daysRemaining : hoursShortfall

                            recommendations.push(`⏱️ Log ${Math.round(hoursShortfall)}h more to hit MTD target (+${pointsToGain} pts to ${Math.min(currentScore + pointsToGain, 25)}/25)`)

                            if (daysRemaining > 0) {
                              recommendations.push(`📅 Need ${dailyHoursNeeded.toFixed(1)}h/day for remaining ${daysRemaining} days to reach target`)
                            }
                          }

                          // 2. Daily productivity optimization
                          const avgHoursPerDay = currentHours / mtdCalculations.currentDay
                          const targetHoursPerDay = mtdHoursTarget / mtdCalculations.currentDay

                          if (avgHoursPerDay < targetHoursPerDay) {
                            const dailyGap = targetHoursPerDay - avgHoursPerDay
                            recommendations.push(`📈 Increase daily average by ${dailyGap.toFixed(1)}h (from ${avgHoursPerDay.toFixed(1)} to ${targetHoursPerDay.toFixed(1)}h/day)`)
                          }

                          // 3. Performance status and targets
                          if (hoursProgressPercentage >= 100) {
                            const excessPercentage = hoursProgressPercentage - 100
                            recommendations.push(`🎉 Exceeding MTD target by ${Math.round(excessPercentage)}% - excellent productivity!`)
                            if (currentScore === maxScore) {
                              recommendations.push(`🚀 Perfect efficiency score! Consider raising monthly targets for growth`)
                            }
                          } else if (hoursProgressPercentage >= 80) {
                            recommendations.push(`✅ Strong progress at ${Math.round(hoursProgressPercentage)}% - maintain current pace`)
                          } else if (hoursProgressPercentage < 50) {
                            recommendations.push(`🚨 Critical: Only ${Math.round(hoursProgressPercentage)}% of target - significant effort needed`)
                          }

                          // Ensure we have actionable recommendations
                          if (recommendations.length === 0) {
                            recommendations.push('🔄 Monitor daily productivity and maintain consistent time tracking')
                          }

                          return recommendations.slice(0, 3).map((rec, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold mt-0.5 ${
                                healthScores.efficiency < 15
                                  ? 'bg-red-500/20 text-red-600'
                                  : healthScores.efficiency < 20
                                    ? 'bg-yellow-500/20 text-yellow-600'
                                    : 'bg-green-500/20 text-green-600'
                              }`}>
                                {i + 1}
                              </span>
                              <span className="flex-1">{rec}</span>
                            </div>
                          ))
                        })()}
                      </div>
                    </div>

                </div>
              </div>

              {/* Overall Business Performance Summary */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary" />
                  Overall Performance
                </h3>

                {/* Always show performance summary with dynamic styling */}
                <div className={`p-4 rounded-lg ${
                  healthScores.totalRounded >= 80
                    ? 'bg-green-500/10 border border-green-500/20'
                    : healthScores.totalRounded >= 60
                      ? 'bg-yellow-500/10 border border-yellow-500/20'
                      : 'bg-red-500/10 border border-red-500/20'
                }`}>
                  <h4 className={`font-semibold mb-2 flex items-center gap-2 ${
                    healthScores.totalRounded >= 80
                      ? 'text-green-600'
                      : healthScores.totalRounded >= 60
                        ? 'text-yellow-600'
                        : 'text-red-600'
                  }`}>
                    {healthScores.totalRounded >= 80 ? '🎉' : healthScores.totalRounded >= 60 ? '👍' : '💪'}
                    {healthScores.totalRounded >= 80 ? 'Excellent Performance!' : healthScores.totalRounded >= 60 ? 'Good Progress!' : 'Focus Areas Identified'}
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      healthScores.totalRounded >= 80
                        ? 'bg-green-500/20 text-green-600'
                        : healthScores.totalRounded >= 60
                          ? 'bg-yellow-500/20 text-yellow-600'
                          : 'bg-red-500/20 text-red-600'
                    }`}>
                      {healthScores.totalRounded}/100 SCORE
                    </span>
                  </h4>
                  <div className="space-y-3 mb-4">
                    {(() => {
                      const recommendations = []
                      const currentRevenue = (dashboardMetrics?.totale_registratie || 0) + ((timeStats?.subscription?.monthlyActiveUsers?.current || 0) * (timeStats?.subscription?.averageSubscriptionFee?.current || 0))
                      const mtdProgress = mtdCalculations.mtdRevenueTarget > 0 ? (currentRevenue / mtdCalculations.mtdRevenueTarget) * 100 : 0
                      const overdueRatio = dashboardMetrics?.achterstallig / ((dashboardMetrics?.totale_registratie || 1) + (dashboardMetrics?.achterstallig || 0))

                      if (healthScores.totalRounded >= 80) {
                        if (mtdProgress > 120) {
                          recommendations.push(`Exceptional month! You're ${Math.round(mtdProgress)}% of MTD target - consider rate optimization`)
                        } else if (mtdProgress > 100) {
                          recommendations.push(`Great performance - ${Math.round(mtdProgress)}% of MTD target achieved`)
                        }
                        if (overdueRatio < 0.1) {
                          recommendations.push(`Excellent cash flow management - maintain payment follow-up process`)
                        }
                        if (timeStats?.thisMonth.hours && timeStats.thisMonth.hours >= mtdCalculations.mtdHoursTarget) {
                          recommendations.push(`Strong work consistency - ${Math.round(timeStats.thisMonth.hours)} hours tracked this month`)
                        }
                      } else if (healthScores.totalRounded >= 60) {
                        recommendations.push(`You're on the right track with ${healthScores.totalRounded}/100 score - focus on priority areas above`)
                        if (mtdProgress < 80) {
                          recommendations.push(`Work on reaching ${Math.round(mtdProgress)}% → 100% of your MTD revenue target`)
                        }
                        recommendations.push(`Address the highest priority recommendations above to improve your score`)
                      } else {
                        recommendations.push(`Multiple areas need attention - start with HIGH PRIORITY items above`)
                        recommendations.push(`Focus on one area at a time for best results`)
                        recommendations.push(`Your business fundamentals are solid - these are optimization opportunities`)
                      }

                      if (recommendations.length === 0) {
                        recommendations.push('Your business is performing well - keep up the momentum!')
                      }

                      return recommendations.slice(0, 3).map((rec, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold mt-0.5 ${
                            healthScores.totalRounded >= 80
                              ? 'bg-green-500/20 text-green-600'
                              : healthScores.totalRounded >= 60
                                ? 'bg-yellow-500/20 text-yellow-600'
                                : 'bg-red-500/20 text-red-600'
                          }`}>
                            {i + 1}
                          </span>
                          <span className="flex-1">{rec}</span>
                        </div>
                      ))
                    })()}
                  </div>
                  <div className="flex justify-center">
                    <button
                      onClick={() => {
                        setShowHealthReport(false)
                        const params = new URLSearchParams(window.location.search)
                        const mtdProgress = mtdCalculations.mtdRevenueTarget > 0 ? (((dashboardMetrics?.totale_registratie || 0) + ((timeStats?.subscription?.monthlyActiveUsers?.current || 0) * (timeStats?.subscription?.averageSubscriptionFee?.current || 0))) / mtdCalculations.mtdRevenueTarget) * 100 : 0
                        // Navigate to most relevant section based on performance
                        if (healthScores.totalRounded >= 80) {
                          params.set('tab', mtdProgress > 120 ? 'klanten' : 'tijd')
                        } else if (healthScores.revenue < healthScores.cashflow && healthScores.revenue < healthScores.risk) {
                          params.set('tab', 'klanten')
                        } else if (healthScores.cashflow < healthScores.risk) {
                          params.set('tab', 'facturen')
                        } else {
                          params.set('tab', 'tijd')
                        }
                        window.history.pushState({}, '', `${window.location.pathname}?${params}`)
                      }}
                      className={`flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors ${
                        healthScores.totalRounded >= 80
                          ? 'bg-green-500 hover:bg-green-600'
                          : healthScores.totalRounded >= 60
                            ? 'bg-yellow-500 hover:bg-yellow-600'
                            : 'bg-red-500 hover:bg-red-600'
                      }`}
                    >
                      {healthScores.totalRounded >= 80 ? (
                        <>
                          <TrendingUp className="h-4 w-4" />
                          Continue Growing
                        </>
                      ) : healthScores.totalRounded >= 60 ? (
                        <>
                          <Target className="h-4 w-4" />
                          Improve Performance
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-4 w-4" />
                          Take Action
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Overall Performance Summary */}
                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <h4 className="font-semibold mb-3 flex items-center gap-2 text-blue-600">
                    📊 Overall Performance Summary
                  </h4>
                  <div className="space-y-3 mb-4">
                    {(() => {
                      const recommendations = []
                      const currentRevenue = (dashboardMetrics?.totale_registratie || 0) + ((timeStats?.subscription?.monthlyActiveUsers?.current || 0) * (timeStats?.subscription?.averageSubscriptionFee?.current || 0))
                      const mtdProgress = mtdCalculations.mtdRevenueTarget > 0 ? (currentRevenue / mtdCalculations.mtdRevenueTarget) * 100 : 0
                      const overdueRatio = dashboardMetrics?.achterstallig / ((dashboardMetrics?.totale_registratie || 1) + (dashboardMetrics?.achterstallig || 0))
                      const overallScore = (healthScores.revenue + healthScores.cashflow + healthScores.efficiency + healthScores.risk) / 4

                      if (overallScore >= 20) {
                        recommendations.push(`🎉 Excellent overall performance! Average score: ${Math.round(overallScore)}/20`)
                      } else if (overallScore >= 15) {
                        recommendations.push(`✅ Good performance with room for improvement. Average score: ${Math.round(overallScore)}/20`)
                      } else {
                        recommendations.push(`⚠️ Focus needed on key areas. Average score: ${Math.round(overallScore)}/20`)
                      }

                      if (mtdProgress > 120) {
                        recommendations.push(`🚀 Exceptional month! You're ${Math.round(mtdProgress)}% of MTD target - consider rate optimization`)
                      } else if (mtdProgress > 100) {
                        recommendations.push(`📈 Great performance - ${Math.round(mtdProgress)}% of MTD target achieved`)
                      } else if (mtdProgress > 80) {
                        recommendations.push(`⚡ Good progress - ${Math.round(mtdProgress)}% of MTD target, push for final stretch`)
                      } else {
                        recommendations.push(`🎯 Focus needed - ${Math.round(mtdProgress)}% of MTD target, review strategy`)
                      }

                      if (overdueRatio < 0.1) {
                        recommendations.push(`💰 Excellent cash flow management - maintain payment follow-up process`)
                      } else if (overdueRatio < 0.2) {
                        recommendations.push(`💳 Good cash flow management - slight room for improvement`)
                      } else {
                        recommendations.push(`🚨 Cash flow needs attention - review payment processes`)
                      }

                      return recommendations.slice(0, 3).map((rec, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="flex-shrink-0 w-5 h-5 bg-blue-500/20 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold mt-0.5">
                            {i + 1}
                          </span>
                          <span className="flex-1">{rec}</span>
                        </div>
                      ))
                    })()}
                  </div>
                  <div className="flex justify-center">
                    <button
                      onClick={() => {
                        setShowHealthReport(false)
                        const params = new URLSearchParams(window.location.search)
                        const overallScore = (healthScores.revenue + healthScores.cashflow + healthScores.efficiency + healthScores.risk) / 4
                        // Navigate to most relevant section based on lowest score
                        const lowestScore = Math.min(healthScores.revenue, healthScores.cashflow, healthScores.efficiency, healthScores.risk)
                        if (lowestScore === healthScores.revenue) {
                          params.set('tab', 'klanten')
                        } else if (lowestScore === healthScores.cashflow) {
                          params.set('tab', 'facturen')
                        } else {
                          params.set('tab', 'tijd')
                        }
                        window.history.pushState({}, '', `${window.location.pathname}?${params}`)
                      }}
                      className={`flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors ${
                        (healthScores.revenue + healthScores.cashflow + healthScores.efficiency + healthScores.risk) / 4 >= 20
                          ? 'bg-green-500 hover:bg-green-600'
                          : (healthScores.revenue + healthScores.cashflow + healthScores.efficiency + healthScores.risk) / 4 >= 15
                          ? 'bg-yellow-500 hover:bg-yellow-600'
                          : 'bg-red-500 hover:bg-red-600'
                      }`}
                    >
                      <TrendingUp className="h-4 w-4" />
                      Take Action
                    </button>
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <div className="flex justify-end mt-6 pt-4 border-t">
                <button
                  onClick={() => setShowHealthReport(false)}
                  className="px-6 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
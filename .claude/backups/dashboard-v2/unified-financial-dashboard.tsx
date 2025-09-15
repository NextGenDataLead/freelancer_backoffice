'use client'

import { useState, useEffect } from 'react'
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
import {
  Euro,
  TrendingUp,
  TrendingDown,
  Clock,
  DollarSign,
  Users,
  AlertTriangle,
  ChevronRight,
  CreditCard,
  FileText,
  Activity,
  Target,
  BarChart3,
  Calendar
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

// Format helpers
const formatCurrency = (amount: number) => `€${amount.toLocaleString()}`
const formatHours = (hours: number) => `${hours}h`

export function UnifiedFinancialDashboard() {
  const router = useRouter()
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetricsResponse['data'] | null>(null)
  const [timeStats, setTimeStats] = useState<TimeStatsResponse['data'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [smartAlerts, setSmartAlerts] = useState<SmartAlert[]>([])
  const [actionsOpen, setActionsOpen] = useState(true)

  // Fetch all dashboard data
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true)

        // Parallel fetch of all required data
        const [dashboardResponse, timeResponse] = await Promise.all([
          fetch('/api/invoices/dashboard-metrics'),
          fetch('/api/time-entries/stats')
        ])

        if (!dashboardResponse.ok || !timeResponse.ok) {
          throw new Error('Failed to fetch dashboard data')
        }

        const dashboardData: DashboardMetricsResponse = await dashboardResponse.json()
        const timeData: TimeStatsResponse = await timeResponse.json()

        setDashboardMetrics(dashboardData.data)
        setTimeStats(timeData.data)

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

    fetchAllData()

    // Refresh every 5 minutes
    const interval = setInterval(fetchAllData, 5 * 60 * 1000)
    return () => clearInterval(interval)
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
    <div className="min-h-screen bg-background mobile-safe-area">
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-6">

        {/* Header with User Avatar */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Financial Command Center</h1>
            <p className="text-muted-foreground">
              Your unified business intelligence dashboard
            </p>
          </div>
          <UserButton
            appearance={{
              elements: {
                userButtonAvatarBox: "w-9 h-9",
                userButtonPopoverCard: "border border-border",
                userButtonPopoverActionButton: "hover:bg-accent",
              }
            }}
            afterSignOutUrl="/sign-in"
          />
        </div>

        {/* Financial Health Score - Prominent */}
        <FinancialHealthScore
          dashboardMetrics={dashboardMetrics}
          timeStats={timeStats}
          loading={loading}
        />

        {/* 5-Card Metrics System - Core Competitive Advantage */}
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
                    <span>Registered time</span>
                    <span>value</span>
                  </p>
                </div>
              </div>
              <div className={`mobile-status-indicator ${
                ((dashboardMetrics?.totale_registratie || 0) / 12000) * 100 >= 100 ? 'status-active' :
                ((dashboardMetrics?.totale_registratie || 0) / 12000) * 100 >= 80 ? 'status-warning' : 'status-inactive'
              }`}>
                <span>{Math.round(((dashboardMetrics?.totale_registratie || 0) / 12000) * 100)}%</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold metric-number text-accent">
                  {formatCurrency(dashboardMetrics?.totale_registratie || 0)}
                </span>
                <span className="text-sm text-muted-foreground">/ {formatCurrency(12000)}</span>
              </div>
              <div className="flex items-center gap-2 h-8 flex-col justify-center">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-400" />
                  <span className="text-sm font-medium text-green-400">Active</span>
                  <span className="text-sm text-muted-foreground">this month</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="relative progress-bar">
                <div
                  className={`progress-fill ${
                    ((dashboardMetrics?.totale_registratie || 0) / 12000) * 100 >= 100 ? 'progress-fill-success' :
                    ((dashboardMetrics?.totale_registratie || 0) / 12000) * 100 >= 80 ? 'progress-fill-warning' : 'progress-fill-warning'
                  }`}
                  style={{ width: `${Math.min(((dashboardMetrics?.totale_registratie || 0) / 12000) * 100, 100)}%` }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/20">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Billable</p>
                <p className="text-sm font-bold text-primary">
                  {formatCurrency(dashboardMetrics?.factureerbaar || 0)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Overdue</p>
                <p className="text-sm font-bold text-red-400">
                  {formatCurrency(dashboardMetrics?.achterstallig || 0)}
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
                ((timeStats?.thisMonth.hours || 0) / 160) * 100 >= 100 ? 'status-active' :
                ((timeStats?.thisMonth.hours || 0) / 160) * 100 >= 75 ? 'status-warning' : 'status-inactive'
              }`}>
                <span>{Math.round(((timeStats?.thisMonth.hours || 0) / 160) * 100)}%</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold metric-number text-green-400">{formatHours(timeStats?.thisMonth.hours || 0)}</span>
                <span className="text-sm text-muted-foreground">/ {formatHours(160)}</span>
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
                ((timeStats?.thisMonth.hours || 0) > 0 ? Math.round((timeStats?.thisMonth.revenue || 0) / timeStats.thisMonth.hours) : 0) >= 80 ? 'status-active' :
                ((timeStats?.thisMonth.hours || 0) > 0 ? Math.round((timeStats?.thisMonth.revenue || 0) / timeStats.thisMonth.hours) : 0) >= 60 ? 'status-warning' : 'status-inactive'
              }`}>
                <span>{Math.round((((timeStats?.thisMonth.hours || 0) > 0 ? Math.round((timeStats?.thisMonth.revenue || 0) / timeStats.thisMonth.hours) : 0) / 100) * 100)}%</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold metric-number text-blue-400">
                  €{(timeStats?.thisMonth.hours || 0) > 0 ? Math.round((timeStats?.thisMonth.revenue || 0) / timeStats.thisMonth.hours) : 0}
                </span>
                <span className="text-sm text-muted-foreground">/ €100 target</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="relative progress-bar">
                <div
                  className={`progress-fill ${
                    ((timeStats?.thisMonth.hours || 0) > 0 ? Math.round((timeStats?.thisMonth.revenue || 0) / timeStats.thisMonth.hours) : 0) >= 80 ? 'progress-fill-success' :
                    ((timeStats?.thisMonth.hours || 0) > 0 ? Math.round((timeStats?.thisMonth.revenue || 0) / timeStats.thisMonth.hours) : 0) >= 60 ? 'progress-fill-warning' : 'progress-fill-primary'
                  }`}
                  style={{ width: `${Math.min(((timeStats?.thisMonth.hours || 0) > 0 ? Math.round((timeStats?.thisMonth.revenue || 0) / timeStats.thisMonth.hours) : 0), 100)}%` }}
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
                <p className="text-sm font-bold text-blue-400">{formatCurrency(timeStats?.thisMonth.revenue || 0)}</p>
              </div>
            </div>
          </div>

          {/* Card 4: Projects & Clients */}
          <div className="mobile-card-glass space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Users className="h-5 w-5 text-purple-400 chart-glow-purple" />
                </div>
                <div>
                  <h3 className="text-base font-semibold mobile-sharp-text">Portfolio</h3>
                  <p className="text-sm text-muted-foreground h-8 flex flex-col justify-center">
                    <span>Active projects</span>
                    <span>& clients</span>
                  </p>
                </div>
              </div>
              <div className={`mobile-status-indicator ${
                (timeStats?.projects.count || 0) >= 5 ? 'status-active' :
                (timeStats?.projects.count || 0) >= 3 ? 'status-warning' : 'status-inactive'
              }`}>
                <span>{Math.round(((timeStats?.projects.count || 0) / 10) * 100)}%</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold metric-number text-purple-400">
                  {timeStats?.projects.count || 0}
                </span>
                <span className="text-sm text-muted-foreground">projects</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/20">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Projects</p>
                <p className="text-sm font-bold text-purple-400">{timeStats?.projects.count || 0}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Clients</p>
                <p className="text-sm font-bold text-green-400">{timeStats?.projects.clients || 0}</p>
              </div>
            </div>
          </div>

          {/* Card 5: Business Health */}
          <div className="mobile-card-glass space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 rounded-lg">
                  <Activity className="h-5 w-5 text-emerald-400 chart-glow-emerald" />
                </div>
                <div>
                  <h3 className="text-base font-semibold mobile-sharp-text">Health</h3>
                  <p className="text-sm text-muted-foreground h-8 flex flex-col justify-center">
                    <span>Business</span>
                    <span>overview</span>
                  </p>
                </div>
              </div>
              <div className={`mobile-status-indicator ${
                ((dashboardMetrics?.achterstallig || 0) === 0 && (timeStats?.unbilled.hours || 0) < 20) ? 'status-active' :
                ((dashboardMetrics?.achterstallig || 0) < 5000 && (timeStats?.unbilled.hours || 0) < 40) ? 'status-warning' : 'status-inactive'
              }`}>
                <span>
                  {((dashboardMetrics?.achterstallig || 0) === 0 && (timeStats?.unbilled.hours || 0) < 20) ? '✓' : '!'}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold metric-number text-emerald-400">
                  {((dashboardMetrics?.achterstallig || 0) === 0 && (timeStats?.unbilled.hours || 0) < 20) ? 'Good' : 'Alert'}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/20">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Overdue</p>
                <p className="text-sm font-bold text-red-400">€{(dashboardMetrics?.achterstallig || 0).toLocaleString()}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Unbilled</p>
                <p className="text-sm font-bold text-orange-400">{timeStats?.unbilled.hours || 0}h</p>
              </div>
            </div>
          </div>
        </div>

        {/* Two-Column Layout: Main Dashboard + Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-3 gap-6">

          {/* Left Column: Cash Flow + Smart Actions */}
          <div className="lg:col-span-2 space-y-6">

            {/* Cash Flow Forecast */}
            <CashFlowForecast dashboardMetrics={dashboardMetrics} />

            {/* Enhanced Smart Actions - Restored from MetricsCards */}
            <Collapsible open={actionsOpen} onOpenChange={setActionsOpen}>
              <Card className="mobile-card-glass">
                <div className="p-4">
                  <CollapsibleTrigger className="flex items-center justify-between w-full [&[data-state=open]>div>svg]:rotate-90">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-500/20 rounded-lg">
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                      </div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold">Smart Actions Required</h3>
                        {smartAlerts.length > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {smartAlerts.length}
                          </Badge>
                        )}
                        {dashboardMetrics?.achterstallig_count > 0 && smartAlerts.length === 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {dashboardMetrics.achterstallig_count}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform duration-200" />
                  </CollapsibleTrigger>

                  <CollapsibleContent className="mt-4">
                    <div className="space-y-3">
                      {/* Smart Alerts from Rules Engine */}
                      {smartAlerts.length > 0 ? (
                        smartAlerts.slice(0, 3).map((alert) => {
                          const alertColors = {
                            critical: { bg: 'bg-red-500/5', border: 'border-red-500/20', icon: 'bg-red-500/20', text: 'text-red-600', button: 'bg-red-500 hover:bg-red-600' },
                            warning: { bg: 'bg-orange-500/5', border: 'border-orange-500/20', icon: 'bg-orange-500/20', text: 'text-orange-600', button: 'bg-orange-500 hover:bg-orange-600' },
                            opportunity: { bg: 'bg-blue-500/5', border: 'border-blue-500/20', icon: 'bg-blue-500/20', text: 'text-blue-600', button: 'bg-blue-500 hover:bg-blue-600' },
                            info: { bg: 'bg-gray-500/5', border: 'border-gray-500/20', icon: 'bg-gray-500/20', text: 'text-gray-600', button: 'bg-gray-500 hover:bg-gray-600' }
                          }
                          const colors = alertColors[alert.type]

                          // Icon based on category
                          let AlertIcon = AlertTriangle
                          if (alert.category === 'cash_flow') AlertIcon = CreditCard
                          else if (alert.category === 'efficiency') AlertIcon = Clock
                          else if (alert.category === 'growth') AlertIcon = TrendingUp
                          else if (alert.category === 'risk') AlertIcon = AlertTriangle

                          return (
                            <div key={alert.id} className={`p-3 rounded-lg ${colors.bg} ${colors.border} border`}>
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                  <div className={`p-1.5 ${colors.icon} rounded-lg mt-0.5 flex-shrink-0`}>
                                    <AlertIcon className={`h-4 w-4 ${alert.type === 'critical' ? 'text-red-500' :
                                      alert.type === 'warning' ? 'text-orange-500' :
                                      alert.type === 'opportunity' ? 'text-blue-500' : 'text-gray-500'}`} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between mb-1">
                                      <p className={`text-sm font-medium ${colors.text} truncate`}>{alert.title}</p>
                                      {alert.priority >= 8 && (
                                        <Badge className="ml-2 bg-red-100 text-red-700 border-red-200 text-xs flex-shrink-0">
                                          HIGH
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed">{alert.description}</p>

                                    {/* Action Buttons */}
                                    {alert.actions.length > 0 && (
                                      <div className="flex gap-2 mt-3">
                                        {alert.actions.slice(0, 2).map((action, actionIndex) => (
                                          <button
                                            key={actionIndex}
                                            onClick={() => handleSmartAction(alert, actionIndex)}
                                            className={`text-xs text-white px-3 py-1 rounded-md transition-colors ${
                                              action.primary ? colors.button : 'bg-gray-500 hover:bg-gray-600'
                                            }`}
                                          >
                                            {action.label}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        /* Fallback to basic alerts if no smart alerts */
                        <>
                          {/* Basic Overdue Invoices */}
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
                              <button
                                onClick={handleReviewOverdue}
                                className="text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md transition-colors"
                              >
                                Review
                              </button>
                            </div>
                          )}

                          {/* Basic Unbilled Hours */}
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
                              <button
                                onClick={handleCreateInvoice}
                                className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded-md transition-colors"
                              >
                                Create Invoice
                              </button>
                            </div>
                          )}

                          {/* All caught up message */}
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
                        </>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Card>
            </Collapsible>
          </div>

          {/* Right Column: Timer + Client Health */}
          <div className="space-y-6">

            {/* Active Timer Widget */}
            <ActiveTimerWidget
              onNavigateToTimer={() => router.push('/dashboard/financieel?tab=tijd')}
            />

            {/* Client Health Dashboard */}
            <ClientHealthDashboard
              onViewAllClients={() => router.push('/dashboard/financieel?tab=klanten')}
            />

            {/* Enhanced Quick Stats Summary - Mobile Optimized */}
            {dashboardMetrics && timeStats && (
              <Card className="mobile-card-glass p-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Quick Stats
                </h3>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <p className="text-lg font-bold text-primary">
                      {formatCurrency(dashboardMetrics.totale_registratie)}
                    </p>
                    <p className="text-xs text-muted-foreground">Revenue MTD</p>
                  </div>
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <p className="text-lg font-bold text-green-600">
                      {formatHours(timeStats.thisMonth.hours)}
                    </p>
                    <p className="text-xs text-muted-foreground">Hours MTD</p>
                  </div>
                </div>

                {/* Additional Quick Metrics */}
                <div className="grid grid-cols-2 gap-3 text-center mt-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <p className="text-lg font-bold text-blue-600">
                      €{timeStats.thisMonth.hours > 0 ? Math.round(timeStats.thisMonth.revenue / timeStats.thisMonth.hours) : 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Avg Rate</p>
                  </div>
                  <div className="p-2 bg-orange-500/10 rounded-lg">
                    <p className="text-lg font-bold text-orange-600">
                      {formatHours(timeStats.unbilled.hours)}
                    </p>
                    <p className="text-xs text-muted-foreground">Unbilled</p>
                  </div>
                </div>

                {/* Project & Client Summary */}
                <div className="mt-3 pt-3 border-t border-border/20">
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Portfolio</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{timeStats.projects.count || 0} projects</span>
                      <span className="font-medium text-green-600">{timeStats.projects.clients || 0} clients</span>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Financial Analysis & Charts - Restored from Overview */}
        <div className="space-y-6">
          {/* Section Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Financial Analysis</h2>
              <p className="text-muted-foreground text-sm">
                Detailed insights, trends, and performance analytics
              </p>
            </div>
          </div>

          {/* Enhanced Analytics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Profit Margin Analysis */}
            <div className="mobile-card-glass space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1 min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">Profit Margin</p>
                  <p className="text-xl font-bold text-primary">
                    {dashboardMetrics && timeStats ?
                      Math.round(((timeStats.thisMonth.revenue - 1200) / timeStats.thisMonth.revenue) * 100) : 0}%
                  </p>
                </div>
                <div className="p-2 bg-primary/20 rounded-xl flex-shrink-0">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">€1.2K monthly expenses</p>
                <p className="text-xs text-primary font-medium">+3.2% improved</p>
              </div>
            </div>

            {/* Billable Efficiency */}
            <div className="mobile-card-glass space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1 min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">Billable Efficiency</p>
                  <p className="text-xl font-bold text-green-400">
                    {timeStats ? Math.round((timeStats.thisMonth.hours / 160) * 100) : 0}%
                  </p>
                </div>
                <div className="p-2 bg-green-500/20 rounded-xl flex-shrink-0">
                  <Target className="h-4 w-4 text-green-400" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {timeStats ? `${timeStats.thisMonth.hours}h logged` : '0h logged'}
                </p>
                <p className="text-xs text-green-400 font-medium">On track</p>
              </div>
            </div>

            {/* Collection Status */}
            <div className="mobile-card-glass space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1 min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">Collection Rate</p>
                  <p className="text-xl font-bold text-blue-400">
                    {dashboardMetrics ?
                      Math.round((1 - (dashboardMetrics.achterstallig / dashboardMetrics.totale_registratie)) * 100) : 100}%
                  </p>
                </div>
                <div className="p-2 bg-blue-500/20 rounded-xl flex-shrink-0">
                  <CreditCard className="h-4 w-4 text-blue-400" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Payment tracking</p>
                <p className={`text-xs font-medium ${
                  (dashboardMetrics?.achterstallig || 0) === 0 ? 'text-green-400' : 'text-orange-400'
                }`}>
                  {(dashboardMetrics?.achterstallig || 0) === 0 ? 'All current' : 'Action needed'}
                </p>
              </div>
            </div>

            {/* Dutch Tax Status */}
            <div className="mobile-card-glass space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1 min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">BTW Status</p>
                  <p className="text-xl font-bold text-purple-400">Q4</p>
                </div>
                <div className="p-2 bg-purple-500/20 rounded-xl flex-shrink-0">
                  <FileText className="h-4 w-4 text-purple-400" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Next filing: 31 Jan</p>
                <p className="text-xs text-green-400 font-medium">Compliant</p>
              </div>
            </div>
          </div>

          {/* Financial Charts - Full Width */}
          <Card className="p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold">Performance Trends</h3>
              <p className="text-sm text-muted-foreground">Revenue, hours, and efficiency analysis</p>
            </div>
            <FinancialCharts />
          </Card>
        </div>

        {/* Footer */}
        <div className="pt-6 border-t border-border/50 text-center">
          <p className="text-xs text-muted-foreground">
            Financial Command Center v2.0 - Competitive Intelligence Dashboard
          </p>
        </div>
      </div>
    </div>
  )
}
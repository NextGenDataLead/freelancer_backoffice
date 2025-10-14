'use client'

import { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { ClientHealthDashboard } from './client-health-dashboard'
import { CashFlowForecast } from './cash-flow-forecast'
import { FinancialCharts } from '../financial/charts/financial-charts'
import { QuickActionsBar } from './quick-actions-bar'
import { CompactBusinessHealth } from './compact-business-health'
import { CompactMetricCard } from './compact-metric-card'
import { useProfitTargets } from '@/hooks/use-profit-targets'
import { smartRulesEngine, type BusinessData, type SmartAlert } from '@/lib/smart-rules-engine'
import { healthScoreEngine, type HealthScoreInputs, type HealthScoreOutputs } from '@/lib/health-score-engine'
import { HEALTH_STATUS_CONFIG, getStatusForScore, HEALTH_ANIMATIONS } from '@/lib/health-score-constants'
import { getMetricDefinition, type MetricDefinition } from '@/lib/health-score-metric-definitions'
import { getCurrentDate } from '@/lib/current-date'
import { HealthScoreHierarchicalTree } from './health-score-hierarchical-tree'
import { CalculationDetailModal } from './calculation-detail-modal'
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
  Award,
  HelpCircle,
  BookOpen,
  ArrowRight,
  Lightbulb,
  Shield,
  Zap
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
    factureerbaar_count: number
    totale_registratie: number
    achterstallig: number
    achterstallig_count: number
    actual_dso: number
    average_payment_terms: number
    average_dri: number
    rolling30DaysRevenue?: {
      current: number
      previous: number
    }
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
      billableHours: number
      nonBillableHours: number
    }
    unbilled: {
      hours: number
      revenue: number
      value: number
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
    rolling30Days?: {
      current: {
        billableRevenue: number
        distinctWorkingDays: number
        totalHours: number
        dailyHours: number
        billableHours: number
        nonBillableHours: number
        unbilledHours: number
        unbilledValue: number
      }
      previous: {
        billableRevenue: number
        distinctWorkingDays: number
        totalHours: number
        dailyHours: number
        billableHours: number
        nonBillableHours: number
        unbilledHours: number
        unbilledValue: number
      }
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
const formatDateRange = (start: Date, end: Date) => {
  const formatDate = (date: Date) => {
    const month = date.toLocaleDateString('en-US', { month: 'short' })
    const day = date.getDate()
    return `${month} ${day}`
  }
  return `${formatDate(start)} - ${formatDate(end)}`
}

interface UnifiedFinancialDashboardProps {
  onTabChange?: (tabId: string) => void // Optional navigation handler
}

export function UnifiedFinancialDashboard({ onTabChange }: UnifiedFinancialDashboardProps = {}) {
  const router = useRouter()
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetricsResponse['data'] | null>(null)
  const [timeStats, setTimeStats] = useState<TimeStatsResponse['data'] | null>(null)
  const [todayStats, setTodayStats] = useState<{ totalHours: number; billableHours: number; entries: number; revenue: number } | null>(null)
  const [revenueTrend, setRevenueTrend] = useState<any[]>([])
  const [clientRevenue, setClientRevenue] = useState<{
    topClient?: { name: string; revenueShare: number }
    rolling30DaysComparison?: {
      current: { topClientShare: number; totalRevenue: number }
      previous: { topClientShare: number; totalRevenue: number }
    }
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [smartAlerts, setSmartAlerts] = useState<SmartAlert[]>([])
  const [healthScoreOpen, setHealthScoreOpen] = useState(false)
  const [analyticsOpen, setAnalyticsOpen] = useState(false)
  const [showExplanation, setShowExplanation] = useState<string | null>(null)
  const [showHealthReport, setShowHealthReport] = useState(false)
  const [healthScoreResults, setHealthScoreResults] = useState<HealthScoreOutputs | null>(null)
  const [calculationDetailModal, setCalculationDetailModal] = useState<{
    metricId: string;
    metricName: string;
    calculationValue?: string;
    calculationDescription?: string;
    score: number;
    maxScore: number;
    detailedCalculation?: any;
  } | null>(null)
  const { targets: profitTargets } = useProfitTargets()

  // Helper function to get metric definition based on label
  const getMetricDefinitionByLabel = (label: string): MetricDefinition | null => {
    const labelMap: Record<string, string> = {
      'Outstanding Amount': 'outstanding_amount',
      'Outstanding Count': 'outstanding_count',
      'Collection Speed': 'collection_speed',
      'Current Hours (MTD)': 'current_hours_mtd',
      'MTD Target': 'mtd_target',
      'Unbilled Hours': 'unbilled_hours',
      'Daily Average': 'daily_average',
      'Billing Efficiency': 'billing_efficiency',
      'Active Subscribers': 'active_subscribers',
      'Average Subscription Fee': 'average_subscription_fee',
      'Monthly Recurring Revenue': 'monthly_recurring_revenue',
      'Hourly Rate Value': 'hourly_rate_value',
      'Ready to Bill': 'ready_to_bill',
      'Payment Risk': 'payment_risk',
      'Subscription Health': 'subscription_health',

      // Cash Flow calculation metrics
      '1. Collection Speed': 'collection_speed',
      '2. Volume Efficiency': 'volume_efficiency',
      '3. Absolute Amount Control': 'absolute_amount_control',

      // Efficiency calculation metrics
      '1. Time Utilization Progress': 'hours_progress',
      '2. Billing Efficiency': 'billing_efficiency',
      '3. Daily Consistency': 'daily_consistency',

      // Profit calculation metrics (consulting mode)
      '1. Hourly Rate Value': 'hourly_rate_value',
      '2. Rate Target Contribution': 'rate_optimization',
      '3. Time Utilization Efficiency': 'time_utilization_efficiency',
      '4. Revenue Quality & Collection': 'revenue_quality_collection',

      // Profit calculation metrics (subscription mode)
      '1. Subscription Growth': 'subscription_growth',
      '2. Subscription Pricing': 'subscription_pricing',
      '3. Revenue Diversification': 'revenue_diversification',
      '4. Hourly Rate Value': 'hourly_rate_value',
      '5. Rate Target Contribution': 'rate_optimization',
      '6. Subscription Effectiveness': 'subscription_effectiveness',

      // Risk calculation metrics
      '1. Invoice Processing Risk': 'invoice_processing_risk',
      '2. Payment Collection Risk': 'payment_collection_risk',
      '3. Client Concentration Risk': 'client_concentration_risk',
      '4. Business Model Risk': 'business_model_risk',

      // Component breakdown metrics
      'Hours Progress': 'hours_progress',
      'Collection Rate': 'collection_rate',
      'Invoicing Speed': 'invoicing_speed',
      'Payment Quality': 'payment_quality'
    }

    const metricId = labelMap[label]
    return metricId ? getMetricDefinition(metricId) : null
  }


  // Enhanced navigation helper
  const handleRecommendationAction = (recommendationId: string, targetTab: string) => {
    setShowHealthReport(false)

    // Smart navigation based on recommendation type
    const navigationMap: Record<string, string> = {
      'improve-ocf-ratio': 'facturen',
      'reduce-billing-backlog': 'facturen',
      'optimize-daily-workflow': 'tijd',
      'increase-utilization': 'tijd',
      'setup-profit-targets': 'dashboard',
      'accelerate-collection-speed': 'facturen',
      'improve-volume-efficiency': 'facturen',
      'control-absolute-amounts': 'facturen',
      'improve-time-utilization': 'tijd',
      'improve-billing-efficiency': 'tijd',
      'reduce-invoice-processing-risk': 'facturen',
      'reduce-payment-collection-risk': 'facturen'
    }

    const finalTab = navigationMap[recommendationId] || targetTab

    if (onTabChange) {
      onTabChange(finalTab)
    } else {
      const params = new URLSearchParams(window.location.search)
      params.set('tab', finalTab)
      window.history.pushState({}, '', `${window.location.pathname}?${params}`)
    }
  }

  // Calculate month-to-date (MTD) benchmarks - centralized calculation
  const mtdCalculations = useMemo(() => {
    const now = getCurrentDate()
    const currentDay = now.getDate()
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const monthProgress = currentDay / daysInMonth

    // FIXED: Use component-based targets with optional streams support
    const monthlyRevenueTarget = profitTargets ?
      (() => {
        // Calculate time-based revenue (only if both values > 0)
        const timeBasedRevenue = (profitTargets.monthly_hours_target > 0 && profitTargets.target_hourly_rate > 0) ?
          profitTargets.monthly_hours_target * profitTargets.target_hourly_rate : 0

        // Calculate subscription revenue (only if both values > 0)
        const subscriptionRevenue = (profitTargets.target_monthly_active_users > 0 && profitTargets.target_avg_subscription_fee > 0) ?
          profitTargets.target_monthly_active_users * profitTargets.target_avg_subscription_fee : 0

        return timeBasedRevenue + subscriptionRevenue
      })()
      : 12000 // Fallback for users without targets

    const monthlyHoursTarget = profitTargets?.monthly_hours_target || 160

    // === DYNAMIC HOURS MTD CALCULATION BASED ON WORKING DAYS ===
    const workingDays = profitTargets?.target_working_days_per_week || [1, 2, 3, 4, 5]

    // Calculate yesterday (we measure progress up to yesterday, not today)
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(0, 0, 0, 0)

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    startOfMonth.setHours(0, 0, 0, 0)

    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    endOfMonth.setHours(23, 59, 59, 999)

    // Expected working days up to yesterday (for MTD assessment)
    let expectedWorkingDaysUpToYesterday = 0
    let currentDate = new Date(startOfMonth)
    while (currentDate <= yesterday) {
      const dayOfWeek = currentDate.getDay()
      const isoWeekday = dayOfWeek === 0 ? 7 : dayOfWeek
      if (workingDays.includes(isoWeekday)) {
        expectedWorkingDaysUpToYesterday++
      }
      currentDate.setDate(currentDate.getDate() + 1)
    }

    // Total expected working days in full month
    let totalExpectedWorkingDays = 0
    currentDate = new Date(startOfMonth)
    while (currentDate <= endOfMonth) {
      const dayOfWeek = currentDate.getDay()
      const isoWeekday = dayOfWeek === 0 ? 7 : dayOfWeek
      if (workingDays.includes(isoWeekday)) {
        totalExpectedWorkingDays++
      }
      currentDate.setDate(currentDate.getDate() + 1)
    }

    const workingDaysProgress = totalExpectedWorkingDays > 0
      ? expectedWorkingDaysUpToYesterday / totalExpectedWorkingDays
      : monthProgress // fallback to calendar-based if no working days

    return {
      currentDay,
      daysInMonth,
      monthProgress, // Keep for revenue (calendar-based is appropriate for revenue)
      monthlyRevenueTarget,
      mtdRevenueTarget: monthlyRevenueTarget * monthProgress,
      monthlyHoursTarget,
      mtdHoursTarget: Math.round(monthlyHoursTarget * workingDaysProgress), // Now uses working days!
      expectedWorkingDaysUpToYesterday,
      totalExpectedWorkingDays
    }
  }, [profitTargets]) // Add profitTargets dependency

  // Calculate date ranges for display
  const dateRanges = useMemo(() => {
    const now = getCurrentDate()

    // Rolling 30 days range
    const rolling30Start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const rolling30End = now

    // MTD range
    const mtdStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const mtdEnd = now

    return {
      rolling30: formatDateRange(rolling30Start, rolling30End),
      mtd: formatDateRange(mtdStart, mtdEnd)
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
        factureerbaar: dashboardMetrics.factureerbaar || 0,
        factureerbaar_count: dashboardMetrics.factureerbaar_count || 0,
        actual_dso: dashboardMetrics.actual_dso,
        average_payment_terms: dashboardMetrics.average_payment_terms,
        average_dri: dashboardMetrics.average_dri,
        rolling30DaysRevenue: dashboardMetrics.rolling30DaysRevenue
      },
      timeStats: {
        thisMonth: {
          hours: timeStats.thisMonth?.hours || 0,
          revenue: timeStats.thisMonth?.revenue || 0,
          billableHours: timeStats.thisMonth?.billableHours || 0,
          nonBillableHours: timeStats.thisMonth?.nonBillableHours || 0
        },
        unbilled: {
          hours: timeStats.unbilled?.hours || 0,
          revenue: timeStats.unbilled?.revenue || 0,
          value: timeStats.unbilled?.value || 0
        },
        subscription: timeStats.subscription,
        rolling30Days: timeStats.rolling30Days
      },
      mtdCalculations,
      profitTargets: profitTargets ? {
        monthly_revenue_target: profitTargets.monthly_revenue_target,
        monthly_cost_target: profitTargets.monthly_cost_target,
        monthly_profit_target: profitTargets.monthly_profit_target,
        // Component-based targets
        monthly_hours_target: profitTargets.monthly_hours_target,
        target_hourly_rate: profitTargets.target_hourly_rate,
        target_billable_ratio: profitTargets.target_billable_ratio,
        target_working_days_per_week: profitTargets.target_working_days_per_week,
        target_monthly_active_users: profitTargets.target_monthly_active_users,
        target_avg_subscription_fee: profitTargets.target_avg_subscription_fee,
        setup_completed: profitTargets.setup_completed
      } : undefined,
      clientRevenue: clientRevenue || undefined
    }

    console.log('🔍 Health Score Inputs:', {
      hasTimeStats: !!timeStats,
      hasRolling30Days: !!timeStats.rolling30Days,
      rolling30DaysData: timeStats.rolling30Days,
      hasDashboardMetrics: !!dashboardMetrics,
      hasProfitTargets: !!profitTargets,
      hasClientRevenue: !!clientRevenue
    })

    try {
      const results = healthScoreEngine.process(inputs)
      console.log('✅ Health Score Results:', results)
      setHealthScoreResults(results)
    } catch (error) {
      console.error('❌ Health score calculation failed:', error)
      // Set null when profit targets are not configured
      setHealthScoreResults(null)
    }
  }, [dashboardMetrics, timeStats, mtdCalculations, profitTargets, clientRevenue])

  // Determine if subscription/SaaS features are enabled
  const subscriptionEnabled = Boolean(
    profitTargets?.target_monthly_active_users && profitTargets.target_monthly_active_users > 0 &&
    profitTargets?.target_avg_subscription_fee && profitTargets.target_avg_subscription_fee > 0
  )

  // MTD Comparison calculation using time-based billable revenue + subscriptions
  const mtdComparison = useMemo(() => {
    if (!timeStats || !timeStats.thisMonth || !timeStats.previousMonthMTD) {
      return {
        current: 0,
        previous: 0,
        difference: 0,
        trend: 'neutral' as const,
        percentageChange: 0
      }
    }

    // Current month MTD: billable time revenue from time entries + MRR
    const currentMonthBillableRevenue = timeStats.thisMonth.billableRevenue || 0
    const currentMonthSubscriptionRevenue = (timeStats?.subscription?.monthlyActiveUsers?.current || 0) * (timeStats?.subscription?.averageSubscriptionFee?.current || 0)
    const currentMTD = currentMonthBillableRevenue + currentMonthSubscriptionRevenue

    // Previous month MTD (same day range): billable time revenue from time entries + MRR
    const previousMonthBillableRevenue = timeStats.previousMonthMTD.billableRevenue || 0
    const previousMonthSubscriptionRevenue = (timeStats?.subscription?.monthlyActiveUsers?.previous || 0) * (timeStats?.subscription?.averageSubscriptionFee?.previous || 0)
    const previousMTD = previousMonthBillableRevenue + previousMonthSubscriptionRevenue

    const difference = currentMTD - previousMTD
    const percentageChange = previousMTD > 0 ? (difference / previousMTD) * 100 : 0

    return {
      current: currentMTD,
      previous: previousMTD,
      difference,
      trend: difference >= 0 ? 'positive' as const : 'negative' as const,
      percentageChange
    }
  }, [timeStats, mtdCalculations])

  // Average Rate comparison calculation using billable hours only
  const rateComparison = useMemo(() => {
    if (!revenueTrend || revenueTrend.length < 2 || !timeStats?.thisMonth.billableHours) {
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

    // Current rate = current billable revenue / current billable hours
    const currentRate = timeStats.thisMonth.billableHours > 0 ?
      (timeStats.thisMonth.billableRevenue || 0) / timeStats.thisMonth.billableHours : 0

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
  }, [revenueTrend, timeStats])

  // Get health scores from decision tree results
  const healthScores = useMemo(() => {
    if (!healthScoreResults) {
      return { total: 0, profit: 0, cashflow: 0, efficiency: 0, risk: 0, totalRounded: 0 }
    }
    return healthScoreResults.scores
  }, [healthScoreResults])

  // Function to fetch all dashboard data
  const fetchAllData = async () => {
      try {
        setLoading(true)

        // Parallel fetch of all required data
        const [dashboardResponse, timeResponse, todayResponse, revenueTrendResponse, clientRevenueResponse] = await Promise.all([
          fetch('/api/invoices/dashboard-metrics'),
          fetch('/api/time-entries/stats'),
          fetch('/api/time-entries/today'),
          fetch('/api/financial/revenue-trend'),
          fetch('/api/financial/client-revenue')
        ])

        if (!dashboardResponse.ok || !timeResponse.ok || !revenueTrendResponse.ok) {
          throw new Error('Failed to fetch dashboard data')
        }

        const dashboardData: DashboardMetricsResponse = await dashboardResponse.json()
        const timeData: TimeStatsResponse = await timeResponse.json()
        const revenueTrendData = await revenueTrendResponse.json()
        const clientRevenueData = clientRevenueResponse.ok ? await clientRevenueResponse.json() : null

        // Dashboard metrics fetched successfully

        // Validate dashboard metrics for data integrity
        if (dashboardData.data) {
          const { achterstallig, achterstallig_count } = dashboardData.data
          if (achterstallig_count > 0 && achterstallig <= 0) {
            console.warn('⚠️ Dashboard Metrics Warning: Overdue count exists but amount is zero', { achterstallig, achterstallig_count })
          }
          if (achterstallig > 0 && achterstallig_count <= 0) {
            console.warn('⚠️ Dashboard Metrics Warning: Overdue amount exists but count is zero', { achterstallig, achterstallig_count })
          }
          if (achterstallig_count > 10) {
            console.warn('⚠️ Dashboard Metrics Warning: Unusually high overdue count, possible tenant isolation issue', { achterstallig, achterstallig_count })
          }
        }

        setDashboardMetrics(dashboardData.data)
        setTimeStats(timeData.data)
        setRevenueTrend(revenueTrendData.data || [])

        // Extract and set top client data and rolling 30-day comparison from client revenue response
        if (clientRevenueData?.data) {
          const topClient = clientRevenueData.data.summary?.topClient
          const rolling30DaysComparison = clientRevenueData.data.rolling30DaysComparison

          setClientRevenue({
            topClient: topClient ? {
              name: topClient.name,
              revenueShare: topClient.percentage // API returns percentage
            } : undefined,
            rolling30DaysComparison // Add rolling 30-day comparison data
          })
        } else {
          setClientRevenue(null)
        }

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
              total: clientRevenueData?.data?.summary?.totalClients || 10,
              activeThisMonth: clientRevenueData?.data?.summary?.totalClients || 6,
              topClient: clientRevenueData?.data?.summary?.topClient
                ? {
                    name: clientRevenueData.data.summary.topClient.name,
                    revenueShare: clientRevenueData.data.summary.topClient.percentage
                  }
                : { name: 'Unknown', revenueShare: 0 }
            },
            rate: {
              current: timeData.data.thisMonth.hours > 0
                ? Math.round(timeData.data.thisMonth.revenue / timeData.data.thisMonth.hours)
                : 0,
              target: profitTargets?.target_hourly_rate || 100
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

  const handleViewTax = () => {
    // Navigate to tax/reporting section (we'll implement this later)
    router.push('/dashboard/financieel?tab=belasting')
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

        {/* Quick Actions Bar - Priority Actions (Sticky) */}
        <TooltipProvider>
          <QuickActionsBar
            onStartTimer={handleStartTimer}
            onLogExpense={handleLogExpense}
            onCreateInvoice={handleCreateInvoice}
            onViewTax={handleViewTax}
            unbilledAmount={dashboardMetrics?.factureerbaar || 0}
            taxQuarterStatus={75} // TODO: Calculate actual tax quarter progress
          />
        </TooltipProvider>

        {/* Cohesive 3-Section Layout */}
        <div className="space-y-8">

          {/* Section 1: Compact Business Health + Monthly Metrics */}
          <div className="space-y-6">
            {/* Compact Business Health Score */}
            <TooltipProvider>
              <CompactBusinessHealth
                healthScores={healthScores}
                dateRange={dateRanges.rolling30}
                onShowHealthReport={() => setShowHealthReport(true)}
                onShowExplanation={setShowExplanation}
              />
            </TooltipProvider>

            {/* Monthly Progress - Compact Cards */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-green-600" />
                  <h3 className="text-base font-semibold">Monthly Progress</h3>
                  <Badge className="bg-green-500/10 text-green-600 text-xs">
                    <Calendar className="h-3 w-3 mr-1" />
                    MTD
                  </Badge>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3 w-3 text-green-600/50 hover:text-green-600 cursor-help transition-colors" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs" side="top">
                      <p className="text-xs font-semibold mb-1">Month-to-Date Progress</p>
                      <p className="text-xs">Monthly Progress tracks your current month ({dateRanges.mtd}) toward tactical monthly goals. Metrics reset at the start of each month for fresh monthly targets.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-xs text-muted-foreground">{dateRanges.mtd}</p>
              </div>

              <div className={`grid grid-cols-1 sm:grid-cols-2 ${subscriptionEnabled ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-3`}>
                {/* Revenue Card */}
                <CompactMetricCard
                  icon={Euro}
                  iconColor="bg-accent/20 text-accent"
                  title="Revenue MTD"
                  value={formatCurrency(Math.round((timeStats?.thisMonth?.billableRevenue || 0) + ((timeStats?.subscription?.monthlyActiveUsers?.current || 0) * (timeStats?.subscription?.averageSubscriptionFee?.current || 0))))}
                  subtitle={`/ €${Math.round(mtdCalculations.monthlyRevenueTarget / 1000)}K`}
                  progress={(((timeStats?.thisMonth?.billableRevenue || 0) + ((timeStats?.subscription?.monthlyActiveUsers?.current || 0) * (timeStats?.subscription?.averageSubscriptionFee?.current || 0))) / mtdCalculations.monthlyRevenueTarget) * 100}
                  progressColor="bg-accent"
                  targetLine={(mtdCalculations.mtdRevenueTarget / mtdCalculations.monthlyRevenueTarget) * 100}
                  badge={{
                    label: `${Math.round((((timeStats?.thisMonth?.billableRevenue || 0) + ((timeStats?.subscription?.monthlyActiveUsers?.current || 0) * (timeStats?.subscription?.averageSubscriptionFee?.current || 0))) / mtdCalculations.mtdRevenueTarget) * 100)}%`,
                    variant: (((timeStats?.thisMonth?.billableRevenue || 0) + ((timeStats?.subscription?.monthlyActiveUsers?.current || 0) * (timeStats?.subscription?.averageSubscriptionFee?.current || 0))) / mtdCalculations.mtdRevenueTarget) * 100 >= 100 ? 'success' :
                             (((timeStats?.thisMonth?.billableRevenue || 0) + ((timeStats?.subscription?.monthlyActiveUsers?.current || 0) * (timeStats?.subscription?.averageSubscriptionFee?.current || 0))) / mtdCalculations.mtdRevenueTarget) * 100 >= 80 ? 'warning' : 'danger'
                  }}
                  trendComparison={{
                    icon: mtdComparison.trend === 'positive' ? TrendingUp : TrendingDown,
                    value: `${mtdComparison.difference >= 0 ? '+' : ''}€${(Math.abs(mtdComparison.difference) / 1000).toFixed(1)}K (${mtdComparison.percentageChange >= 0 ? '+' : ''}${mtdComparison.percentageChange.toFixed(1)}%)`,
                    label: 'vs prev MTD',
                    isPositive: mtdComparison.trend === 'positive'
                  }}
                  splitMetrics={{
                    label1: 'Time-based',
                    value1: formatCurrency(timeStats?.thisMonth?.billableRevenue || 0),
                    label2: 'Subscriptions',
                    value2: formatCurrency(Math.round((timeStats?.subscription?.monthlyActiveUsers?.current || 0) * (timeStats?.subscription?.averageSubscriptionFee?.current || 0)))
                  }}
                />

                {/* Hours Card */}
                <CompactMetricCard
                  icon={Clock}
                  iconColor="bg-green-500/20 text-green-600"
                  title="Hours MTD"
                  value={`${timeStats?.thisMonth.billableHours || 0}h`}
                  subtitle={`/ ${Math.round(mtdCalculations.mtdHoursTarget)}h`}
                  progress={((timeStats?.thisMonth.billableHours || 0) / mtdCalculations.mtdHoursTarget) * 100}
                  progressColor="bg-green-500"
                  badge={{
                    label: `${Math.round(((timeStats?.thisMonth.billableHours || 0) / mtdCalculations.mtdHoursTarget) * 100)}%`,
                    variant: ((timeStats?.thisMonth.billableHours || 0) / mtdCalculations.mtdHoursTarget) * 100 >= 100 ? 'success' :
                             ((timeStats?.thisMonth.billableHours || 0) / mtdCalculations.mtdHoursTarget) * 100 >= 75 ? 'warning' : 'danger'
                  }}
                  trendComparison={{
                    icon: (timeStats?.thisWeek.trend === 'positive') ? TrendingUp : TrendingDown,
                    value: `${(timeStats?.thisWeek.difference || 0) >= 0 ? '+' : ''}${(timeStats?.thisWeek.difference || 0).toFixed(1)}h`,
                    label: 'this week',
                    isPositive: timeStats?.thisWeek.trend === 'positive'
                  }}
                  splitMetrics={{
                    label1: 'Non-billable',
                    value1: `${timeStats?.thisMonth.nonBillableHours || 0}h`,
                    label2: 'Unbilled',
                    value2: `${timeStats?.unbilled.hours || 0}h`
                  }}
                />

                {/* Avg Rate Card */}
                <CompactMetricCard
                  icon={Target}
                  iconColor="bg-blue-500/20 text-blue-600"
                  title="Avg Rate"
                  value={`€${(timeStats?.thisMonth.billableHours || 0) > 0 ? ((timeStats?.thisMonth.billableRevenue || 0) / timeStats.thisMonth.billableHours).toFixed(0) : '0'}`}
                  subtitle={`/ €${profitTargets?.target_hourly_rate || 100} target`}
                  progress={((timeStats?.thisMonth.billableHours || 0) > 0 ? ((timeStats?.thisMonth.billableRevenue || 0) / timeStats.thisMonth.billableHours) : 0) / (profitTargets?.target_hourly_rate || 100) * 100}
                  progressColor="bg-blue-500"
                  badge={{
                    label: `${Math.round((((timeStats?.thisMonth.billableHours || 0) > 0 ? ((timeStats?.thisMonth.billableRevenue || 0) / timeStats.thisMonth.billableHours) : 0) / (profitTargets?.target_hourly_rate || 100)) * 100)}%`,
                    variant: (((timeStats?.thisMonth.billableHours || 0) > 0 ? ((timeStats?.thisMonth.billableRevenue || 0) / timeStats.thisMonth.billableHours) : 0) / (profitTargets?.target_hourly_rate || 100)) * 100 >= 100 ? 'success' : 'warning'
                  }}
                  trendComparison={{
                    icon: rateComparison.trend === 'positive' ? TrendingUp : rateComparison.trend === 'negative' ? TrendingDown : TrendingUp,
                    value: `${rateComparison.percentageChange >= 0 ? '+' : ''}${rateComparison.percentageChange.toFixed(1)}%`,
                    label: 'vs prev month',
                    isPositive: rateComparison.trend === 'positive'
                  }}
                  splitMetrics={{
                    label1: 'Billable Hours',
                    value1: `${timeStats?.thisMonth.billableHours || 0}h`,
                    label2: 'Revenue',
                    value2: formatCurrency(timeStats?.thisMonth.billableRevenue || 0)
                  }}
                />

                {/* Subscription Card - Only if enabled */}
                {subscriptionEnabled && (
                  <CompactMetricCard
                    icon={Users}
                    iconColor="bg-purple-500/20 text-purple-600"
                    title="Active Users"
                    value={timeStats?.subscription?.monthlyActiveUsers?.current || 0}
                    subtitle="/ 15 target"
                    progress={((timeStats?.subscription?.monthlyActiveUsers?.current || 0) / 15) * 100}
                    progressColor="bg-purple-500"
                    badge={{
                      label: `${Math.round((timeStats?.subscription?.monthlyActiveUsers?.growth || 0))}%`,
                      variant: (timeStats?.subscription?.monthlyActiveUsers?.trend === 'positive') ? 'success' : 'warning'
                    }}
                  />
                )}

              </div>
            </div>
          </div>

          {/* Section 2: Management Dashboard - 2 Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">

            {/* Client Health Dashboard */}
            <div className="flex h-full">
              <ClientHealthDashboard
                onViewAllClients={() => router.push('/dashboard/financieel?tab=klanten')}
                className="w-full"
              />
            </div>

            {/* Cash Flow Forecast */}
            <div className="flex h-full">
              <CashFlowForecast
                dashboardMetrics={dashboardMetrics}
                className="w-full"
              />
            </div>
          </div>

          {/* Section 3: Analysis & Charts */}
          <Collapsible open={analyticsOpen} onOpenChange={setAnalyticsOpen}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Financial Analysis</h2>
                <p className="text-sm text-muted-foreground">Performance insights and trends</p>
              </div>
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm">
                  {analyticsOpen ? '▲ Hide' : '▼ Show'} Charts & Analysis
                </Button>
              </CollapsibleTrigger>
            </div>

            <CollapsibleContent className="space-y-6">

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
                  {timeStats ? Math.round((timeStats.thisMonth.hours / mtdCalculations.monthlyHoursTarget) * 100) : 0}%
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
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Enhanced Health Score Explanation Modal */}
        {showExplanation && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-card border rounded-xl max-w-[874px] w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-card border-b p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      showExplanation === 'profit' ? 'bg-primary/20' :
                      showExplanation === 'cashflow' ? 'bg-green-500/20' :
                      showExplanation === 'efficiency' ? 'bg-blue-500/20' : 'bg-purple-500/20'
                    }`}>
                      {showExplanation === 'profit' ? <Target className="h-5 w-5 text-primary" /> :
                       showExplanation === 'cashflow' ? <Activity className="h-5 w-5 text-green-500" /> :
                       showExplanation === 'efficiency' ? <Clock className="h-5 w-5 text-blue-500" /> :
                       <Users className="h-5 w-5 text-purple-500" />}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">
                        {getExplanation(showExplanation)?.title}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Current Score:</span>
                        <span className="text-lg font-bold text-primary">
                          {getExplanation(showExplanation)?.score}/25
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowExplanation(null)}
                    className="p-1 hover:bg-muted rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="p-4 sm:p-6">
                {/* Overview Section */}
                <div className="mb-6">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {showExplanation === 'profit' &&
                      `Profit Health measures your business's ability to generate sustainable profit through effective revenue streams and value creation. It evaluates ${subscriptionEnabled ? 'subscription business performance, ' : ''}revenue quality, and value-generating activities that directly impact your bottom line.`
                    }
                    {showExplanation === 'cashflow' &&
                      'Cash Flow Health focuses on your payment collection efficiency and outstanding invoices. It measures how quickly you collect payments and how well you manage overdue amounts, which directly affects your business liquidity and operational stability.'
                    }
                    {showExplanation === 'efficiency' &&
                      'Efficiency Health tracks your time utilization patterns and billing effectiveness. It measures how consistently you track time, meet your hourly targets, and convert tracked time into billable revenue.'
                    }
                    {showExplanation === 'risk' &&
                      `Risk Management Health evaluates potential threats to business continuity including invoice processing backlogs, payment risks${subscriptionEnabled ? ', and subscription health' : ''}. It identifies areas where operational delays could impact your revenue flow.`
                    }
                  </p>
                </div>

                {/* Score Breakdown Visualization */}
                {healthScoreResults && (
                  <HealthScoreHierarchicalTree
                    healthScoreResults={healthScoreResults}
                    category={showExplanation as 'profit' | 'cashflow' | 'efficiency' | 'risk'}
                    onMetricClick={(metricId, metricName, score, maxScore, currentValue) => {
                      // Use calculation modal for all metric clicks - no fallback to compact modal
                      setCalculationDetailModal({
                        metricId,
                        metricName,
                        calculationValue: `${score}/${maxScore} points`,
                        calculationDescription: `Current score: ${score}/${maxScore} points`,
                        score,
                        maxScore,
                        detailedCalculation: undefined
                      });
                    }}
                    onCalculationClick={(metricId, metricName, calculationValue, calculationDescription, score, maxScore, detailedCalculation) => {
                      setCalculationDetailModal({
                        metricId,
                        metricName,
                        calculationValue,
                        calculationDescription,
                        score,
                        maxScore,
                        detailedCalculation
                      });
                    }}
                    className="max-w-full"
                  />
                )}
              </div>


              <div className="sticky bottom-0 bg-card border-t p-4 sm:p-6">
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowExplanation(null)}
                    className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium">
                    Got it
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}


        {/* Calculation Detail Modal */}
        {calculationDetailModal && (
          <CalculationDetailModal
            metricId={calculationDetailModal.metricId}
            metricName={calculationDetailModal.metricName}
            calculationValue={calculationDetailModal.calculationValue}
            calculationDescription={calculationDetailModal.calculationDescription}
            currentScore={calculationDetailModal.score}
            maxScore={calculationDetailModal.maxScore}
            detailedCalculation={calculationDetailModal.detailedCalculation}
            isOpen={true}
            onClose={() => setCalculationDetailModal(null)}
          />
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
                {/* Profit Health */}
                <button
                  onClick={() => setShowExplanation('profit')}
                  className="p-4 border rounded-lg hover:shadow-md hover:border-primary/40 transition-all duration-200 text-left w-full"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-primary" />
                      <h4 className="font-semibold">Profit Health (Rolling 30d)</h4>
                    </div>
                    <span className="text-lg font-bold text-primary">{healthScores.profit}/25</span>
                  </div>
                  <div className="w-full bg-primary/20 rounded-full h-2 mb-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-500"
                      style={{ width: `${(healthScores.profit / 25) * 100}%` }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {healthScores.profit >= 20 ? 'Excellent profit performance!' :
                     healthScores.profit >= 15 ? 'Strong profit growth' :
                     healthScores.profit >= 10 ? 'Steady progress, room to improve' : 'Profit needs immediate attention'}
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
                      <h4 className="font-semibold">Efficiency Health (Rolling 30d)</h4>
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

              {/* Top 3 Recommended Actions - Combined List */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Top 3 Recommended Actions
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  {(() => {
                    // Combine all recommendations with their scores and priorities
                    const allRecommendations = [
                      ...healthScoreResults?.recommendations.profit || [],
                      ...healthScoreResults?.recommendations.cashflow || [],
                      ...healthScoreResults?.recommendations.efficiency || [],
                      ...healthScoreResults?.recommendations.risk || []
                    ]

                    // Sort by impact (highest first), then by priority (high > medium > low)
                    const sortedRecommendations = allRecommendations
                      .sort((a, b) => {
                        // First sort by impact
                        if (b.impact !== a.impact) return b.impact - a.impact

                        // Then by priority
                        const priorityOrder = { high: 3, medium: 2, low: 1 }
                        return priorityOrder[b.priority] - priorityOrder[a.priority]
                      })
                      .slice(0, 3) // Take top 3

                    const getPriorityColor = (priority: string) => {
                      switch (priority) {
                        case 'high': return 'bg-red-500/20 text-red-600 border-red-200'
                        case 'medium': return 'bg-orange-500/20 text-orange-600 border-orange-200'
                        case 'low': return 'bg-blue-500/20 text-blue-600 border-blue-200'
                        default: return 'bg-gray-500/20 text-gray-600 border-gray-200'
                      }
                    }

                    return sortedRecommendations.map((rec, index) => (
                      <div key={rec.id} className="p-4 bg-muted/30 rounded-lg border border-muted">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center mt-0.5">
                              {index + 1}
                            </span>
                            <div className="flex-1">
                              <h4 className="font-medium text-sm mb-1">{rec.title}</h4>
                              <p className="text-xs text-muted-foreground mb-2">{rec.description}</p>
                              <div className={`inline-flex items-center px-2 py-1 rounded-md border text-xs font-medium ${getPriorityColor(rec.priority)}`}>
                                {rec.priority.charAt(0).toUpperCase() + rec.priority.slice(1)} Priority
                              </div>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs whitespace-nowrap">
                            +{rec.impact} pts
                          </Badge>
                        </div>

                        {/* Action Items */}
                        <div className="space-y-1">
                          {rec.actionItems.slice(0, 3).map((action, actionIndex) => (
                            <div key={actionIndex} className="flex items-start gap-2 text-xs">
                              <span className="text-primary mt-1">•</span>
                              <span className="text-muted-foreground">{action}</span>
                            </div>
                          ))}
                        </div>

                        {/* Metrics */}
                        <div className="mt-3 pt-3 border-t border-muted">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">Current: </span>
                              <span className="font-medium">{rec.metrics?.current}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Target: </span>
                              <span className="font-medium">{rec.metrics?.target}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  })()}
                </div>
              </div>

              {/* Recommended Actions by Category */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Recommended Actions by Category
                </h3>
                <div className="space-y-6">
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
                        {/* Key Metrics from Engine */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          {healthScoreResults?.explanations.cashflow.details
                            .find(section => section.title?.includes('Payment Collection'))
                            ?.items.slice(0, 3).map((item, index) => {
                              if (item.type === 'metric' && item.label && item.value) {
                                const isGood = item.emphasis === 'primary'
                                return (
                                  <div key={index} className={`p-2 rounded-lg border text-xs ${
                                    isGood ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'
                                  }`}>
                                    <div className="text-muted-foreground mb-1">{item.label}</div>
                                    <div className={`font-medium ${isGood ? 'text-green-700' : 'text-orange-700'}`}>
                                      {item.value}
                                    </div>
                                  </div>
                                )
                              }
                              return null
                            }).filter(Boolean)}
                        </div>

                        {/* Engine-Driven Recommendations */}
                        {healthScoreResults?.recommendations.cashflow.slice(0, 5).map((rec, i) => (
                          <div key={i} className="p-3 bg-muted/30 rounded-lg">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-start gap-2">
                                <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold mt-0.5 ${
                                  rec.priority === 'high'
                                    ? 'bg-red-500/20 text-red-600'
                                    : rec.priority === 'medium'
                                      ? 'bg-yellow-500/20 text-yellow-600'
                                      : 'bg-green-500/20 text-green-600'
                                }`}>
                                  {i + 1}
                                </span>
                                <div className="flex-1">
                                  <div className="font-medium text-sm">{rec.title}</div>
                                  <div className="text-xs text-muted-foreground mt-1">{rec.description}</div>
                                </div>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                +{rec.impact} pts
                              </Badge>
                            </div>
                            <div className="ml-7 text-xs">
                              <span className="text-muted-foreground">Current:</span>
                              <span className="ml-1 font-medium">{rec.metrics.current}</span>
                              <span className="mx-2 text-muted-foreground">→</span>
                              <span className="text-muted-foreground">Target:</span>
                              <span className="ml-1 font-medium text-green-600">{rec.metrics.target}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-center">
                        <button
                          onClick={() => {
                            setShowHealthReport(false)
                            // Enhanced cross-navigation
                            if (onTabChange) {
                              onTabChange('facturen')
                            } else {
                              const params = new URLSearchParams(window.location.search)
                              params.set('tab', 'facturen')
                              window.history.pushState({}, '', `${window.location.pathname}?${params}`)
                            }
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
                    healthScores.profit < 15
                      ? 'bg-red-500/10 border border-red-500/20'
                      : healthScores.profit < 20
                        ? 'bg-yellow-500/10 border border-yellow-500/20'
                        : 'bg-green-500/10 border border-green-500/20'
                  }`}>
                    <h4 className={`font-semibold mb-2 flex items-center gap-2 ${
                      healthScores.profit < 15
                        ? 'text-red-600'
                        : healthScores.profit < 20
                          ? 'text-yellow-600'
                          : 'text-green-600'
                    }`}>
                      {healthScores.profit < 15 ? '🚨' : healthScores.profit < 20 ? '⚠️' : '✅'}
                      Profit Growth
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        healthScores.profit < 15
                          ? 'bg-red-500/20 text-red-600'
                          : healthScores.profit < 20
                            ? 'bg-yellow-500/20 text-yellow-600'
                            : 'bg-green-500/20 text-green-600'
                      }`}>
                        {healthScores.profit < 15 ? 'HIGH PRIORITY' : healthScores.profit < 20 ? 'MONITOR' : 'OPTIMIZED'}
                      </span>
                    </h4>

                      {/* Business Model Indicator */}
                      {healthScoreResults?.explanations.profit.breakdown?.redistribution && (
                        <div className="mb-3 p-2 rounded-lg bg-blue-50 border border-blue-200">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-blue-900">
                              {healthScoreResults.explanations.profit.breakdown.redistribution.businessModel === 'time-only' && '⏰ Time-Based Only'}
                              {healthScoreResults.explanations.profit.breakdown.redistribution.businessModel === 'saas-only' && '🔄 SaaS-Only'}
                              {healthScoreResults.explanations.profit.breakdown.redistribution.businessModel === 'hybrid' && '🔀 Hybrid Model'}
                            </span>
                            {healthScoreResults.explanations.profit.breakdown.redistribution.pointsRedistributed && (
                              <Badge variant="outline" className="text-xs bg-white">Fair Scoring</Badge>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="space-y-3 mb-4">
                        {/* Profit Driver Metrics from Engine */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          {healthScoreResults?.explanations.profit.details
                            .find(section => section.title?.includes('Subscription Business'))
                            ?.items.slice(0, 2).map((item, index) => {
                              if (item.type === 'metric' && item.label && item.value) {
                                const isGood = item.emphasis === 'primary'
                                return (
                                  <div key={index} className={`p-2 rounded-lg border text-xs ${
                                    isGood ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'
                                  }`}>
                                    <div className="text-muted-foreground mb-1">{item.label}</div>
                                    <div className={`font-medium ${isGood ? 'text-green-700' : 'text-orange-700'}`}>
                                      {item.value}
                                    </div>
                                  </div>
                                )
                              }
                              return null
                            }).filter(Boolean)}

                          {healthScoreResults?.explanations.profit.details
                            .find(section => section.title?.includes('Revenue Quality'))
                            ?.items.slice(0, 2).map((item, index) => {
                              if (item.type === 'metric' && item.label && item.value) {
                                const isGood = item.emphasis === 'primary'
                                return (
                                  <div key={`rq-${index}`} className={`p-2 rounded-lg border text-xs ${
                                    isGood ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'
                                  }`}>
                                    <div className="text-muted-foreground mb-1">{item.label}</div>
                                    <div className={`font-medium ${isGood ? 'text-green-700' : 'text-orange-700'}`}>
                                      {item.value}
                                    </div>
                                  </div>
                                )
                              }
                              return null
                            }).filter(Boolean)}
                        </div>

                        {/* Engine-Driven Profit Recommendations */}
                        {healthScoreResults?.recommendations.profit.slice(0, 5).map((rec, i) => (
                          <div key={i} className="p-3 bg-muted/30 rounded-lg">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-start gap-2">
                                <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold mt-0.5 ${
                                  rec.priority === 'high'
                                    ? 'bg-red-500/20 text-red-600'
                                    : rec.priority === 'medium'
                                      ? 'bg-yellow-500/20 text-yellow-600'
                                      : 'bg-green-500/20 text-green-600'
                                }`}>
                                  {i + 1}
                                </span>
                                <div className="flex-1">
                                  <div className="font-medium text-sm">{rec.title}</div>
                                  <div className="text-xs text-muted-foreground mt-1">{rec.description}</div>
                                </div>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                +{rec.impact} pts
                              </Badge>
                            </div>
                            <div className="ml-7 text-xs">
                              <span className="text-muted-foreground">Current:</span>
                              <span className="ml-1 font-medium">{rec.metrics.current}</span>
                              <span className="mx-2 text-muted-foreground">→</span>
                              <span className="text-muted-foreground">Target:</span>
                              <span className="ml-1 font-medium text-green-600">{rec.metrics.target}</span>
                            </div>
                          </div>
                        ))}
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
                        {/* Risk Metrics from Engine */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          {healthScoreResults?.explanations.risk.details
                            .find(section => section.title?.includes('Business Continuity'))
                            ?.items.slice(0, 3).map((item, index) => {
                              if (item.type === 'metric' && item.label && item.value) {
                                const isGood = item.emphasis === 'primary'
                                return (
                                  <div key={index} className={`p-2 rounded-lg border text-xs ${
                                    isGood ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'
                                  }`}>
                                    <div className="text-muted-foreground mb-1">{item.label}</div>
                                    <div className={`font-medium ${isGood ? 'text-green-700' : 'text-orange-700'}`}>
                                      {item.value}
                                    </div>
                                  </div>
                                )
                              }
                              return null
                            }).filter(Boolean)}
                        </div>

                        {/* Engine-Driven Risk Recommendations */}
                        {healthScoreResults?.recommendations.risk.slice(0, 5).map((rec, i) => (
                          <div key={i} className="p-3 bg-muted/30 rounded-lg">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-start gap-2">
                                <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold mt-0.5 ${
                                  rec.priority === 'high'
                                    ? 'bg-red-500/20 text-red-600'
                                    : rec.priority === 'medium'
                                      ? 'bg-yellow-500/20 text-yellow-600'
                                      : 'bg-green-500/20 text-green-600'
                                }`}>
                                  {i + 1}
                                </span>
                                <div className="flex-1">
                                  <div className="font-medium text-sm">{rec.title}</div>
                                  <div className="text-xs text-muted-foreground mt-1">{rec.description}</div>
                                </div>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                +{rec.impact} pts
                              </Badge>
                            </div>
                            <div className="ml-7 text-xs">
                              <span className="text-muted-foreground">Current:</span>
                              <span className="ml-1 font-medium">{rec.metrics.current}</span>
                              <span className="mx-2 text-muted-foreground">→</span>
                              <span className="text-muted-foreground">Target:</span>
                              <span className="ml-1 font-medium text-green-600">{rec.metrics.target}</span>
                            </div>
                          </div>
                        ))}
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
                        {/* Time Utilization Metrics from Engine */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          {healthScoreResults?.explanations.efficiency.details
                            .find(section => section.title?.includes('Time Utilization'))
                            ?.items.slice(0, 4).map((item, index) => {
                              if (item.type === 'metric' && item.label && item.value) {
                                const isGood = item.emphasis === 'primary'
                                return (
                                  <div key={index} className={`p-2 rounded-lg border text-xs ${
                                    isGood ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'
                                  }`}>
                                    <div className="text-muted-foreground mb-1">{item.label}</div>
                                    <div className={`font-medium ${isGood ? 'text-green-700' : 'text-orange-700'}`}>
                                      {item.value}
                                    </div>
                                  </div>
                                )
                              }
                              return null
                            }).filter(Boolean)}
                        </div>

                        {/* Engine-Driven Efficiency Recommendations */}
                        {healthScoreResults?.recommendations.efficiency.slice(0, 5).map((rec, i) => (
                          <div key={i} className="p-3 bg-muted/30 rounded-lg">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-start gap-2">
                                <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold mt-0.5 ${
                                  rec.priority === 'high'
                                    ? 'bg-red-500/20 text-red-600'
                                    : rec.priority === 'medium'
                                      ? 'bg-yellow-500/20 text-yellow-600'
                                      : 'bg-green-500/20 text-green-600'
                                }`}>
                                  {i + 1}
                                </span>
                                <div className="flex-1">
                                  <div className="font-medium text-sm">{rec.title}</div>
                                  <div className="text-xs text-muted-foreground mt-1">{rec.description}</div>
                                </div>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                +{rec.impact} pts
                              </Badge>
                            </div>
                            <div className="ml-7 text-xs">
                              <span className="text-muted-foreground">Current:</span>
                              <span className="ml-1 font-medium">{rec.metrics.current}</span>
                              <span className="mx-2 text-muted-foreground">→</span>
                              <span className="text-muted-foreground">Target:</span>
                              <span className="ml-1 font-medium text-green-600">{rec.metrics.target}</span>
                            </div>
                          </div>
                        ))}
                      </div>
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
'use client'

import { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ActiveTimerWidget } from './active-timer-widget'
import { ClientHealthDashboard } from './client-health-dashboard'
import { CashFlowForecast } from './cash-flow-forecast'
import { FinancialCharts } from '../financial/charts/financial-charts'
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
      mtdRevenueTarget: monthlyRevenueTarget * monthProgress,
      mtdHoursTarget: Math.round(monthlyHoursTarget * workingDaysProgress), // Now uses working days!
      expectedWorkingDaysUpToYesterday,
      totalExpectedWorkingDays
    }
  }, [profitTargets]) // Add profitTargets dependency

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
                    {/* Profit Score Card */}
                    <div
                      onClick={() => setShowExplanation('profit')}
                      className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 p-3 transition-all duration-300 hover:from-primary/10 hover:to-primary/20 hover:scale-105 hover:shadow-lg border border-primary/20 hover:border-primary/40 cursor-pointer"
                    >
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className="p-1 rounded-lg bg-primary/20 group-hover:bg-primary/30 transition-colors">
                              <DollarSign className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <div>
                              <p className="text-xs font-medium text-left leading-none">Total Profit (MTD)</p>
                              <p className="text-xs text-muted-foreground leading-none">
                                {healthScores.profit >= 20 ? 'Crushing it!' :
                                 healthScores.profit >= 15 ? 'Strong performance' :
                                 healthScores.profit >= 10 ? 'Room to grow' : 'Needs attention'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-baseline gap-1">
                              <span className="text-lg font-bold text-primary">{healthScores.profit}</span>
                              <span className="text-xs text-muted-foreground">/25</span>
                            </div>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-primary/20 rounded-full h-1 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-primary to-primary/80 h-1 rounded-full transition-all duration-700 ease-out"
                            style={{ width: `${(healthScores.profit / 25) * 100}%` }}
                          />
                        </div>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>

                    {/* Cash Flow Score Card */}
                    <div
                      onClick={() => setShowExplanation('cashflow')}
                      className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-green-500/5 to-green-500/10 p-3 transition-all duration-300 hover:from-green-500/10 hover:to-green-500/20 hover:scale-105 hover:shadow-lg border border-green-500/20 hover:border-green-500/40 cursor-pointer"
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
                    </div>

                    {/* Efficiency Score Card */}
                    <div
                      onClick={() => setShowExplanation('efficiency')}
                      className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500/5 to-blue-500/10 p-3 transition-all duration-300 hover:from-blue-500/10 hover:to-blue-500/20 hover:scale-105 hover:shadow-lg border border-blue-500/20 hover:border-blue-500/40 cursor-pointer"
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
                    </div>

                    {/* Risk Management Score Card */}
                    <div
                      onClick={() => setShowExplanation('risk')}
                      className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-500/5 to-purple-500/10 p-3 transition-all duration-300 hover:from-purple-500/10 hover:to-purple-500/20 hover:scale-105 hover:shadow-lg border border-purple-500/20 hover:border-purple-500/40 cursor-pointer"
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
                    </div>
                  </div>

                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Dynamic Card Metrics System - Adapts to Business Model */}
            <div className={`grid grid-cols-1 sm:grid-cols-2 ${subscriptionEnabled ? 'xl:grid-cols-5' : 'xl:grid-cols-3'} gap-4 sm:gap-6`}>
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
                    <span className="text-sm text-muted-foreground">/ €{profitTargets?.target_hourly_rate || 100} target</span>
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

              {/* Card 4: Monthly Active Users - Only show if subscription enabled */}
              {subscriptionEnabled && (
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
              )}

              {/* Card 5: Average Subscription Fee - Only show if subscription enabled */}
              {subscriptionEnabled && (
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
              )}
            </div>
          </div>

          {/* Section 2: Management Dashboard - 3 Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">

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
            <div className="flex h-full">
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
                      <h4 className="font-semibold">Profit Health (MTD)</h4>
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
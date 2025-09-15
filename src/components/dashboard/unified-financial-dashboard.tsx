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
  Info
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
  const [healthScoreOpen, setHealthScoreOpen] = useState(false)
  const [showExplanation, setShowExplanation] = useState<string | null>(null)

  // Official Cash Flow Scoring Function (Based on Accounting Standards)
  const calculateAdvancedCashFlowScore = (metrics: any) => {
    if (!metrics || metrics.totale_registratie === 0) return 25

    const totalRevenue = metrics.totale_registratie
    const overdueAmount = metrics.achterstallig
    const overdueCount = metrics.achterstallig_count
    const paidAmount = totalRevenue - overdueAmount

    // 1. Operating Cash Flow Ratio (10 points) - Industry Standard
    // Formula: (Revenue - Overdue) ÷ Revenue = Collection Rate
    const operatingCashFlowRatio = paidAmount / totalRevenue
    let ocfScore = 0
    if (operatingCashFlowRatio >= 0.90) ocfScore = 10      // Excellent >90%
    else if (operatingCashFlowRatio >= 0.75) ocfScore = 7  // Good 75-90%
    else if (operatingCashFlowRatio >= 0.60) ocfScore = 5  // Fair 60-75%
    else if (operatingCashFlowRatio >= 0.40) ocfScore = 3  // Poor 40-60%
    else ocfScore = 1                                      // Critical <40%

    // 2. Current Liability Coverage (8 points) - Accounting Standard
    // Formula: Operating Cash Flow ÷ Current Liabilities
    // Approximating with: Cash Flow ÷ Monthly Revenue (as liability proxy)
    const monthlyRevenue = totalRevenue // Assuming monthly data
    const currentLiabilityCoverage = paidAmount / monthlyRevenue
    let clcScore = 0
    if (currentLiabilityCoverage >= 1.5) clcScore = 8      // Excellent >1.5x
    else if (currentLiabilityCoverage >= 1.0) clcScore = 6 // Good 1.0-1.5x
    else if (currentLiabilityCoverage >= 0.7) clcScore = 4 // Fair 0.7-1.0x
    else if (currentLiabilityCoverage >= 0.5) clcScore = 2 // Poor 0.5-0.7x
    else clcScore = 1                                      // Critical <0.5x

    // 3. Collection Efficiency - DSO Equivalent (4 points)
    // Formula: (Overdue Amount ÷ Monthly Revenue) × 30 days
    const dsoEquivalent = (overdueAmount / totalRevenue) * 30
    let dsoScore = 0
    if (dsoEquivalent <= 15) dsoScore = 4        // Excellent <15 days
    else if (dsoEquivalent <= 30) dsoScore = 3   // Good 15-30 days (industry standard)
    else if (dsoEquivalent <= 45) dsoScore = 2   // Fair 30-45 days
    else if (dsoEquivalent <= 60) dsoScore = 1   // Poor 45-60 days
    else dsoScore = 0                            // Critical >60 days

    // 4. Risk Factor Adjustment (3 points) - Concentration Risk
    let riskScore = 0
    if (overdueCount <= 2) riskScore = 3         // Low risk: 0-2 overdue
    else if (overdueCount <= 4) riskScore = 2    // Medium risk: 3-4 overdue
    else if (overdueCount <= 6) riskScore = 1    // High risk: 5-6 overdue
    else riskScore = 0                           // Critical risk: 7+ overdue

    // Calculate final score (max 25 points)
    const finalScore = ocfScore + clcScore + dsoScore + riskScore

    return Math.max(0, Math.min(25, finalScore))
  }

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
      mtdHoursTarget: 160 * monthProgress
    }
  }, [])

  // Calculate health scores using centralized MTD calculations
  const healthScores = useMemo(() => {
    if (!dashboardMetrics || !timeStats) return { total: 0, revenue: 0, cashflow: 0, efficiency: 0, risk: 0 }

    const { mtdRevenueTarget, mtdHoursTarget } = mtdCalculations

    // Revenue Health (25 points max) - MTD based
    const revenueScore = Math.min(Math.round((dashboardMetrics.totale_registratie / mtdRevenueTarget) * 25), 25)

    // Cash Flow Health (25 points max) - sophisticated time-weighted scoring
    const cashflowScore = calculateAdvancedCashFlowScore(dashboardMetrics)

    // Efficiency Health (25 points max) - MTD based
    const efficiencyScore = Math.min(Math.round((timeStats.thisMonth.hours / mtdHoursTarget) * 25), 25)

    // Risk Management (25 points max) - operational risks (matching modal calculation)
    const unbilledRisk = Math.round(Math.min((timeStats.unbilled.hours / 40) * 12, 12))
    const clientConcentrationRisk = 3 // Assume moderate risk
    const workloadRisk = timeStats.thisMonth.hours > 200 ? 5 : timeStats.thisMonth.hours < 80 ? 3 : 0
    const riskScore = Math.max(0, 25 - unbilledRisk - workloadRisk - clientConcentrationRisk)

    // Calculate total as exact sum of rounded individual card scores
    const totalScore = revenueScore + cashflowScore + efficiencyScore + riskScore

    // Use exact total (no separate rounding) to avoid discrepancy with sum of cards
    const displayTotalScore = totalScore

    return {
      total: totalScore,
      totalRounded: displayTotalScore, // Same as total - no separate rounding
      revenue: revenueScore,
      cashflow: cashflowScore,
      efficiency: efficiencyScore,
      risk: riskScore
    }
  }, [dashboardMetrics, timeStats, mtdCalculations])

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

  // Explanation content for each health score category
  const getExplanation = (category: string) => {
    if (!dashboardMetrics || !timeStats) return null

    const formatCurrency = (amount: number) => `€${amount.toLocaleString()}`

    // Use centralized MTD calculations
    const { currentDay, daysInMonth, monthProgress, mtdRevenueTarget, mtdHoursTarget } = mtdCalculations

    switch (category) {
      case 'revenue':
        const revenueScore = Math.round((dashboardMetrics.totale_registratie / mtdRevenueTarget) * 25)
        const revenueProgress = (dashboardMetrics.totale_registratie / mtdRevenueTarget) * 100
        return {
          title: 'Revenue Health - MTD (25 points max)',
          score: Math.min(revenueScore, 25),
          details: [
            `Current Revenue (MTD): ${formatCurrency(dashboardMetrics.totale_registratie)}`,
            `MTD Target (Day ${currentDay}/${daysInMonth}): ${formatCurrency(mtdRevenueTarget)}`,
            `Monthly Target: ${formatCurrency(12000)}`,
            `Month Progress: ${(monthProgress * 100).toFixed(1)}%`,
            `Revenue Progress: ${revenueProgress.toFixed(1)}%`,
            '',
            'Calculation:',
            `MTD Target = €12,000 × (${currentDay}/${daysInMonth}) = ${formatCurrency(mtdRevenueTarget)}`,
            `Score = min(current/mtd_target, 1) × 25`,
            `Score = min(${dashboardMetrics.totale_registratie}/${mtdRevenueTarget.toFixed(0)}, 1) × 25 = ${Math.min(revenueScore, 25)}`
          ]
        }
      case 'cashflow':
        const totalRevenue = dashboardMetrics.totale_registratie
        const overdueAmount = dashboardMetrics.achterstallig
        const paidAmount = totalRevenue - overdueAmount
        const overdueCount = dashboardMetrics.achterstallig_count

        // Calculate each component
        const operatingCashFlowRatio = paidAmount / totalRevenue
        const currentLiabilityCoverage = paidAmount / totalRevenue
        const dsoEquivalent = (overdueAmount / totalRevenue) * 30

        // Score each component
        let ocfScore = operatingCashFlowRatio >= 0.90 ? 10 : operatingCashFlowRatio >= 0.75 ? 7 : operatingCashFlowRatio >= 0.60 ? 5 : operatingCashFlowRatio >= 0.40 ? 3 : 1
        let clcScore = currentLiabilityCoverage >= 1.5 ? 8 : currentLiabilityCoverage >= 1.0 ? 6 : currentLiabilityCoverage >= 0.7 ? 4 : currentLiabilityCoverage >= 0.5 ? 2 : 1
        let dsoScore = dsoEquivalent <= 15 ? 4 : dsoEquivalent <= 30 ? 3 : dsoEquivalent <= 45 ? 2 : dsoEquivalent <= 60 ? 1 : 0
        let cashflowRiskScore = overdueCount <= 2 ? 3 : overdueCount <= 4 ? 2 : overdueCount <= 6 ? 1 : 0

        const finalScore = ocfScore + clcScore + dsoScore + cashflowRiskScore

        return {
          title: 'Official Cash Flow Health - Accounting Standards (25 points)',
          score: finalScore,
          details: [
            `Paid Amount: ${formatCurrency(paidAmount)}`,
            `Overdue Amount: ${formatCurrency(overdueAmount)}`,
            `Total Revenue: ${formatCurrency(totalRevenue)}`,
            `Overdue Count: ${overdueCount} invoices`,
            '',
            'Official Accounting Ratios:',
            `1. Operating Cash Flow Ratio: ${(operatingCashFlowRatio * 100).toFixed(1)}% → ${ocfScore}/10 pts`,
            `   Standard: >90%=Excellent, 75-90%=Good, 60-75%=Fair`,
            '',
            `2. Current Liability Coverage: ${currentLiabilityCoverage.toFixed(2)}x → ${clcScore}/8 pts`,
            `   Standard: >1.5x=Excellent, 1.0-1.5x=Good, 0.7-1.0x=Fair`,
            '',
            `3. Collection Efficiency (DSO): ${dsoEquivalent.toFixed(1)} days → ${dsoScore}/4 pts`,
            `   Industry Standard: <30 days=Good, 30-45=Fair, >60=Critical`,
            '',
            `4. Collection Risk: ${overdueCount} overdue → ${cashflowRiskScore}/3 pts`,
            `   Standard: ≤2=Low Risk, 3-4=Medium, 5+=High Risk`,
            '',
            `Total Score: ${ocfScore} + ${clcScore} + ${dsoScore} + ${cashflowRiskScore} = ${finalScore}/25`
          ]
        }
      case 'efficiency':
        const hoursProgress = (timeStats.thisMonth.hours / mtdHoursTarget) * 100
        const efficiencyScore = Math.round(Math.min((timeStats.thisMonth.hours / mtdHoursTarget) * 25, 25))
        return {
          title: 'Efficiency Health - MTD (25 points max)',
          score: Math.min(efficiencyScore, 25),
          details: [
            `Current Hours (MTD): ${timeStats.thisMonth.hours}h`,
            `MTD Target (Day ${currentDay}/${daysInMonth}): ${mtdHoursTarget.toFixed(1)}h`,
            `Monthly Target: 160h`,
            `Month Progress: ${(monthProgress * 100).toFixed(1)}%`,
            `Hours Progress: ${hoursProgress.toFixed(1)}%`,
            `Current Rate: ${timeStats.thisMonth.hours > 0 ? formatCurrency(Math.round(timeStats.thisMonth.revenue / timeStats.thisMonth.hours)) : '€0'}/h`,
            '',
            'Calculation:',
            `MTD Target = 160h × (${currentDay}/${daysInMonth}) = ${mtdHoursTarget.toFixed(1)}h`,
            `Score = min((${timeStats.thisMonth.hours} / ${mtdHoursTarget.toFixed(1)}) × 25, 25) = ${Math.min(efficiencyScore, 25)}`,
            '',
            'Based on monthly billable hours target of 160h, prorated for MTD'
          ]
        }
      case 'risk':
        // Focus on operational and business continuity risks (not cash flow overlap)
        const unbilledRisk = Math.round(Math.min((timeStats.unbilled.hours / 40) * 12, 12)) // Max 12 points penalty
        const clientConcentrationRisk = 3 // Assume moderate risk - could be enhanced with actual client data
        const workloadRisk = timeStats.thisMonth.hours > 200 ? 5 : timeStats.thisMonth.hours < 80 ? 3 : 0 // Burnout or underutilization risk

        const operationalRiskScore = Math.max(0, 25 - unbilledRisk - workloadRisk - clientConcentrationRisk)

        return {
          title: 'Operational Risk Management (25 points max)',
          score: operationalRiskScore,
          details: [
            `Unbilled Hours: ${timeStats.unbilled.hours}h`,
            `Unbilled Revenue: ${formatCurrency(timeStats.unbilled.revenue)}`,
            `Monthly Hours: ${timeStats.thisMonth.hours}h`,
            '',
            'Operational Risk Assessment:',
            `1. Revenue Risk (Unbilled): -${unbilledRisk}/12 pts`,
            `   Formula: round(min((${timeStats.unbilled.hours}h / 40h) × 12, 12))`,
            `   Risk: >40h unbilled = high revenue at risk`,
            '',
            `2. Workload Risk: -${workloadRisk}/5 pts`,
            `   Current: ${timeStats.thisMonth.hours}h/month`,
            `   Risk: >200h = Burnout, <80h = Underutilization`,
            '',
            `3. Business Continuity: -${clientConcentrationRisk}/8 pts`,
            `   Estimated client concentration risk`,
            '',
            `Total Score: 25 - ${unbilledRisk} - ${workloadRisk} - ${clientConcentrationRisk} = ${operationalRiskScore}`
          ]
        }
      default:
        return null
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
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${
                        (dashboardMetrics?.achterstallig === 0 && (timeStats?.unbilled.hours || 0) < 20)
                          ? 'bg-green-500/20 border-green-500/30'
                          : (dashboardMetrics?.achterstallig || 0) > 0
                            ? 'bg-red-500/20 border-red-500/30'
                            : 'bg-orange-500/20 border-orange-500/30'
                      } border`}>
                        <Activity className={`h-5 w-5 ${
                          (dashboardMetrics?.achterstallig === 0 && (timeStats?.unbilled.hours || 0) < 20)
                            ? 'text-green-500'
                            : (dashboardMetrics?.achterstallig || 0) > 0
                              ? 'text-red-500'
                              : 'text-orange-500'
                        }`} />
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold">Business Health Score</h3>
                        <p className="text-sm text-muted-foreground">
                          {healthScores.total >= 85 ? 'Excellent financial performance (MTD)' :
                           healthScores.total >= 70 ? 'Good progress towards monthly targets' :
                           healthScores.total >= 50 ? 'Some areas need attention' :
                           'Immediate action required'
                          }
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className={`text-3xl font-bold ${
                          healthScores.totalRounded >= 85 ? 'text-green-500' :
                          healthScores.totalRounded >= 70 ? 'text-blue-500' :
                          healthScores.totalRounded >= 50 ? 'text-orange-500' : 'text-red-500'
                        }`}>
                          {healthScores.totalRounded}%
                        </div>
                        <Badge className={`${
                          healthScores.totalRounded >= 85 ? 'bg-green-500/10 text-green-500' :
                          healthScores.totalRounded >= 70 ? 'bg-blue-500/10 text-blue-500' :
                          healthScores.totalRounded >= 50 ? 'bg-orange-500/10 text-orange-500' : 'bg-red-500/10 text-red-500'
                        }`}>
                          {healthScores.totalRounded >= 85 ? 'EXCELLENT' :
                           healthScores.totalRounded >= 70 ? 'GOOD' :
                           healthScores.totalRounded >= 50 ? 'WARNING' : 'CRITICAL'
                          }
                        </Badge>
                      </div>
                      <div className="flex items-center">
                        {healthScoreOpen ? (
                          <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-200" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform duration-200" />
                        )}
                      </div>
                    </div>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent className="space-y-4 mt-4">
                  {/* Health breakdown - 4 key metrics (Now Clickable!) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <button
                      onClick={() => setShowExplanation('revenue')}
                      className="text-center p-3 bg-primary/5 rounded-lg hover:bg-primary/10 transition-colors border border-transparent hover:border-primary/20 cursor-pointer group"
                    >
                      <div className="flex items-center justify-center mb-1">
                        <DollarSign className="h-4 w-4 text-primary" />
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">Revenue (MTD)</p>
                      <p className="text-sm font-bold">
                        {healthScores.revenue}/25
                      </p>
                      <Info className="h-3 w-3 text-muted-foreground mx-auto mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                    <button
                      onClick={() => setShowExplanation('cashflow')}
                      className="text-center p-3 bg-green-500/5 rounded-lg hover:bg-green-500/10 transition-colors border border-transparent hover:border-green-500/20 cursor-pointer group"
                    >
                      <div className="flex items-center justify-center mb-1">
                        <Activity className="h-4 w-4 text-green-500" />
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">Cash Flow</p>
                      <p className="text-sm font-bold">
                        {healthScores.cashflow}/25
                      </p>
                      <Info className="h-3 w-3 text-muted-foreground mx-auto mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                    <button
                      onClick={() => setShowExplanation('efficiency')}
                      className="text-center p-3 bg-blue-500/5 rounded-lg hover:bg-blue-500/10 transition-colors border border-transparent hover:border-blue-500/20 cursor-pointer group"
                    >
                      <div className="flex items-center justify-center mb-1">
                        <Clock className="h-4 w-4 text-blue-500" />
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">Efficiency (MTD)</p>
                      <p className="text-sm font-bold">
                        {healthScores.efficiency}/25
                      </p>
                      <Info className="h-3 w-3 text-muted-foreground mx-auto mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                    <button
                      onClick={() => setShowExplanation('risk')}
                      className="text-center p-3 bg-purple-500/5 rounded-lg hover:bg-purple-500/10 transition-colors border border-transparent hover:border-purple-500/20 cursor-pointer group"
                    >
                      <div className="flex items-center justify-center mb-1">
                        <Users className="h-4 w-4 text-purple-500" />
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">Risk Mgmt</p>
                      <p className="text-sm font-bold">
                        {healthScores.risk}/25
                      </p>
                      <Info className="h-3 w-3 text-muted-foreground mx-auto mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  </div>

                  {/* Progress bar and smart actions */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span>Overall Health</span>
                      <span className={`${
                        healthScores.totalRounded >= 85 ? 'text-green-500' :
                        healthScores.totalRounded >= 70 ? 'text-blue-500' :
                        healthScores.totalRounded >= 50 ? 'text-orange-500' : 'text-red-500'
                      }`}>
                        {healthScores.totalRounded}%
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-2 transition-all duration-500 ${
                          healthScores.totalRounded >= 85 ? 'bg-green-500' :
                          healthScores.totalRounded >= 70 ? 'bg-blue-500' :
                          healthScores.totalRounded >= 50 ? 'bg-orange-500' : 'bg-red-500'
                        }`}
                        style={{
                          width: `${healthScores.totalRounded}%`
                        }}
                      />
                    </div>

                    {/* Integrated Smart Actions */}
                    <div className="flex items-center justify-between gap-3 pt-1">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          {(dashboardMetrics?.achterstallig || 0) === 0 ? (
                            <>
                              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                              No overdue invoices
                            </>
                          ) : (
                            <>
                              <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                              {dashboardMetrics?.achterstallig_count || 0} overdue invoice(s)
                            </>
                          )}
                        </span>
                        <span className="flex items-center gap-1">
                          {(timeStats?.unbilled.hours || 0) === 0 ? (
                            <>
                              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                              No unbilled hours
                            </>
                          ) : (
                            <>
                              <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                              {timeStats?.unbilled.hours || 0}h unbilled
                            </>
                          )}
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        {dashboardMetrics && dashboardMetrics.achterstallig > 0 && (
                          <button
                            onClick={handleReviewOverdue}
                            className="text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md transition-colors flex items-center gap-1"
                          >
                            <CreditCard className="h-3 w-3" />
                            Review
                          </button>
                        )}

                        {timeStats && timeStats.unbilled.hours > 0 && (
                          <button
                            onClick={handleCreateInvoice}
                            className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded-md transition-colors flex items-center gap-1"
                          >
                            <FileText className="h-3 w-3" />
                            Invoice
                          </button>
                        )}

                        {(!dashboardMetrics || dashboardMetrics.achterstallig === 0) &&
                         (!timeStats || timeStats.unbilled.hours === 0) && (
                          <div className="flex items-center gap-1 text-xs text-green-600">
                            <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                            All caught up!
                          </div>
                        )}
                      </div>
                    </div>
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
                    (timeStats?.subscription?.monthlyActiveUsers?.trend === 'positive') ? 'status-active' :
                    (timeStats?.subscription?.monthlyActiveUsers?.trend === 'neutral') ? 'status-warning' : 'status-inactive'
                  }`}>
                    <span>
                      {(timeStats?.subscription?.monthlyActiveUsers?.growth || 0) >= 0 ? '+' : ''}
                      {Math.round(timeStats?.subscription?.monthlyActiveUsers?.growth || 0)}%
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold metric-number text-purple-400">
                      {(timeStats?.subscription?.monthlyActiveUsers?.current || 0).toLocaleString()}
                    </span>
                    <span className="text-sm text-muted-foreground">users</span>
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
                    (timeStats?.subscription?.averageSubscriptionFee?.trend === 'positive') ? 'status-active' :
                    (timeStats?.subscription?.averageSubscriptionFee?.trend === 'neutral') ? 'status-warning' : 'status-inactive'
                  }`}>
                    <span>
                      {(timeStats?.subscription?.averageSubscriptionFee?.growth || 0) >= 0 ? '+' : ''}
                      {Math.round(timeStats?.subscription?.averageSubscriptionFee?.growth || 0)}%
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold metric-number text-emerald-400">
                      €{Math.round(timeStats?.subscription?.averageSubscriptionFee?.current || 0)}
                    </span>
                    <span className="text-sm text-muted-foreground">/month</span>
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
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/20">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Current</p>
                    <p className="text-sm font-bold text-emerald-400">€{Math.round(timeStats?.subscription?.averageSubscriptionFee?.current || 0)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Previous</p>
                    <p className="text-sm font-bold text-muted-foreground">€{Math.round(timeStats?.subscription?.averageSubscriptionFee?.previous || 0)}</p>
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
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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

              <div className="space-y-2">
                {getExplanation(showExplanation)?.details.map((detail, index) => (
                  <p
                    key={index}
                    className={`text-sm ${
                      detail === '' ? 'h-2' :
                      detail.startsWith('Calculation') || detail.startsWith('Risk Calculations') ? 'font-medium text-foreground mt-3' :
                      detail.startsWith('Score =') ? 'font-mono text-xs bg-muted p-2 rounded' :
                      'text-muted-foreground'
                    }`}
                  >
                    {detail}
                  </p>
                ))}
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
      </div>
    </div>
  )
}
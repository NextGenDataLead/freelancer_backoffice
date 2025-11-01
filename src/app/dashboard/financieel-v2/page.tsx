'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { GlassmorphicMetricCard } from '@/components/dashboard/glassmorphic-metric-card'
import { GlassmorphicBusinessHealth } from '@/components/dashboard/glassmorphic-business-health'
import { HealthExplanationModal } from '@/components/dashboard/modals/health-explanation-modal'
import { HealthReportModal } from '@/components/dashboard/modals/health-report-modal'
import { CalculationDetailModal } from '@/components/dashboard/calculation-detail-modal'
import { CashFlowForecast } from '@/components/dashboard/cash-flow-forecast'
import { ClientHealthDashboard } from '@/components/dashboard/client-health-dashboard'
import { useProfitTargets } from '@/hooks/use-profit-targets'
import { healthScoreEngine, type HealthScoreInputs, type HealthScoreOutputs } from '@/lib/health-score-engine'
import { getCurrentDate } from '@/lib/current-date'
import { Euro, Clock, DollarSign, Users, CreditCard, TrendingUp, TrendingDown } from 'lucide-react'

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
    lastRecurringExpenseRegistration?: string
  }
}

interface TimeStatsResponse {
  success: boolean
  data: {
    thisMonth: {
      hours: number
      revenue: number
      billableHours: number
      nonBillableHours: number
      billableRevenue?: number
    }
    previousMonthMTD?: {
      billableRevenue: number
    }
    unbilled: {
      hours: number
      revenue: number
      value: number
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

interface RecurringExpensesDueResponse {
  success: boolean
  data: Array<{
    template: {
      id: string
      name: string
      frequency: string
    }
    occurrences_due: number
    total_amount: number
    next_occurrence_date: string
    last_occurrence_date: string
  }>
}

export default function FinancieelV2Page() {
  const router = useRouter()
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetricsResponse['data'] | null>(null)
  const [timeStats, setTimeStats] = useState<TimeStatsResponse['data'] | null>(null)
  const [clientRevenue, setClientRevenue] = useState<{
    topClient?: { name: string; revenueShare: number }
    rolling30DaysComparison?: {
      current: { topClientShare: number; totalRevenue: number }
      previous: { topClientShare: number; totalRevenue: number }
    }
  } | null>(null)
  const [recurringExpensesDue, setRecurringExpensesDue] = useState<RecurringExpensesDueResponse['data'] | null>(null)
  const [revenueTrendData, setRevenueTrendData] = useState<any[]>([])
  const [currentTimeframe, setCurrentTimeframe] = useState<'12m' | '3m' | '31d'>('12m')
  const [showExplanation, setShowExplanation] = useState<string | null>(null)
  const [showHealthReport, setShowHealthReport] = useState(false)
  const [calculationDetailModal, setCalculationDetailModal] = useState<{
    metricId: string
    metricName: string
    calculationValue?: string
    calculationDescription?: string
    score: number
    maxScore: number
    detailedCalculation?: any
  } | null>(null)
  const { targets: profitTargets } = useProfitTargets()

  // Determine if subscription/SaaS features are enabled
  const subscriptionEnabled = Boolean(
    profitTargets?.target_monthly_active_users && profitTargets.target_monthly_active_users > 0 &&
    profitTargets?.target_avg_subscription_fee && profitTargets.target_avg_subscription_fee > 0
  )

  // Calculate MTD targets (using development date if configured)
  const now = getCurrentDate()
  const currentDay = now.getDate()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const monthProgress = currentDay / daysInMonth

  const monthlyRevenueTarget = profitTargets
    ? (() => {
        const timeBasedRevenue =
          profitTargets.monthly_hours_target > 0 && profitTargets.target_hourly_rate > 0
            ? profitTargets.monthly_hours_target * profitTargets.target_hourly_rate
            : 0
        const subscriptionRevenue =
          profitTargets.target_monthly_active_users > 0 && profitTargets.target_avg_subscription_fee > 0
            ? profitTargets.target_monthly_active_users * profitTargets.target_avg_subscription_fee
            : 0
        return timeBasedRevenue + subscriptionRevenue
      })()
    : 12000

  const monthlyHoursTarget = profitTargets?.monthly_hours_target || 160
  const mtdRevenueTarget = monthlyRevenueTarget * monthProgress

  // Calculate MTD hours target based on working days completed in current month
  // (NOT rolling 30-day window - that's used in Business Health Score)
  const workingDays = profitTargets?.target_working_days_per_week || [1, 2, 3, 4, 5]

  // Calculate yesterday (we measure MTD progress up to yesterday, not including today)
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  yesterday.setHours(23, 59, 59, 999)

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  startOfMonth.setHours(0, 0, 0, 0)

  // Count working days completed in current month (up to yesterday)
  let workingDaysCompleted = 0
  let tempDate = new Date(startOfMonth)
  while (tempDate <= yesterday) {
    const dayOfWeek = tempDate.getDay()
    const isoWeekday = dayOfWeek === 0 ? 7 : dayOfWeek
    if (workingDays.includes(isoWeekday)) {
      workingDaysCompleted++
    }
    tempDate.setDate(tempDate.getDate() + 1)
  }

  // Calculate total working days in the full month
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  endOfMonth.setHours(23, 59, 59, 999)

  let totalWorkingDaysInMonth = 0
  tempDate = new Date(startOfMonth)
  while (tempDate <= endOfMonth) {
    const dayOfWeek = tempDate.getDay()
    const isoWeekday = dayOfWeek === 0 ? 7 : dayOfWeek
    if (workingDays.includes(isoWeekday)) {
      totalWorkingDaysInMonth++
    }
    tempDate.setDate(tempDate.getDate() + 1)
  }

  // Calculate MTD hours target: (monthly target / total working days) × working days completed
  const dailyHoursTarget = totalWorkingDaysInMonth > 0 ? monthlyHoursTarget / totalWorkingDaysInMonth : 0
  const mtdHoursTarget = Math.round(dailyHoursTarget * workingDaysCompleted)

  // Fetch all dashboard data
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        // Determine granularity based on timeframe
        const granularity = currentTimeframe === '31d' ? 'daily' : currentTimeframe === '3m' ? 'weekly' : 'monthly'

        const [dashboardResponse, timeResponse, clientRevenueResponse, revenueTrendResponse, recurringExpensesResponse] = await Promise.all([
          fetch('/api/invoices/dashboard-metrics'),
          fetch('/api/time-entries/stats'),
          fetch('/api/financial/client-revenue'),
          fetch(`/api/financial/revenue-trend?granularity=${granularity}&period=${currentTimeframe}`),
          fetch('/api/recurring-expenses/due')
        ])

        if (dashboardResponse.ok) {
          const dashboardData: DashboardMetricsResponse = await dashboardResponse.json()
          setDashboardMetrics(dashboardData.data)
        }

        if (timeResponse.ok) {
          const timeData: TimeStatsResponse = await timeResponse.json()
          setTimeStats(timeData.data)
        }

        if (clientRevenueResponse.ok) {
          const clientRevenueData = await clientRevenueResponse.json()
          setClientRevenue(clientRevenueData.data || null)
        }

        if (revenueTrendResponse.ok) {
          const revenueTrendDataRes = await revenueTrendResponse.json()
          setRevenueTrendData(revenueTrendDataRes.data || [])
        }

        if (recurringExpensesResponse.ok) {
          const recurringExpensesData: RecurringExpensesDueResponse = await recurringExpensesResponse.json()
          setRecurringExpensesDue(recurringExpensesData.data || [])
        } else {
          setRecurringExpensesDue(null)
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
      }
    }

    fetchAllData()
  }, [currentTimeframe])

  // Calculate MTD calculations for health score
  const mtdCalculations = useMemo(() => {
    return {
      currentDay,
      daysInMonth,
      monthProgress,
      monthlyRevenueTarget,
      mtdRevenueTarget,
      monthlyHoursTarget,
      mtdHoursTarget,
      expectedWorkingDaysUpToYesterday: workingDaysCompleted,
      totalExpectedWorkingDays: totalWorkingDaysInMonth
    }
  }, [currentDay, daysInMonth, monthProgress, monthlyRevenueTarget, mtdRevenueTarget, monthlyHoursTarget, mtdHoursTarget, workingDaysCompleted, totalWorkingDaysInMonth])

  const recurringExpensePenaltySummary = useMemo(() => {
    if (!recurringExpensesDue || recurringExpensesDue.length === 0) {
      return undefined
    }

    const totalCount = recurringExpensesDue.reduce((sum, item) => sum + (item.occurrences_due || 0), 0)
    const totalAmount = recurringExpensesDue.reduce((sum, item) => sum + (item.total_amount || 0), 0)

    return {
      totalCount,
      totalAmount,
      templates: recurringExpensesDue.map(item => ({
        templateId: item.template.id,
        templateName: item.template.name,
        frequency: item.template.frequency,
        occurrencesDue: item.occurrences_due,
        totalAmount: item.total_amount,
        nextOccurrenceDate: item.next_occurrence_date,
        lastOccurrenceDate: item.last_occurrence_date
      }))
    }
  }, [recurringExpensesDue])

  // Calculate health scores client-side (full results for modals)
  const healthScoreResults = useMemo<HealthScoreOutputs | null>(() => {
    if (!dashboardMetrics || !timeStats) {
      return null
    }

    try {
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
          rolling30DaysRevenue: dashboardMetrics.rolling30DaysRevenue,
          lastRecurringExpenseRegistration: dashboardMetrics.lastRecurringExpenseRegistration,
          recurringExpensesDue: recurringExpensePenaltySummary
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

      return healthScoreEngine.process(inputs)
    } catch (error) {
      console.error('Health score calculation failed:', error)
      return null
    }
  }, [dashboardMetrics, timeStats, mtdCalculations, profitTargets, clientRevenue, recurringExpensePenaltySummary])

  // Extract scores for component usage
  const healthScores = healthScoreResults?.scores || null

  // Initialize Chart after component mounts
  useEffect(() => {
    const initializeChart = () => {
      const canvas = document.getElementById('balanceChart')
      if (!canvas || revenueTrendData.length === 0) return

      const Chart = (window as any).Chart
      if (typeof Chart === 'undefined') {
        console.warn('[dashboard] Chart.js not available')
        return
      }

      const existingChart = Chart.getChart('balanceChart')
      if (existingChart) {
        existingChart.destroy()
      }

      const ctx = (canvas as HTMLCanvasElement).getContext('2d')
      if (!ctx) return

      // Create gradients
      const revenueGradient = ctx.createLinearGradient(0, 0, 0, 280)
      revenueGradient.addColorStop(0, 'rgba(34, 211, 238, 0.3)')
      revenueGradient.addColorStop(1, 'rgba(34, 211, 238, 0)')

      const expenseGradient = ctx.createLinearGradient(0, 0, 0, 280)
      expenseGradient.addColorStop(0, 'rgba(239, 68, 68, 0.2)')
      expenseGradient.addColorStop(1, 'rgba(239, 68, 68, 0)')

      // Extract data from API response
      const labels = revenueTrendData.map(d => d.month)
      const revenue = revenueTrendData.map(d => d.revenue || 0)
      const expenses = revenueTrendData.map(d => d.expenses || 0)
      const profit = revenueTrendData.map(d => d.profit || 0)
      const timeRevenue = revenueTrendData.map(d => d.timeRevenue || 0)
      const platformRevenue = revenueTrendData.map(d => d.subscriptionRevenue || 0)

      const chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Total Revenue',
              data: revenue,
              fill: true,
              tension: 0.4,
              borderColor: '#22d3ee',
              backgroundColor: revenueGradient,
              pointRadius: 3,
              pointBackgroundColor: '#22d3ee',
              pointBorderColor: '#22d3ee',
              borderWidth: 2,
              order: 4,
            },
            {
              label: 'Expenses',
              data: expenses,
              fill: true,
              tension: 0.4,
              borderColor: '#ef4444',
              backgroundColor: expenseGradient,
              pointRadius: 3,
              pointBackgroundColor: '#ef4444',
              pointBorderColor: '#ef4444',
              borderWidth: 2,
              order: 5,
            },
            {
              label: 'Profit',
              data: profit,
              fill: false,
              tension: 0.4,
              borderColor: '#10b981',
              pointRadius: 4,
              pointBackgroundColor: '#10b981',
              pointBorderColor: '#10b981',
              borderWidth: 3,
              order: 1,
            },
            {
              label: 'Time-based Revenue',
              data: timeRevenue,
              fill: false,
              tension: 0.4,
              borderColor: '#22d3ee',
              borderDash: [5, 5],
              pointRadius: 2,
              pointBackgroundColor: '#22d3ee',
              pointBorderColor: '#22d3ee',
              borderWidth: 2,
              order: 2,
            },
            {
              label: 'Platform Revenue',
              data: platformRevenue,
              fill: false,
              tension: 0.4,
              borderColor: '#8b5cf6',
              borderDash: [8, 3],
              pointRadius: 2,
              pointBackgroundColor: '#8b5cf6',
              pointBorderColor: '#8b5cf6',
              borderWidth: 2,
              order: 3,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: 'index',
            intersect: false,
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(15, 23, 42, 0.9)',
              borderColor: 'rgba(148, 163, 184, 0.35)',
              borderWidth: 1,
              padding: 12,
              titleColor: '#f8fafc',
              bodyColor: '#e2e8f0',
              displayColors: true,
              callbacks: {
                label: function(context: any) {
                  let label = context.dataset.label || ''
                  if (label) {
                    label += ': '
                  }
                  if (context.parsed.y !== null) {
                    label += '€' + context.parsed.y.toLocaleString()
                  }
                  return label
                }
              }
            },
          },
          scales: {
            x: {
              grid: {
                color: 'rgba(148, 163, 184, 0.1)',
                borderDash: [6, 6],
              },
              ticks: {
                color: 'rgba(148, 163, 184, 0.55)',
                font: {
                  family: 'Outfit, system-ui',
                },
              },
            },
            y: {
              grid: {
                color: 'rgba(148, 163, 184, 0.12)',
                borderDash: [6, 6],
              },
              ticks: {
                color: 'rgba(148, 163, 184, 0.45)',
                callback: (value: any) => `€${(value / 1000).toFixed(0)}k`,
                font: {
                  family: 'Outfit, system-ui',
                },
              },
            },
          },
        },
      })

    }

    setTimeout(() => {
      initializeChart()
    }, 300)
  }, [revenueTrendData])

  // Handle timeframe button clicks
  useEffect(() => {
    const timeframeButtons = document.querySelectorAll('[data-timeframe]')

    // Set initial active state
    timeframeButtons.forEach((btn) => {
      if (btn.getAttribute('data-timeframe') === currentTimeframe) {
        btn.classList.add('is-active')
      } else {
        btn.classList.remove('is-active')
      }
    })

    const handleTimeframeClick = (event: Event) => {
      const button = event.currentTarget as HTMLElement
      const timeframe = button.getAttribute('data-timeframe') as '12m' | '3m' | '31d' | null
      if (!timeframe) return

      setCurrentTimeframe(timeframe)
    }

    timeframeButtons.forEach((button) => {
      button.addEventListener('click', handleTimeframeClick)
    })

    return () => {
      timeframeButtons.forEach((button) => {
        button.removeEventListener('click', handleTimeframeClick)
      })
    }
  }, [currentTimeframe])

  // Calculate metrics
  const currentRevenue = timeStats?.thisMonth?.billableRevenue || 0
  const subscriptionRevenue = subscriptionEnabled
    ? (timeStats?.subscription?.monthlyActiveUsers?.current || 0) *
      (timeStats?.subscription?.averageSubscriptionFee?.current || 0)
    : 0
  const totalRevenueMTD = currentRevenue + subscriptionRevenue

  const currentHoursMTD = timeStats?.thisMonth?.billableHours || 0
  const avgRate = currentHoursMTD > 0 ? currentRevenue / currentHoursMTD : 0

  const previousRevenue = timeStats?.previousMonthMTD?.billableRevenue || 0
  const revenueDifference = totalRevenueMTD - previousRevenue
  const revenueGrowth = previousRevenue > 0 ? (revenueDifference / previousRevenue) * 100 : 0

  // Revenue progress: actual MTD as % of full monthly budget
  const revenueProgress = monthlyRevenueTarget > 0 ? (totalRevenueMTD / monthlyRevenueTarget) * 100 : 0
  // Revenue target line: where MTD target sits within monthly budget
  const revenueTargetLine = monthlyRevenueTarget > 0 ? (mtdRevenueTarget / monthlyRevenueTarget) * 100 : 100

  // Hours progress: actual MTD as % of full monthly budget (same pattern as revenue)
  const hoursProgress = monthlyHoursTarget > 0 ? (currentHoursMTD / monthlyHoursTarget) * 100 : 0
  // Hours target line: where MTD target sits within monthly budget
  const hoursTargetLine = monthlyHoursTarget > 0 ? (mtdHoursTarget / monthlyHoursTarget) * 100 : 100

  const targetRate = profitTargets?.target_hourly_rate || 75
  const rateProgress = targetRate > 0 ? (avgRate / targetRate) * 100 : 0

  return (
    <section className="main-grid" aria-label="Dashboard content">
      {/* Left column: Monthly Progress Cards */}
      <article className="glass-card" style={{ gridColumn: 'span 6', gridRow: 'span 1' }} aria-labelledby="cards-title">
        <div className="card-header">
          <h2 className="card-header__title" id="cards-title">
            Monthly Progress
          </h2>
        </div>
        <div className="card-grid">
          {/* Card 1: Revenue MTD - Always visible */}
          <GlassmorphicMetricCard
            icon={Euro}
            iconColor="rgba(16, 185, 129, 0.7)"
            title="Revenue MTD"
            value={`€${Math.round(totalRevenueMTD).toLocaleString()}`}
            subtitle={`Target: €${(mtdRevenueTarget / 1000).toFixed(1)}K MTD (€${(monthlyRevenueTarget / 1000).toFixed(1)}K monthly)`}
            progress={revenueProgress}
            progressColor="rgba(16, 185, 129, 1)"
            targetLine={revenueTargetLine}
            badge={{
              label: 'MTD',
              color: 'rgba(16, 185, 129, 0.25)',
            }}
            trendComparison={{
              icon: revenueGrowth >= 0 ? TrendingUp : TrendingDown,
              value: `${revenueGrowth >= 0 ? '+' : ''}${revenueGrowth.toFixed(1)}%`,
              label: 'vs last month MTD',
              isPositive: revenueGrowth >= 0,
            }}
            gradient="linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(5, 150, 105, 0.08))"
          />

          {/* Card 2: Hours MTD - Always visible */}
          <GlassmorphicMetricCard
              icon={Clock}
              iconColor="rgba(59, 130, 246, 0.7)"
              title="Hours MTD"
              value={`${Math.round(currentHoursMTD)}h`}
              subtitle={`Target: ${mtdHoursTarget}h MTD (${monthlyHoursTarget}h monthly)`}
              progress={hoursProgress}
              progressColor="rgba(59, 130, 246, 1)"
              targetLine={hoursTargetLine}
              badge={{
                label: 'MTD',
                color: 'rgba(59, 130, 246, 0.25)',
              }}
              gradient="linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(37, 99, 235, 0.08))"
            />

          {/* Card 3: Avg Rate - Always visible */}
          <GlassmorphicMetricCard
              icon={DollarSign}
              iconColor="rgba(139, 92, 246, 0.7)"
              title="Avg Rate"
              value={`€${Math.round(avgRate)}/h`}
              subtitle={`Target: €${targetRate}/h`}
              progress={rateProgress}
              progressColor="rgba(139, 92, 246, 1)"
              targetLine={100}
              badge={{
                label: 'MTD',
                color: 'rgba(139, 92, 246, 0.25)',
              }}
              gradient="linear-gradient(135deg, rgba(139, 92, 246, 0.12), rgba(124, 58, 237, 0.08))"
            />

          {/* Card 4: Active Users - Only visible if SaaS enabled */}
          {subscriptionEnabled && (
            <GlassmorphicMetricCard
              icon={Users}
              iconColor="rgba(236, 72, 153, 0.7)"
              title="Active Users"
              value={timeStats?.subscription?.monthlyActiveUsers?.current || 0}
              subtitle={`Target: ${profitTargets?.target_monthly_active_users || 0}`}
              progress={
                profitTargets?.target_monthly_active_users
                  ? ((timeStats?.subscription?.monthlyActiveUsers?.current || 0) /
                      profitTargets.target_monthly_active_users) *
                    100
                  : 0
              }
              progressColor="rgba(236, 72, 153, 1)"
              targetLine={100}
              badge={{
                label: 'SaaS',
                color: 'rgba(236, 72, 153, 0.25)',
              }}
              trendComparison={{
                icon: (timeStats?.subscription?.monthlyActiveUsers?.growth || 0) >= 0 ? TrendingUp : TrendingDown,
                value: `${(timeStats?.subscription?.monthlyActiveUsers?.growth || 0) >= 0 ? '+' : ''}${(
                  timeStats?.subscription?.monthlyActiveUsers?.growth || 0
                ).toFixed(1)}%`,
                label: 'vs last month',
                isPositive: (timeStats?.subscription?.monthlyActiveUsers?.growth || 0) >= 0,
              }}
              gradient="linear-gradient(135deg, rgba(236, 72, 153, 0.12), rgba(219, 39, 119, 0.08))"
            />
          )}

          {/* Card 5: Avg Fee - Only visible if SaaS enabled */}
          {subscriptionEnabled && (
            <GlassmorphicMetricCard
              icon={CreditCard}
              iconColor="rgba(251, 146, 60, 0.7)"
              title="Avg Fee"
              value={`€${Math.round(timeStats?.subscription?.averageSubscriptionFee?.current || 0)}`}
              subtitle={`Target: €${Math.round(profitTargets?.target_avg_subscription_fee || 0)}`}
              progress={
                profitTargets?.target_avg_subscription_fee
                  ? ((timeStats?.subscription?.averageSubscriptionFee?.current || 0) /
                      profitTargets.target_avg_subscription_fee) *
                    100
                  : 0
              }
              progressColor="rgba(251, 146, 60, 1)"
              targetLine={100}
              badge={{
                label: 'SaaS',
                color: 'rgba(251, 146, 60, 0.25)',
              }}
              trendComparison={{
                icon:
                  (timeStats?.subscription?.averageSubscriptionFee?.growth || 0) >= 0 ? TrendingUp : TrendingDown,
                value: `${(timeStats?.subscription?.averageSubscriptionFee?.growth || 0) >= 0 ? '+' : ''}${(
                  timeStats?.subscription?.averageSubscriptionFee?.growth || 0
                ).toFixed(1)}%`,
                label: 'vs last month',
                isPositive: (timeStats?.subscription?.averageSubscriptionFee?.growth || 0) >= 0,
              }}
              gradient="linear-gradient(135deg, rgba(251, 146, 60, 0.12), rgba(249, 115, 22, 0.08))"
            />
          )}

          {/* Card 6: Business Health - Always visible */}
          {healthScores && (
            <GlassmorphicBusinessHealth
              healthScores={healthScores}
              onShowHealthReport={() => setShowHealthReport(true)}
              onShowExplanation={setShowExplanation}
            />
          )}
        </div>
      </article>

      {/* Right column: Total balance */}
      <article
        className="glass-card"
        style={{ gridColumn: 'span 6', gridRow: 'span 1' }}
        aria-labelledby="total-balance-title"
      >
        <div className="card-header">
          <h2 className="card-header__title" id="total-balance-title">
            Revenue & Profit Trend
          </h2>
          <div className="time-toggle" role="tablist" aria-label="Balance timeframe">
            <button type="button" className="is-active" data-timeframe="12m" role="tab" aria-selected="true">
              1 year
            </button>
            <button type="button" data-timeframe="3m" role="tab" aria-selected="false">
              3 months
            </button>
            <button type="button" data-timeframe="31d" role="tab" aria-selected="false">
              Last month
            </button>
          </div>
        </div>
        <div className="balance-chart" aria-hidden="false">
          <canvas id="balanceChart" height={280} role="img" aria-label="Balance chart" />
        </div>
        <div className="metric" role="presentation">
          <span>6 month average</span>
          <strong>$8,000.00</strong>
        </div>
        <div className="chart-legends" role="presentation">
          <span>
            <span className="legend-bullet" style={{ background: '#22d3ee' }} />
            Total Revenue
          </span>
          <span>
            <span className="legend-bullet" style={{ background: '#ef4444' }} />
            Expenses
          </span>
          <span>
            <span className="legend-bullet" style={{ background: '#10b981' }} />
            Profit
          </span>
          <span>
            <span className="legend-bullet" style={{ background: '#22d3ee', opacity: 0.6, borderTop: '2px dashed #22d3ee' }} />
            Time Revenue
          </span>
          <span>
            <span className="legend-bullet" style={{ background: '#8b5cf6', opacity: 0.6, borderTop: '2px dashed #8b5cf6' }} />
            Platform Revenue
          </span>
        </div>
      </article>

      {/* Cash Flow Forecast - Spans 2 rows on the left, same width as Monthly Progress */}
      <article
        style={{ gridColumn: 'span 6', gridRow: 'span 2' }}
        aria-labelledby="cash-flow-title"
      >
        <CashFlowForecast
          dashboardMetrics={dashboardMetrics}
        />
      </article>

      {/* Client Health - Top right, spans 1 row, same width as Revenue & Profit */}
      <article
        style={{ gridColumn: 'span 6', gridRow: 'span 1' }}
        aria-labelledby="client-health-title"
      >
        <ClientHealthDashboard
          onViewAllClients={() => router.push('/dashboard/financieel-v2/klanten')}
        />
      </article>

      {/* Revolutionize Your Banking with AI - Bottom right, spans 1 row, same width as Revenue & Profit */}
      <article className="glass-card" style={{ gridColumn: 'span 6', gridRow: 'span 1' }} aria-labelledby="promo-title">
        <div className="promo-card">
          <div className="promo-card__badge float-soft" aria-hidden="true" />
          <div>
            <h2 className="promo-card__title" id="promo-title">
              Revolutionize Your Banking with AI
            </h2>
            <p className="promo-card__body">Leverage the power of AI to manage your finances more efficiently.</p>
          </div>
          <button type="button" className="action-chip" data-action="customize" style={{ alignSelf: 'center' }}>
            Customize dashboard
          </button>
        </div>
      </article>

      {/* Health Explanation Modal */}
      {showExplanation && healthScoreResults && (
        <HealthExplanationModal
          pillar={showExplanation as 'profit' | 'cashflow' | 'efficiency' | 'risk'}
          healthScoreResults={healthScoreResults}
          subscriptionEnabled={subscriptionEnabled}
          onClose={() => setShowExplanation(null)}
          onShowCalculationDetail={(metricId, metricName, score, maxScore, detailedCalculation) => {
            setCalculationDetailModal({
              metricId,
              metricName,
              calculationValue: `${score}/${maxScore} points`,
              calculationDescription: `Current score: ${score}/${maxScore} points`,
              score,
              maxScore,
              detailedCalculation
            })
          }}
        />
      )}

      {/* Health Report Modal */}
      {showHealthReport && healthScoreResults && (
        <HealthReportModal
          healthScoreResults={healthScoreResults}
          dashboardMetrics={dashboardMetrics}
          subscriptionEnabled={subscriptionEnabled}
          onClose={() => setShowHealthReport(false)}
          onShowExplanation={(pillar) => {
            setShowHealthReport(false)
            setShowExplanation(pillar)
          }}
        />
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
    </section>
  )
}

'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { healthScoreEngine, type HealthScoreInputs, type HealthScoreOutputs } from '@/lib/health-score-engine'
import { HEALTH_STATUS_CONFIG, getStatusForScore, getNextMilestone, HEALTH_ANIMATIONS } from '@/lib/health-score-constants'
import { useProfitTargets } from '@/hooks/use-profit-targets'
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Activity,
  DollarSign,
  Clock,
  Users,
  AlertCircle,
  X,
  Info,
  Target,
  FileText,
  ChevronRight
} from 'lucide-react'

// Component interfaces
interface HealthScoreResult {
  score: number // 0-100
  status: 'excellent' | 'good' | 'warning' | 'critical'
  message: string
  recommendations: string[]
  breakdown: {
    profit: number     // 0-25 points (always profit-focused)
    cashflow: number   // 0-25 points
    efficiency: number // 0-25 points
    risk: number       // 0-25 points
  }
}

// Transform health score outputs to component format
const transformHealthScoreOutputs = (outputs: HealthScoreOutputs): HealthScoreResult => {
  const { scores } = outputs

  // Use unified status configuration
  const status = getStatusForScore(scores.totalRounded)
  const statusConfig = HEALTH_STATUS_CONFIG[status]
  const message = statusConfig.message

  // Enhanced recommendation synchronization (Phase 1)
  const allRecommendations = [
    ...outputs.recommendations.profit,
    ...outputs.recommendations.cashflow,
    ...outputs.recommendations.efficiency,
    ...outputs.recommendations.risk
  ]

  // Prioritize high-impact, high-priority recommendations
  const topRecommendations = allRecommendations
    .filter(rec => rec.priority === 'high')
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 3) // Show top 3 instead of 4
    .map(rec => rec.title)

  return {
    score: scores.totalRounded,
    status,
    message,
    recommendations: topRecommendations,
    breakdown: {
      profit: scores.profit,
      cashflow: scores.cashflow,
      efficiency: scores.efficiency,
      risk: scores.risk
    }
  }
}

// Format currency helper
const formatCurrency = (amount: number) => `€${amount.toLocaleString()}`

interface FinancialHealthScoreProps {
  dashboardMetrics?: {
    factureerbaar: number
    totale_registratie: number
    achterstallig: number
    achterstallig_count: number
  } | null
  timeStats?: {
    thisMonth: {
      hours: number
      revenue: number
    }
    thisWeek: {
      hours: number
      difference: number
      trend: 'positive' | 'negative'
    }
    unbilled: {
      hours: number
      revenue: number
    }
    subscription?: {
      monthlyActiveUsers?: { current: number }
      averageSubscriptionFee?: { current: number }
    }
  } | null
  loading?: boolean
  onShowHealthReport?: () => void // New prop for navigation
}

export function FinancialHealthScore({
  dashboardMetrics,
  timeStats,
  loading = false,
  onShowHealthReport
}: FinancialHealthScoreProps) {
  const [healthScore, setHealthScore] = useState<HealthScoreResult | null>(null)
  const [showExplanation, setShowExplanation] = useState<string | null>(null)
  const [healthScoreOutputs, setHealthScoreOutputs] = useState<HealthScoreOutputs | null>(null)
  const { targets: profitTargets } = useProfitTargets()

  // Calculate month-to-date (MTD) benchmarks
  const mtdCalculations = useMemo(() => {
    const now = new Date()
    const currentDay = now.getDate()
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const monthProgress = currentDay / daysInMonth

    // Calculate revenue target based on component-based targets (with optional streams support)
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

    return {
      currentDay,
      daysInMonth,
      monthProgress,
      mtdRevenueTarget: monthlyRevenueTarget * monthProgress,
      mtdHoursTarget: Math.round(monthlyHoursTarget * monthProgress)
    }
  }, [profitTargets])

  // Process health scores using centralized health engine
  useEffect(() => {
    if (!dashboardMetrics || !timeStats) {
      setHealthScore(null)
      setHealthScoreOutputs(null)
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
          value: timeStats.unbilled?.revenue || 0
        },
        subscription: timeStats.subscription
      },
      mtdCalculations,
      profitTargets: profitTargets ? {
        monthly_revenue_target: profitTargets.monthly_revenue_target,
        monthly_cost_target: profitTargets.monthly_cost_target,
        monthly_profit_target: profitTargets.monthly_profit_target,
        // Component-based targets for optional streams
        monthly_hours_target: profitTargets.monthly_hours_target,
        target_hourly_rate: profitTargets.target_hourly_rate,
        target_monthly_active_users: profitTargets.target_monthly_active_users,
        target_avg_subscription_fee: profitTargets.target_avg_subscription_fee,
        setup_completed: profitTargets.setup_completed
      } : undefined
    }

    try {
      const outputs = healthScoreEngine.process(inputs)
      setHealthScoreOutputs(outputs)

      const transformedScore = transformHealthScoreOutputs(outputs)
      setHealthScore(transformedScore)
    } catch (error) {
      console.error('Health score calculation failed:', error)
      // If profit targets are not configured, show setup required state
      setHealthScore(null)
      setHealthScoreOutputs(null)
    }
  }, [dashboardMetrics, timeStats, mtdCalculations, profitTargets])

  if (loading) {
    return (
      <Card className="mobile-card-glass">
        <div className="p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-muted animate-pulse"></div>
            <div>
              <div className="h-5 w-32 bg-muted animate-pulse rounded mb-2"></div>
              <div className="h-4 w-48 bg-muted animate-pulse rounded"></div>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  if (!healthScore) {
    return (
      <Card className="mobile-card-glass border-orange-200 bg-orange-50/50">
        <div className="p-4 sm:p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-orange-100 rounded-full flex items-center justify-center">
            <Target className="h-8 w-8 text-orange-600" />
          </div>
          <h3 className="text-lg font-semibold text-orange-800 mb-2">Profit Targets Required</h3>
          <p className="text-sm text-orange-700 mb-4">
            Please set up your profit targets to view your business health dashboard.
          </p>
          <div className="text-xs text-orange-600">
            Complete the setup wizard to get started with profit tracking.
          </div>
        </div>
      </Card>
    )
  }

  // Use unified status configuration
  const config = HEALTH_STATUS_CONFIG[healthScore.status]
  const StatusIcon = healthScore.status === 'excellent' ? CheckCircle :
                    healthScore.status === 'good' ? TrendingUp :
                    healthScore.status === 'warning' ? AlertTriangle : AlertCircle

  // Calculate next milestone for progressive disclosure
  const nextMilestone = useMemo(() => {
    return getNextMilestone(healthScore.score)
  }, [healthScore.score])

  // Enhanced recommendation display
  const topRecommendations = useMemo(() => {
    if (!healthScoreOutputs) return []

    const allRecs = [
      ...healthScoreOutputs.recommendations.profit,
      ...healthScoreOutputs.recommendations.cashflow,
      ...healthScoreOutputs.recommendations.efficiency,
      ...healthScoreOutputs.recommendations.risk
    ]

    return allRecs
      .filter(rec => rec.priority === 'high')
      .sort((a, b) => b.impact - a.impact)
      .slice(0, 3) // Show top 3 high-priority recommendations
  }, [healthScoreOutputs])

  // Explanation content for each category
  const getExplanation = (category: string) => {
    if (!healthScore || !healthScoreOutputs) return null

    const { explanations } = healthScoreOutputs

    switch (category) {
      case 'profit':
        return {
          title: explanations.profit.title,
          score: explanations.profit.score,
          details: explanations.profit.details.flatMap(section => [
            ...(section.title ? [section.title] : []),
            ...section.items.map(item => {
              if (item.type === 'metric' && item.label && item.value) {
                return `${item.label}: ${item.value}`
              } else if (item.type === 'calculation' && item.label && item.value) {
                return `${item.label}: ${item.value}`
              } else if (item.type === 'formula' && item.formula) {
                return item.formula
              } else if (item.type === 'text' && item.description) {
                return item.description
              }
              return ''
            }).filter(Boolean),
            '' // Add spacing between sections
          ])
        }

      case 'cashflow':
        return {
          title: explanations.cashflow.title,
          score: explanations.cashflow.score,
          details: explanations.cashflow.details.flatMap(section => [
            ...(section.title ? [section.title] : []),
            ...section.items.map(item => {
              if (item.type === 'metric' && item.label && item.value) {
                return `${item.label}: ${item.value}`
              } else if (item.type === 'calculation' && item.label && item.value) {
                return `${item.label}: ${item.value}`
              } else if (item.type === 'formula' && item.formula) {
                return item.formula
              } else if (item.type === 'text' && item.description) {
                return item.description
              }
              return ''
            }).filter(Boolean),
            ''
          ])
        }

      case 'efficiency':
        return {
          title: explanations.efficiency.title,
          score: explanations.efficiency.score,
          details: explanations.efficiency.details.flatMap(section => [
            ...(section.title ? [section.title] : []),
            ...section.items.map(item => {
              if (item.type === 'metric' && item.label && item.value) {
                return `${item.label}: ${item.value}`
              } else if (item.type === 'calculation' && item.label && item.value) {
                return `${item.label}: ${item.value}`
              } else if (item.type === 'formula' && item.formula) {
                return item.formula
              } else if (item.type === 'text' && item.description) {
                return item.description
              }
              return ''
            }).filter(Boolean),
            ''
          ])
        }

      case 'risk':
        return {
          title: explanations.risk.title,
          score: explanations.risk.score,
          details: explanations.risk.details.flatMap(section => [
            ...(section.title ? [section.title] : []),
            ...section.items.map(item => {
              if (item.type === 'metric' && item.label && item.value) {
                return `${item.label}: ${item.value}`
              } else if (item.type === 'calculation' && item.label && item.value) {
                return `${item.label}: ${item.value}`
              } else if (item.type === 'formula' && item.formula) {
                return item.formula
              } else if (item.type === 'text' && item.description) {
                return item.description
              }
              return ''
            }).filter(Boolean),
            ''
          ])
        }

      default:
        return null
    }
  }

  return (
    <div className="relative z-50" style={{ position: 'relative', zIndex: 9999 }}>
      <Card className={`border-2 ${config.borderColor} p-4 sm:p-6 rounded-xl bg-card`}>
        <div>
        {/* Header with Score */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-full ${config.bgColor} border ${config.borderColor}`}>
              <StatusIcon className={`h-6 w-6 ${config.color}`} />
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-1">
                Profit Health
              </h2>
              <p className="text-sm text-muted-foreground">{healthScore.message}</p>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-3xl font-bold ${config.color}`}>
              {healthScore.score}
            </div>
            <Badge className={config.badgeClass}>
              {config.badge}
            </Badge>
          </div>
        </div>


        {/* Score Breakdown - Clickable Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {/* Profit Health Card */}
          <button
            onClick={() => {
              console.log('Profit card clicked')
              setShowExplanation('profit')
            }}
            className={`block w-full text-center p-3 rounded-lg border hover:bg-muted cursor-pointer group ${HEALTH_ANIMATIONS.cardHover}`}
          >
            <div className="p-2 bg-primary/10 rounded-lg mb-2 group-hover:bg-primary/20 transition-colors">
              <Target className="h-4 w-4 text-primary mx-auto" />
            </div>
            <p className="text-xs text-muted-foreground">Profit</p>
            <p className="text-sm font-bold">{healthScore.breakdown.profit}/25</p>
            <Info className="h-3 w-3 text-muted-foreground mx-auto mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          {/* Cash Flow Health Card */}
          <button
            onClick={() => {
              console.log('Cash Flow card clicked')
              setShowExplanation('cashflow')
            }}
            className={`block w-full text-center p-3 rounded-lg border hover:bg-muted cursor-pointer group ${HEALTH_ANIMATIONS.cardHover}`}
          >
            <div className="p-2 bg-success/10 rounded-lg mb-2 group-hover:bg-success/20 transition-colors">
              <Activity className="h-4 w-4 text-green-400 mx-auto" />
            </div>
            <p className="text-xs text-muted-foreground">Cash Flow</p>
            <p className="text-sm font-bold">{healthScore.breakdown.cashflow}/25</p>
            <Info className="h-3 w-3 text-muted-foreground mx-auto mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          {/* Efficiency Health Card */}
          <button
            onClick={() => {
              console.log('Efficiency card clicked')
              setShowExplanation('efficiency')
            }}
            className={`block w-full text-center p-3 rounded-lg border hover:bg-muted cursor-pointer group ${HEALTH_ANIMATIONS.cardHover}`}
          >
            <div className="p-2 bg-blue-500/10 rounded-lg mb-2 group-hover:bg-blue-500/20 transition-colors">
              <Clock className="h-4 w-4 text-blue-400 mx-auto" />
            </div>
            <p className="text-xs text-muted-foreground">Efficiency</p>
            <p className="text-sm font-bold">{healthScore.breakdown.efficiency}/25</p>
            <Info className="h-3 w-3 text-muted-foreground mx-auto mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          {/* Risk Management Health Card */}
          <button
            onClick={() => {
              console.log('Risk Management card clicked')
              setShowExplanation('risk')
            }}
            className={`block w-full text-center p-3 rounded-lg border hover:bg-muted cursor-pointer group ${HEALTH_ANIMATIONS.cardHover}`}
          >
            <div className="p-2 bg-purple-500/10 rounded-lg mb-2 group-hover:bg-purple-500/20 transition-colors">
              <Users className="h-4 w-4 text-purple-400 mx-auto" />
            </div>
            <p className="text-xs text-muted-foreground">Risk Mgmt</p>
            <p className="text-sm font-bold">{healthScore.breakdown.risk}/25</p>
            <Info className="h-3 w-3 text-muted-foreground mx-auto mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span>Overall Health</span>
            <span className={config.color}>{healthScore.score}%</span>
          </div>
          <div className="relative progress-bar h-3 bg-muted rounded-full">
            <div
              className={`progress-fill h-3 rounded-full ${HEALTH_ANIMATIONS.progressBar} ${
                healthScore.status === 'excellent' ? 'bg-green-500' :
                healthScore.status === 'good' ? 'bg-blue-500' :
                healthScore.status === 'warning' ? 'bg-orange-500' : 'bg-red-500'
              }`}
              style={{ width: `${healthScore.score}%` }}
            />
          </div>
        </div>

        {/* Profit Driver Insights */}
        {healthScoreOutputs?.explanations.profit && (
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Profit Driver Performance
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {/* Extract subscription metrics from profit breakdown */}
              {healthScoreOutputs.explanations.profit.details
                .find(section => section.title?.includes('Subscription Business'))
                ?.items.slice(0, 2).map((item, index) => {
                  if (item.type === 'metric' && item.label && item.value) {
                    const isGood = item.emphasis === 'primary'
                    return (
                      <div key={index} className={`p-2 rounded-lg border ${isGood ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">{item.label}</span>
                          <div className={`w-2 h-2 rounded-full ${isGood ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                        </div>
                        <div className="font-medium">{item.value}</div>
                        {item.description && (
                          <div className="text-muted-foreground text-xs mt-1">{item.description}</div>
                        )}
                      </div>
                    )
                  }
                  return null
                }).filter(Boolean)}

              {/* Extract revenue quality metrics */}
              {healthScoreOutputs.explanations.profit.details
                .find(section => section.title?.includes('Revenue Quality'))
                ?.items.slice(0, 2).map((item, index) => {
                  if (item.type === 'metric' && item.label && item.value) {
                    const isGood = item.emphasis === 'primary'
                    return (
                      <div key={`rq-${index}`} className={`p-2 rounded-lg border ${isGood ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">{item.label}</span>
                          <div className={`w-2 h-2 rounded-full ${isGood ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                        </div>
                        <div className="font-medium">{item.value}</div>
                        {item.description && (
                          <div className="text-muted-foreground text-xs mt-1">{item.description}</div>
                        )}
                      </div>
                    )
                  }
                  return null
                }).filter(Boolean)}
            </div>
          </div>
        )}

        {/* Enhanced Recommendations */}
        {topRecommendations.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Top Priority Actions
            </h4>
            <div className="space-y-1">
              {topRecommendations.slice(0, 3).map((rec, index) => (
                <p key={index} className="text-xs text-muted-foreground flex items-start gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${config.bgColor} mt-1.5 flex-shrink-0`}></span>
                  {rec.title}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Achievement Progress Indicator */}
        {nextMilestone && (
          <div className="mt-3 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between text-sm mb-2">
              <span>Progress to {HEALTH_STATUS_CONFIG[nextMilestone.status].badge}</span>
              <span className="font-medium">{nextMilestone.pointsNeeded} points needed</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className={`bg-primary h-2 rounded-full ${HEALTH_ANIMATIONS.progressBar}`}
                style={{ width: `${nextMilestone.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Progressive Disclosure - View Full Report CTA */}
        {onShowHealthReport && (
          <div className="mt-4 pt-4 border-t">
            <button
              onClick={onShowHealthReport}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg hover:border-primary/40 ${HEALTH_ANIMATIONS.cardHover} group`}
            >
              <FileText className="h-4 w-4 text-primary" />
              <span className="font-medium text-primary">View Complete Health Analysis</span>
              <ChevronRight className={`h-4 w-4 text-primary group-hover:translate-x-1 ${HEALTH_ANIMATIONS.cardHover}`} />
            </button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Get detailed recommendations and action plan
            </p>
          </div>
        )}

        {/* Enhanced Explanation Modal */}
        {showExplanation && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card border rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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
                        <span className={`text-lg font-bold ${config.color}`}>
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

              <div className="p-4 sm:p-6 space-y-6">
                {/* 1. Introduction Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">1</div>
                    <h4 className="font-semibold text-base">What This Metric Measures</h4>
                  </div>
                  <div className="pl-8">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {showExplanation === 'profit' &&
                        'Profit Health measures your business\'s ability to generate sustainable profit through effective revenue streams and value creation. It evaluates subscription business performance, revenue quality, and value-generating activities that directly impact your bottom line.'
                      }
                      {showExplanation === 'cashflow' &&
                        'Cash Flow Health focuses on your payment collection efficiency and outstanding invoices. It measures how quickly you collect payments and how well you manage overdue amounts, which directly affects your business liquidity and operational stability.'
                      }
                      {showExplanation === 'efficiency' &&
                        'Efficiency Health tracks your time utilization patterns and billing effectiveness. It measures how consistently you track time, meet your hourly targets, and convert tracked time into billable revenue.'
                      }
                      {showExplanation === 'risk' &&
                        'Risk Management Health evaluates potential threats to business continuity including invoice processing backlogs, payment risks, and subscription health. It identifies areas where operational delays could impact your revenue flow.'
                      }
                    </p>
                  </div>
                </div>

                {/* 2. Input Data Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center">2</div>
                    <h4 className="font-semibold text-base">Input Data</h4>
                  </div>
                  <div className="pl-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {getExplanation(showExplanation)?.details
                        .find(section => section.title?.includes('Status') || section.title?.includes('Data'))
                        ?.items.filter(item => item.type === 'metric')
                        .map((item, index) => (
                          <div key={index} className="bg-muted/50 rounded-lg p-3 border">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
                              <div className={`w-2 h-2 rounded-full ${
                                item.emphasis === 'primary' ? 'bg-green-500' :
                                item.emphasis === 'secondary' ? 'bg-orange-500' : 'bg-muted-foreground'
                              }`}></div>
                            </div>
                            <div className="font-semibold text-sm mt-1">{item.value}</div>
                            {item.description && (
                              <div className="text-xs text-muted-foreground mt-1">{item.description}</div>
                            )}
                          </div>
                        )) || []}
                    </div>
                  </div>
                </div>

                {/* 3. Calculations with Legends */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-green-500 text-white text-xs font-bold flex items-center justify-center">3</div>
                    <h4 className="font-semibold text-base">Score Calculation</h4>
                  </div>
                  <div className="pl-8 space-y-6">
                    {/* All Calculation Sections */}
                    {getExplanation(showExplanation)?.details
                      .filter(section => section.type === 'calculations')
                      .map((section, sectionIndex) => (
                        <div key={sectionIndex} className="space-y-4">
                          {/* Section Header */}
                          <div className="border-l-4 border-primary pl-4">
                            <h5 className="font-semibold text-sm text-primary">{section.title}</h5>
                          </div>

                          {/* Section Calculations and Legends */}
                          <div className="space-y-3">
                            {section.items.map((item, itemIndex) => {
                              if (item.type === 'calculation') {
                                return (
                                  <div key={itemIndex} className="border rounded-lg p-4 bg-gradient-to-r from-muted/30 to-muted/10">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="font-medium text-sm">{item.label}</span>
                                      <span className="font-mono text-sm bg-muted px-2 py-1 rounded">{item.value}</span>
                                    </div>
                                    {item.description && (
                                      <div className="text-xs text-muted-foreground">{item.description}</div>
                                    )}
                                  </div>
                                )
                              } else if (item.type === 'standard') {
                                return (
                                  <div key={itemIndex} className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                                    <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                      <span className="text-xs text-blue-700 dark:text-blue-300">{item.value}</span>
                                    </div>
                                  </div>
                                )
                              } else if (item.type === 'formula') {
                                return (
                                  <div key={itemIndex} className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                                    <h6 className="font-medium text-sm mb-2">Formula</h6>
                                    <div className="font-mono text-sm bg-primary/20 px-3 py-2 rounded">
                                      {item.formula}
                                    </div>
                                  </div>
                                )
                              } else if (item.type === 'text') {
                                return (
                                  <div key={itemIndex} className="text-xs text-muted-foreground italic bg-muted/30 p-3 rounded">
                                    {item.description}
                                  </div>
                                )
                              }
                              return null
                            })}
                          </div>
                        </div>
                      )) || []}
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 bg-card border-t p-4 sm:p-6">
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowExplanation(null)}
                    className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
                  >
                    Got it
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </Card>
    </div>
  )
}
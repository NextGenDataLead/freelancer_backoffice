'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
  Info
} from 'lucide-react'

// Health score calculation interfaces
interface HealthScoreData {
  revenue: {
    current: number
    target: number
    trend: 'positive' | 'negative' | 'neutral'
  }
  hours: {
    current: number
    target: number
    progress: number
  }
  rate: {
    current: number
    target: number
  }
  overdue: {
    amount: number
    count: number
  }
  unbilled: {
    hours: number
    amount: number
  }
}

interface HealthScoreResult {
  score: number // 0-100
  status: 'excellent' | 'good' | 'warning' | 'critical'
  message: string
  recommendations: string[]
  breakdown: {
    revenue: number    // 0-25 points
    cashflow: number   // 0-25 points
    efficiency: number // 0-25 points
    risk: number       // 0-25 points
  }
}

// Health score calculation algorithm
const calculateHealthScore = (data: HealthScoreData): HealthScoreResult => {
  // Revenue Health (25 points max)
  const revenueProgress = Math.min(data.revenue.current / data.revenue.target, 1)
  const revenueScore = Math.round(revenueProgress * 25)

  // Cash Flow Health (25 points max) - penalize overdue invoices
  const overdueRatio = data.overdue.amount / Math.max(data.revenue.current, 1)
  const cashflowScore = Math.round(Math.max(0, 25 - (overdueRatio * 50)))

  // Efficiency Health (25 points max) - hours target + rate achievement
  const hoursEfficiency = Math.min(data.hours.progress / 100, 1) * 15
  const rateEfficiency = Math.min(data.rate.current / data.rate.target, 1) * 10
  const efficiencyScore = Math.round(hoursEfficiency + rateEfficiency)

  // Risk Management (25 points max) - penalize unbilled hours and overdue items
  const unbilledRisk = Math.min((data.unbilled.amount / Math.max(data.revenue.current, 1)) * 15, 15)
  const overdueRisk = Math.min(data.overdue.count * 3, 10)
  const riskScore = Math.round(Math.max(0, 25 - unbilledRisk - overdueRisk))

  // Total score
  const totalScore = revenueScore + cashflowScore + efficiencyScore + riskScore

  // Determine status and message
  let status: HealthScoreResult['status']
  let message: string
  let recommendations: string[] = []

  if (totalScore >= 85) {
    status = 'excellent'
    message = 'Your financial health is excellent! Keep up the great work.'
    recommendations = ['Consider increasing rates or capacity', 'Explore new market opportunities']
  } else if (totalScore >= 70) {
    status = 'good'
    message = 'Your financial health is good with room for optimization.'
    if (data.unbilled.hours > 0) recommendations.push('Invoice unbilled hours immediately')
    if (data.rate.current < data.rate.target) recommendations.push('Review and increase your hourly rates')
  } else if (totalScore >= 50) {
    status = 'warning'
    message = 'Your financial health needs attention. Focus on key areas.'
    if (data.overdue.count > 0) recommendations.push(`Follow up on ${data.overdue.count} overdue invoice(s)`)
    if (data.hours.progress < 75) recommendations.push('Increase billable hours to meet targets')
    if (data.unbilled.hours > 20) recommendations.push('Create invoices for unbilled time')
  } else {
    status = 'critical'
    message = 'Your financial health requires immediate action.'
    recommendations = [
      'Immediate: Follow up on all overdue invoices',
      'Invoice all unbilled hours today',
      'Review and optimize pricing strategy',
      'Focus on increasing billable hours'
    ]
  }

  return {
    score: totalScore,
    status,
    message,
    recommendations,
    breakdown: {
      revenue: revenueScore,
      cashflow: cashflowScore,
      efficiency: efficiencyScore,
      risk: riskScore
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
  } | null
  loading?: boolean
}

export function FinancialHealthScore({
  dashboardMetrics,
  timeStats,
  loading = false
}: FinancialHealthScoreProps) {
  const [healthScore, setHealthScore] = useState<HealthScoreResult | null>(null)
  const [showExplanation, setShowExplanation] = useState<string | null>(null)
  const [healthData, setHealthData] = useState<HealthScoreData | null>(null)

  useEffect(() => {
    if (dashboardMetrics && timeStats) {
      // Transform your existing data into health score format
      const healthData: HealthScoreData = {
        revenue: {
          current: dashboardMetrics.totale_registratie,
          target: 12000, // Make configurable later
          trend: timeStats.thisWeek.trend
        },
        hours: {
          current: timeStats.thisMonth.hours,
          target: 160, // Make configurable later
          progress: (timeStats.thisMonth.hours / 160) * 100
        },
        rate: {
          current: timeStats.thisMonth.hours > 0 ? Math.round(timeStats.thisMonth.revenue / timeStats.thisMonth.hours) : 0,
          target: 100 // Make configurable later
        },
        overdue: {
          amount: dashboardMetrics.achterstallig,
          count: dashboardMetrics.achterstallig_count
        },
        unbilled: {
          hours: timeStats.unbilled.hours,
          amount: timeStats.unbilled.revenue
        }
      }

      const score = calculateHealthScore(healthData)
      setHealthScore(score)
      setHealthData(healthData)
    }
  }, [dashboardMetrics, timeStats])

  if (loading || !healthScore) {
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

  // Status configurations
  const statusConfig = {
    excellent: {
      color: 'text-green-400',
      bgColor: 'bg-green-400/20',
      borderColor: 'border-green-400/30',
      icon: CheckCircle,
      badge: 'bg-green-400/10 text-green-400'
    },
    good: {
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/20',
      borderColor: 'border-blue-400/30',
      icon: TrendingUp,
      badge: 'bg-blue-400/10 text-blue-400'
    },
    warning: {
      color: 'text-orange-400',
      bgColor: 'bg-orange-400/20',
      borderColor: 'border-orange-400/30',
      icon: AlertTriangle,
      badge: 'bg-orange-400/10 text-orange-400'
    },
    critical: {
      color: 'text-red-400',
      bgColor: 'bg-red-400/20',
      borderColor: 'border-red-400/30',
      icon: AlertCircle,
      badge: 'bg-red-400/10 text-red-400'
    }
  }

  const config = statusConfig[healthScore.status]
  const StatusIcon = config.icon

  // Explanation content for each category
  const getExplanation = (category: string) => {
    if (!healthData) return null

    switch (category) {
      case 'revenue':
        const revenueProgress = (healthData.revenue.current / healthData.revenue.target) * 100
        return {
          title: 'Revenue Health (25 points max)',
          score: healthScore.breakdown.revenue,
          details: [
            `Current Revenue: ${formatCurrency(healthData.revenue.current)}`,
            `Target Revenue: ${formatCurrency(healthData.revenue.target)}`,
            `Progress: ${revenueProgress.toFixed(1)}%`,
            `Trend: ${healthData.revenue.trend}`,
            '',
            'Calculation:',
            `Score = min(current/target, 1) × 25`,
            `Score = min(${healthData.revenue.current}/${healthData.revenue.target}, 1) × 25 = ${healthScore.breakdown.revenue}`
          ]
        }
      case 'cashflow':
        const overdueRatio = (healthData.overdue.amount / Math.max(healthData.revenue.current, 1)) * 100
        return {
          title: 'Cash Flow Health (25 points max)',
          score: healthScore.breakdown.cashflow,
          details: [
            `Overdue Amount: ${formatCurrency(healthData.overdue.amount)}`,
            `Current Revenue: ${formatCurrency(healthData.revenue.current)}`,
            `Overdue Ratio: ${overdueRatio.toFixed(1)}%`,
            '',
            'Calculation:',
            'Score = max(0, 25 - (overdue_ratio × 50))',
            `Score = max(0, 25 - (${overdueRatio.toFixed(1)}% × 50)) = ${healthScore.breakdown.cashflow}`,
            '',
            'Lower overdue amounts = better cash flow health'
          ]
        }
      case 'efficiency':
        const hoursEff = (healthData.hours.progress / 100) * 15
        const rateEff = Math.min(healthData.rate.current / healthData.rate.target, 1) * 10
        return {
          title: 'Efficiency Health (25 points max)',
          score: healthScore.breakdown.efficiency,
          details: [
            `Current Hours: ${healthData.hours.current}h`,
            `Target Hours: ${healthData.hours.target}h`,
            `Hours Progress: ${healthData.hours.progress.toFixed(1)}%`,
            `Current Rate: ${formatCurrency(healthData.rate.current)}/h`,
            `Target Rate: ${formatCurrency(healthData.rate.target)}/h`,
            '',
            'Calculation:',
            `Hours Efficiency = (${healthData.hours.progress.toFixed(1)}% / 100) × 15 = ${hoursEff.toFixed(1)}`,
            `Rate Efficiency = min(${healthData.rate.current}/${healthData.rate.target}, 1) × 10 = ${rateEff.toFixed(1)}`,
            `Total = ${hoursEff.toFixed(1)} + ${rateEff.toFixed(1)} = ${healthScore.breakdown.efficiency}`
          ]
        }
      case 'risk':
        const unbilledRisk = Math.min((healthData.unbilled.amount / Math.max(healthData.revenue.current, 1)) * 15, 15)
        const overdueRisk = Math.min(healthData.overdue.count * 3, 10)
        return {
          title: 'Risk Management (25 points max)',
          score: healthScore.breakdown.risk,
          details: [
            `Unbilled Hours: ${healthData.unbilled.hours}h`,
            `Unbilled Amount: ${formatCurrency(healthData.unbilled.amount)}`,
            `Overdue Invoices: ${healthData.overdue.count}`,
            '',
            'Risk Calculations:',
            `Unbilled Risk = min((${formatCurrency(healthData.unbilled.amount)} / ${formatCurrency(healthData.revenue.current)}) × 15, 15) = ${unbilledRisk.toFixed(1)}`,
            `Overdue Risk = min(${healthData.overdue.count} × 3, 10) = ${overdueRisk.toFixed(1)}`,
            '',
            'Calculation:',
            `Score = max(0, 25 - ${unbilledRisk.toFixed(1)} - ${overdueRisk.toFixed(1)}) = ${healthScore.breakdown.risk}`,
            '',
            'Lower unbilled amounts and fewer overdue invoices = lower risk'
          ]
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
              <h2 className="text-lg font-semibold mb-1">Financial Health</h2>
              <p className="text-sm text-muted-foreground">{healthScore.message}</p>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-3xl font-bold ${config.color}`}>
              {healthScore.score}
            </div>
            <Badge className={config.badge}>
              {healthScore.status.toUpperCase()}
            </Badge>
          </div>
        </div>

        {/* Test Button */}
        <div className="mb-4" style={{ position: 'relative', zIndex: 10002 }}>
          <button
            onClick={() => {
              console.log('TEST BUTTON CLICKED!')
              alert('Test button works!')
            }}
            className="bg-red-500 text-white px-4 py-2 rounded cursor-pointer"
            style={{
              position: 'relative',
              zIndex: 10003,
              pointerEvents: 'auto',
              touchAction: 'auto'
            }}
          >
            TEST CLICK
          </button>
        </div>

        {/* Score Breakdown - Clickable Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4" style={{ position: 'relative', zIndex: 10000 }}>
          <button
            onClick={() => {
              console.log('Revenue card clicked')
              setShowExplanation('revenue')
            }}
            className="block w-full text-center p-3 rounded-lg border hover:bg-muted cursor-pointer"
            style={{
              touchAction: 'auto',
              position: 'relative',
              zIndex: 10001,
              pointerEvents: 'auto',
              background: 'white'
            }}
          >
            <div className="p-2 bg-primary/10 rounded-lg mb-2 group-hover:bg-primary/20 transition-colors">
              <DollarSign className="h-4 w-4 text-primary mx-auto" />
            </div>
            <p className="text-xs text-muted-foreground">Revenue</p>
            <p className="text-sm font-bold">{healthScore.breakdown.revenue}/25</p>
            <Info className="h-3 w-3 text-muted-foreground mx-auto mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          <button
            onClick={() => {
              console.log('Cash Flow card clicked')
              setShowExplanation('cashflow')
            }}
            className="block w-full text-center p-3 rounded-lg border hover:bg-muted cursor-pointer"
            style={{
              touchAction: 'auto',
              position: 'relative',
              zIndex: 10001,
              pointerEvents: 'auto',
              background: 'white'
            }}
          >
            <div className="p-2 bg-success/10 rounded-lg mb-2 group-hover:bg-success/20 transition-colors">
              <Activity className="h-4 w-4 text-green-400 mx-auto" />
            </div>
            <p className="text-xs text-muted-foreground">Cash Flow</p>
            <p className="text-sm font-bold">{healthScore.breakdown.cashflow}/25</p>
            <Info className="h-3 w-3 text-muted-foreground mx-auto mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          <button
            onClick={() => {
              console.log('Efficiency card clicked')
              setShowExplanation('efficiency')
            }}
            className="block w-full text-center p-3 rounded-lg border hover:bg-muted cursor-pointer"
            style={{
              touchAction: 'auto',
              position: 'relative',
              zIndex: 10001,
              pointerEvents: 'auto',
              background: 'white'
            }}
          >
            <div className="p-2 bg-blue-500/10 rounded-lg mb-2 group-hover:bg-blue-500/20 transition-colors">
              <Clock className="h-4 w-4 text-blue-400 mx-auto" />
            </div>
            <p className="text-xs text-muted-foreground">Efficiency</p>
            <p className="text-sm font-bold">{healthScore.breakdown.efficiency}/25</p>
            <Info className="h-3 w-3 text-muted-foreground mx-auto mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          <button
            onClick={() => {
              console.log('Risk Management card clicked')
              setShowExplanation('risk')
            }}
            className="block w-full text-center p-3 rounded-lg border hover:bg-muted cursor-pointer"
            style={{
              touchAction: 'auto',
              position: 'relative',
              zIndex: 10001,
              pointerEvents: 'auto',
              background: 'white'
            }}
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
          <div className="relative progress-bar h-3 rounded-full">
            <div
              className={`progress-fill h-3 rounded-full transition-all duration-500 ${
                healthScore.status === 'excellent' ? 'bg-green-400' :
                healthScore.status === 'good' ? 'bg-blue-400' :
                healthScore.status === 'warning' ? 'bg-orange-400' : 'bg-red-400'
              }`}
              style={{ width: `${healthScore.score}%` }}
            />
          </div>
        </div>

        {/* Recommendations */}
        {healthScore.recommendations.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Recommendations
            </h4>
            <div className="space-y-1">
              {healthScore.recommendations.slice(0, 2).map((rec, index) => (
                <p key={index} className="text-xs text-muted-foreground flex items-start gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${config.bgColor} mt-1.5 flex-shrink-0`}></span>
                  {rec}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Explanation Modal */}
        {showExplanation && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card border rounded-xl max-w-md w-full max-h-[80vh] overflow-y-auto p-4 sm:p-6">
              <div>
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
                    <span className={`text-lg font-bold ${config.color}`}>
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
          </div>
        )}
        </div>
      </Card>
    </div>
  )
}
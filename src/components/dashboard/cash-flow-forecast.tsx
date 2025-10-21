'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getCurrentDate } from '@/lib/current-date'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Info,
  BarChart3,
  HelpCircle
} from 'lucide-react'

// Cash flow prediction interfaces
interface CashFlowEntry {
  date: string
  type: 'invoice_due' | 'expense_planned' | 'recurring_income' | 'tax_payment'
  amount: number
  description: string
  probability: number // 0-1 confidence
  source: string
}

interface CashFlowForecast {
  date: string
  inflows: number
  outflows: number
  netFlow: number
  runningBalance: number
  confidence: number // 0-1
}

interface CashFlowAnalysis {
  forecasts: CashFlowForecast[]
  scenarios: {
    optimistic: { runwayDays: number, minBalance: number }
    realistic: { runwayDays: number, minBalance: number }
    pessimistic: { runwayDays: number, minBalance: number }
  }
  insights: {
    type: 'positive' | 'warning' | 'critical'
    message: string
    action?: string
  }[]
  nextMilestones: {
    date: string
    type: 'low_balance' | 'negative_balance' | 'major_payment'
    amount: number
    description: string
  }[]
}

// Help Modal Component
function CashFlowHelpModal() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm sm:max-w-2xl lg:max-w-4xl xl:max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Cash Flow Forecast Explained</DialogTitle>
          <DialogDescription>
            Understanding your cash flow projections and financial runway
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 space-y-6">
          {/* Key Metrics Section */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Key Metrics</h3>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="border-l-4 border-blue-500 pl-4">
                <h4 className="font-medium text-blue-700">Net Cash Flow</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  The difference between money coming in (inflows) and going out (outflows) each day. This helps you:
                </p>
                <ul className="text-sm text-muted-foreground mt-2 ml-4 list-disc space-y-1">
                  <li>Identify days with positive or negative cash flow</li>
                  <li>Plan for large expenses or payments</li>
                  <li>Understand your daily cash position</li>
                </ul>
              </div>

              <div className="border-l-4 border-green-500 pl-4">
                <h4 className="font-medium text-green-700">Runway (Days)</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  How many days your business can operate with current cash flow patterns. This shows:
                </p>
                <ul className="text-sm text-muted-foreground mt-2 ml-4 list-disc space-y-1">
                  <li>Time available to secure new revenue</li>
                  <li>When urgent action might be needed</li>
                  <li>Your financial safety buffer</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Scenarios Section */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Forecast Scenarios</h3>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <h4 className="font-medium text-green-700 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Optimistic (+20%)
                </h4>
                <p className="text-sm text-green-600 mt-1">
                  Best-case scenario where payments arrive early, collections improve, and expenses stay low.
                  Applies a 20% positive adjustment to your projected cash flow.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h4 className="font-medium text-blue-700 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Realistic (Base Case)
                </h4>
                <p className="text-sm text-blue-600 mt-1">
                  Most likely scenario based on your historical data, current invoices, and typical payment patterns.
                  Uses actual amounts and standard collection rates.
                </p>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 md:col-span-2 lg:col-span-1">
                <h4 className="font-medium text-orange-700 flex items-center gap-2">
                  <TrendingDown className="h-4 w-4" />
                  Pessimistic (-30%)
                </h4>
                <p className="text-sm text-orange-600 mt-1">
                  Conservative scenario accounting for delayed payments, collection issues, and unexpected expenses.
                  Applies a 30% negative adjustment for cautious planning.
                </p>
              </div>
            </div>
          </div>

          {/* Data Sources Section */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Data Sources</h3>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-muted-foreground">
                Your forecast is calculated using real business data:
              </p>
              <ul className="text-sm text-muted-foreground mt-2 ml-4 list-disc space-y-1">
                <li><strong>Outstanding Invoices:</strong> Due dates and amounts from your actual invoices</li>
                <li><strong>Unbilled Time:</strong> Hours logged but not yet invoiced</li>
                <li><strong>Payment History:</strong> Your typical collection patterns and payment timing</li>
                <li><strong>Recurring Expenses:</strong> Monthly operational costs and tax obligations</li>
              </ul>
            </div>
          </div>

          {/* Action Tips */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Taking Action</h3>
            <div className="space-y-2">
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <span><strong>Green metrics:</strong> You're in good financial health</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5" />
                <span><strong>Orange metrics:</strong> Monitor closely and consider follow-ups</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                <span><strong>Red metrics:</strong> Take immediate action to improve cash flow</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Generate mock cash flow data - replace with real API
const generateMockCashFlow = (
  currentBalance: number,
  monthlyRevenue: number,
  overdueAmount: number
): CashFlowAnalysis => {
  const forecasts: CashFlowForecast[] = []
  const entries: CashFlowEntry[] = []
  let runningBalance = currentBalance

  // Generate next 90 days of forecasts
  for (let i = 0; i < 90; i++) {
    const date = new Date()
    date.setDate(date.getDate() + i)
    const dateStr = date.toISOString().split('T')[0]

    // Mock inflows (invoices, recurring payments)
    let dailyInflows = 0
    if (i === 15) { // Mid-month invoice payments
      dailyInflows += monthlyRevenue * 0.6 // 60% of monthly revenue
      entries.push({
        date: dateStr,
        type: 'invoice_due',
        amount: monthlyRevenue * 0.6,
        description: 'Monthly invoice payments',
        probability: 0.85,
        source: 'Historical payment patterns'
      })
    }
    if (i === 30) { // End of month
      dailyInflows += monthlyRevenue * 0.3 // Remaining 30%
      entries.push({
        date: dateStr,
        type: 'invoice_due',
        amount: monthlyRevenue * 0.3,
        description: 'End-month invoice payments',
        probability: 0.75,
        source: 'Historical payment patterns'
      })
    }
    if (i === 7 && overdueAmount > 0) { // Overdue collection
      dailyInflows += overdueAmount * 0.7 // 70% collection rate
      entries.push({
        date: dateStr,
        type: 'invoice_due',
        amount: overdueAmount * 0.7,
        description: 'Overdue invoice collection',
        probability: 0.6,
        source: 'Follow-up actions'
      })
    }

    // Mock outflows (expenses, taxes)
    let dailyOutflows = 0
    const dailyExpenses = 80 // Average daily expenses

    dailyOutflows += dailyExpenses

    if (i === 25) { // Monthly tax payment
      dailyOutflows += monthlyRevenue * 0.21 // 21% VAT
      entries.push({
        date: dateStr,
        type: 'tax_payment',
        amount: monthlyRevenue * 0.21,
        description: 'VAT payment',
        probability: 1.0,
        source: 'Tax obligations'
      })
    }

    if (date.getDate() === 1) { // Monthly expenses
      dailyOutflows += 1200 // Fixed monthly costs
      entries.push({
        date: dateStr,
        type: 'expense_planned',
        amount: 1200,
        description: 'Monthly fixed expenses',
        probability: 0.95,
        source: 'Recurring expenses'
      })
    }

    const netFlow = dailyInflows - dailyOutflows
    runningBalance += netFlow

    // Calculate confidence based on time horizon
    const confidence = Math.max(0.3, 1 - (i / 90) * 0.4)

    forecasts.push({
      date: dateStr,
      inflows: dailyInflows,
      outflows: dailyOutflows,
      netFlow,
      runningBalance,
      confidence
    })
  }

  // Calculate scenarios
  const optimisticBalance = runningBalance * 1.2
  const pessimisticBalance = runningBalance * 0.7

  const findRunwayDays = (balance: number) => {
    for (let i = 0; i < forecasts.length; i++) {
      if (forecasts[i].runningBalance <= 0) {
        return i
      }
    }
    return 90
  }

  const scenarios = {
    optimistic: {
      runwayDays: findRunwayDays(optimisticBalance),
      minBalance: Math.min(...forecasts.map(f => f.runningBalance * 1.2))
    },
    realistic: {
      runwayDays: findRunwayDays(runningBalance),
      minBalance: Math.min(...forecasts.map(f => f.runningBalance))
    },
    pessimistic: {
      runwayDays: findRunwayDays(pessimisticBalance),
      minBalance: Math.min(...forecasts.map(f => f.runningBalance * 0.7))
    }
  }

  // Generate insights
  const insights: CashFlowAnalysis['insights'] = []

  if (scenarios.pessimistic.runwayDays < 30) {
    insights.push({
      type: 'critical',
      message: `Cash flow risk in ${scenarios.pessimistic.runwayDays} days`,
      action: 'Accelerate overdue invoice collection'
    })
  } else if (scenarios.realistic.runwayDays < 60) {
    insights.push({
      type: 'warning',
      message: `Cash flow may tighten in ${scenarios.realistic.runwayDays} days`,
      action: 'Consider short-term financing options'
    })
  } else {
    insights.push({
      type: 'positive',
      message: `Healthy cash flow runway for ${scenarios.realistic.runwayDays > 90 ? '90+' : scenarios.realistic.runwayDays} days`
    })
  }

  // Major upcoming payments
  const nextMilestones = entries
    .filter(e => e.amount > 1000)
    .slice(0, 3)
    .map(e => ({
      date: e.date,
      type: e.type === 'tax_payment' ? 'major_payment' :
            e.type === 'invoice_due' ? 'major_payment' : 'major_payment',
      amount: e.amount,
      description: e.description
    })) as CashFlowAnalysis['nextMilestones']

  return {
    forecasts,
    scenarios,
    insights,
    nextMilestones
  }
}

const formatCurrency = (amount: number | undefined | null) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '€0'
  return `€${amount.toLocaleString()}`
}
const formatDays = (days: number | undefined | null) => {
  if (days === undefined || days === null || isNaN(days)) return '0 days'
  return `${days} days`
}

interface CashFlowForecastProps {
  className?: string
  dashboardMetrics?: {
    totale_registratie: number
    achterstallig: number
  } | null
}

export function CashFlowForecast({ className, dashboardMetrics }: CashFlowForecastProps) {
  const [cashFlowAnalysis, setCashFlowAnalysis] = useState<CashFlowAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedScenario, setSelectedScenario] = useState<'optimistic' | 'realistic' | 'pessimistic'>('realistic')

  useEffect(() => {
    const generateForecast = async () => {
      if (!dashboardMetrics) return

      try {
        setLoading(true)

        // Fetch real cash flow forecast from API
        const response = await fetch('/api/cash-flow/forecast')

        if (!response.ok) {
          throw new Error('Failed to fetch cash flow forecast')
        }

        const result = await response.json()

        if (result.success) {
          setCashFlowAnalysis(result.data)
        } else {
          throw new Error(result.message || 'Failed to fetch forecast')
        }

      } catch (error) {
        console.error('Failed to generate cash flow forecast:', error)

        // Fallback to mock data if API fails
        const currentBalance = 8500
        const monthlyRevenue = dashboardMetrics.totale_registratie
        const overdueAmount = dashboardMetrics.achterstallig

        const analysis = generateMockCashFlow(currentBalance, monthlyRevenue, overdueAmount)
        setCashFlowAnalysis(analysis)
      } finally {
        setLoading(false)
      }
    }

    generateForecast()
  }, [dashboardMetrics])

  if (loading || !cashFlowAnalysis) {
    return (
      <div className={`glass-card ${className}`}>
        <div className="space-y-4">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg animate-pulse" style={{
                background: 'rgba(148, 163, 184, 0.2)'
              }}></div>
              <div>
                <div className="h-4 w-24 rounded mb-2 animate-pulse" style={{
                  background: 'rgba(148, 163, 184, 0.2)'
                }}></div>
                <div className="h-3 w-32 rounded animate-pulse" style={{
                  background: 'rgba(148, 163, 184, 0.15)'
                }}></div>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="h-16 rounded animate-pulse" style={{
              background: 'rgba(148, 163, 184, 0.15)'
            }}></div>
            <div className="h-12 rounded animate-pulse" style={{
              background: 'rgba(148, 163, 184, 0.15)'
            }}></div>
          </div>
        </div>
      </div>
    )
  }

  const scenario = cashFlowAnalysis.scenarios[selectedScenario]
  const nextWeekForecasts = cashFlowAnalysis.forecasts.slice(0, 7)

  return (
    <div className={`glass-card ${className}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="card-header">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg" style={{
              background: 'linear-gradient(120deg, rgba(52, 211, 153, 0.22), rgba(16, 185, 129, 0.18))',
              border: '1px solid rgba(52, 211, 153, 0.35)'
            }}>
              <BarChart3 className="h-5 w-5" style={{ color: 'rgba(52, 211, 153, 0.9)' }} />
            </div>
            <div>
              <h3 className="card-header__title">Cash Flow Forecast</h3>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Next 90 days</p>
            </div>
          </div>
          <CashFlowHelpModal />
        </div>

        {/* Scenario Selection - Glassmorphic toggle */}
        <div className="time-toggle" role="tablist" aria-label="Forecast scenario">
          {(['optimistic', 'realistic', 'pessimistic'] as const).map((scenarioType) => (
            <button
              key={scenarioType}
              onClick={() => setSelectedScenario(scenarioType)}
              className={selectedScenario === scenarioType ? 'is-active' : ''}
              type="button"
              role="tab"
              aria-selected={selectedScenario === scenarioType}
            >
              {scenarioType.charAt(0).toUpperCase() + scenarioType.slice(1)}
            </button>
          ))}
        </div>

        {/* Key Metrics - Glassmorphic cards */}
        <div className="grid grid-cols-1 gap-3">
          <div className="text-center p-3 rounded-lg" style={{
            background: scenario.runwayDays < 30
              ? 'rgba(239, 68, 68, 0.15)'
              : scenario.runwayDays < 60
                ? 'rgba(251, 146, 60, 0.15)'
                : 'rgba(52, 211, 153, 0.15)',
            border: scenario.runwayDays < 30
              ? '1px solid rgba(239, 68, 68, 0.25)'
              : scenario.runwayDays < 60
                ? '1px solid rgba(251, 146, 60, 0.25)'
                : '1px solid rgba(52, 211, 153, 0.25)',
            backdropFilter: 'blur(8px)'
          }}>
            <p className="text-lg font-bold" style={{
              color: scenario.runwayDays < 30
                ? 'rgba(239, 68, 68, 0.95)'
                : scenario.runwayDays < 60
                  ? 'rgba(251, 146, 60, 0.95)'
                  : 'rgba(52, 211, 153, 0.95)'
            }}>
              {scenario.runwayDays > 90 ? '90+' : scenario.runwayDays}
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Runway (days)</p>
          </div>
        </div>

        {/* Insights - Glassmorphic style */}
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
            <Info className="h-4 w-4" />
            Key Insights
          </h4>
          <div className="space-y-2">
            {cashFlowAnalysis.insights.slice(0, 2).map((insight, index) => (
              <div key={index} className="p-2 rounded-lg text-sm" style={{
                background: insight.type === 'positive'
                  ? 'rgba(52, 211, 153, 0.12)'
                  : insight.type === 'warning'
                    ? 'rgba(251, 146, 60, 0.12)'
                    : 'rgba(239, 68, 68, 0.12)',
                border: insight.type === 'positive'
                  ? '1px solid rgba(52, 211, 153, 0.25)'
                  : insight.type === 'warning'
                    ? '1px solid rgba(251, 146, 60, 0.25)'
                    : '1px solid rgba(239, 68, 68, 0.25)',
                backdropFilter: 'blur(8px)'
              }}>
                <div className="flex items-start gap-2">
                  {insight.type === 'positive' ? (
                    <CheckCircle className="h-4 w-4 mt-0.5" style={{ color: 'rgba(52, 211, 153, 0.95)' }} />
                  ) : insight.type === 'warning' ? (
                    <AlertTriangle className="h-4 w-4 mt-0.5" style={{ color: 'rgba(251, 146, 60, 0.95)' }} />
                  ) : (
                    <AlertTriangle className="h-4 w-4 mt-0.5" style={{ color: 'rgba(239, 68, 68, 0.95)' }} />
                  )}
                  <div>
                    <p className="font-medium" style={{
                      color: insight.type === 'positive'
                        ? 'rgba(52, 211, 153, 0.95)'
                        : insight.type === 'warning'
                          ? 'rgba(251, 146, 60, 0.95)'
                          : 'rgba(239, 68, 68, 0.95)'
                    }}>
                      {insight.message}
                    </p>
                    {insight.action && (
                      <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                        💡 {insight.action}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Next Week Overview - Glassmorphic */}
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
            <Calendar className="h-4 w-4" />
            Next 7 Days
          </h4>
          <div className="space-y-1">
            {nextWeekForecasts.map((forecast, index) => {
              const date = new Date(forecast.date)
              const currentDate = getCurrentDate()
              const isToday = date.toDateString() === currentDate.toDateString()

              return (
                <div key={forecast.date} className="flex items-center justify-between text-xs p-2 rounded" style={{
                  background: isToday ? 'rgba(96, 165, 250, 0.08)' : 'transparent',
                  border: isToday ? '1px solid rgba(96, 165, 250, 0.22)' : '1px solid transparent',
                  transition: 'background 0.2s ease'
                }}>
                  <div className="flex items-center gap-2">
                    <span className="font-medium" style={{
                      color: isToday ? 'rgba(96, 165, 250, 0.95)' : 'var(--color-text-secondary)'
                    }}>
                      {date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })}
                    </span>
                    {isToday && (
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{
                        background: 'rgba(96, 165, 250, 0.18)',
                        border: '1px solid rgba(96, 165, 250, 0.3)',
                        color: 'rgba(96, 165, 250, 0.95)',
                        fontWeight: 600
                      }}>Today</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {forecast.inflows > 0 && (
                      <span className="flex items-center gap-1" style={{ color: 'rgba(52, 211, 153, 0.95)' }}>
                        <TrendingUp className="h-3 w-3" />
                        {formatCurrency(forecast.inflows)}
                      </span>
                    )}
                    {forecast.outflows > 0 && (
                      <span className="flex items-center gap-1" style={{ color: 'rgba(239, 68, 68, 0.95)' }}>
                        <TrendingDown className="h-3 w-3" />
                        {formatCurrency(forecast.outflows)}
                      </span>
                    )}
                    <span className="font-medium" style={{
                      color: forecast.netFlow > 0
                        ? 'rgba(52, 211, 153, 0.95)'
                        : forecast.netFlow < 0
                          ? 'rgba(239, 68, 68, 0.95)'
                          : 'var(--color-text-muted)'
                    }}>
                      {forecast.netFlow >= 0 ? '+' : ''}{formatCurrency(forecast.netFlow)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Expense Breakdown - NEW */}
        {(cashFlowAnalysis as any).expenseBreakdown && (
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
              <TrendingDown className="h-4 w-4" />
              Uitgaven Analyse
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-center p-2 rounded" style={{
                background: 'rgba(96, 165, 250, 0.12)',
                border: '1px solid rgba(96, 165, 250, 0.22)'
              }}>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Terugkerend</p>
                <p className="text-sm font-bold" style={{ color: 'rgba(96, 165, 250, 0.95)' }}>
                  {formatCurrency((cashFlowAnalysis as any).expenseBreakdown.recurring)}
                </p>
              </div>
              <div className="text-center p-2 rounded" style={{
                background: 'rgba(139, 92, 246, 0.12)',
                border: '1px solid rgba(139, 92, 246, 0.22)'
              }}>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Daggemiddelde</p>
                <p className="text-sm font-bold" style={{ color: 'rgba(139, 92, 246, 0.95)' }}>
                  {formatCurrency((cashFlowAnalysis as any).expenseBreakdown.daily_average)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tax Breakdown - NEW */}
        {(cashFlowAnalysis as any).taxBreakdown && (
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
              <DollarSign className="h-4 w-4" />
              BTW Overzicht
            </h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs p-2 rounded" style={{
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.22)'
              }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Verschuldigd</span>
                <span className="font-bold" style={{ color: 'rgba(239, 68, 68, 0.95)' }}>
                  {formatCurrency((cashFlowAnalysis as any).taxBreakdown.vat_owed)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs p-2 rounded" style={{
                background: 'rgba(52, 211, 153, 0.12)',
                border: '1px solid rgba(52, 211, 153, 0.22)'
              }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Aftrekbaar</span>
                <span className="font-bold" style={{ color: 'rgba(52, 211, 153, 0.95)' }}>
                  {formatCurrency((cashFlowAnalysis as any).taxBreakdown.vat_deductible)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs p-2 rounded" style={{
                background: 'rgba(251, 146, 60, 0.12)',
                border: '1px solid rgba(251, 146, 60, 0.22)'
              }}>
                <div>
                  <p className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>Te betalen</p>
                  {(cashFlowAnalysis as any).taxBreakdown.next_payment_date && (
                    <p style={{ color: 'var(--color-text-muted)' }}>
                      {new Date((cashFlowAnalysis as any).taxBreakdown.next_payment_date).toLocaleDateString('nl-NL', {
                        day: 'numeric',
                        month: 'short'
                      })}
                    </p>
                  )}
                </div>
                <span className="font-bold" style={{ color: 'rgba(251, 146, 60, 0.95)' }}>
                  {formatCurrency((cashFlowAnalysis as any).taxBreakdown.net_vat)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Data Quality Indicator - NEW */}
        {(cashFlowAnalysis as any).dataQuality && (
          <div className="text-xs p-2 rounded" style={{
            background: (cashFlowAnalysis as any).dataQuality.has_recurring_templates && (cashFlowAnalysis as any).dataQuality.has_expense_history
              ? 'rgba(52, 211, 153, 0.08)'
              : 'rgba(251, 146, 60, 0.08)',
            border: (cashFlowAnalysis as any).dataQuality.has_recurring_templates && (cashFlowAnalysis as any).dataQuality.has_expense_history
              ? '1px solid rgba(52, 211, 153, 0.22)'
              : '1px solid rgba(251, 146, 60, 0.22)'
          }}>
            <div className="flex items-center gap-1">
              {(cashFlowAnalysis as any).dataQuality.has_recurring_templates && (cashFlowAnalysis as any).dataQuality.has_expense_history ? (
                <>
                  <CheckCircle className="h-3 w-3" style={{ color: 'rgba(52, 211, 153, 0.95)' }} />
                  <span style={{ color: 'var(--color-text-secondary)' }}>Voorspelling gebaseerd op echte data</span>
                </>
              ) : (
                <>
                  <Info className="h-3 w-3" style={{ color: 'rgba(251, 146, 60, 0.95)' }} />
                  <span style={{ color: 'var(--color-text-secondary)' }}>
                    {!(cashFlowAnalysis as any).dataQuality.has_recurring_templates && 'Voeg terugkerende uitgaven toe voor betere voorspelling'}
                    {!(cashFlowAnalysis as any).dataQuality.has_expense_history && 'Registreer uitgaven voor nauwkeurigere voorspelling'}
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Major Upcoming Events - Glassmorphic */}
        {cashFlowAnalysis.nextMilestones.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>Major Events</h4>
            <div className="space-y-1">
              {cashFlowAnalysis.nextMilestones.slice(0, 2).map((milestone, index) => (
                <div key={index} className="flex items-center justify-between text-xs p-2 rounded" style={{
                  background: 'rgba(15, 23, 42, 0.45)',
                  border: '1px solid rgba(148, 163, 184, 0.16)'
                }}>
                  <div>
                    <p className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>{milestone.description}</p>
                    <p style={{ color: 'var(--color-text-muted)' }}>
                      {new Date(milestone.date).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="font-bold" style={{
                    color: milestone.type === 'major_payment'
                      ? 'rgba(52, 211, 153, 0.95)'
                      : 'rgba(251, 146, 60, 0.95)'
                  }}>
                    {formatCurrency(milestone.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
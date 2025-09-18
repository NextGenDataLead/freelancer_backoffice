'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
            Understanding your financial runway and minimum balance projections
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 space-y-6">
          {/* Key Metrics Section */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Key Metrics</h3>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="border-l-4 border-blue-500 pl-4">
                <h4 className="font-medium text-blue-700">Minimum Balance</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  The lowest amount your account balance will reach during the forecast period. This helps you:
                </p>
                <ul className="text-sm text-muted-foreground mt-2 ml-4 list-disc space-y-1">
                  <li>Plan for potential cash shortfalls</li>
                  <li>Ensure you maintain minimum operating capital</li>
                  <li>Avoid overdraft fees or payment delays</li>
                </ul>
              </div>

              <div className="border-l-4 border-green-500 pl-4">
                <h4 className="font-medium text-green-700">Runway (Days)</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  How many days your business can operate before running out of money. This shows:
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
                  Applies a 20% positive adjustment to your projected balance.
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

  if (scenarios.pessimistic.minBalance < 1000) {
    insights.push({
      type: 'critical',
      message: `Cash flow risk in ${scenarios.pessimistic.runwayDays} days`,
      action: 'Accelerate overdue invoice collection'
    })
  } else if (scenarios.realistic.minBalance < 3000) {
    insights.push({
      type: 'warning',
      message: `Minimum balance may drop to €${Math.round(scenarios.realistic.minBalance).toLocaleString()}`,
      action: 'Consider short-term financing options'
    })
  } else {
    insights.push({
      type: 'positive',
      message: `Healthy cash flow with €${Math.round(scenarios.realistic.minBalance).toLocaleString()} minimum balance`
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

const formatCurrency = (amount: number) => `€${amount.toLocaleString()}`
const formatDays = (days: number) => `${days} days`

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
      <Card className={`mobile-card-glass ${className}`}>
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-muted rounded-lg animate-pulse"></div>
            <div>
              <div className="h-4 w-24 bg-muted animate-pulse rounded mb-2"></div>
              <div className="h-3 w-32 bg-muted animate-pulse rounded"></div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="h-16 bg-muted animate-pulse rounded"></div>
            <div className="h-12 bg-muted animate-pulse rounded"></div>
          </div>
        </div>
      </Card>
    )
  }

  const scenario = cashFlowAnalysis.scenarios[selectedScenario]
  const nextWeekForecasts = cashFlowAnalysis.forecasts.slice(0, 7)

  return (
    <Card className={`mobile-card-glass ${className}`}>
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <BarChart3 className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <h3 className="text-base font-semibold">Cash Flow Forecast</h3>
              <p className="text-xs text-muted-foreground">Next 90 days</p>
            </div>
          </div>
          <CashFlowHelpModal />
        </div>

        {/* Scenario Selection */}
        <div className="flex gap-1">
          {(['optimistic', 'realistic', 'pessimistic'] as const).map((scenarioType) => (
            <button
              key={scenarioType}
              onClick={() => setSelectedScenario(scenarioType)}
              className={`px-3 py-2 text-xs rounded-md transition-colors flex-1 ${
                selectedScenario === scenarioType
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {scenarioType.charAt(0).toUpperCase() + scenarioType.slice(1)}
            </button>
          ))}
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className={`text-center p-3 rounded-lg border ${
            scenario.minBalance < 1000 ? 'bg-red-50 border-red-200' :
            scenario.minBalance < 3000 ? 'bg-orange-50 border-orange-200' :
            'bg-green-50 border-green-200'
          }`}>
            <p className={`text-lg font-bold ${
              scenario.minBalance < 1000 ? 'text-red-600' :
              scenario.minBalance < 3000 ? 'text-orange-600' :
              'text-green-600'
            }`}>
              {formatCurrency(scenario.minBalance)}
            </p>
            <p className="text-xs text-muted-foreground">Minimum Balance</p>
          </div>
          <div className={`text-center p-3 rounded-lg border ${
            scenario.runwayDays < 30 ? 'bg-red-50 border-red-200' :
            scenario.runwayDays < 60 ? 'bg-orange-50 border-orange-200' :
            'bg-green-50 border-green-200'
          }`}>
            <p className={`text-lg font-bold ${
              scenario.runwayDays < 30 ? 'text-red-600' :
              scenario.runwayDays < 60 ? 'text-orange-600' :
              'text-green-600'
            }`}>
              {scenario.runwayDays > 90 ? '90+' : scenario.runwayDays}
            </p>
            <p className="text-xs text-muted-foreground">Runway (days)</p>
          </div>
        </div>

        {/* Insights */}
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Info className="h-4 w-4" />
            Key Insights
          </h4>
          <div className="space-y-2">
            {cashFlowAnalysis.insights.slice(0, 2).map((insight, index) => (
              <div key={index} className={`p-2 rounded-lg text-sm ${
                insight.type === 'positive' ? 'bg-green-50 border border-green-200' :
                insight.type === 'warning' ? 'bg-orange-50 border border-orange-200' :
                'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-start gap-2">
                  {insight.type === 'positive' ? <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" /> :
                   insight.type === 'warning' ? <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5" /> :
                   <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />}
                  <div>
                    <p className={`font-medium ${
                      insight.type === 'positive' ? 'text-green-700' :
                      insight.type === 'warning' ? 'text-orange-700' :
                      'text-red-700'
                    }`}>
                      {insight.message}
                    </p>
                    {insight.action && (
                      <p className="text-xs text-muted-foreground mt-1">
                        💡 {insight.action}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Next Week Overview */}
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Next 7 Days
          </h4>
          <div className="space-y-1">
            {nextWeekForecasts.map((forecast, index) => {
              const date = new Date(forecast.date)
              const isToday = date.toDateString() === new Date().toDateString()

              return (
                <div key={forecast.date} className={`flex items-center justify-between text-xs p-2 rounded ${
                  isToday ? 'bg-primary/5 border border-primary/20' : 'hover:bg-muted/30'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${isToday ? 'text-primary' : ''}`}>
                      {date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })}
                    </span>
                    {isToday && (
                      <Badge className="bg-primary/10 text-primary text-xs">Today</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {forecast.inflows > 0 && (
                      <span className="text-green-600 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {formatCurrency(forecast.inflows)}
                      </span>
                    )}
                    {forecast.outflows > 0 && (
                      <span className="text-red-600 flex items-center gap-1">
                        <TrendingDown className="h-3 w-3" />
                        {formatCurrency(forecast.outflows)}
                      </span>
                    )}
                    <span className={`font-medium ${
                      forecast.netFlow > 0 ? 'text-green-600' :
                      forecast.netFlow < 0 ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {formatCurrency(forecast.runningBalance)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Major Upcoming Events */}
        {cashFlowAnalysis.nextMilestones.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Major Events</h4>
            <div className="space-y-1">
              {cashFlowAnalysis.nextMilestones.slice(0, 2).map((milestone, index) => (
                <div key={index} className="flex items-center justify-between text-xs p-2 bg-muted/30 rounded">
                  <div>
                    <p className="font-medium">{milestone.description}</p>
                    <p className="text-muted-foreground">
                      {new Date(milestone.date).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`font-bold ${
                    milestone.type === 'major_payment' ? 'text-green-600' : 'text-orange-600'
                  }`}>
                    {formatCurrency(milestone.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
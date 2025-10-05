/**
 * Calculation Detail Modal
 * Shows technical calculation details, formulas, and values for health score metrics
 * This is separate from the DetailedMetricExplanationModal which shows layman explanations
 */

import React from 'react'
import { X, Calculator, TrendingUp, Target, Info, BarChart3, CheckCircle } from 'lucide-react'

interface ComponentBreakdown {
  name: string
  value: string
  percentage: string
  score: number
  maxScore: number
  description: string
  formula: string
  benchmark: string
}

interface DetailedCalculation {
  components: ComponentBreakdown[]
  totalScore: number
  totalMaxScore: number
  summary: string
}

interface CalculationDetailModalProps {
  metricId: string
  metricName: string
  calculationValue?: string
  calculationDescription?: string
  currentScore: number
  maxScore: number
  detailedCalculation?: DetailedCalculation // For complex metrics
  isOpen: boolean
  onClose: () => void
  className?: string
}

export function CalculationDetailModal({
  metricId,
  metricName,
  calculationValue,
  calculationDescription,
  currentScore,
  maxScore,
  detailedCalculation,
  isOpen,
  onClose,
  className = ''
}: CalculationDetailModalProps) {
  if (!isOpen) return null

  const scorePercentage = Math.round((currentScore / maxScore) * 100)

  const getScoreColor = (percentage: number): string => {
    if (percentage >= 90) return 'text-green-600 dark:text-green-400'
    if (percentage >= 70) return 'text-blue-600 dark:text-blue-400'
    if (percentage >= 50) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getScoreBadgeColor = (percentage: number): string => {
    if (percentage >= 90) return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
    if (percentage >= 70) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
    if (percentage >= 50) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
    return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
  }

  // Parse calculation details to separate calculation from scoring
  const parseCalculationDetails = () => {
    if (!calculationDescription) return null

    // Extract values from description like "Daily average: 5.2h/day → 8/8 pts"
    const match = calculationDescription.match(/([^→]+)→\s*(.+)/)
    if (match) {
      const calculationPart = match[1].trim()
      const scoringPart = match[2].trim()

      // Extract just the calculation value (e.g., "5.2h/day" from "Daily average: 5.2h/day")
      const calcMatch = calculationPart.match(/([^:]+):\s*(.+)/)
      if (calcMatch) {
        return {
          label: calcMatch[1].trim(),
          pureCalculation: calcMatch[2].trim(), // Just the value part
          scoreContribution: scoringPart,
          fullCalculation: calculationPart
        }
      }

      return {
        label: '',
        pureCalculation: calculationPart,
        scoreContribution: scoringPart,
        fullCalculation: calculationPart
      }
    }
    return null
  }

  const calculationDetails = parseCalculationDetails()

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[10001]">
      <div className={`bg-background rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Calculator className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Calculation Details</h2>
              <p className="text-sm text-muted-foreground">{metricName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Score Overview */}

          {/* Calculation Method */}
          {(calculationValue || (calculationDetails && calculationDetails.pureCalculation)) && (
            <div className="space-y-3">
              <h3 className="font-medium flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Calculation Method
              </h3>
              <div className="bg-card border rounded-lg p-4">
                {calculationDetails ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{calculationDetails.label}:</span>
                      <span className="font-mono text-primary text-lg">{calculationDetails.pureCalculation}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Points Awarded:</span>
                      <span className="font-medium text-primary">{calculationDetails.scoreContribution}</span>
                    </div>
                  </div>
                ) : (
                  <div className="font-mono text-lg text-primary">
                    {calculationValue}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Legend - Maps calculations to point amounts */}
          {calculationDetails && (
            <div className="space-y-3">
              <h3 className="font-medium flex items-center gap-2">
                <Info className="h-4 w-4" />
                Legend
              </h3>
              <div className="bg-card border rounded-lg p-4 space-y-4">
                {/* Current Result */}
                <div className="space-y-2" style={{display: 'none'}}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{calculationDetails.label}:</span>
                    <span className="font-mono text-primary text-lg">{calculationDetails.pureCalculation}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Points Awarded:</span>
                    <span className="font-medium text-primary">{calculationDetails.scoreContribution}</span>
                  </div>
                </div>

                {/* Scoring Scale - Complete mapping for all metrics */}
                <div>
                  <h4 className="text-sm font-medium mb-3">Scoring Scale</h4>
                  {metricId === 'billable_ratio' ? (
                    <div className="space-y-2">
                      <div className="text-xs font-medium mb-2 text-muted-foreground">
                        {(() => {
                          const match = calculationDescription?.match(/(\d+(?:\.\d+)?)% target/)
                          const target = match ? match[1] : '90'
                          return `Compares actual billable ratio to target (${target}%)`
                        })()}
                      </div>
                      <div className="text-xs text-muted-foreground mb-3">
                        Formula: Billable / (Billable + Unbilled) × 100 = Actual %
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>≥100% of target ratio</span>
                        <span className="text-green-600 font-medium">6.0 points</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>95% of target ratio</span>
                        <span className="text-green-600 font-medium">5.7 points</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>90% of target ratio</span>
                        <span className="text-blue-600 font-medium">5.4 points</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>80% of target ratio</span>
                        <span className="text-yellow-600 font-medium">4.8 points</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>50% of target ratio</span>
                        <span className="text-red-600 font-medium">3.0 points</span>
                      </div>
                      <div className="mt-3 pt-3 border-t">
                        <div className="text-xs font-medium mb-1">How to Improve:</div>
                        <div className="text-xs text-muted-foreground">
                          • Minimize unbilled hours<br/>
                          • Track billable vs non-billable time carefully<br/>
                          • Convert unbilled work to invoices promptly
                        </div>
                      </div>
                    </div>
                  ) : metricId === 'daily_consistency' ? (
                    <div className="space-y-2">
                      {(() => {
                        // Extract daily target from detailed calculation if available
                        const dailyConsistencyComponent = detailedCalculation?.components?.find(c => c.name === 'Daily Consistency')
                        const benchmarkMatch = dailyConsistencyComponent?.benchmark?.match(/([\d.]+)h\/day/)
                        const dailyTarget = benchmarkMatch ? parseFloat(benchmarkMatch[1]) : 5.0

                        const excellent = dailyTarget
                        const good = dailyTarget * 0.8
                        const fair = dailyTarget * 0.6

                        return (
                          <>
                            <div className="text-xs font-medium mb-2 text-muted-foreground">
                              Measures actual vs target daily hours (based on working days schedule)
                            </div>
                            <div className="flex justify-between text-xs">
                              <span>≥{excellent.toFixed(1)}h/day (100% of target)</span>
                              <span className="text-green-600 font-medium">3.0 points</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span>{good.toFixed(1)}-{excellent.toFixed(1)}h/day (80-100%)</span>
                              <span className="text-blue-600 font-medium">2.4 points</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span>{fair.toFixed(1)}-{good.toFixed(1)}h/day (60-80%)</span>
                              <span className="text-yellow-600 font-medium">1.8 points</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span>&lt;{fair.toFixed(1)}h/day (&lt;60%)</span>
                              <span className="text-red-600 font-medium">&lt;1.8 points</span>
                            </div>
                            <div className="mt-3 pt-3 border-t">
                              <div className="text-xs font-medium mb-1">How to Improve:</div>
                              <div className="text-xs text-muted-foreground">
                                • Configure accurate working days in settings<br/>
                                • Track time consistently on all working days<br/>
                                • Set realistic monthly targets for your schedule
                              </div>
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  ) : metricId === 'time_utilization_efficiency' ? (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span>≥100% progress</span>
                        <span className="text-green-600 font-medium">6/6 points (Excellent)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>80-99% progress</span>
                        <span className="text-blue-600 font-medium">4.5-5.9/6 points (Good)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>60-79% progress</span>
                        <span className="text-yellow-600 font-medium">3-4.4/6 points (Fair)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>&lt;60% progress</span>
                        <span className="text-red-600 font-medium">0-2.9/6 points (Poor)</span>
                      </div>
                    </div>
                  ) : metricId === 'billing_efficiency' ? (
                    <div className="space-y-2">
                      <div className="text-xs font-medium mb-2 text-muted-foreground">
                        Measures invoicing completeness and speed
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>≥90% efficiency</span>
                        <span className="text-green-600 font-medium">5/5 points (Excellent)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>80-89% efficiency</span>
                        <span className="text-blue-600 font-medium">4/5 points (Good)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>70-79% efficiency</span>
                        <span className="text-yellow-600 font-medium">3/5 points (Fair)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>60-69% efficiency</span>
                        <span className="text-orange-600 font-medium">2/5 points (Below Average)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>&lt;60% efficiency</span>
                        <span className="text-red-600 font-medium">1/5 points (Poor)</span>
                      </div>
                      <div className="mt-3 pt-3 border-t">
                        <div className="text-xs font-medium mb-1">How to Improve:</div>
                        <div className="text-xs text-muted-foreground">
                          • Track all billable time accurately and completely<br/>
                          • Invoice completed work promptly (within 24-48 hours)<br/>
                          • Use templates and automation to speed up invoicing<br/>
                          • Perform quality checks before sending invoices
                        </div>
                      </div>
                    </div>
                  ) : metricId === 'collection_speed' ? (
                    <div className="space-y-2">
                      <div className="text-xs font-medium mb-2 text-muted-foreground">
                        Measures average invoice overdue time (DIO)
                        <div className="mt-1 text-muted-foreground/90">
                          DIO (Days Invoice Overdue) is how many days past the payment terms invoices are typically paid. Lower values mean better payment discipline; higher values signal collection delays and cash-flow risk.
                        </div>
                      </div>
                      {(() => {
                        // Extract payment terms from calculation description
                        const termsMatch = calculationDescription?.match(/Payment Terms: (\d+)/)
                        const paymentTerms = termsMatch ? parseInt(termsMatch[1]) : 30
                        const excellent = paymentTerms
                        const good = paymentTerms + 7
                        const fair = paymentTerms + 15
                        const poor = paymentTerms + 30

                        return (
                          <>
                            <div className="flex justify-between text-xs">
                              <span>≤{excellent} days</span>
                              <span className="text-green-600 font-medium">15/15 points (Excellent)</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span>{excellent + 1}-{good} days</span>
                              <span className="text-blue-600 font-medium">12/15 points (Good)</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span>{good + 1}-{fair} days</span>
                              <span className="text-yellow-600 font-medium">8/15 points (Fair)</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span>{fair + 1}-{poor} days</span>
                              <span className="text-orange-600 font-medium">3/15 points (Poor)</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span>&gt;{poor} days</span>
                              <span className="text-red-600 font-medium">0/15 points (Critical)</span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-2">
                              Based on {paymentTerms}-day payment terms. Excellent = paid within terms.
                            </div>
                          </>
                        )
                      })()}
                      <div className="mt-3 pt-3 border-t">
                        <div className="text-xs font-medium mb-1">How to Improve:</div>
                        <div className="text-xs text-muted-foreground">
                          • Set clear payment terms upfront (e.g., Net 15 or Net 30)<br/>
                          • Send automated payment reminders before and after due dates<br/>
                          • Offer early payment discounts or incentives<br/>
                          • Follow up promptly on overdue invoices
                        </div>
                      </div>
                    </div>
                  ) : metricId === 'volume_efficiency' ? (
                    <div className="space-y-2">
                      <div className="text-xs font-medium mb-2 text-muted-foreground">
                        Tracks number of overdue invoices
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>0-3 overdue invoices</span>
                        <span className="text-green-600 font-medium">10/10 points (Excellent)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>4-5 overdue invoices</span>
                        <span className="text-blue-600 font-medium">7/10 points (Good)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>6-7 overdue invoices</span>
                        <span className="text-yellow-600 font-medium">5/10 points (Fair)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>&gt;7 overdue invoices</span>
                        <span className="text-red-600 font-medium">2/10 points (Poor)</span>
                      </div>
                      <div className="mt-3 pt-3 border-t">
                        <div className="text-xs font-medium mb-1">How to Improve:</div>
                        <div className="text-xs text-muted-foreground">
                          • Invoice work regularly (weekly or bi-weekly)<br/>
                          • Use batch invoicing for recurring clients<br/>
                          • Clear overdue invoices before creating new ones<br/>
                          • Maintain open communication with clients about payment status
                        </div>
                      </div>
                    </div>
                  ) : metricId === 'absolute_amount_control' ? (
                    <div className="space-y-2">
                      <div className="text-xs font-medium mb-2 text-muted-foreground">
                        Monitors total value of overdue payments
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>&lt;€1,000</span>
                        <span className="text-green-600 font-medium">5/5 points (Excellent)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>€1,000-€3,000</span>
                        <span className="text-blue-600 font-medium">4/5 points (Good)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>€3,000-€5,000</span>
                        <span className="text-yellow-600 font-medium">3/5 points (Fair)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>&gt;€5,000</span>
                        <span className="text-red-600 font-medium">1/5 points (Poor)</span>
                      </div>
                      <div className="mt-3 pt-3 border-t">
                        <div className="text-xs font-medium mb-1">How to Improve:</div>
                        <div className="text-xs text-muted-foreground">
                          • Establish clear credit policies and payment terms<br/>
                          • Implement escalation procedures for large overdue amounts<br/>
                          • Offer payment plans for struggling clients<br/>
                          • Consider credit checks for new high-value clients
                        </div>
                      </div>
                    </div>
                  ) : metricId === 'client_concentration_risk' ? (
                    <div className="space-y-2">
                      <div className="text-xs font-medium mb-2 text-muted-foreground">
                        Measures business dependency on key clients using rolling 30-day data
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Diversified client base (&lt;40%)</span>
                        <span className="text-green-600 font-medium">9/9 points (Low Risk)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Moderate concentration (40-60%)</span>
                        <span className="text-yellow-600 font-medium">6/9 points (Moderate Risk)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>High concentration (60-80%)</span>
                        <span className="text-orange-600 font-medium">3/9 points (High Risk)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Very high concentration (≥80%)</span>
                        <span className="text-red-600 font-medium">0/9 points (Critical Risk)</span>
                      </div>
                      <div className="mt-3 pt-3 border-t">
                        <div className="text-xs font-medium mb-1">How to Reduce Risk:</div>
                        <div className="text-xs text-muted-foreground">
                          • Acquire new clients across different industries<br/>
                          • Keep any single client below 40% of total revenue<br/>
                          • Develop multiple revenue streams and partnerships<br/>
                          • Build strategic relationships with diverse client types
                        </div>
                      </div>
                    </div>
                  ) : metricId === 'business_continuity_risk' ? (
                    <div className="space-y-2">
                      <div className="text-xs font-medium mb-2 text-muted-foreground">
                        Measures revenue and stability trends using rolling 30-day windows
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>All trends positive or stable</span>
                        <span className="text-green-600 font-medium">8/8 points (Low Risk)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Some declining trends</span>
                        <span className="text-yellow-600 font-medium">4-6/8 points (Moderate Risk)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Multiple declining trends</span>
                        <span className="text-red-600 font-medium">0-4/8 points (High Risk)</span>
                      </div>
                      <div className="mt-3 pt-3 border-t">
                        <div className="text-xs font-medium mb-1">How to Reduce Risk:</div>
                        <div className="text-xs text-muted-foreground">
                          • Grow billable revenue consistently month-over-month<br/>
                          • Diversify client base to reduce concentration<br/>
                          • Maintain consistent daily work patterns<br/>
                          • Monitor trends and address declines proactively
                        </div>
                      </div>
                    </div>
                  ) : metricId === 'revenue_stability_risk' ? (
                    <div className="space-y-2">
                      <div className="text-xs font-medium mb-2 text-muted-foreground">
                        Compares current 30 days billable revenue vs previous 30 days (days 31-60)
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>≥100% of previous 30 days</span>
                        <span className="text-green-600 font-medium">3/3 points (Growing)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>90-100% of previous 30 days</span>
                        <span className="text-blue-600 font-medium">2.5/3 points (Stable)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>80-90% of previous 30 days</span>
                        <span className="text-yellow-600 font-medium">1.5/3 points (Declining)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>&lt;80% of previous 30 days</span>
                        <span className="text-red-600 font-medium">0/3 points (High Risk)</span>
                      </div>
                      <div className="mt-3 pt-3 border-t">
                        <div className="text-xs font-medium mb-1">How to Improve:</div>
                        <div className="text-xs text-muted-foreground">
                          • Track billable time consistently every day<br/>
                          • Maintain or increase billable hours month-over-month<br/>
                          • Convert unbilled work to invoices promptly<br/>
                          • Focus on high-value billable projects
                        </div>
                      </div>
                    </div>
                  ) : metricId === 'client_concentration_trend_risk' ? (
                    <div className="space-y-2">
                      <div className="text-xs font-medium mb-2 text-muted-foreground">
                        Tracks if client concentration is improving or worsening (rolling 30 days)
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Decreasing concentration (diversifying)</span>
                        <span className="text-green-600 font-medium">2.5/2.5 points (Low Risk)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Stable (±5% change)</span>
                        <span className="text-blue-600 font-medium">2/2.5 points (Moderate)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Increasing 5-10%</span>
                        <span className="text-yellow-600 font-medium">1.25/2.5 points (Warning)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Increasing &gt;10%</span>
                        <span className="text-red-600 font-medium">0/2.5 points (High Risk)</span>
                      </div>
                      <div className="mt-3 pt-3 border-t">
                        <div className="text-xs font-medium mb-1">How to Improve:</div>
                        <div className="text-xs text-muted-foreground">
                          • Actively pursue new client opportunities<br/>
                          • Diversify across different industries and sectors<br/>
                          • Reduce dependency on your largest client over time<br/>
                          • Build a pipeline of smaller clients to balance revenue
                        </div>
                      </div>
                    </div>
                  ) : metricId === 'consistency_trend_risk' ? (
                    <div className="space-y-2">
                      <div className="text-xs font-medium mb-2 text-muted-foreground">
                        Compares current 30 days daily hours consistency vs previous 30 days (days 31-60)
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Improving (closer to target)</span>
                        <span className="text-green-600 font-medium">2.5/2.5 points (Low Risk)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Stable (±10% change)</span>
                        <span className="text-blue-600 font-medium">2/2.5 points (Moderate)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Deteriorating 10-20%</span>
                        <span className="text-yellow-600 font-medium">1.25/2.5 points (Warning)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Deteriorating &gt;20%</span>
                        <span className="text-red-600 font-medium">0/2.5 points (High Risk)</span>
                      </div>
                      <div className="mt-3 pt-3 border-t">
                        <div className="text-xs font-medium mb-1">How to Improve:</div>
                        <div className="text-xs text-muted-foreground">
                          • Establish consistent daily work routines<br/>
                          • Aim for sustainable hours that match your targets<br/>
                          • Avoid extreme variations in daily working hours<br/>
                          • Balance workload to prevent burnout and maintain productivity
                        </div>
                      </div>
                    </div>
                  ) : metricId === 'daily_consistency_risk' ? (
                    <div className="space-y-2">
                      <div className="text-xs font-medium mb-2 text-muted-foreground">
                        Measures work pattern consistency and sustainability risk
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Matches target days/week AND hours/day</span>
                        <span className="text-green-600 font-medium">8/8 points (Low Risk)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>10-25% deviation from target</span>
                        <span className="text-yellow-600 font-medium">4-6/8 points (Moderate Risk)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>&gt;25% deviation from target</span>
                        <span className="text-red-600 font-medium">0-4/8 points (High Risk)</span>
                      </div>
                      <div className="mt-3 pt-3 border-t">
                        <div className="text-xs font-medium mb-1">How to Reduce Risk:</div>
                        <div className="text-xs text-muted-foreground">
                          • Maintain consistent working days per week<br/>
                          • Balance daily hours to match sustainable targets<br/>
                          • Avoid overwork (burnout risk) or underwork (revenue risk)<br/>
                          • Configure realistic targets in profit settings
                        </div>
                      </div>
                    </div>
                  ) : metricId === 'days_per_week_risk' ? (
                    <div className="space-y-2">
                      <div className="text-xs font-medium mb-2 text-muted-foreground">
                        Penalizes deviation from target working days per week
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Matches target days/week</span>
                        <span className="text-green-600 font-medium">4/4 points (Optimal)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>More days than target</span>
                        <span className="text-yellow-600 font-medium">Penalty (Work-life balance risk)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Fewer days than target</span>
                        <span className="text-yellow-600 font-medium">Penalty (Revenue risk)</span>
                      </div>
                      <div className="mt-3 pt-3 border-t">
                        <div className="text-xs font-medium mb-1">How to Improve:</div>
                        <div className="text-xs text-muted-foreground">
                          • Work the target number of days configured in settings<br/>
                          • Balance work schedule to avoid overwork or underwork<br/>
                          • Adjust profit targets if current schedule is unsustainable
                        </div>
                      </div>
                    </div>
                  ) : metricId === 'hours_per_day_risk' ? (
                    <div className="space-y-2">
                      <div className="text-xs font-medium mb-2 text-muted-foreground">
                        Penalizes deviation from target hours per day
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Matches target hours/day</span>
                        <span className="text-green-600 font-medium">4/4 points (Optimal)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>More hours than target</span>
                        <span className="text-yellow-600 font-medium">Penalty (Burnout risk)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Fewer hours than target</span>
                        <span className="text-yellow-600 font-medium">Penalty (Productivity risk)</span>
                      </div>
                      <div className="mt-3 pt-3 border-t">
                        <div className="text-xs font-medium mb-1">How to Improve:</div>
                        <div className="text-xs text-muted-foreground">
                          • Match your daily hours to the calculated target<br/>
                          • Avoid excessive hours that could lead to burnout<br/>
                          • Ensure you're working enough to meet revenue goals<br/>
                          • Adjust monthly targets if daily hours are unrealistic
                        </div>
                      </div>
                    </div>
                  ) : metricId === 'hourly_rate_value' ? (
                    <div className="space-y-2">
                      <div className="text-xs font-medium mb-2 text-muted-foreground">
                        Measures effective hourly rate (revenue / billable hours) against target rate
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>≥Target rate</span>
                        <span className="text-green-600 font-medium">8/8 points (Excellent)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>90-99% of max score</span>
                        <span className="text-blue-600 font-medium">6-7/8 points (Good)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>80-89% of max score</span>
                        <span className="text-yellow-600 font-medium">4-5/8 points (Fair)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>&lt;80% of max score</span>
                        <span className="text-red-600 font-medium">0-3/8 points (Poor)</span>
                      </div>
                      <div className="mt-3 pt-3 border-t">
                        <div className="text-xs font-medium mb-1">How to Improve:</div>
                        <div className="text-xs text-muted-foreground">
                          • Focus on high-value projects and clients<br/>
                          • Review and adjust your hourly rates regularly<br/>
                          • Track time accurately to reflect true value delivered<br/>
                          • Negotiate better rates for specialized services
                        </div>
                      </div>
                    </div>
                  ) : metricId === 'hours_progress' ? (
                    <div className="space-y-2">
                      <div className="text-xs font-medium mb-2 text-muted-foreground">
                        Measures total tracked hours against MTD target (based on working days schedule, not calendar days)
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>≥100% of MTD target</span>
                        <span className="text-green-600 font-medium">6.0 points</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>90% of MTD target</span>
                        <span className="text-blue-600 font-medium">5.4 points</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>80% of MTD target</span>
                        <span className="text-blue-600 font-medium">4.8 points</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>70% of MTD target</span>
                        <span className="text-yellow-600 font-medium">4.2 points</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>50% of MTD target</span>
                        <span className="text-red-600 font-medium">3.0 points</span>
                      </div>
                      <div className="mt-3 pt-3 border-t">
                        <div className="text-xs font-medium mb-1">How to Improve:</div>
                        <div className="text-xs text-muted-foreground">
                          • Configure accurate working days in settings<br/>
                          • Track time daily on all working days<br/>
                          • Front-load hours early in your working schedule
                        </div>
                      </div>
                    </div>
                  ) : metricId === 'tracking_consistency' ? (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span>≥90% days logged</span>
                        <span className="text-green-600 font-medium">3/3 points (Excellent)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>80-89% days logged</span>
                        <span className="text-blue-600 font-medium">2/3 points (Good)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>70-79% days logged</span>
                        <span className="text-yellow-600 font-medium">1/3 points (Fair)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>&lt;70% days logged</span>
                        <span className="text-red-600 font-medium">0/3 points (Poor)</span>
                      </div>
                    </div>
                  ) : metricId === 'collection_rate' ? (
                    <div className="space-y-2">
                      <div className="text-xs font-medium mb-2 text-muted-foreground">
                        Measures percentage of potential revenue successfully invoiced
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>100% collection rate</span>
                        <span className="text-green-600 font-medium">10.0 points</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>95% collection rate</span>
                        <span className="text-green-600 font-medium">9.5 points</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>85% collection rate</span>
                        <span className="text-blue-600 font-medium">8.5 points</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>75% collection rate</span>
                        <span className="text-yellow-600 font-medium">7.5 points</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>50% collection rate</span>
                        <span className="text-red-600 font-medium">5.0 points</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        Formula: (Total Revenue / Total Earned) × 10 = Score (capped at 10)
                      </div>
                      <div className="mt-3 pt-3 border-t">
                        <div className="text-xs font-medium mb-1">How to Improve:</div>
                        <div className="text-xs text-muted-foreground">
                          • Invoice completed work promptly<br/>
                          • Minimize unbilled hours accumulation<br/>
                          • Review unbilled work weekly and convert to invoices
                        </div>
                      </div>
                    </div>
                  ) : metricId === 'invoicing_speed' ? (
                    <div className="space-y-2">
                      <div className="text-xs font-medium mb-2 text-muted-foreground">
                        Measures DRI (Days Ready to Invoice) - how quickly ready work becomes invoiced
                        <div className="mt-1 text-muted-foreground/90">
                          DRI tracks average days from when work is ready to invoice until the actual invoice is created. Lower values mean faster invoicing cycles.
                        </div>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>≤2 days</span>
                        <span className="text-green-600 font-medium">10/10 points (Excellent)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>3-5 days</span>
                        <span className="text-blue-600 font-medium">7.5/10 points (Good)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>6-10 days</span>
                        <span className="text-yellow-600 font-medium">5/10 points (Fair)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>11-20 days</span>
                        <span className="text-orange-600 font-medium">2.5/10 points (Poor)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>&gt;20 days</span>
                        <span className="text-red-600 font-medium">0/10 points (Critical)</span>
                      </div>
                      <div className="mt-3 pt-3 border-t">
                        <div className="text-xs font-medium mb-1">How to Improve:</div>
                        <div className="text-xs text-muted-foreground">
                          • Invoice ready work within 24-48 hours<br/>
                          • Set up automated invoicing workflows<br/>
                          • Review unbilled work daily<br/>
                          • Create invoicing calendar reminders
                        </div>
                      </div>
                    </div>
                  ) : metricId === 'invoice_quality' ? (
                    <div className="space-y-2">
                      <div className="text-xs font-medium mb-2 text-muted-foreground">
                        Measures invoice accuracy and completeness
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>No errors/disputes</span>
                        <span className="text-green-600 font-medium">5 points</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Minimal errors</span>
                        <span className="text-blue-600 font-medium">4 points</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Some errors</span>
                        <span className="text-yellow-600 font-medium">3 points</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Frequent errors</span>
                        <span className="text-red-600 font-medium">0-2 points</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        Formula: Currently placeholder (4/5 points default)
                      </div>
                      <div className="mt-3 pt-3 border-t">
                        <div className="text-xs font-medium mb-1">How to Improve:</div>
                        <div className="text-xs text-muted-foreground">
                          • Use invoice templates<br/>
                          • Double-check before sending<br/>
                          • Track and address client feedback
                        </div>
                      </div>
                    </div>
                  ) : metricId === 'revenue_quality_collection' ? (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span>≥85% collection + ≤7 days</span>
                        <span className="text-green-600 font-medium">3.5-4/4 points (Excellent)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>75-84% collection + 8-14 days</span>
                        <span className="text-blue-600 font-medium">2.5-3.4/4 points (Good)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>65-74% collection + 15-30 days</span>
                        <span className="text-yellow-600 font-medium">1.5-2.4/4 points (Fair)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>&lt;65% collection + &gt;30 days</span>
                        <span className="text-red-600 font-medium">0-1.4/4 points (Poor)</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      <div>Points are awarded based on performance thresholds:</div>
                      <div>• Higher values typically = more points</div>
                      <div>• Each metric has its own scoring scale</div>
                      <div>• Points contribute to overall health score</div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* Component Breakdown - Only for complex metrics */}
          {detailedCalculation && (
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Component Breakdown
              </h3>

              {/* Summary */}
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  {detailedCalculation.summary}
                </p>
              </div>

              {/* Component Details */}
              <div className="space-y-3">
                {detailedCalculation.components.map((component, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-card">
                    {/* Component Header */}
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm">{component.name}</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {component.percentage}
                        </span>
                        <span className={`text-sm font-medium ${component.score / component.maxScore >= 0.8 ? 'text-green-600' : component.score / component.maxScore >= 0.6 ? 'text-blue-600' : 'text-yellow-600'}`}>
                          {component.score.toFixed(1)}/{component.maxScore} pts
                        </span>
                      </div>
                    </div>

                    {/* Component Value */}
                    <div className="mb-2">
                      <span className="font-mono text-sm text-primary">{component.value}</span>
                    </div>

                    {/* Component Description */}
                    <div className="text-xs text-muted-foreground mb-2">
                      {component.description}
                    </div>

                    {/* Formula */}
                    <div className="bg-muted/30 rounded px-2 py-1 mb-2">
                      <span className="font-mono text-xs">{component.formula}</span>
                    </div>

                    {/* Benchmark */}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CheckCircle className="h-3 w-3" />
                      {component.benchmark}
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Score Summary */}
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Total Metric Score</span>
                  <span className="font-bold text-primary">
                    {detailedCalculation.totalScore.toFixed(1)}/{detailedCalculation.totalMaxScore} points
                  </span>
                </div>
                <div className="mt-2 w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min((detailedCalculation.totalScore / detailedCalculation.totalMaxScore) * 100, 100)}%` }}
                  />
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {Math.round((detailedCalculation.totalScore / detailedCalculation.totalMaxScore) * 100)}% of maximum score
                </div>
              </div>
            </div>
          )}


          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

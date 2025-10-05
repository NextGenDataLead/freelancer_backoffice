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
                          const match = calculationDescription?.match(/MTD target \((\d+)%\)/)
                          const target = match ? match[1] : '90'
                          return `Measures progress toward MTD billable hours target (${target}% of MTD hours target)`
                        })()}
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>100% of MTD billable target</span>
                        <span className="text-green-600 font-medium">2.1 points</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>95% of MTD billable target</span>
                        <span className="text-green-600 font-medium">2.0 points</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>90% of MTD billable target</span>
                        <span className="text-blue-600 font-medium">1.9 points</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>80% of MTD billable target</span>
                        <span className="text-yellow-600 font-medium">1.7 points</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>50% of MTD billable target</span>
                        <span className="text-red-600 font-medium">1.1 points</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        Formula: (Billable Hours / MTD Billable Target) × 2.1 = Score
                      </div>
                      <div className="mt-3 pt-3 border-t">
                        <div className="text-xs font-medium mb-1">How to Improve:</div>
                        <div className="text-xs text-muted-foreground">
                          • Track billable vs non-billable time carefully<br/>
                          • Review weekly to stay on track for monthly target
                        </div>
                      </div>
                    </div>
                  ) : metricId === 'daily_consistency' ? (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span>≥5.0h/day</span>
                        <span className="text-green-600 font-medium">1.5/1.5 points (Excellent)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>3.0-4.9h/day</span>
                        <span className="text-blue-600 font-medium">1.2/1.5 points (Good)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>2.0-2.9h/day</span>
                        <span className="text-yellow-600 font-medium">0.8/1.5 points (Fair)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>&lt;2.0h/day</span>
                        <span className="text-red-600 font-medium">0.3/1.5 points (Poor)</span>
                      </div>
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
                    </div>
                  ) : metricId === 'collection_speed' ? (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span>&lt;7 days</span>
                        <span className="text-green-600 font-medium">10/10 points (Excellent)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>7-15 days</span>
                        <span className="text-blue-600 font-medium">8/10 points (Good)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>16-30 days</span>
                        <span className="text-yellow-600 font-medium">5/10 points (Fair)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>31-45 days</span>
                        <span className="text-orange-600 font-medium">3/10 points (Poor)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>&gt;45 days</span>
                        <span className="text-red-600 font-medium">1/10 points (Critical)</span>
                      </div>
                    </div>
                  ) : metricId === 'volume_efficiency' ? (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span>0-3 invoices</span>
                        <span className="text-green-600 font-medium">10/10 points (Excellent)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>4-5 invoices</span>
                        <span className="text-blue-600 font-medium">7/10 points (Good)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>6-7 invoices</span>
                        <span className="text-yellow-600 font-medium">5/10 points (Fair)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>&gt;7 invoices</span>
                        <span className="text-red-600 font-medium">2/10 points (Poor)</span>
                      </div>
                    </div>
                  ) : metricId === 'absolute_amount_control' ? (
                    <div className="space-y-2">
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
                    </div>
                  ) : metricId === 'invoice_processing_risk' ? (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span>&lt;€2,000</span>
                        <span className="text-green-600 font-medium">8/8 points (Excellent)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>€2,000-€5,000</span>
                        <span className="text-blue-600 font-medium">6/8 points (Good)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>€5,000-€8,000</span>
                        <span className="text-yellow-600 font-medium">4/8 points (Fair)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>&gt;€8,000</span>
                        <span className="text-red-600 font-medium">0/8 points (Critical)</span>
                      </div>
                    </div>
                  ) : metricId === 'payment_collection_risk' ? (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span>&lt;€1,000</span>
                        <span className="text-green-600 font-medium">5/5 points (Low Risk)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>€1,000-€3,000</span>
                        <span className="text-blue-600 font-medium">3/5 points (Moderate Risk)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>€3,000-€5,000</span>
                        <span className="text-yellow-600 font-medium">2/5 points (High Risk)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>&gt;€5,000</span>
                        <span className="text-red-600 font-medium">0/5 points (Critical Risk)</span>
                      </div>
                    </div>
                  ) : metricId === 'hourly_rate_value' ? (
                    <div className="space-y-2">
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
                    </div>
                  ) : metricId === 'hours_progress' ? (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span>≥100% MTD target</span>
                        <span className="text-green-600 font-medium">2.4/2.4 points (Excellent)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>85-99% MTD target</span>
                        <span className="text-blue-600 font-medium">2.0-2.3/2.4 points (Good)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>70-84% MTD target</span>
                        <span className="text-yellow-600 font-medium">1.7-1.9/2.4 points (Fair)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>&lt;70% MTD target</span>
                        <span className="text-red-600 font-medium">0-1.6/2.4 points (Poor)</span>
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
                      <div className="flex justify-between text-xs">
                        <span>≥85% collection rate</span>
                        <span className="text-green-600 font-medium">2/2 points (Excellent)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>75-84% collection rate</span>
                        <span className="text-blue-600 font-medium">1.5/2 points (Good)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>65-74% collection rate</span>
                        <span className="text-yellow-600 font-medium">1/2 points (Fair)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>&lt;65% collection rate</span>
                        <span className="text-red-600 font-medium">0/2 points (Poor)</span>
                      </div>
                    </div>
                  ) : metricId === 'invoicing_speed' ? (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span>≤2 days delay</span>
                        <span className="text-green-600 font-medium">2/2 points (Excellent)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>3-4 days delay</span>
                        <span className="text-blue-600 font-medium">1.5/2 points (Good)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>5-7 days delay</span>
                        <span className="text-yellow-600 font-medium">1/2 points (Fair)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>&gt;7 days delay</span>
                        <span className="text-red-600 font-medium">0/2 points (Poor)</span>
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

                {/* Data Source */}
                <div className="pt-3 border-t text-xs text-muted-foreground">
                  <>
                    <div><strong>Current:</strong> {calculationDetails.pureCalculation}</div>
                    <div><strong>Progress:</strong> Based on {metricId.includes('rate') ? 'actual performance vs benchmark thresholds' : metricId.includes('consistency') ? 'daily tracking consistency' : 'actual vs planned metrics'}</div>
                  </>
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
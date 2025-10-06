/**
 * Health Score Decision Tree Engine
 *
 * Centralizes all health score calculations, explanations, and recommendations
 * into a clean input → transform → output flow.
 */

import {
  calculateExpectedWorkingDays,
  calculateDailyHoursTarget,
  getStartOfMonth,
  getEndOfMonth,
  getYesterday
} from './utils/working-days-calculator'

// ================== INPUT TYPES ==================
export interface HealthScoreInputs {
  dashboardMetrics: {
    totale_registratie: number
    achterstallig: number
    achterstallig_count: number
    factureerbaar: number
    factureerbaar_count?: number
    actual_dso?: number
    average_payment_terms?: number
    average_dri?: number
    rolling30DaysRevenue?: {
      current: number
      previous: number
    }
  }
  timeStats: {
    thisMonth: {
      hours: number
      revenue: number
      billableHours?: number
      nonBillableHours?: number
      distinctWorkingDays?: number
    }
    unbilled: {
      hours: number
      revenue: number
      value: number
    }
    subscription?: {
      monthlyActiveUsers?: { current: number }
      averageSubscriptionFee?: { current: number }
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
  mtdCalculations: {
    currentDay: number
    daysInMonth: number
    monthProgress: number
    mtdRevenueTarget: number
    mtdHoursTarget: number
  }
  profitTargets?: {
    monthly_revenue_target: number
    monthly_cost_target: number
    monthly_profit_target: number
    // Component-based targets
    monthly_hours_target: number
    target_hourly_rate: number
    target_billable_ratio: number
    target_working_days_per_week: number[]
    target_monthly_active_users: number
    target_avg_subscription_fee: number
    setup_completed: boolean
  }
  clientRevenue?: {
    topClient?: {
      name: string
      revenueShare: number
    }
    rolling30DaysComparison?: {
      current: {
        topClientShare: number
        totalRevenue: number
      }
      previous: {
        topClientShare: number
        totalRevenue: number
      }
    }
  }
}

// ================== OUTPUT TYPES ==================
export interface HealthScoreOutputs {
  scores: {
    profit: number // Profit targets are now mandatory
    cashflow: number
    efficiency: number
    risk: number
    total: number
    totalRounded: number
  }
  breakdown: {
    profit: any
    cashflow: any
    efficiency: any
    risk: any
  }
  explanations: {
    profit: HealthExplanation // Profit health is now the default
    cashflow: HealthExplanation
    efficiency: HealthExplanation
    risk: HealthExplanation
  }
  recommendations: {
    profit: HealthRecommendation[] // Profit recommendations are now the default
    cashflow: HealthRecommendation[]
    efficiency: HealthRecommendation[]
    risk: HealthRecommendation[]
  }
  insights: {
    topPriorities: string[]
    quickWins: string[]
    longTermGoals: string[]
  }
}

export interface HealthExplanation {
  title: string
  score: number
  maxScore: number
  details: HealthExplanationSection[]
}

export interface HealthExplanationSection {
  type: 'metrics' | 'calculations' | 'summary'
  title?: string
  items: HealthExplanationItem[]
}

export interface HealthExplanationItem {
  type: 'metric' | 'calculation' | 'standard' | 'formula' | 'text'
  label?: string
  value?: string
  description?: string
  formula?: string
  emphasis?: 'primary' | 'secondary' | 'muted'
}

export interface HealthRecommendation {
  id: string
  priority: 'high' | 'medium' | 'low'
  impact: number // potential points to gain
  effort: 'low' | 'medium' | 'high'
  timeframe: 'immediate' | 'weekly' | 'monthly'
  title: string
  description: string
  actionItems: string[]
  metrics: {
    current: string
    target: string
    pointsToGain: number
  }
}

// ================== REDISTRIBUTION TYPES ==================

export interface ScoreCategories {
  subscription: {
    subscriberGrowth: number
    subscriptionPricing: number
    revenueMix: number
    subscriptionEffectiveness: number
  }
  timeBased: {
    pricingEfficiency: number
    rateOptimization: number
    timeUtilization: number
    revenueQuality: number
  }
}

export interface RedistributedScores {
  subscriberScore: number
  subscriptionPricingScore: number
  revenueMixScore: number
  pricingEfficiencyScore: number
  rateOptimizationScore: number
  subscriptionEffectivenessScore: number
  timeUtilizationScore: number
  revenueQualityScore: number
  totalPoints: number
  businessModel: 'time-only' | 'saas-only' | 'hybrid'
}

// ================== DECISION TREE CALCULATORS ==================

// Helper function to round to one decimal place consistently
function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10
}


class CashFlowScoreCalculator {
  // Helper method to calculate realistic DIO from invoice data patterns
  calculateRealDIOFromData(overdueAmount: number, overdueCount: number): number {
    // If no overdue amounts, collection is excellent
    if (overdueAmount <= 0 || overdueCount <= 0) return 0

    // Estimate days based on real business patterns:
    // €500-€1000 overdue typically = 15-30 days past due
    // €1000-€3000 overdue typically = 30-45 days past due
    // €3000+ overdue typically = 45-60+ days past due

    const avgOverduePerInvoice = overdueAmount / Math.max(overdueCount, 1)
    let calculatedDIO: number

    if (avgOverduePerInvoice <= 500) {
      // Small amounts = likely recent overdue
      calculatedDIO = 15 + (avgOverduePerInvoice / 500) * 15 // 15-30 days
    } else if (avgOverduePerInvoice <= 1500) {
      // Medium amounts = moderate overdue period
      calculatedDIO = 30 + ((avgOverduePerInvoice - 500) / 1000) * 15 // 30-45 days
    } else {
      // Large amounts = likely long overdue
      calculatedDIO = Math.min(45 + ((avgOverduePerInvoice - 1500) / 1000) * 10, 60) // 45-60 days max
    }

    // Validate data integrity (ensure tenant isolation)
    if (overdueCount > 0 && overdueAmount <= 0) {
      console.warn('⚠️ DIO Data Integrity Warning: Overdue count exists but amount is zero')
    }
    if (overdueAmount > 0 && overdueCount <= 0) {
      console.warn('⚠️ DIO Data Integrity Warning: Overdue amount exists but count is zero')
    }

    return calculatedDIO
  }

  calculate(inputs: HealthScoreInputs): { score: number; breakdown: any } {
    const { dashboardMetrics } = inputs

    // Use actual DIO (Days Invoice Overdue) from invoice payment timing
    const overdueAmount = dashboardMetrics.achterstallig || 0
    const overdueCount = dashboardMetrics.achterstallig_count || 0
    const actualDIO = dashboardMetrics.actual_dso ?? this.calculateRealDIOFromData(overdueAmount, overdueCount)
    const paymentTerms = dashboardMetrics.average_payment_terms || 30

    // Volume efficiency - fewer overdue items = better
    const volumeEfficiency = Math.max(0, 1 - (overdueCount / 10)) // Scale to 0-1 based on count

    // Score components - DYNAMIC BASED ON PAYMENT TERMS
    // Thresholds relative to payment terms:
    // - Excellent: ≤payment terms (paid on time or early)
    // - Good: payment terms + 1 to 7 days late
    // - Fair: payment terms + 8 to 15 days late
    // - Poor: payment terms + 16 to 30 days late
    // - Critical: >payment terms + 30 days late

    const excellent = paymentTerms
    const good = paymentTerms + 7
    const fair = paymentTerms + 15
    const poor = paymentTerms + 30

    const dioScore = roundToOneDecimal(actualDIO <= excellent ? 15 :
                                      actualDIO <= good ? 12 :
                                      actualDIO <= fair ? 8 :
                                      actualDIO <= poor ? 3 : 0) // 15 points max

    const volumeScore = roundToOneDecimal(volumeEfficiency * 5) // 0-5 points

    const absoluteAmountScore = roundToOneDecimal(overdueAmount <= 1000 ? 5 :
                                                 overdueAmount <= 3000 ? 3 :
                                                 overdueAmount <= 5000 ? 1 : 0) // 5 points max

    const finalScore = roundToOneDecimal(dioScore + volumeScore + absoluteAmountScore)

    return {
      score: finalScore,
      breakdown: {
        overdueAmount,
        overdueCount,
        dioEquivalent: actualDIO,
        paymentTerms,
        volumeEfficiency,
        scores: { dioScore, volumeScore, absoluteAmountScore }
      }
    }
  }

  generateExplanation(inputs: HealthScoreInputs, result: { score: number; breakdown: any }): HealthExplanation {
    return {
      title: 'Cash Flow Health - Collection Focus (25 points)',
      score: result.score,
      maxScore: 25,
      details: [
        {
          type: 'metrics',
          title: 'Payment Collection Status',
          items: [
            {
              type: 'metric',
              label: 'Outstanding Amount',
              value: `€${result.breakdown.overdueAmount?.toLocaleString() || 0}`,
              emphasis: result.breakdown.overdueAmount > 1000 ? 'secondary' : 'primary'
            },
            {
              type: 'metric',
              label: 'Outstanding Count',
              value: `${result.breakdown.overdueCount} invoices`,
              emphasis: result.breakdown.overdueCount > 3 ? 'secondary' : 'primary'
            },
            {
              type: 'metric',
              label: 'DIO (Days Invoice Overdue)',
              value: `${result.breakdown.dioEquivalent?.toFixed(1) || 0} days`,
              emphasis: result.breakdown.dioEquivalent > 15 ? 'secondary' : 'primary'
            },
            {
              type: 'text',
              description: 'Note: This metric focuses purely on payment collection patterns, completely independent of total revenue or profitability.'
            }
          ]
        },
        {
          type: 'calculations',
          title: 'Independent Collection Metrics',
          items: [
            {
              type: 'calculation',
              label: '1. Collection Speed (DIO)',
              value: `${result.breakdown.dioEquivalent?.toFixed(1) || 0} days overdue`,
              description: `→ ${result.breakdown.scores?.dioScore || 0}/15 pts`,
              emphasis: 'primary'
            },
            {
              type: 'standard',
              value: 'Speed: <7 days=Excellent (15), 7-15=Good (12), 15-30=Fair (8), 30-45=Poor (3)'
            },
            {
              type: 'calculation',
              label: '2. Volume Efficiency',
              value: `${(result.breakdown.volumeEfficiency * 100)?.toFixed(1) || 0}%`,
              description: `→ ${result.breakdown.scores?.volumeScore || 0}/5 pts`,
              emphasis: 'primary'
            },
            {
              type: 'standard',
              value: 'Volume: <3 items=Good, 3-5=Fair, 5-7=Poor, >7=Critical'
            },
            {
              type: 'calculation',
              label: '3. Absolute Amount Control',
              value: `€${result.breakdown.overdueAmount?.toLocaleString() || 0}`,
              description: `→ ${result.breakdown.scores?.absoluteAmountScore || 0}/5 pts`,
              emphasis: 'primary'
            },
            {
              type: 'standard',
              value: 'Amount: <€1k=Excellent, €1-3k=Good, €3-5k=Fair, >€5k=Poor'
            },
            {
              type: 'formula',
              formula: `Total Score: ${result.breakdown.scores?.dioScore || 0} + ${result.breakdown.scores?.volumeScore || 0} + ${result.breakdown.scores?.absoluteAmountScore || 0} = ${result.score}/25`
            }
          ]
        }
      ]
    }
  }

  generateRecommendations(inputs: HealthScoreInputs, breakdown: any): HealthRecommendation[] {
    const recommendations: HealthRecommendation[] = []
    const { overdueAmount, overdueCount, dioEquivalent, scores, paymentTerms } = breakdown

    // 1. COLLECTION SPEED OPTIMIZATION (up to 15 points)
    const targetDIO = paymentTerms || 30
    const speedGap = Math.max(0, dioEquivalent - targetDIO)
    const speedPointsToGain = Math.max(0.1, 15 - (scores?.dioScore || 0))

    recommendations.push({
      id: 'reduce-dio',
      priority: speedPointsToGain >= 5 ? 'high' : speedPointsToGain >= 2 ? 'medium' : 'low',
      impact: Math.round(speedPointsToGain * 10) / 10,
      effort: 'medium',
      timeframe: 'immediate',
      title: 'Reduce Days Invoice Overdue (DIO)',
      description: speedGap > 0
        ? `Reduce DIO from ${dioEquivalent.toFixed(1)} to ≤${targetDIO} days (payment terms)`
        : `Maintain excellent DIO at ${dioEquivalent.toFixed(1)} days`,
      actionItems: speedGap > 0 ? [
        'Contact clients with outstanding invoices immediately',
        'Implement daily payment follow-up procedures',
        'Offer early payment discounts for quick settlement',
        'Send payment reminders before due date'
      ] : [
        'Maintain current efficient collection processes',
        'Monitor payment timing consistency',
        'Implement automated payment reminders'
      ],
      metrics: {
        current: `${dioEquivalent.toFixed(1)} days overdue`,
        target: `≤${targetDIO} days (payment terms)`,
        pointsToGain: Math.round(speedPointsToGain * 10) / 10
      }
    })

    // 2. VOLUME EFFICIENCY OPTIMIZATION (up to 10 points)
    const volumeGap = Math.max(0, overdueCount - 3)
    const volumePointsToGain = Math.max(0.1, 10 - (scores?.volumeScore || 0))

    recommendations.push({
      id: 'improve-volume-efficiency',
      priority: volumePointsToGain >= 5 ? 'high' : volumePointsToGain >= 2 ? 'medium' : 'low',
      impact: Math.round(volumePointsToGain * 10) / 10,
      effort: 'medium',
      timeframe: 'weekly',
      title: 'Improve Volume Efficiency',
      description: volumeGap > 0
        ? `Reduce ${overdueCount} overdue items to 3 or fewer`
        : `Maintain efficient volume with ${overdueCount} items`,
      actionItems: volumeGap > 0 ? [
        'Focus on clearing smallest outstanding amounts first',
        'Implement systematic collection workflow',
        'Negotiate payment plans for larger amounts'
      ] : [
        'Maintain systematic collection workflow',
        'Monitor overdue item count weekly',
        'Prevent new items from becoming overdue'
      ],
      metrics: {
        current: `${overdueCount} overdue items`,
        target: '≤3 overdue items',
        pointsToGain: Math.round(volumePointsToGain * 10) / 10
      }
    })

    // 3. ABSOLUTE AMOUNT CONTROL (up to 5 points)
    const amountGap = Math.max(0, overdueAmount - 1000)
    const amountPointsToGain = Math.max(0.1, 5 - (scores?.absoluteAmountScore || 0))

    recommendations.push({
      id: 'control-absolute-amounts',
      priority: amountPointsToGain >= 3 ? 'medium' : 'low',
      impact: Math.round(amountPointsToGain * 10) / 10,
      effort: 'high',
      timeframe: 'monthly',
      title: 'Control Outstanding Amounts',
      description: amountGap > 0
        ? `Reduce €${Math.round(overdueAmount)} outstanding to under €1,000`
        : `Maintain excellent amount control under €1,000`,
      actionItems: amountGap > 0 ? [
        'Target largest outstanding invoices for immediate collection',
        'Review and improve credit management policies',
        'Consider factoring for difficult-to-collect amounts'
      ] : [
        'Maintain proactive credit management',
        'Monitor outstanding amounts weekly',
        'Implement preventive collection measures'
      ],
      metrics: {
        current: `€${overdueAmount.toLocaleString()} outstanding`,
        target: '<€1,000 outstanding',
        pointsToGain: Math.round(amountPointsToGain * 10) / 10
      }
    })

    // Sort by priority and impact, return top 5
    return recommendations
      .sort((a, b) => {
        const priorityWeight = { high: 3, medium: 2, low: 1 }
        const scoreA = priorityWeight[a.priority] * 10 + a.impact
        const scoreB = priorityWeight[b.priority] * 10 + b.impact
        return scoreB - scoreA
      })
      .slice(0, 5)
  }
}

class EfficiencyScoreCalculator {
  calculate(inputs: HealthScoreInputs): { score: number; breakdown: any } {
    const { timeStats, dashboardMetrics } = inputs

    const totalRevenue = dashboardMetrics.totale_registratie || 0
    const unbilledValue = dashboardMetrics.factureerbaar || 0
    const unbilledCount = dashboardMetrics.factureerbaar_count || 0
    const averageDRI = dashboardMetrics.average_dri ?? 0

    // === EFFICIENCY METRICS (MIRRORING CASHFLOW STRUCTURE) ===

    // 1. DRI - Days Ready to Invoice (15 pts) - How quickly ready work becomes invoiced
    // DRI Scoring: Lower is better (faster invoicing)
    // Excellent: ≤2 days (15 pts), Good: 3-5 days (12 pts), Fair: 6-10 days (8 pts), Poor: 11-20 days (3 pts), Critical: >20 days (0 pts)
    const driScore = roundToOneDecimal(
      averageDRI <= 2 ? 15 :
      averageDRI <= 5 ? 12 :
      averageDRI <= 10 ? 8 :
      averageDRI <= 20 ? 3 : 0
    )

    // 2. Volume Efficiency (5 pts) - Fewer ready-to-invoice items = better
    const volumeEfficiency = Math.max(0, 1 - (unbilledCount / 10)) // Scale to 0-1 based on count
    const volumeScore = roundToOneDecimal(volumeEfficiency * 5) // 0-5 points

    // 3. Absolute Amount Control (5 pts) - Lower ready-to-invoice amounts = better
    // €0-€1000 = Excellent (5 pts)
    // €1000-€3000 = Good (3 pts)
    // €3000-€5000 = Fair (1 pt)
    // >€5000 = Poor (0 pts)
    const absoluteAmountScore = roundToOneDecimal(
      unbilledValue <= 1000 ? 5 :
      unbilledValue <= 3000 ? 3 :
      unbilledValue <= 5000 ? 1 : 0
    )

    const finalScore = roundToOneDecimal(driScore + volumeScore + absoluteAmountScore)

    return {
      score: finalScore,
      breakdown: {
        totalRevenue,
        unbilledValue,
        unbilledCount,
        averageDRI,
        volumeEfficiency,
        scores: {
          driScore,
          volumeScore,
          absoluteAmountScore
        }
      }
    }
  }

  generateExplanation(inputs: HealthScoreInputs, result: { score: number; breakdown: any }): HealthExplanation {
    return {
      title: 'Efficiency Health - Work-to-Revenue Conversion (25 points)',
      score: result.score,
      maxScore: 25,
      details: [
        {
          type: 'metrics',
          title: 'Conversion Efficiency Data',
          items: [
            {
              type: 'metric',
              label: 'Total Invoiced Revenue',
              value: `€${result.breakdown.totalRevenue?.toFixed(0)}`,
              emphasis: 'primary'
            },
            {
              type: 'metric',
              label: 'Unbilled Work Value',
              value: `€${result.breakdown.unbilledValue?.toFixed(0)}`,
              emphasis: result.breakdown.unbilledValue > 0 ? 'secondary' : 'muted'
            },
            {
              type: 'metric',
              label: 'Total Earned Value',
              value: `€${result.breakdown.totalEarned?.toFixed(0)}`,
              description: 'Invoiced + Unbilled'
            },
            {
              type: 'text',
              description: 'Note: This metric focuses on operational effectiveness of converting work to revenue, independent of time tracking.'
            }
          ]
        },
        {
          type: 'calculations',
          title: 'Efficiency Metrics',
          items: [
            {
              type: 'calculation',
              label: '1. DRI (Days Ready to Invoice)',
              value: `${result.breakdown.averageDRI?.toFixed(1)} days`,
              description: `→ ${result.breakdown.scores?.driScore || 0}/10 pts`,
              emphasis: 'primary'
            },
            {
              type: 'standard',
              value: 'DRI: ≤2 days=Excellent (10), 3-5=Good (7.5), 6-10=Fair (5), 11-20=Poor (2.5), >20=Critical (0)'
            },
            {
              type: 'calculation',
              label: '2. Collection Rate',
              value: `${(result.breakdown.collectionRate * 100)?.toFixed(1)}%`,
              description: `→ ${result.breakdown.scores?.collectionRateScore || 0}/10 pts`,
              emphasis: 'primary'
            },
            {
              type: 'standard',
              value: 'Collection: >90%=Excellent, 80-90%=Good, 70-80%=Fair, <70%=Poor'
            },
            {
              type: 'calculation',
              label: '3. Invoice Quality',
              value: 'Placeholder (80%)',
              description: `→ ${result.breakdown.scores?.invoiceQualityScore || 0}/5 pts`,
              emphasis: 'muted'
            },
            {
              type: 'standard',
              value: 'Quality: Future metric for tracking invoice accuracy'
            },
            {
              type: 'formula',
              formula: `Total Score: ${result.breakdown.scores?.invoicingSpeedScore || 0} + ${result.breakdown.scores?.collectionRateScore || 0} + ${result.breakdown.scores?.invoiceQualityScore || 0} = ${result.score}/25`
            }
          ]
        }
      ]
    }
  }

  generateRecommendations(inputs: HealthScoreInputs, breakdown: any): HealthRecommendation[] {
    const recommendations: HealthRecommendation[] = []
    const { averageDRI, collectionRate, scores, unbilledValue, totalEarned } = breakdown

    // 1. DRI (DAYS READY TO INVOICE) OPTIMIZATION (up to 10 points)
    const driPointsToGain = Math.max(0.1, 10 - (scores?.driScore || 0))

    recommendations.push({
      id: 'reduce-dri',
      priority: driPointsToGain >= 5 ? 'high' : driPointsToGain >= 3 ? 'medium' : 'low',
      impact: Math.round(driPointsToGain * 10) / 10,
      effort: unbilledValue > 5000 ? 'high' : 'medium',
      timeframe: 'weekly',
      title: 'Reduce Days Ready to Invoice (DRI)',
      description: averageDRI > 2
        ? `Reduce DRI from ${averageDRI?.toFixed(1)} days to ≤2 days for maximum efficiency`
        : `Maintain excellent DRI at ${averageDRI?.toFixed(1)} days`,
      actionItems: averageDRI > 2 ? [
        'Invoice ready work within 24-48 hours',
        'Set up automated invoicing workflows',
        'Review unbilled work daily',
        'Create invoicing calendar reminders'
      ] : [
        'Maintain fast invoicing practices',
        'Monitor unbilled work daily',
        'Optimize invoice generation process'
      ],
      metrics: {
        current: `${averageDRI?.toFixed(1)} days average`,
        target: '≤2 days (Excellent)',
        pointsToGain: Math.round(driPointsToGain * 10) / 10
      }
    })

    // 2. COLLECTION RATE OPTIMIZATION (up to 10 points)
    const collectionGap = Math.max(0, 0.90 - collectionRate)
    const collectionPointsToGain = Math.max(0.1, 10 - (scores?.collectionRateScore || 0))

    recommendations.push({
      id: 'improve-collection-rate',
      priority: collectionPointsToGain >= 5 ? 'high' : collectionPointsToGain >= 3 ? 'medium' : 'low',
      impact: Math.round(collectionPointsToGain * 10) / 10,
      effort: 'medium',
      timeframe: 'weekly',
      title: 'Improve Collection Rate',
      description: collectionGap > 0
        ? `Increase collection rate from ${Math.round(collectionRate * 100)}% to 90%+`
        : `Maintain excellent collection rate at ${Math.round(collectionRate * 100)}%`,
      actionItems: collectionGap > 0 ? [
        'Follow up on outstanding invoices',
        'Implement payment reminders',
        'Offer multiple payment methods'
      ] : [
        'Maintain efficient collection practices',
        'Monitor payment patterns weekly',
        'Optimize client payment terms'
      ],
      metrics: {
        current: `${Math.round(collectionRate * 100)}% collected`,
        target: '90%+ collection rate',
        pointsToGain: Math.round(collectionPointsToGain * 10) / 10
      }
    })

    // 3. INVOICE QUALITY OPTIMIZATION (up to 5 points) - Placeholder
    const qualityPointsToGain = Math.max(0.1, 5 - (scores?.invoiceQualityScore || 0))

    recommendations.push({
      id: 'improve-invoice-quality',
      priority: 'low',
      impact: Math.round(qualityPointsToGain * 10) / 10,
      effort: 'low',
      timeframe: 'ongoing',
      title: 'Improve Invoice Quality',
      description: 'Future metric - maintain invoice accuracy and completeness',
      actionItems: [
        'Use invoice templates',
        'Double-check before sending',
        'Track client feedback'
      ],
      metrics: {
        current: 'Placeholder (80%)',
        target: '100% invoice accuracy',
        pointsToGain: Math.round(qualityPointsToGain * 10) / 10
      }
    })

    // Sort by priority and impact, return top 5
    return recommendations
      .sort((a, b) => {
        const priorityWeight = { high: 3, medium: 2, low: 1 }
        const scoreA = priorityWeight[a.priority] * 10 + a.impact
        const scoreB = priorityWeight[b.priority] * 10 + b.impact
        return scoreB - scoreA
      })
      .slice(0, 5)
  }
}

class RiskScoreCalculator {
  calculate(inputs: HealthScoreInputs): { score: number; breakdown: any } {
    const { timeStats, profitTargets, mtdCalculations, clientRevenue } = inputs

    // Redistribute: Client (36%), Business (32%), Consistency (32%)
    // Client concentration risk - 9 pts max (36% of 25)
    // Use rolling 30-day data for consistency with other metrics
    const topClientShare = clientRevenue?.rolling30DaysComparison?.current?.topClientShare || 0
    let clientRisk = 0
    if (topClientShare >= 80) {
      clientRisk = 9 // Very high concentration: >80%
    } else if (topClientShare >= 60) {
      clientRisk = 6 // High concentration: 60-80%
    } else if (topClientShare >= 40) {
      clientRisk = 3 // Moderate concentration: 40-60%
    } else {
      clientRisk = 0 // Diversified: <40%
    }
    clientRisk = roundToOneDecimal(clientRisk)

    // Calculate target values needed for consistency metrics
    const targetWorkingDays = profitTargets?.target_working_days_per_week || [1, 2, 3, 4, 5]
    const targetDaysPerWeek = targetWorkingDays.length
    const targetDailyHours = profitTargets?.monthly_hours_target
      ? calculateDailyHoursTarget(profitTargets.monthly_hours_target, targetWorkingDays)
      : 8

    // Business continuity risk - 8 pts max (32% of 25)
    // Split into 3 sub-metrics: Revenue Stability (3pts), Client Concentration Trend (2.5pts), Consistency Trend (2.5pts)

    // 1. Revenue Stream Stability (3 points)
    const current30DaysBillableRevenue = timeStats.rolling30Days?.current?.billableRevenue || 0
    const previous30DaysBillableRevenue = timeStats.rolling30Days?.previous?.billableRevenue || 0

    let revenueStabilityRisk = 0
    if (previous30DaysBillableRevenue > 0) {
      const revenueGrowth = current30DaysBillableRevenue / previous30DaysBillableRevenue
      if (revenueGrowth >= 1.0) {
        revenueStabilityRisk = 0 // No risk - growing
      } else if (revenueGrowth >= 0.9) {
        revenueStabilityRisk = 0.5 // Slight decline
      } else if (revenueGrowth >= 0.8) {
        revenueStabilityRisk = 1.5 // Moderate decline
      } else {
        revenueStabilityRisk = 3 // Significant decline
      }
    } else {
      revenueStabilityRisk = 1.5 // No baseline - moderate risk
    }

    // 2. Client Concentration Trend (2.5 points)
    const current30DaysClientShare = clientRevenue?.rolling30DaysComparison?.current?.topClientShare || 0
    const previous30DaysClientShare = clientRevenue?.rolling30DaysComparison?.previous?.topClientShare || 0

    let clientConcentrationTrendRisk = 0
    if (previous30DaysClientShare > 0) {
      const concentrationChange = current30DaysClientShare - previous30DaysClientShare
      if (concentrationChange <= 0) {
        clientConcentrationTrendRisk = 0 // Diversifying - good
      } else if (concentrationChange <= 5) {
        clientConcentrationTrendRisk = 0.5 // Slight increase
      } else if (concentrationChange <= 10) {
        clientConcentrationTrendRisk = 1.25 // Moderate increase
      } else {
        clientConcentrationTrendRisk = 2.5 // High increase
      }
    } else {
      clientConcentrationTrendRisk = 0.5 // No baseline - slight risk
    }

    // 3. Daily Consistency Trend (2.5 points)
    const current30DaysDailyHours = timeStats.rolling30Days?.current?.dailyHours || 0
    const previous30DaysDailyHours = timeStats.rolling30Days?.previous?.dailyHours || 0

    let consistencyTrendRisk = 0
    if (previous30DaysDailyHours > 0 && targetDailyHours > 0) {
      const currentDeviation = Math.abs(current30DaysDailyHours - targetDailyHours) / targetDailyHours
      const previousDeviation = Math.abs(previous30DaysDailyHours - targetDailyHours) / targetDailyHours
      const deviationChange = currentDeviation - previousDeviation

      if (deviationChange <= 0) {
        consistencyTrendRisk = 0 // Improving
      } else if (deviationChange <= 0.1) {
        consistencyTrendRisk = 0.5 // Slight deterioration
      } else if (deviationChange <= 0.2) {
        consistencyTrendRisk = 1.25 // Moderate deterioration
      } else {
        consistencyTrendRisk = 2.5 // Significant deterioration
      }
    } else {
      consistencyTrendRisk = 0.5 // No baseline - slight risk
    }

    const businessContinuityRisk = roundToOneDecimal(
      revenueStabilityRisk + clientConcentrationTrendRisk + consistencyTrendRisk
    )

    // Daily Consistency risk - 8 pts max (32% of 25)
    // Use rolling 30-day data for consistency with other metrics
    const actualDailyHours = timeStats.rolling30Days?.current?.dailyHours || 0
    const distinctWorkingDays = timeStats.rolling30Days?.current?.distinctWorkingDays || 0

    // Calculate days per week from rolling 30-day window
    // 30 days ≈ 4.29 weeks (30/7)
    const estimatedDaysPerWeek = distinctWorkingDays > 0
      ? distinctWorkingDays / 4.29 // 30 days = 4.29 weeks
      : targetDaysPerWeek // Fall back to target if no data

    // Days/Week risk - 4 pts max (penalize deviation from target)
    const daysDeviation = Math.abs(estimatedDaysPerWeek - targetDaysPerWeek) / targetDaysPerWeek
    const daysRisk = roundToOneDecimal(Math.min(daysDeviation * 4, 4))

    // Hours/Day risk - 4 pts max (penalize deviation from target)
    const hoursDeviation = targetDailyHours > 0 ? Math.abs(actualDailyHours - targetDailyHours) / targetDailyHours : 0
    const hoursRisk = roundToOneDecimal(Math.min(hoursDeviation * 4, 4))

    const dailyConsistencyRisk = roundToOneDecimal(daysRisk + hoursRisk)

    const totalRiskPenalty = roundToOneDecimal(clientRisk + businessContinuityRisk + dailyConsistencyRisk)
    const finalScore = roundToOneDecimal(Math.max(0, 25 - totalRiskPenalty))

    return {
      score: finalScore,
      breakdown: {
        penalties: {
          clientRisk,
          businessContinuityRisk,
          dailyConsistencyRisk,
          daysRisk,
          hoursRisk
        },
        totalPenalty: totalRiskPenalty,
        // Business Continuity Risk sub-metrics breakdown
        businessContinuityBreakdown: {
          revenueStabilityRisk,
          clientConcentrationTrendRisk,
          consistencyTrendRisk,
          current30DaysBillableRevenue,
          previous30DaysBillableRevenue,
          current30DaysClientShare,
          previous30DaysClientShare,
          current30DaysDailyHours,
          previous30DaysDailyHours
        },
        // Client concentration data
        topClient: clientRevenue?.topClient,
        topClientShare,
        // Daily Consistency data
        targetDaysPerWeek,
        estimatedDaysPerWeek,
        targetDailyHours,
        actualDailyHours,
        distinctWorkingDays, // Add distinct working days to breakdown
        daysDeviation,
        hoursDeviation
      }
    }
  }

  generateExplanation(inputs: HealthScoreInputs, result: { score: number; breakdown: any }): HealthExplanation {
    const { timeStats, profitTargets, clientRevenue } = inputs
    const { penalties, hasSubscription, activeUsers, topClient, topClientShare } = result.breakdown

    // Detect business model
    const businessModel = hasSubscription ? 'hybrid' : 'time-only'

    // Build details array conditionally
    const details: any[] = []

    // Business Continuity Data - core metrics
    const coreMetrics = [
      {
        type: 'metric',
        label: 'Client Dependency',
        value: 'High Risk',
        description: 'Business relies on few key clients',
        emphasis: 'secondary'
      }
    ]

    // Conditionally add subscription metrics
    if (businessModel !== 'time-only') {
      coreMetrics.push({
        type: 'metric',
        label: 'Subscription Health',
        value: timeStats.subscription ?
          `${timeStats.subscription.monthlyActiveUsers?.current || 0} users` :
          'Not applicable',
        description: 'Business model diversification'
      })
    }

    coreMetrics.push({
      type: 'text',
      description: 'Note: This metric focuses purely on business continuity factors, independent of time tracking or efficiency.'
    })

    details.push({
      type: 'metrics',
      title: 'Business Continuity Data',
      items: coreMetrics
    })

    // Build calculations array
    const clientRiskValue = topClient
      ? `${topClient.name}: ${topClientShare.toFixed(1)}%`
      : 'No client data available'

    const calculationItems = [
      {
        type: 'calculation',
        label: '1. Client Concentration Risk',
        value: clientRiskValue,
        description: `→ -${penalties?.clientRisk || 0}/9 pts`,
        emphasis: 'primary'
      },
      {
        type: 'standard',
        value: topClientShare >= 30
          ? `Risk: High dependency on ${topClient?.name || 'key client'}`
          : topClientShare >= 20
            ? `Risk: Moderate concentration on ${topClient?.name || 'key client'}`
            : 'Risk: Diversified client base'
      },
      {
        type: 'calculation',
        label: '2. Business Continuity Risk',
        value: businessModel === 'time-only'
          ? 'Time-based business model'
          : `${activeUsers} active subscribers`,
        description: `→ -${penalties?.subscriptionRisk || 0}/8 pts`,
        emphasis: 'primary'
      },
      {
        type: 'standard',
        value: businessModel === 'time-only'
          ? 'Risk: Single revenue stream (time-based only)'
          : activeUsers < 5
            ? 'Risk: Low subscriber base (<5 users)'
            : 'Low risk: Healthy subscriber base'
      }
    ]

    calculationItems.push({
      type: 'formula',
      formula: `Total Score: 25 - ${penalties?.clientRisk || 0} - ${penalties?.subscriptionRisk || 0} = ${result.score}/25`
    })

    details.push({
      type: 'calculations',
      title: 'Independent Risk Assessment',
      items: calculationItems
    })

    return {
      title: 'Risk Management - Business Continuity (25 points)',
      score: result.score,
      maxScore: 25,
      details
    }
  }

  generateRecommendations(inputs: HealthScoreInputs, breakdown: any): HealthRecommendation[] {
    const recommendations: HealthRecommendation[] = []
    const { penalties, hasSubscription, activeUsers } = breakdown
    const { timeStats } = inputs

    // 1. CLIENT DIVERSIFICATION (up to 12.5 points)
    const clientRiskPoints = penalties.clientRisk || 0

    recommendations.push({
      id: 'reduce-client-concentration-risk',
      priority: 'high',
      impact: Math.round(clientRiskPoints * 10) / 10,
      effort: 'high',
      timeframe: 'quarterly',
      title: 'Diversify Client Portfolio',
      description: 'Reduce dependency on key clients by expanding client base',
      actionItems: [
        'Acquire new clients across different industries',
        'Avoid over-reliance on single clients (target <20% revenue per client)',
        'Develop multiple revenue streams and partnerships',
        'Build strategic relationships with diverse client types'
      ],
      metrics: {
        current: 'High client concentration',
        target: 'Diversified client base',
        pointsToGain: Math.round(clientRiskPoints * 10) / 10
      }
    })

    // 2. BUSINESS MODEL DIVERSIFICATION (up to 12.5 points)
    const subscriptionPointsToGain = penalties.subscriptionRisk || 0

    if (timeStats.subscription) {
      const currentUsers = timeStats.subscription.monthlyActiveUsers?.current || 0
      const userGap = Math.max(0, 5 - currentUsers)

      recommendations.push({
        id: 'improve-subscription-business',
        priority: subscriptionPointsToGain >= 2 ? 'medium' : 'low',
        impact: Math.round(subscriptionPointsToGain * 10) / 10,
        effort: 'high',
        timeframe: 'monthly',
        title: 'Strengthen Subscription Business',
        description: userGap > 0
          ? `Grow subscriber base from ${currentUsers} to 5+ users for model stability`
          : `Expand subscription business beyond ${currentUsers} users for growth`,
        actionItems: userGap > 0 ? [
          'Focus on user acquisition and retention',
          'Improve product value proposition',
          'Implement user onboarding improvements'
        ] : [
          'Scale subscriber acquisition strategies',
          'Optimize user retention and engagement',
          'Develop premium subscription tiers'
        ],
        metrics: {
          current: `${currentUsers} subscribers`,
          target: '5+ active subscribers',
          pointsToGain: Math.round(subscriptionPointsToGain * 10) / 10
        }
      })
    } else {
      recommendations.push({
        id: 'diversify-business-model',
        priority: subscriptionPointsToGain >= 2 ? 'medium' : 'low',
        impact: Math.round(subscriptionPointsToGain * 10) / 10,
        effort: 'high',
        timeframe: 'monthly',
        title: 'Diversify Business Model',
        description: subscriptionPointsToGain > 1
          ? 'Reduce dependency on time-based revenue only'
          : 'Explore additional revenue streams for stability',
        actionItems: [
          'Explore subscription or product-based revenue streams',
          'Develop recurring revenue opportunities',
          'Create passive income sources'
        ],
        metrics: {
          current: 'Time-based revenue only',
          target: 'Diversified revenue streams',
          pointsToGain: Math.round(subscriptionPointsToGain * 10) / 10
        }
      })
    }

    // Sort by priority and impact, return top 5
    return recommendations
      .sort((a, b) => {
        const priorityWeight = { high: 3, medium: 2, low: 1 }
        const scoreA = priorityWeight[a.priority] * 10 + a.impact
        const scoreB = priorityWeight[b.priority] * 10 + b.impact
        return scoreB - scoreA
      })
      .slice(0, 5)
  }
}

class ProfitScoreCalculator {
  calculate(inputs: HealthScoreInputs): { score: number; breakdown: any } {
    const { dashboardMetrics, timeStats, mtdCalculations, profitTargets } = inputs

    // Only calculate if minimum time-based profit targets are set up
    if (!profitTargets?.setup_completed ||
        !profitTargets?.monthly_hours_target ||
        profitTargets.monthly_hours_target <= 0 ||
        !profitTargets?.target_hourly_rate ||
        profitTargets.target_hourly_rate <= 0) {
      return {
        score: 0,
        breakdown: {
          available: false,
          reason: 'Time-based profit targets (hours and hourly rate) must be configured'
        }
      }
    }

    // === ENHANCED: Granular driver analysis - PROFIT HEALTH EXCLUSIVE METRICS ===

    // === 1. SUBSCRIPTION METRICS (12 points - UNIQUE to Profit Health) ===
    // Handle optional subscription stream - only calculate if enabled (target > 0)

    const targetUsers = profitTargets.target_monthly_active_users // Use component target
    const targetSubFee = profitTargets.target_avg_subscription_fee // Use component target
    const subscriptionStreamEnabled = targetUsers > 0 && targetSubFee > 0

    let subscriberScore = 0
    let subscriptionPricingScore = 0
    let userGrowthPerformance = 0
    let pricingPerformance = 0
    let currentMRR = 0
    let targetMRR = 0

    if (subscriptionStreamEnabled) {
      // 1A. Number of Subscribers (6 points)
      const currentUsers = timeStats.subscription?.monthlyActiveUsers?.current || 0
      userGrowthPerformance = targetUsers > 0 ? Math.min(currentUsers / targetUsers, 1.2) : 0
      subscriberScore = Math.min(userGrowthPerformance * 6, 6) // 6 points max

      // 1B. Average Subscription Fee (6 points)
      const currentSubFee = timeStats.subscription?.averageSubscriptionFee?.current || 0
      pricingPerformance = targetSubFee > 0 ? Math.min(currentSubFee / targetSubFee, 1.5) : 0
      subscriptionPricingScore = Math.min(pricingPerformance * 6, 6) // 6 points max

      // 1C. Monthly Recurring Revenue (MRR) - Calculated for analysis
      currentMRR = currentUsers * currentSubFee
      targetMRR = targetUsers * targetSubFee
    } else {
      // ❌ FIXED: No more free points - redistribution will handle this
      subscriberScore = 0
      subscriptionPricingScore = 0
    }

    // === 2. REVENUE MIX & QUALITY (7 points - NO overlap) ===
    // Handle optional time-based stream

    const targetHours = profitTargets.monthly_hours_target
    const targetHourlyRate = profitTargets.target_hourly_rate // Use component target
    const timeBasedStreamEnabled = targetHours > 0 && targetHourlyRate > 0

    // 2A. Revenue Diversification (3 points) - only relevant if both streams exist
    let revenueMixScore = 0 // ❌ FIXED: No default points - calculate or redistribute
    if (subscriptionStreamEnabled && timeBasedStreamEnabled) {
      const timeRevenue = timeStats.rolling30Days?.current?.billableRevenue || 0
      const totalRevenue = timeRevenue + currentMRR
      const subscriptionWeight = totalRevenue > 0 ? currentMRR / totalRevenue : 0
      const optimalMix = 0.3 // Target 30% subscription revenue
      const mixOptimization = Math.max(0, 1 - Math.abs(subscriptionWeight - optimalMix))
      revenueMixScore = Math.min(mixOptimization * 3, 3) // 3 points max
    }

    // 2B. Pricing Efficiency (4 points) - Revenue per hour VALUE (not volume)
    let pricingEfficiencyScore = 0 // ❌ FIXED: No default points - calculate or redistribute
    let rateEfficiencyPerformance = 0
    if (timeBasedStreamEnabled) {
      // Use billable revenue from TIME ENTRIES, not from invoices
      const timeRevenue = timeStats.rolling30Days?.current?.billableRevenue || 0
      const currentHours = timeStats.rolling30Days?.current?.billableHours || 0
      const currentHourlyRate = currentHours > 0 ? timeRevenue / currentHours : 0
      rateEfficiencyPerformance = targetHourlyRate > 0 ? Math.min(currentHourlyRate / targetHourlyRate, 1.5) : 0
      pricingEfficiencyScore = Math.min(rateEfficiencyPerformance * 4, 4) // 4 points max
    }

    // === 3. VALUE CREATION (6 points - NO overlap) ===

    // 3A. Rate Optimization (3 points) - Whether rates meet profit targets
    let rateOptimizationScore = 0 // ❌ FIXED: No default points - calculate or redistribute
    let hourlyRateContribution = 0
    if (timeBasedStreamEnabled) {
      // Use billable revenue from TIME ENTRIES for rate optimization
      const timeRevenue = timeStats.rolling30Days?.current?.billableRevenue || 0
      hourlyRateContribution = profitTargets?.monthly_revenue_target ?
        (timeRevenue / profitTargets.monthly_revenue_target) : 0
      rateOptimizationScore = Math.min(hourlyRateContribution * 3, 3) // 3 points max
    }

    // 3B. Subscription Pricing Effectiveness (3 points) - Fees supporting profit goals
    let subscriptionEffectivenessScore = 0 // ❌ FIXED: No default points - calculate or redistribute
    let subscriptionContribution = 0
    if (subscriptionStreamEnabled) {
      subscriptionContribution = profitTargets?.monthly_revenue_target ?
        (currentMRR / profitTargets.monthly_revenue_target) : 0
      subscriptionEffectivenessScore = Math.min(subscriptionContribution * 3, 3) // 3 points max
    }

    // === TIME UTILIZATION CALCULATION ===
    // Calculate time utilization (15 points) - KEEP IN PROFIT
    const timeUtilizationScore = this.calculateTimeUtilization(timeStats, profitTargets)

    // === REDISTRIBUTION LOGIC ===
    // Apply point redistribution based on business model
    const baseScores = {
      subscriberScore,
      subscriptionPricingScore,
      revenueMixScore,
      pricingEfficiencyScore,
      rateOptimizationScore,
      subscriptionEffectivenessScore
    }

    const redistributedScores = this.redistributePoints(
      subscriptionStreamEnabled,
      timeBasedStreamEnabled,
      baseScores,
      timeUtilizationScore
    )

    // === TOTAL CALCULATION ===
    // Use redistributed scores for fair 25-point scaling (max 25 points)
    const driverScore = redistributedScores.subscriberScore +
                       redistributedScores.subscriptionPricingScore +
                       redistributedScores.revenueMixScore +
                       redistributedScores.pricingEfficiencyScore +
                       redistributedScores.rateOptimizationScore +
                       redistributedScores.subscriptionEffectivenessScore +
                       redistributedScores.timeUtilizationScore

    // Apply penalties for critically weak drivers (only for enabled streams)
    let penalties = 0
    const weakDrivers = []

    // Only apply subscription penalties if subscription stream is enabled
    if (subscriptionStreamEnabled) {
      const currentUsers = timeStats.subscription?.monthlyActiveUsers?.current || 0
      const currentSubFee = timeStats.subscription?.averageSubscriptionFee?.current || 0
      if (userGrowthPerformance < 0.5 && currentUsers < 5) { penalties += 2; weakDrivers.push('subscriber-growth') }
      if (pricingPerformance < 0.7 && currentSubFee < 20) { penalties += 2; weakDrivers.push('subscription-pricing') }
    }

    // Only apply time-based penalties if time-based stream is enabled
    if (timeBasedStreamEnabled) {
      const timeRevenue = timeStats.rolling30Days?.current?.billableRevenue || 0
      const currentHours = timeStats.rolling30Days?.current?.billableHours || 0
      const currentHourlyRate = currentHours > 0 ? timeRevenue / currentHours : 0
      if (rateEfficiencyPerformance < 0.7 && currentHourlyRate < 50) { penalties += 2; weakDrivers.push('hourly-rate-value') }
    }

    // Only apply mix penalty if both streams are enabled
    if (subscriptionStreamEnabled && timeBasedStreamEnabled) {
      const timeRevenue = timeStats.rolling30Days?.current?.billableRevenue || 0
      const totalRevenue = timeRevenue + currentMRR
      const subscriptionWeight = totalRevenue > 0 ? currentMRR / totalRevenue : 0
      const mixOptimization = Math.max(0, 1 - Math.abs(subscriptionWeight - 0.3))
      if (mixOptimization < 0.5 && totalRevenue > 0) { penalties += 1; weakDrivers.push('revenue-diversification') }
    }

    // 🔍 DEBUG: Log redistribution and penalty calculations
    console.log('🔍 DEBUG: Profit Score Redistribution:', {
      businessModel: redistributedScores.businessModel,
      subscriptionStreamEnabled,
      timeBasedStreamEnabled,
      originalScores: baseScores,
      redistributedScores: {
        subscriber: redistributedScores.subscriberScore,
        subscriptionPricing: redistributedScores.subscriptionPricingScore,
        revenueMix: redistributedScores.revenueMixScore,
        pricingEfficiency: redistributedScores.pricingEfficiencyScore,
        rateOptimization: redistributedScores.rateOptimizationScore,
        subscriptionEffectiveness: redistributedScores.subscriptionEffectivenessScore,
        timeUtilization: redistributedScores.timeUtilizationScore,
        revenueQuality: redistributedScores.revenueQualityScore
      },
      originalTotal: baseScores.subscriberScore + baseScores.subscriptionPricingScore + baseScores.revenueMixScore + baseScores.pricingEfficiencyScore + baseScores.rateOptimizationScore + baseScores.subscriptionEffectivenessScore,
      redistributedTotal: driverScore,
      finalScore: Math.max(0, Math.round(driverScore) - penalties),
      totalPenalties: penalties,
      weakDrivers
    })

    // Calculate legacy metrics for backward compatibility (using rolling 30-day data)
    const estimatedMonthlyCosts = profitTargets.monthly_cost_target
    const timeRevenue = timeStats.rolling30Days?.current?.billableRevenue || 0
    const totalRevenue = timeRevenue + currentMRR
    const currentProfit = totalRevenue - estimatedMonthlyCosts
    // For rolling 30 days, we compare against full monthly targets (30 days ≈ 1 month)
    const dayProgress = 1.0 // Rolling 30 days represents a full month's worth of data
    const mtdProfitTarget = profitTargets.monthly_profit_target * dayProgress
    const progressRatio = mtdProfitTarget > 0 ? currentProfit / mtdProfitTarget : 0

    return {
      score: roundToOneDecimal(Math.max(0, driverScore - penalties)),
      breakdown: {
        available: true,
        // Stream configuration status
        streamConfiguration: {
          subscriptionStreamEnabled,
          timeBasedStreamEnabled,
          bothStreamsEnabled: subscriptionStreamEnabled && timeBasedStreamEnabled
        },
        // ✅ REDISTRIBUTION INFORMATION
        redistribution: {
          businessModel: redistributedScores.businessModel,
          originalTotal: baseScores.subscriberScore + baseScores.subscriptionPricingScore + baseScores.revenueMixScore + baseScores.pricingEfficiencyScore + baseScores.rateOptimizationScore + baseScores.subscriptionEffectivenessScore,
          redistributedTotal: driverScore,
          pointsRedistributed: redistributedScores.businessModel !== 'hybrid'
        },
        // 🎯 CLEARLY DENOTED PROFIT-EXCLUSIVE METRICS
        subscriptionMetrics: {
          enabled: subscriptionStreamEnabled,
          subscriberGrowth: {
            performance: userGrowthPerformance,
            score: redistributedScores.subscriberScore,
            originalScore: subscriberScore,
            target: targetUsers,
            current: subscriptionStreamEnabled ? (timeStats.subscription?.monthlyActiveUsers?.current || 0) : 0
          },
          subscriptionPricing: {
            performance: pricingPerformance,
            score: redistributedScores.subscriptionPricingScore,
            originalScore: subscriptionPricingScore,
            target: targetSubFee,
            current: subscriptionStreamEnabled ? (timeStats.subscription?.averageSubscriptionFee?.current || 0) : 0
          },
          monthlyRecurringRevenue: { current: currentMRR, target: targetMRR }
        },
        revenueMixQuality: {
          revenueDiversification: {
            enabled: subscriptionStreamEnabled && timeBasedStreamEnabled,
            performance: subscriptionStreamEnabled && timeBasedStreamEnabled ?
              Math.max(0, 1 - Math.abs((totalRevenue > 0 ? currentMRR / totalRevenue : 0) - 0.3)) : 1,
            score: redistributedScores.revenueMixScore,
            originalScore: revenueMixScore,
            target: 0.3,
            current: subscriptionStreamEnabled && timeBasedStreamEnabled ?
              (totalRevenue > 0 ? currentMRR / totalRevenue : 0) : 0
          },
          pricingEfficiency: {
            enabled: timeBasedStreamEnabled,
            performance: rateEfficiencyPerformance,
            score: redistributedScores.pricingEfficiencyScore,
            originalScore: pricingEfficiencyScore,
            target: targetHourlyRate,
            current: timeBasedStreamEnabled ?
              ((timeStats.rolling30Days?.current?.billableHours || 0) > 0 ? (timeStats.rolling30Days?.current?.billableRevenue || 0) / (timeStats.rolling30Days?.current?.billableHours || 1) : 0) : 0
          }
        },
        valueCreation: {
          rateOptimization: {
            enabled: timeBasedStreamEnabled,
            score: redistributedScores.rateOptimizationScore,
            originalScore: rateOptimizationScore,
            contribution: hourlyRateContribution
          },
          subscriptionEffectiveness: {
            enabled: subscriptionStreamEnabled,
            score: redistributedScores.subscriptionEffectivenessScore,
            originalScore: subscriptionEffectivenessScore,
            contribution: subscriptionContribution
          }
        },
        // ✅ NEW TIME-BASED METRICS (for redistribution)
        newTimeBasedMetrics: {
          timeUtilization: {
            enabled: redistributedScores.businessModel === 'time-only' || redistributedScores.businessModel === 'hybrid',
            score: redistributedScores.timeUtilizationScore,
            components: {
              hoursTarget: profitTargets?.monthly_hours_target || 0,
              currentHours: timeStats.rolling30Days?.current?.totalHours || 0,
              unbilledHours: timeStats.rolling30Days?.current?.unbilledHours || 0
            }
          },
          revenueQuality: {
            enabled: redistributedScores.businessModel === 'time-only' || redistributedScores.businessModel === 'hybrid',
            score: redistributedScores.revenueQualityScore,
            components: {
              totalRevenue: dashboardMetrics.rolling30DaysRevenue?.current || 0,
              unbilledValue: timeStats.rolling30Days?.current?.unbilledValue || 0,
              overdueAmount: dashboardMetrics.achterstallig || 0
            }
          }
        },
        penalties,
        weakDrivers,
        totalRevenue,
        timeRevenue,
        subscriptionRevenue: currentMRR,
        // Redistributed scores for explanation generation
        redistributedScores,
        // Legacy metrics for backward compatibility
        estimatedCosts: estimatedMonthlyCosts,
        currentProfit,
        mtdProfitTarget,
        monthlyProfitTarget: profitTargets.monthly_profit_target,
        progressRatio,
        progressPercentage: progressRatio * 100,
        dayProgress: dayProgress * 100,

        // Individual scores for organogram compatibility
        scores: {
          hourlyRateScore: roundToOneDecimal(redistributedScores.pricingEfficiencyScore || 0),
          timeUtilizationScore: roundToOneDecimal(redistributedScores.timeUtilizationScore || 0),
          revenueQualityScore: roundToOneDecimal(redistributedScores.revenueQualityScore || 0)
        },

        // Real-time metrics for organogram display (using rolling 30-day data)
        currentRate: (timeStats.rolling30Days?.current?.billableHours || 0) > 0 ? (timeStats.rolling30Days?.current?.billableRevenue || 0) / (timeStats.rolling30Days?.current?.billableHours || 1) : 0,
        targetRate: profitTargets?.target_hourly_rate || 0,
        currentHours: timeStats.rolling30Days?.current?.totalHours || 0,
        billableHours: timeStats.rolling30Days?.current?.billableHours || 0,
        nonBillableHours: timeStats.rolling30Days?.current?.nonBillableHours || 0,
        targetHours: profitTargets?.monthly_hours_target || 0,
        mtdTargetHours: profitTargets?.monthly_hours_target || 0, // For rolling 30 days, compare against full monthly target
        currentDay: 30, // Rolling 30-day window

        // Time Utilization component scores for organogram
        timeUtilizationComponents: this.timeUtilizationComponents,
        targetBillableRatio: profitTargets?.target_billable_ratio || 90,
        actualBillableRatio: this.actualBillableRatioValue,

        // Detailed breakdown for modal display
        timeUtilizationBreakdown: this.generateTimeUtilizationBreakdown(timeStats, inputs, redistributedScores)
      }
    }
  }

  generateExplanation(inputs: HealthScoreInputs, result: { score: number; breakdown: any }): HealthExplanation {
    if (!result.breakdown.available) {
      return {
        title: 'Profit Health - Not Available',
        score: 0,
        maxScore: 25,
        details: [
          {
            type: 'summary',
            items: [
              {
                type: 'text',
                description: 'Configure profit targets in settings to track profit health'
              }
            ]
          }
        ]
      }
    }

    const { breakdown } = result
    const { subscriptionMetrics, revenueMixQuality, valueCreation, weakDrivers, penalties, redistributedScores } = breakdown
    const { timeStats, profitTargets, dashboardMetrics } = inputs

    // Build details array conditionally based on business model
    const details: any[] = []

    // Only show subscription metrics if SaaS is enabled
    if (redistributedScores.businessModel !== 'time-only') {
      details.push({
        type: 'metrics',
        title: 'Subscription Business Metrics (12 points)',
        items: [
          {
            type: 'metric',
            label: 'Active Subscribers',
            value: `${subscriptionMetrics.subscriberGrowth.current} / ${subscriptionMetrics.subscriberGrowth.target}`,
            description: `→ ${subscriptionMetrics.subscriberGrowth.score.toFixed(1)}/6 pts`,
            emphasis: subscriptionMetrics.subscriberGrowth.performance >= 1 ? 'primary' : 'secondary'
          },
          {
            type: 'metric',
            label: 'Average Subscription Fee',
            value: `€${subscriptionMetrics.subscriptionPricing.current} / €${subscriptionMetrics.subscriptionPricing.target}`,
            description: `→ ${subscriptionMetrics.subscriptionPricing.score.toFixed(1)}/6 pts`,
            emphasis: subscriptionMetrics.subscriptionPricing.performance >= 1 ? 'primary' : 'secondary'
          },
          {
            type: 'metric',
            label: 'Monthly Recurring Revenue',
            value: `€${subscriptionMetrics.monthlyRecurringRevenue.current.toLocaleString()} / €${subscriptionMetrics.monthlyRecurringRevenue.target.toLocaleString()}`,
            description: 'Calculated: Users × Fee',
            emphasis: 'muted'
          }
        ]
      })
    }

    // Add Revenue Quality & Mix section
    const revenueQualityItems: any[] = []

    // Only show Revenue Diversification for hybrid models
    if (redistributedScores.businessModel === 'hybrid') {
      revenueQualityItems.push({
        type: 'metric',
        label: 'Revenue Diversification',
        value: `${(revenueMixQuality.revenueDiversification.current * 100).toFixed(1)}% subscription`,
        description: `Target: ${(revenueMixQuality.revenueDiversification.target * 100).toFixed(1)}% → ${revenueMixQuality.revenueDiversification.score.toFixed(1)}/3 pts`,
        emphasis: revenueMixQuality.revenueDiversification.performance >= 0.8 ? 'primary' : 'secondary'
      })
    }

    // Always show Hourly Rate Value for time-based models
    if (redistributedScores.businessModel !== 'saas-only') {
      revenueQualityItems.push({
        type: 'metric',
        label: 'Hourly Rate Value',
        value: `€${revenueMixQuality.pricingEfficiency.current.toFixed(0)}/h`,
        description: `Target: €${revenueMixQuality.pricingEfficiency.target}/h → ${redistributedScores.pricingEfficiencyScore.toFixed(1)}/${redistributedScores.businessModel === 'time-only' ? '8' : '4'} pts`,
        emphasis: revenueMixQuality.pricingEfficiency.performance >= 1 ? 'primary' : 'secondary'
      })
    }

    if (revenueQualityItems.length > 0) {
      details.push({
        type: 'metrics',
        title: `Revenue Quality & Mix (${redistributedScores.businessModel === 'time-only' ? '8' : '7'} points${redistributedScores.businessModel !== 'hybrid' ? ' - Redistributed' : ''})`,
        items: revenueQualityItems
      })
    }

    // Add Value Creation section
    const valueCreationItems: any[] = []

    // Only show Rate Target Contribution for hybrid models (not time-only)
    if (redistributedScores.businessModel === 'hybrid') {
      valueCreationItems.push({
        type: 'metric',
        label: 'Rate Target Contribution',
        value: `${(valueCreation.rateOptimization.contribution * 100).toFixed(1)}%`,
        description: `→ ${redistributedScores.rateOptimizationScore.toFixed(1)}/3 pts`,
        emphasis: valueCreation.rateOptimization.contribution >= 0.8 ? 'primary' : 'secondary'
      })
    }

    // Only show Subscription Target Contribution for SaaS models
    if (redistributedScores.businessModel !== 'time-only') {
      valueCreationItems.push({
        type: 'metric',
        label: 'Subscription Target Contribution',
        value: `${(valueCreation.subscriptionEffectiveness.contribution * 100).toFixed(1)}%`,
        description: `→ ${redistributedScores.subscriptionEffectivenessScore.toFixed(1)}/${redistributedScores.businessModel === 'saas-only' ? '4' : '3'} pts`,
        emphasis: valueCreation.subscriptionEffectiveness.contribution >= 0.3 ? 'primary' : 'secondary'
      })
    }

    if (valueCreationItems.length > 0) {
      details.push({
        type: 'metrics',
        title: `Value Creation Performance (${redistributedScores.businessModel === 'time-only' ? '7' : '6'} points${redistributedScores.businessModel !== 'hybrid' ? ' - Redistributed' : ''})`,
        items: valueCreationItems
      })
    }

    // Add Input Data section
    details.push({
      type: 'metrics',
      title: 'Input Data Sources',
      items: [
        {
          type: 'metric',
          label: 'Monthly Hours Target',
          value: `${profitTargets?.monthly_hours_target || 0}h`,
          description: 'Target monthly working hours from profit targets configuration',
          emphasis: 'muted'
        },
        {
          type: 'metric',
          label: 'Target Hourly Rate',
          value: `€${profitTargets?.target_hourly_rate || 0}/h`,
          description: 'Target rate per hour from profit targets configuration',
          emphasis: 'muted'
        },
        {
          type: 'metric',
          label: 'Rolling 30-Day Hours',
          value: `${timeStats.rolling30Days?.current?.totalHours || 0}h`,
          description: 'Actual tracked hours in the last 30 days from time tracking data',
          emphasis: 'muted'
        },
        {
          type: 'metric',
          label: 'Rolling 30-Day Billable Revenue',
          value: `€${(timeStats.rolling30Days?.current?.billableRevenue || 0).toLocaleString()}`,
          description: 'Billable revenue from time entries in the last 30 days (hours × rates)',
          emphasis: 'muted'
        },
        ...(redistributedScores.businessModel === 'time-only' ? [{
          type: 'text' as const,
          description: 'Note: SaaS/subscription metrics are not applicable for time-only business model. Points are redistributed to time-based performance metrics.'
        }] : [])
      ]
    })

    // Add calculation sections for time-only business model
    if (redistributedScores.businessModel === 'time-only') {
      details.push({
        type: 'calculations',
        title: 'Time-Based Business Calculation (25 points)',
        items: [
          {
            type: 'calculation',
            label: '1. Hourly Rate Value',
            value: `€${revenueMixQuality.pricingEfficiency.current.toFixed(0)}/hour`,
            description: `→ ${redistributedScores.pricingEfficiencyScore.toFixed(1)}/8 pts`,
            emphasis: 'primary'
          },
          {
            type: 'standard',
            value: `Target: €${revenueMixQuality.pricingEfficiency.target}/h | Achievement: ${(revenueMixQuality.pricingEfficiency.performance * 100).toFixed(1)}% | Score: ${Math.min(revenueMixQuality.pricingEfficiency.performance, 2) * 4}/8 pts (capped at 200%)`
          },
        ]
      })

      // Add enhanced metrics for time-only businesses
      details.push({
        type: 'calculations',
        title: 'Enhanced Time-Based Performance',
        items: [
          {
            type: 'calculation',
            label: '2. Time Utilization Efficiency',
            value: `${timeStats.rolling30Days?.current?.totalHours || 0}h of ${profitTargets?.monthly_hours_target || 0}h rolling 30-day target`,
            description: `→ ${redistributedScores.timeUtilizationScore?.toFixed(1) || 0}/6 pts (redistributed)`,
            emphasis: 'primary',
            // detailedCalculation: this.generateTimeUtilizationBreakdown(timeStats, inputs, redistributedScores)
          },
          {
            type: 'text',
            description: 'Component Breakdown:'
          },
          {
            type: 'calculation',
            label: 'Hours Progress',
            value: `${((timeStats.rolling30Days?.current?.totalHours || 0) / (profitTargets?.monthly_hours_target || 1) * 100).toFixed(1)}%`,
            description: `→ ${(((timeStats.rolling30Days?.current?.totalHours || 0) / (profitTargets?.monthly_hours_target || 1)) * 2.4).toFixed(1)}/2.4 pts`
          },
          {
            type: 'calculation',
            label: 'Billing Efficiency',
            value: `${(((timeStats.rolling30Days?.current?.totalHours || 0) / ((timeStats.rolling30Days?.current?.totalHours || 0) + (timeStats.rolling30Days?.current?.unbilledHours || 0))) * 100).toFixed(1)}%`,
            description: `→ ${(((timeStats.rolling30Days?.current?.totalHours || 0) / ((timeStats.rolling30Days?.current?.totalHours || 0) + (timeStats.rolling30Days?.current?.unbilledHours || 0))) * 2.1).toFixed(1)}/2.1 pts`
          },
          {
            type: 'calculation',
            label: 'Daily Consistency',
            value: `${(timeStats.rolling30Days?.current?.dailyHours || 0).toFixed(1)}h/day`,
            description: `→ ${(timeStats.rolling30Days?.current?.dailyHours || 0) >= 5 ? '1.5' : (timeStats.rolling30Days?.current?.dailyHours || 0) >= 3 ? '1.2' : (timeStats.rolling30Days?.current?.dailyHours || 0) >= 2 ? '0.8' : '0.3'}/1.5 pts`
          },
          {
            type: 'calculation',
            label: '3. Revenue Quality & Collection',
            value: `Collection & invoicing efficiency`,
            description: `→ ${redistributedScores.revenueQualityScore?.toFixed(1) || 0}/4 pts (redistributed)`,
            emphasis: 'primary',
            // detailedCalculation: this.generateRevenueQualityBreakdown(dashboardMetrics, timeStats, inputs, redistributedScores)
          },
          {
            type: 'text',
            description: 'Component Breakdown:'
          },
          {
            type: 'calculation',
            label: 'Collection Rate',
            value: `${(((inputs.dashboardMetrics?.rolling30DaysRevenue?.current || 0) / ((inputs.dashboardMetrics?.rolling30DaysRevenue?.current || 0) + (timeStats.rolling30Days?.current?.unbilledValue || 0))) * 100).toFixed(1)}%`,
            description: `→ ${(((inputs.dashboardMetrics?.rolling30DaysRevenue?.current || 0) / ((inputs.dashboardMetrics?.rolling30DaysRevenue?.current || 0) + (timeStats.rolling30Days?.current?.unbilledValue || 0))) * 1.6).toFixed(1)}/1.6 pts`
          },
          {
            type: 'calculation',
            label: 'Invoicing Speed',
            value: `${(100 - ((timeStats.rolling30Days?.current?.unbilledValue || 0) / ((inputs.dashboardMetrics?.rolling30DaysRevenue?.current || 0) + (timeStats.rolling30Days?.current?.unbilledValue || 0)) * 100)).toFixed(1)}%`,
            description: `→ ${((1 - Math.min((timeStats.rolling30Days?.current?.unbilledValue || 0) / ((inputs.dashboardMetrics?.rolling30DaysRevenue?.current || 0) + (timeStats.rolling30Days?.current?.unbilledValue || 0)), 1)) * 1.4).toFixed(1)}/1.4 pts`
          },
          {
            type: 'calculation',
            label: 'Payment Quality',
            value: `${(100 - Math.min(((inputs.dashboardMetrics?.achterstallig || 0) / (inputs.dashboardMetrics?.rolling30DaysRevenue?.current || 1)) * 100, 100)).toFixed(1)}%`,
            description: `→ ${((1 - Math.min((inputs.dashboardMetrics?.achterstallig || 0) / (inputs.dashboardMetrics?.rolling30DaysRevenue?.current || 1), 1)) * 1.0).toFixed(1)}/1.0 pts`
          }
        ]
      })
    } else {
      // Add calculation sections for hybrid/SaaS models
      const hybridCalculationItems = []

      if (redistributedScores.businessModel === 'hybrid') {
        hybridCalculationItems.push(
          {
            type: 'calculation',
            label: '1. Subscription Growth',
            value: `${subscriptionMetrics.subscriberGrowth.current} / ${subscriptionMetrics.subscriberGrowth.target} users`,
            description: `→ ${subscriptionMetrics.subscriberGrowth.score.toFixed(1)}/6 pts`,
            emphasis: 'primary'
          },
          {
            type: 'standard',
            value: 'Target: Monthly active user growth for sustainable subscription revenue'
          },
          {
            type: 'calculation',
            label: '2. Subscription Pricing',
            value: `€${subscriptionMetrics.subscriptionPricing.current} / €${subscriptionMetrics.subscriptionPricing.target} avg fee`,
            description: `→ ${subscriptionMetrics.subscriptionPricing.score.toFixed(1)}/6 pts`,
            emphasis: 'primary'
          },
          {
            type: 'standard',
            value: 'Target: Average subscription fee per user for optimal pricing'
          },
          {
            type: 'calculation',
            label: '3. Revenue Diversification',
            value: `${(revenueMixQuality.revenueDiversification.current * 100).toFixed(1)}% subscription mix`,
            description: `→ ${revenueMixQuality.revenueDiversification.score.toFixed(1)}/3 pts`,
            emphasis: 'primary'
          },
          {
            type: 'standard',
            value: 'Target: 40%+ subscription revenue for balanced business model'
          },
          {
            type: 'calculation',
            label: '4. Hourly Rate Value',
            value: `€${revenueMixQuality.pricingEfficiency.current.toFixed(0)}/hour`,
            description: `→ ${redistributedScores.pricingEfficiencyScore.toFixed(1)}/4 pts`,
            emphasis: 'primary'
          },
          {
            type: 'standard',
            value: 'Scoring: 0-4 points based on time-based hourly rate achievement'
          },
          {
            type: 'calculation',
            label: '5. Rate Target Contribution',
            value: `${(valueCreation.rateOptimization.contribution * 100).toFixed(1)}% of revenue target`,
            description: `→ ${redistributedScores.rateOptimizationScore.toFixed(1)}/3 pts`,
            emphasis: 'primary'
          },
          {
            type: 'standard',
            value: 'Scoring: 0-3 points based on time-based revenue achievement'
          },
          {
            type: 'calculation',
            label: '6. Subscription Effectiveness',
            value: `${(valueCreation.subscriptionEffectiveness.contribution * 100).toFixed(1)}% of subscription target`,
            description: `→ ${redistributedScores.subscriptionEffectivenessScore.toFixed(1)}/3 pts`,
            emphasis: 'primary'
          },
          {
            type: 'standard',
            value: 'Scoring: 0-3 points based on subscription revenue performance'
          }
        )
      } else {
        // SaaS-only model
        hybridCalculationItems.push(
          {
            type: 'calculation',
            label: '1. Subscription Growth',
            value: `${subscriptionMetrics.subscriberGrowth.current} / ${subscriptionMetrics.subscriberGrowth.target} users`,
            description: `→ ${subscriptionMetrics.subscriberGrowth.score.toFixed(1)}/6 pts`,
            emphasis: 'primary'
          },
          {
            type: 'standard',
            value: 'Target: Monthly active user growth for sustainable revenue'
          },
          {
            type: 'calculation',
            label: '2. Subscription Pricing',
            value: `€${subscriptionMetrics.subscriptionPricing.current} / €${subscriptionMetrics.subscriptionPricing.target} avg fee`,
            description: `→ ${subscriptionMetrics.subscriptionPricing.score.toFixed(1)}/6 pts`,
            emphasis: 'primary'
          },
          {
            type: 'standard',
            value: 'Target: Average subscription fee optimization'
          }
        )
      }

      details.push({
        type: 'calculations',
        title: redistributedScores.businessModel === 'hybrid' ? 'Hybrid Business Calculation (25 points)' : 'SaaS Business Calculation (25 points)',
        items: hybridCalculationItems
      })
    }

    // Add final summary section
    details.push({
      type: 'summary',
      items: [
        {
          type: 'standard',
          description: result.score >= 20
            ? 'Strong profit drivers - business fundamentals are performing well'
            : result.score >= 15
              ? 'Mixed profit drivers - some areas need improvement'
              : result.score >= 10
                ? 'Weak profit drivers - significant optimization needed'
                : 'Critical profit drivers - fundamental business model review required'
        }
      ]
    })

    return {
      title: 'Profit Health - Driver Performance (25 points)',
      score: result.score,
      maxScore: 25,
      details
    }
  }

  generateRecommendations(inputs: HealthScoreInputs, result: { score: number; breakdown: any }): HealthRecommendation[] {
    if (!result.breakdown.available) {
      return [{
        id: 'setup-profit-targets',
        priority: 'high',
        impact: 25,
        effort: 'low',
        timeframe: 'immediate',
        title: 'Set Up Profit Targets',
        description: 'Configure your monthly profit targets to track business performance',
        actionItems: [
          'Visit Settings > Business to set profit targets',
          'Define realistic revenue and cost goals',
          'Enable profit tracking dashboard'
        ],
        metrics: {
          current: 'Not configured',
          target: 'Targets set',
          pointsToGain: 25
        }
      }]
    }

    const recommendations: HealthRecommendation[] = []
    const { breakdown } = result
    const { subscriptionMetrics, revenueMixQuality, valueCreation, weakDrivers, redistribution } = breakdown

    // Detect business model for relevant recommendations
    const businessModel = redistribution?.businessModel || 'hybrid'
    const subscriptionEnabled = ['hybrid', 'saas-only'].includes(businessModel)
    const timeBasedEnabled = ['hybrid', 'time-only'].includes(businessModel)

    // === BUSINESS MODEL SPECIFIC RECOMMENDATIONS ===

    // 1. SUBSCRIPTION GROWTH OPTIMIZATION (highest impact: 6 points) - Only for SaaS models
    if (subscriptionEnabled) {
    const userGap = Math.max(0, subscriptionMetrics.subscriberGrowth.target - subscriptionMetrics.subscriberGrowth.current)
    const subscriberPointsToGain = Math.max(0.1, 6 - subscriptionMetrics.subscriberGrowth.score)

    recommendations.push({
      id: 'optimize-subscriber-growth',
      priority: subscriberPointsToGain >= 3 ? 'high' : subscriberPointsToGain >= 1 ? 'medium' : 'low',
      impact: Math.round(subscriberPointsToGain * 10) / 10, // Allow decimal impact
      effort: userGap <= 1 ? 'low' : userGap <= 3 ? 'medium' : 'high',
      timeframe: 'monthly',
      title: userGap > 0 ? 'Accelerate Subscriber Growth' : 'Optimize Subscriber Excellence',
      description: userGap > 0
        ? `Acquire ${Math.ceil(userGap)} more subscribers to reach target growth`
        : `Maintain and optimize ${subscriptionMetrics.subscriberGrowth.current} subscribers for sustained excellence`,
      actionItems: userGap > 0 ? [
        `Target acquiring ${Math.ceil(userGap)} new subscribers this month`,
        'Implement referral program for existing users',
        'Launch targeted marketing campaigns for ideal customer profile',
        'Optimize onboarding flow to reduce signup friction'
      ] : [
        'Implement advanced retention strategies to reduce churn',
        'Develop customer success programs for existing subscribers',
        'Expand value delivery to justify premium pricing',
        'Create loyalty programs to increase customer lifetime value'
      ],
      metrics: {
        current: `${subscriptionMetrics.subscriberGrowth.current} subscribers (${Math.round(subscriptionMetrics.subscriberGrowth.performance * 100)}%)`,
        target: `${subscriptionMetrics.subscriberGrowth.target}+ subscribers (100%+)`,
        pointsToGain: Math.round(subscriberPointsToGain * 10) / 10
      }
    })

    // 2. SUBSCRIPTION PRICING OPTIMIZATION (high impact: 6 points)
    const pricingGap = Math.max(0, subscriptionMetrics.subscriptionPricing.target - subscriptionMetrics.subscriptionPricing.current)
    const pricingPointsToGain = Math.max(0.1, 6 - subscriptionMetrics.subscriptionPricing.score)

    recommendations.push({
      id: 'optimize-subscription-pricing',
      priority: pricingPointsToGain >= 3 ? 'high' : pricingPointsToGain >= 1 ? 'medium' : 'low',
      impact: Math.round(pricingPointsToGain * 10) / 10,
      effort: pricingGap <= 5 ? 'low' : pricingGap <= 15 ? 'medium' : 'high',
      timeframe: 'weekly',
      title: pricingGap > 0 ? 'Optimize Subscription Pricing' : 'Perfect Pricing Strategy',
      description: pricingGap > 0
        ? `Increase average subscription fee by €${Math.ceil(pricingGap)} to reach target value`
        : `Maintain and optimize €${subscriptionMetrics.subscriptionPricing.current} pricing for market leadership`,
      actionItems: pricingGap > 0 ? [
        `Review and increase subscription pricing from €${subscriptionMetrics.subscriptionPricing.current} to €${subscriptionMetrics.subscriptionPricing.target}`,
        'Analyze competitor pricing and value propositions',
        'Implement value-based pricing tiers',
        'Test pricing changes with new subscribers first'
      ] : [
        'Conduct advanced pricing optimization analysis',
        'Implement dynamic pricing based on usage patterns',
        'Develop premium tier offerings for power users',
        'Test value-based pricing experiments for market expansion'
      ],
      metrics: {
        current: `€${subscriptionMetrics.subscriptionPricing.current}/month (${Math.round(subscriptionMetrics.subscriptionPricing.performance * 100)}%)`,
        target: `€${subscriptionMetrics.subscriptionPricing.target}/month (100%+)`,
        pointsToGain: Math.round(pricingPointsToGain * 10) / 10
      }
    })
    } // End SaaS recommendations

    // 3. HOURLY RATE VALUE OPTIMIZATION (medium-high impact: 4 points) - Only for time-based models
    if (timeBasedEnabled) {
    console.log('🔍 DEBUG: Pricing Efficiency Data:', {
      enabled: revenueMixQuality.pricingEfficiency?.enabled,
      target: revenueMixQuality.pricingEfficiency?.target,
      current: revenueMixQuality.pricingEfficiency?.current,
      score: revenueMixQuality.pricingEfficiency?.score,
      performance: revenueMixQuality.pricingEfficiency?.performance
    })

    const rateGap = Math.max(0, revenueMixQuality.pricingEfficiency.target - revenueMixQuality.pricingEfficiency.current)
    const ratePointsToGain = Math.max(0.1, 4 - revenueMixQuality.pricingEfficiency.score)

    recommendations.push({
      id: 'optimize-hourly-rate-value',
      priority: ratePointsToGain >= 2 ? 'high' : ratePointsToGain >= 0.5 ? 'medium' : 'low',
      impact: Math.round(ratePointsToGain * 10) / 10,
      effort: rateGap <= 5 ? 'low' : rateGap <= 15 ? 'medium' : 'high',
      timeframe: 'weekly',
      title: rateGap > 0 ? 'Increase Hourly Rate Value' : 'Optimize Rate Excellence',
      description: rateGap > 0
        ? `Optimize hourly value from €${Math.round(revenueMixQuality.pricingEfficiency.current)} to €${revenueMixQuality.pricingEfficiency.target}/hour`
        : `Maintain and optimize €${Math.round(revenueMixQuality.pricingEfficiency.current)}/hour rate for market leadership`,
      actionItems: rateGap > 0 ? [
        `Increase hourly rates by €${Math.ceil(rateGap)}/hour for new projects`,
        'Focus on high-value clients and premium service offerings',
        'Negotiate rate increases with existing long-term clients',
        'Eliminate low-value work and administrative tasks'
      ] : [
        'Implement value-based pricing for specialized expertise',
        'Develop premium consulting packages beyond hourly billing',
        'Create retainer agreements for predictable revenue',
        'Focus on outcome-based pricing for high-impact work'
      ],
      metrics: {
        current: `€${Math.round(revenueMixQuality.pricingEfficiency.current)}/hour (${Math.round(revenueMixQuality.pricingEfficiency.performance * 100)}%)`,
        target: `€${revenueMixQuality.pricingEfficiency.target}/hour (100%+)`,
        pointsToGain: Math.round(ratePointsToGain * 10) / 10
      }
    })
    } // End time-based recommendations

    // 4. REVENUE DIVERSIFICATION OPTIMIZATION (medium impact: 3 points) - Only for hybrid models
    if (businessModel === 'hybrid') {
    const currentMix = revenueMixQuality.revenueDiversification.current
    const targetMix = revenueMixQuality.revenueDiversification.target
    const mixPointsToGain = Math.max(0.1, 3 - revenueMixQuality.revenueDiversification.score)
    const mixDirection = currentMix < targetMix ? 'increase subscription' : 'balance time-based'
    const mixGap = Math.abs(targetMix - currentMix)

    recommendations.push({
      id: 'optimize-revenue-mix',
      priority: mixPointsToGain >= 1.5 ? 'medium' : 'low',
      impact: Math.round(mixPointsToGain * 10) / 10,
      effort: mixGap <= 0.1 ? 'low' : 'medium',
      timeframe: 'monthly',
      title: mixGap > 0.05 ? 'Balance Revenue Diversification' : 'Optimize Revenue Excellence',
      description: mixGap > 0.05
        ? `${mixDirection === 'increase subscription' ? 'Grow subscription revenue' : 'Balance revenue streams'} to reach optimal ${(targetMix * 100).toFixed(0)}% subscription mix`
        : `Maintain and optimize current ${(currentMix * 100).toFixed(1)}% subscription revenue mix for sustained performance`,
      actionItems: mixGap > 0.05 ? [
        mixDirection === 'increase subscription'
          ? 'Focus on subscription business growth over time-based work'
          : 'Balance subscription growth with time-based revenue optimization',
        'Develop recurring revenue opportunities from existing clients',
        'Create productized services that can scale beyond hourly work',
        'Review and adjust business model focus based on market opportunities'
      ] : [
        'Fine-tune revenue stream optimization for market leadership',
        'Explore premium subscription tiers for higher-value clients',
        'Develop strategic partnerships for revenue diversification',
        'Create scalable products that complement core services'
      ],
      metrics: {
        current: `${(currentMix * 100).toFixed(1)}% subscription (${Math.round(revenueMixQuality.revenueDiversification.performance * 100)}%)`,
        target: `${(targetMix * 100).toFixed(0)}% subscription (100%+)`,
        pointsToGain: Math.round(mixPointsToGain * 10) / 10
      }
    })
    } // End hybrid model recommendations

    // 5. SUBSCRIPTION EFFECTIVENESS ENHANCEMENT (high impact: up to 3 points)
    // Only create subscription effectiveness recommendation if subscription stream is enabled
    if (subscriptionEnabled) {
      const subscriptionEffectivenessPointsToGain = Math.max(0.1, 3 - valueCreation.subscriptionEffectiveness.score)
      const currentContribution = valueCreation.subscriptionEffectiveness.contribution
      const targetContribution = 0.3 // 30% of revenue target
      const contributionGap = Math.max(0, targetContribution - currentContribution)

      // 🔍 DEBUG: Log subscription effectiveness calculation details
      console.log('🔍 DEBUG: Subscription Effectiveness Details:', {
        subscriptionEffectivenessScore: valueCreation.subscriptionEffectiveness.score,
        currentContribution,
        targetContribution,
        contributionGap,
        subscriptionEffectivenessPointsToGain,
        priority: subscriptionEffectivenessPointsToGain >= 1.5 ? 'medium' : 'low'
      })

      recommendations.push({
        id: 'improve-subscription-effectiveness',
        priority: subscriptionEffectivenessPointsToGain >= 1.5 ? 'medium' : 'low',
        impact: Math.round(subscriptionEffectivenessPointsToGain * 10) / 10,
        effort: contributionGap <= 0.1 ? 'low' : 'high',
        timeframe: 'monthly',
        title: contributionGap > 0.1 ? 'Scale Subscription Business Impact' : 'Optimize Subscription Excellence',
        description: contributionGap > 0.1
          ? `Grow subscription revenue from ${(currentContribution * 100).toFixed(1)}% to ${(targetContribution * 100)}% of monthly targets`
          : `Maintain and optimize excellent subscription business contribution at ${(currentContribution * 100).toFixed(1)}%`,
        actionItems: contributionGap > 0.1 ? [
          `Increase subscription MRR from €${Math.round(subscriptionMetrics.monthlyRecurringRevenue.current)} to €${Math.round(inputs.profitTargets?.monthly_revenue_target * targetContribution)}`,
          'Focus on subscriber acquisition AND pricing optimization together',
          'Develop higher-value subscription tiers and premium offerings',
          'Implement customer success programs to reduce churn and increase ARPU'
        ] : [
          'Scale subscription business for greater revenue diversification',
          'Develop enterprise and premium subscription offerings',
          'Focus on customer lifetime value optimization',
          'Explore new subscription product lines and market segments'
        ],
        metrics: {
          current: `${(currentContribution * 100).toFixed(1)}% revenue contribution (${Math.round(valueCreation.subscriptionEffectiveness.score * 100 / 3)}%)`,
          target: `${(targetContribution * 100)}%+ revenue contribution (100%+)`,
          pointsToGain: Math.round(subscriptionEffectivenessPointsToGain * 10) / 10
        }
      })
    }

    // 6. RATE TARGET ENHANCEMENT (lower impact but strategic: 3 points each) - Only for time-based models
    // Only include Rate Target Contribution for hybrid models (not time-only)
    if (timeBasedEnabled && result.breakdown.redistributedScores?.businessModel === 'hybrid') {
    const valuePointsToGain = Math.max(0.1, 3 - valueCreation.rateOptimization.score)
    const contributionGap = Math.max(0, 0.8 - valueCreation.rateOptimization.contribution)

    // 🔍 DEBUG: Log value creation calculation details
    console.log('🔍 DEBUG: Rate Target Contribution Details:', {
      rateOptimizationScore: valueCreation.rateOptimization.score,
      rateOptimizationContribution: valueCreation.rateOptimization.contribution,
      valuePointsToGain,
      contributionGap,
      priority: valuePointsToGain >= 1.5 ? 'medium' : 'low',
      streamEnabled: breakdown.streamConfiguration?.timeBasedStreamEnabled
    })

    recommendations.push({
      id: 'improve-rate-target-contribution',
      priority: valuePointsToGain >= 1.5 ? 'medium' : 'low',
      impact: Math.round(valuePointsToGain * 10) / 10,
      effort: contributionGap <= 0.1 ? 'low' : 'medium',
      timeframe: 'monthly',
      title: contributionGap > 0.1 ? 'Align Rates with Revenue Targets' : 'Optimize Value Excellence',
      description: contributionGap > 0.1
        ? 'Ensure hourly rates effectively contribute to monthly revenue goals'
        : 'Maintain and optimize excellent rate-to-revenue alignment for sustained performance',
      actionItems: contributionGap > 0.1 ? [
        'Review and align hourly rates with revenue targets',
        'Calculate optimal rate structure for target achievement',
        'Focus on clients and projects that support revenue goals',
        'Eliminate or restructure underperforming rate arrangements'
      ] : [
        'Fine-tune rate structure for maximum revenue contribution',
        'Develop premium rate tiers for specialized expertise',
        'Create value-based pricing models beyond hourly rates',
        'Implement dynamic pricing based on market positioning'
      ],
      metrics: {
        current: `${(valueCreation.rateOptimization.contribution * 100).toFixed(1)}% target contribution (${Math.round(valueCreation.rateOptimization.score * 100 / 3)}%)`,
        target: '80%+ target contribution (100%+)',
        pointsToGain: Math.round(valuePointsToGain * 10) / 10
      }
    })
    }

    // Sort by priority and impact, return top 2
    const sortedRecommendations = recommendations
      .sort((a, b) => {
        const priorityWeight = { high: 3, medium: 2, low: 1 }
        const scoreA = priorityWeight[a.priority] * 10 + a.impact
        const scoreB = priorityWeight[b.priority] * 10 + b.impact
        return scoreB - scoreA
      })

    // 🔍 DEBUG: Log all profit recommendations before filtering
    console.log('🔍 DEBUG: All Profit Recommendations (before .slice(0,5)):',
      sortedRecommendations.map((rec, index) => ({
        rank: index + 1,
        id: rec.id,
        title: rec.title,
        impact: rec.impact,
        priority: rec.priority,
        priorityWeight: { high: 3, medium: 2, low: 1 }[rec.priority],
        score: ({ high: 3, medium: 2, low: 1 }[rec.priority] * 10 + rec.impact),
        metrics: rec.metrics
      }))
    )

    console.log('🔍 DEBUG: Final Top 5 Recommendations:',
      sortedRecommendations.slice(0, 5).map(rec => ({
        id: rec.id,
        title: rec.title,
        impact: rec.impact,
        priority: rec.priority,
        score: ({ high: 3, medium: 2, low: 1 }[rec.priority] * 10 + rec.impact)
      }))
    )

    return sortedRecommendations.slice(0, 5)
  }

  // ================== REDISTRIBUTION LOGIC ==================

  private redistributePoints(
    subscriptionEnabled: boolean,
    timeBasedEnabled: boolean,
    baseScores: {
      subscriberScore: number
      subscriptionPricingScore: number
      revenueMixScore: number
      pricingEfficiencyScore: number
      rateOptimizationScore: number
      subscriptionEffectivenessScore: number
    },
    timeUtilizationScore: number = 0
  ): RedistributedScores {
    const businessModel = this.detectBusinessModel(subscriptionEnabled, timeBasedEnabled)

    let redistributed = {
      subscriberScore: baseScores.subscriberScore,
      subscriptionPricingScore: baseScores.subscriptionPricingScore,
      revenueMixScore: baseScores.revenueMixScore,
      pricingEfficiencyScore: baseScores.pricingEfficiencyScore,
      rateOptimizationScore: baseScores.rateOptimizationScore,
      subscriptionEffectivenessScore: baseScores.subscriptionEffectivenessScore,
      timeUtilizationScore: timeUtilizationScore, // Pass through time utilization
      totalPoints: 25,
      businessModel
    }

    if (businessModel === 'time-only') {
      // Redistribute 21 SaaS points across 2 time-based categories
      const disabledPoints = 6 + 6 + 3 + 3 + 3 // subscriber + pricing + mix + effectiveness + rateOptimization
      redistributed.subscriberScore = 0
      redistributed.subscriptionPricingScore = 0
      redistributed.revenueMixScore = 0
      redistributed.subscriptionEffectivenessScore = 0
      redistributed.rateOptimizationScore = 0
      // Redistribute proportionally: 4→10, timeUtil→15 = 25 total
      redistributed.pricingEfficiencyScore = baseScores.pricingEfficiencyScore * (10/4) // 4 → 10 pts (Hourly Rate)
      redistributed.timeUtilizationScore = timeUtilizationScore // Use directly (15 pts)

    } else if (businessModel === 'saas-only') {
      // Redistribute time-based points across 4 SaaS categories (no time utilization for SaaS-only)
      redistributed.pricingEfficiencyScore = 0
      redistributed.rateOptimizationScore = 0
      redistributed.timeUtilizationScore = 0

      // Redistribute proportionally: 6→8, 6→8, 3→5, 3→4 = +7 total (25 - 18 SaaS points)
      redistributed.subscriberScore = baseScores.subscriberScore * (8/6) // 6 → 8 pts
      redistributed.subscriptionPricingScore = baseScores.subscriptionPricingScore * (8/6) // 6 → 8 pts
      redistributed.revenueMixScore = baseScores.revenueMixScore * (5/3) // 3 → 5 pts
      redistributed.subscriptionEffectivenessScore = baseScores.subscriptionEffectivenessScore * (4/3) // 3 → 4 pts
    }
    // else: hybrid model keeps original distribution (both enabled)

    return redistributed
  }

  private detectBusinessModel(subscriptionEnabled: boolean, timeBasedEnabled: boolean): 'time-only' | 'saas-only' | 'hybrid' {
    if (subscriptionEnabled && timeBasedEnabled) return 'hybrid'
    if (subscriptionEnabled && !timeBasedEnabled) return 'saas-only'
    if (!subscriptionEnabled && timeBasedEnabled) return 'time-only'
    return 'time-only' // default fallback
  }

  private calculateTimeUtilization(timeStats: any, profitTargets: any): number {
    if (!profitTargets?.monthly_hours_target || profitTargets.monthly_hours_target <= 0) {
      return 0
    }

    // Use rolling 30-day data for consistent time windows
    const totalTrackedHours = timeStats.rolling30Days?.current?.totalHours || 0
    const billableHours = timeStats.rolling30Days?.current?.billableHours || 0
    const nonBillableHours = timeStats.rolling30Days?.current?.nonBillableHours || 0
    const monthlyTarget = profitTargets.monthly_hours_target

    // Calculate components (0-15 points total)
    // Hours Progress: 6 pts (40%), Billable Ratio: 6 pts (40%), Daily Consistency: 3 pts (20%)

    // 1. Target vs Actual Hours (40% weight = 6 points) - using 30-day window
    // 30 days ≈ 1.0 months, so we compare against the full monthly target
    const hoursAchievement = monthlyTarget > 0 ? totalTrackedHours / monthlyTarget : 0
    const hoursScore = Math.min(hoursAchievement * 6, 6) // max 6 points (100% = 6)

    // 2. Billable Ratio (40% weight = 6 points)
    // Get target billable ratio (default 90% if not set)
    const targetBillableRatio = profitTargets?.target_billable_ratio || 90

    // Calculate actual billable ratio: billable / (billable + non-billable)
    const actualBillableRatio = totalTrackedHours > 0 ? (billableHours / totalTrackedHours) * 100 : 0

    // Store actual billable ratio for organogram display
    this.actualBillableRatioValue = actualBillableRatio

    // Compare actual ratio to target ratio
    const billableRatioAchievement = targetBillableRatio > 0 ? actualBillableRatio / targetBillableRatio : 0

    // Score based on achievement (max 6 points, capped at 100% achievement)
    const billableScore = Math.min(billableRatioAchievement * 6, 6) // max 6 points

    // 3. Consistency Score (20% weight = 3 points) - DYNAMIC based on working days target
    // Calculate expected daily hours target based on working days schedule
    const workingDays = profitTargets?.target_working_days_per_week || [1, 2, 3, 4, 5]
    const dailyHoursTarget = calculateDailyHoursTarget(monthlyTarget, workingDays)

    // Use rolling 30-day daily hours average (already calculated by API)
    const actualDailyAverage = timeStats.rolling30Days?.current?.dailyHours || 0

    // Compare actual vs target daily hours
    const dailyConsistencyRatio = dailyHoursTarget > 0 ?
                                  actualDailyAverage / dailyHoursTarget : 0

    // Score based on achievement (max 3 points)
    const consistencyScore = Math.min(dailyConsistencyRatio * 3, 3)

    const totalScore = Math.min(hoursScore + billableScore + consistencyScore, 15)

    // Store component scores for organogram breakdown
    this.timeUtilizationComponents = {
      hoursScore: roundToOneDecimal(hoursScore),
      billableScore: roundToOneDecimal(billableScore),
      consistencyScore: roundToOneDecimal(consistencyScore)
    }

    return totalScore
  }

  private timeUtilizationComponents: { hoursScore: number; billableScore: number; consistencyScore: number } = {
    hoursScore: 0,
    billableScore: 0,
    consistencyScore: 0
  }

  private actualBillableRatioValue: number = 0

  private generateTimeUtilizationBreakdown(timeStats: any, inputs: any, redistributedScores: any) {
    // Safe extraction with proper defaults using rolling 30-day data
    const currentHours = Math.max(0, timeStats?.rolling30Days?.current?.totalHours || 0)
    const unbilledHours = Math.max(0, timeStats?.rolling30Days?.current?.unbilledHours || 0)
    const monthlyTarget = Math.max(0, inputs?.profitTargets?.monthly_hours_target || 0)
    const profitTargets = inputs?.profitTargets

    // Calculate component ratios safely (comparing rolling 30 days against monthly target)
    const hoursProgress = monthlyTarget > 0 ? Math.min(currentHours / monthlyTarget, 1.5) : 0
    const billingEfficiency = currentHours > 0 ? (currentHours - unbilledHours) / currentHours : 1

    // Calculate dynamic daily consistency based on working days
    const workingDays = profitTargets?.target_working_days_per_week || [1, 2, 3, 4, 5]
    const dailyHoursTarget = calculateDailyHoursTarget(monthlyTarget, workingDays)
    const actualDailyAverage = timeStats?.rolling30Days?.current?.dailyHours || 0
    const dailyConsistency = actualDailyAverage

    // Component scoring (15-point scale total: 6 + 6 + 3 = 15) - UPDATED ALLOCATIONS
    const hoursProgressScore = Math.min(hoursProgress * 6, 6) // 40% of 15 points
    const billingEfficiencyScore = Math.min(billingEfficiency * 6, 6) // 40% of 15 points

    // Dynamic consistency scoring based on daily hours target
    const dailyConsistencyRatio = dailyHoursTarget > 0 ? actualDailyAverage / dailyHoursTarget : 0
    const consistencyScore = Math.min(dailyConsistencyRatio * 3, 3) // 20% of 15 points

    const totalScore = redistributedScores?.timeUtilizationScore || 0

    return {
      components: [
        {
          name: 'Hours Progress',
          value: monthlyTarget > 0 ? `${currentHours}h / ${monthlyTarget}h rolling 30-day target` : `${currentHours}h (no target set)`,
          percentage: `${(hoursProgress * 100).toFixed(1)}%`,
          score: hoursProgressScore,
          maxScore: 6,
          description: 'Progress toward monthly hour target over rolling 30-day window',
          formula: monthlyTarget > 0 ? `(${currentHours} ÷ ${monthlyTarget}) × 6 = ${hoursProgressScore.toFixed(1)} pts` : 'No target set',
          benchmark: 'Target: 100% progress (on track with monthly hours)'
        },
        {
          name: 'Billing Efficiency',
          value: currentHours > 0 ? `${Math.max(0, currentHours - unbilledHours)}h billed / ${currentHours}h total` : 'No hours tracked',
          percentage: `${(billingEfficiency * 100).toFixed(1)}%`,
          score: billingEfficiencyScore,
          maxScore: 6,
          description: 'Percentage of worked hours that have been converted to invoices',
          formula: currentHours > 0 ? `${(billingEfficiency * 100).toFixed(1)}% × 6 = ${billingEfficiencyScore.toFixed(1)} pts` : 'No hours to calculate',
          benchmark: 'Target: 90%+ billing efficiency (minimal unbilled work)'
        },
        {
          name: 'Daily Consistency',
          value: `${dailyConsistency.toFixed(1)}h/day average`,
          percentage: dailyConsistencyRatio >= 1 ? '100%' : `${(dailyConsistencyRatio * 100).toFixed(0)}%`,
          score: consistencyScore,
          maxScore: 3,
          description: `Average hours per day vs target (${dailyHoursTarget.toFixed(1)}h/day based on ${workingDays.length} working days/week)`,
          formula: `${dailyConsistency.toFixed(1)}h ÷ ${dailyHoursTarget.toFixed(1)}h target = ${(dailyConsistencyRatio * 100).toFixed(0)}% × 3 = ${consistencyScore.toFixed(1)} pts`,
          benchmark: `Target: ${dailyHoursTarget.toFixed(1)}h/day (${monthlyTarget}h ÷ ${Math.round(calculateExpectedWorkingDays(getStartOfMonth(), getEndOfMonth(), workingDays))} working days)`
        }
      ],
      totalScore: totalScore,
      totalMaxScore: 15,
      summary: `Time utilization combines hour progress (${(hoursProgressScore/6*100).toFixed(0)}%), billing efficiency (${(billingEfficiency*100).toFixed(0)}%), and daily consistency (${dailyConsistency.toFixed(1)}h/day) for comprehensive productivity measurement.`
    }
  }

  private generateRevenueQualityBreakdown(dashboardMetrics: any, timeStats: any, inputs: any, redistributedScores: any) {
    // Use billable revenue from time entries for accurate collection tracking
    const billableRevenue = timeStats.rolling30Days?.current?.billableRevenue || 0
    const unbilledValue = timeStats.rolling30Days?.current?.unbilledValue || 0
    const totalWorkValue = billableRevenue // billableRevenue already includes all billable work
    const invoicedWorkValue = Math.max(0, billableRevenue - unbilledValue) // Work that has been invoiced
    const overdueAmount = dashboardMetrics.achterstallig || 0
    const currentHours = timeStats.rolling30Days?.current?.totalHours || 0

    // Calculate component metrics
    const collectionRate = totalWorkValue > 0 ? (invoicedWorkValue / totalWorkValue) : 0
    const invoicingSpeed = totalWorkValue > 0 ? (invoicedWorkValue / totalWorkValue) : 1
    const paymentQuality = invoicedWorkValue > 0 ? (1 - (overdueAmount / invoicedWorkValue)) : 1

    // Component scoring (4-point scale total: 1.4 + 1.3 + 1.3 = 4)
    const collectionScore = Math.min(collectionRate * 1.4, 1.4) // 35% of 4 points
    const invoicingScore = Math.min(invoicingSpeed * 1.3, 1.3) // 32.5% of 4 points
    const paymentScore = Math.min(paymentQuality * 1.3, 1.3) // 32.5% of 4 points

    return {
      components: [
        {
          name: 'Collection Rate',
          value: `€${invoicedWorkValue.toFixed(0)} invoiced / €${totalWorkValue.toFixed(0)} total`,
          percentage: `${(collectionRate * 100).toFixed(1)}%`,
          score: collectionScore,
          maxScore: 1.4,
          description: 'Percentage of billable work successfully converted to invoices',
          formula: `€${invoicedWorkValue.toFixed(0)} ÷ €${totalWorkValue.toFixed(0)} × 1.4 = ${collectionScore.toFixed(1)} pts`,
          benchmark: 'Target: 95%+ collection rate (minimal unbilled work)'
        },
        {
          name: 'Invoicing Speed',
          value: unbilledValue > 0 ? `€${unbilledValue.toFixed(0)} pending invoicing` : 'All work invoiced',
          percentage: `${(invoicingSpeed * 100).toFixed(1)}%`,
          score: invoicingScore,
          maxScore: 1.3,
          description: 'How quickly completed work is converted to invoices',
          formula: `€${invoicedWorkValue.toFixed(0)} ÷ €${totalWorkValue.toFixed(0)} × 1.3 = ${invoicingScore.toFixed(1)} pts`,
          benchmark: 'Target: Invoice within 24-48 hours of work completion'
        },
        {
          name: 'Payment Quality',
          value: overdueAmount > 0 ? `€${overdueAmount.toFixed(0)} overdue` : 'All payments on time',
          percentage: `${(paymentQuality * 100).toFixed(1)}%`,
          score: paymentScore,
          maxScore: 1.3,
          description: 'Percentage of revenue collected on time vs. overdue amounts',
          formula: `(1 - €${overdueAmount} ÷ €${invoicedWorkValue.toFixed(0)}) × 1.3 = ${paymentScore.toFixed(1)} pts`,
          benchmark: 'Target: <5% overdue amounts (excellent payment collection)'
        }
      ],
      totalScore: redistributedScores.revenueQualityScore || 0,
      totalMaxScore: 4,
      summary: `Revenue quality combines collection rate (${(collectionRate*100).toFixed(0)}%), invoicing speed (${(invoicingSpeed*100).toFixed(0)}%), and payment quality (${(paymentQuality*100).toFixed(0)}%) for comprehensive revenue execution measurement.`
    }
  }

  private calculateRevenueQuality(dashboardMetrics: any, timeStats: any): number {
    const billableRevenue = timeStats.rolling30Days?.current?.billableRevenue || 0
    const unbilledValue = timeStats.rolling30Days?.current?.unbilledValue || 0
    const invoicedWorkValue = Math.max(0, billableRevenue - unbilledValue)
    const overdueAmount = dashboardMetrics.achterstallig || 0

    if (billableRevenue <= 0) {
      return 0
    }

    // Calculate components (0-4 points when redistributed)

    // 1. Collection Efficiency (40% weight)
    const collectionRate = billableRevenue > 0 ? invoicedWorkValue / billableRevenue : 0
    const collectionScore = Math.min(collectionRate * 1.6, 1.6) // max 1.6 points

    // 2. Invoicing Speed (35% weight) - inverse of unbilled ratio
    const unbilledRatio = billableRevenue > 0 ? unbilledValue / billableRevenue : 0
    const invoicingScore = (1 - Math.min(unbilledRatio, 1)) * 1.4 // max 1.4 points

    // 3. Payment Quality (25% weight) - inverse of overdue amount
    const overdueRatio = invoicedWorkValue > 0 ? Math.min(overdueAmount / invoicedWorkValue, 1) : 0
    const paymentScore = (1 - overdueRatio) * 1.0 // max 1.0 points

    return Math.min(collectionScore + invoicingScore + paymentScore, 4)
  }
}

// ================== MAIN DECISION TREE ENGINE ==================

export class HealthScoreDecisionTree {
  private cashflowCalculator = new CashFlowScoreCalculator()
  private efficiencyCalculator = new EfficiencyScoreCalculator()
  private riskCalculator = new RiskScoreCalculator()
  private profitCalculator = new ProfitScoreCalculator()

  /**
   * Main decision tree execution: Input → Transform → Output
   * Only time-based targets are mandatory, SaaS targets are optional
   */
  public process(inputs: HealthScoreInputs): HealthScoreOutputs {
    // Check if minimum time-based profit targets are configured
    if (!inputs.profitTargets?.setup_completed ||
        !inputs.profitTargets?.monthly_hours_target ||
        inputs.profitTargets.monthly_hours_target <= 0 ||
        !inputs.profitTargets?.target_hourly_rate ||
        inputs.profitTargets.target_hourly_rate <= 0) {
      throw new Error('Time-based profit targets (hours and hourly rate) must be configured to use the dashboard')
    }

    // TRANSFORM: Calculate all scores (profit-focused system)
    const cashflowResult = this.cashflowCalculator.calculate(inputs)
    const efficiencyResult = this.efficiencyCalculator.calculate(inputs)
    const riskResult = this.riskCalculator.calculate(inputs)
    const profitResult = this.profitCalculator.calculate(inputs)

    // Calculate total score using profit health (25 + 25 + 25 + 25 = 100)
    const total = profitResult.score + cashflowResult.score + efficiencyResult.score + riskResult.score
    const totalRounded = Math.round(total)

    // OUTPUT: Generate comprehensive results (profit-focused)
    return {
      scores: {
        profit: profitResult.score,
        cashflow: cashflowResult.score,
        efficiency: efficiencyResult.score,
        risk: riskResult.score,
        total,
        totalRounded
      },
      breakdown: {
        profit: profitResult.breakdown,
        cashflow: cashflowResult.breakdown,
        efficiency: efficiencyResult.breakdown,
        risk: riskResult.breakdown
      },
      explanations: {
        profit: this.profitCalculator.generateExplanation(inputs, profitResult),
        cashflow: this.cashflowCalculator.generateExplanation(inputs, cashflowResult),
        efficiency: this.efficiencyCalculator.generateExplanation(inputs, efficiencyResult),
        risk: this.riskCalculator.generateExplanation(inputs, riskResult)
      },
      recommendations: {
        profit: this.profitCalculator.generateRecommendations(inputs, profitResult),
        cashflow: this.cashflowCalculator.generateRecommendations(inputs, cashflowResult.breakdown),
        efficiency: this.efficiencyCalculator.generateRecommendations(inputs, efficiencyResult.breakdown),
        risk: this.riskCalculator.generateRecommendations(inputs, riskResult.breakdown)
      },
      insights: this.generateInsights({
        profit: this.profitCalculator.generateRecommendations(inputs, profitResult),
        cashflow: this.cashflowCalculator.generateRecommendations(inputs, cashflowResult.breakdown),
        efficiency: this.efficiencyCalculator.generateRecommendations(inputs, efficiencyResult.breakdown),
        risk: this.riskCalculator.generateRecommendations(inputs, riskResult.breakdown)
      })
    }
  }

  private generateInsights(recommendations: any): { topPriorities: string[]; quickWins: string[]; longTermGoals: string[] } {
    const allRecommendations = [
      ...recommendations.profit,
      ...recommendations.cashflow,
      ...recommendations.efficiency,
      ...recommendations.risk
    ]

    // Sort by impact and priority
    const topPriorities = allRecommendations
      .filter(rec => rec.priority === 'high')
      .sort((a, b) => b.impact - a.impact)
      .slice(0, 3)
      .map(rec => rec.title)

    const quickWins = allRecommendations
      .filter(rec => rec.effort === 'low' && rec.impact >= 3)
      .sort((a, b) => b.impact - a.impact)
      .slice(0, 3)
      .map(rec => rec.title)

    const longTermGoals = allRecommendations
      .filter(rec => rec.timeframe === 'monthly')
      .sort((a, b) => b.impact - a.impact)
      .slice(0, 3)
      .map(rec => rec.title)

    return { topPriorities, quickWins, longTermGoals }
  }
}

// Export singleton instance
export const healthScoreEngine = new HealthScoreDecisionTree()
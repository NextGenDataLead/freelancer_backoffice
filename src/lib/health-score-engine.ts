/**
 * Health Score Decision Tree Engine
 *
 * Centralizes all health score calculations, explanations, and recommendations
 * into a clean input → transform → output flow.
 */

// ================== INPUT TYPES ==================
export interface HealthScoreInputs {
  dashboardMetrics: {
    totale_registratie: number
    achterstallig: number
    achterstallig_count: number
    factureerbaar: number
  }
  timeStats: {
    thisMonth: {
      hours: number
      revenue: number
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
    target_monthly_active_users: number
    target_avg_subscription_fee: number
    setup_completed: boolean
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

// ================== DECISION TREE CALCULATORS ==================


class CashFlowScoreCalculator {
  calculate(inputs: HealthScoreInputs): { score: number; breakdown: any } {
    const { dashboardMetrics } = inputs

    // FIXED: Focus purely on payment collection patterns (completely independent)
    const overdueAmount = dashboardMetrics.achterstallig || 0
    const overdueCount = dashboardMetrics.achterstallig_count || 0

    // Pure collection metrics - no revenue dependency
    // Collection speed score based purely on overdue days equivalent
    const dsoEquivalent = overdueAmount > 0 ? Math.min(overdueAmount / 1000 * 15, 60) : 0 // Scale: €1k = 15 days

    // Volume efficiency - fewer overdue items = better
    const volumeEfficiency = Math.max(0, 1 - (overdueCount / 10)) // Scale to 0-1 based on count

    // Score components (completely independent of revenue)
    const dsoScore = (dsoEquivalent <= 7 ? 10 :
                     dsoEquivalent <= 15 ? 8 :
                     dsoEquivalent <= 30 ? 5 :
                     dsoEquivalent <= 45 ? 2 : 0)

    const volumeScore = Math.round(volumeEfficiency * 10) // 0-10 points based on volume efficiency

    const absoluteAmountScore = (overdueAmount <= 1000 ? 5 :
                               overdueAmount <= 3000 ? 3 :
                               overdueAmount <= 5000 ? 1 : 0)

    const finalScore = dsoScore + volumeScore + absoluteAmountScore

    return {
      score: finalScore,
      breakdown: {
        overdueAmount,
        overdueCount,
        dsoEquivalent,
        volumeEfficiency,
        scores: { dsoScore, volumeScore, absoluteAmountScore }
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
              label: 'Collection Speed',
              value: `${result.breakdown.dsoEquivalent?.toFixed(1) || 0} days equivalent`,
              emphasis: result.breakdown.dsoEquivalent > 15 ? 'secondary' : 'primary'
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
              label: '1. Collection Speed',
              value: `${result.breakdown.dsoEquivalent?.toFixed(1) || 0} days equivalent`,
              description: `→ ${result.breakdown.scores?.dsoScore || 0}/10 pts`,
              emphasis: 'primary'
            },
            {
              type: 'standard',
              value: 'Speed: <7 days=Excellent, 7-15=Good, 15-30=Fair, 30-45=Poor'
            },
            {
              type: 'calculation',
              label: '2. Volume Efficiency',
              value: `${(result.breakdown.volumeEfficiency * 100)?.toFixed(1) || 0}%`,
              description: `→ ${result.breakdown.scores?.volumeScore || 0}/10 pts`,
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
              formula: `Total Score: ${result.breakdown.scores?.dsoScore || 0} + ${result.breakdown.scores?.volumeScore || 0} + ${result.breakdown.scores?.absoluteAmountScore || 0} = ${result.score}/25`
            }
          ]
        }
      ]
    }
  }

  generateRecommendations(inputs: HealthScoreInputs, breakdown: any): HealthRecommendation[] {
    const recommendations: HealthRecommendation[] = []
    const { overdueAmount, overdueCount, dsoEquivalent, scores } = breakdown

    // 1. COLLECTION SPEED OPTIMIZATION (up to 10 points)
    const speedGap = Math.max(0, dsoEquivalent - 7)
    const speedPointsToGain = Math.max(0.1, 10 - (scores?.dsoScore || 0))

    recommendations.push({
      id: 'accelerate-collection-speed',
      priority: speedPointsToGain >= 5 ? 'high' : speedPointsToGain >= 2 ? 'medium' : 'low',
      impact: Math.round(speedPointsToGain * 10) / 10,
      effort: 'medium',
      timeframe: 'immediate',
      title: 'Accelerate Collection Speed',
      description: speedGap > 0
        ? `Reduce collection time from ${dsoEquivalent.toFixed(1)} to under 7 days equivalent`
        : `Maintain excellent collection speed under 7 days`,
      actionItems: speedGap > 0 ? [
        'Contact clients with outstanding invoices immediately',
        'Implement daily payment follow-up procedures',
        'Offer early payment discounts for quick settlement'
      ] : [
        'Maintain current efficient collection processes',
        'Monitor payment timing consistency',
        'Implement automated payment reminders'
      ],
      metrics: {
        current: `${dsoEquivalent.toFixed(1)} days equivalent`,
        target: '<7 days equivalent',
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
    const { timeStats, mtdCalculations, profitTargets } = inputs

    // Use component-based hours target instead of hardcoded
    const targetHours = profitTargets?.monthly_hours_target || 160
    const mtdHoursTarget = Math.round(targetHours * mtdCalculations.monthProgress)

    const currentHours = timeStats.thisMonth.hours || 0
    const unbilledHours = timeStats.unbilled?.hours || 0

    // Pure time metrics (no revenue calculations)
    const hoursProgressRatio = mtdHoursTarget > 0 ? currentHours / mtdHoursTarget : 0
    const billingEfficiency = currentHours > 0 ?
      (currentHours - unbilledHours) / currentHours : 1

    // Consistency score (daily tracking patterns)
    const dailyAverage = currentHours / mtdCalculations.currentDay
    const consistencyScore = dailyAverage >= 5 ? 8 :
                           dailyAverage >= 3 ? 6 :
                           dailyAverage >= 2 ? 4 : 2

    // Time utilization score
    const utilizationScore = Math.min(Math.round(hoursProgressRatio * 12), 12)

    // Billing efficiency score
    const billingScore = (billingEfficiency >= 0.90 ? 5 :
                         billingEfficiency >= 0.80 ? 4 :
                         billingEfficiency >= 0.70 ? 3 :
                         billingEfficiency >= 0.60 ? 2 : 1)

    const finalScore = utilizationScore + billingScore + consistencyScore

    return {
      score: finalScore,
      breakdown: {
        currentHours,
        mtdTarget: mtdHoursTarget,
        targetHours,
        unbilledHours,
        hoursProgressRatio,
        billingEfficiency,
        dailyAverage,
        scores: { utilizationScore, billingScore, consistencyScore }
      }
    }
  }

  generateExplanation(inputs: HealthScoreInputs, result: { score: number; breakdown: any }): HealthExplanation {
    const { mtdCalculations } = inputs

    return {
      title: 'Efficiency Health - Time Utilization (25 points)',
      score: result.score,
      maxScore: 25,
      details: [
        {
          type: 'metrics',
          title: 'Time Utilization Data',
          items: [
            {
              type: 'metric',
              label: 'Current Hours (MTD)',
              value: `${result.breakdown.currentHours}h`,
              emphasis: 'primary'
            },
            {
              type: 'metric',
              label: 'MTD Target',
              value: `${result.breakdown.mtdTarget?.toFixed(1)}h`,
              description: `Day ${mtdCalculations.currentDay}/${mtdCalculations.daysInMonth}`
            },
            {
              type: 'metric',
              label: 'Unbilled Hours',
              value: `${result.breakdown.unbilledHours}h`,
              emphasis: result.breakdown.unbilledHours > 0 ? 'secondary' : 'muted'
            },
            {
              type: 'metric',
              label: 'Daily Average',
              value: `${result.breakdown.dailyAverage?.toFixed(1)}h/day`,
              emphasis: result.breakdown.dailyAverage >= 5 ? 'primary' : 'secondary'
            },
            {
              type: 'text',
              description: 'Note: This metric focuses purely on time utilization patterns, independent of revenue or profitability.'
            }
          ]
        },
        {
          type: 'calculations',
          title: 'Independent Time Metrics',
          items: [
            {
              type: 'calculation',
              label: '1. Time Utilization Progress',
              value: `${(result.breakdown.hoursProgressRatio * 100)?.toFixed(1)}%`,
              description: `→ ${result.breakdown.scores?.utilizationScore || 0}/12 pts`,
              emphasis: 'primary'
            },
            {
              type: 'standard',
              value: 'Progress: 100%=Excellent, 80-100%=Good, 60-80%=Fair, <60%=Poor'
            },
            {
              type: 'calculation',
              label: '2. Billing Efficiency',
              value: `${(result.breakdown.billingEfficiency * 100)?.toFixed(1)}%`,
              description: `→ ${result.breakdown.scores?.billingScore || 0}/5 pts`,
              emphasis: 'primary'
            },
            {
              type: 'standard',
              value: 'Efficiency: >90%=Excellent, 80-90%=Good, 70-80%=Fair, <60%=Poor'
            },
            {
              type: 'calculation',
              label: '3. Daily Consistency',
              value: `${result.breakdown.dailyAverage?.toFixed(1)}h/day average`,
              description: `→ ${result.breakdown.scores?.consistencyScore || 0}/8 pts`,
              emphasis: 'primary'
            },
            {
              type: 'standard',
              value: 'Consistency: ≥5h/day=Excellent, 3-5h=Good, 2-3h=Fair, <2h=Poor'
            },
            {
              type: 'formula',
              formula: `Total Score: ${result.breakdown.scores?.utilizationScore || 0} + ${result.breakdown.scores?.billingScore || 0} + ${result.breakdown.scores?.consistencyScore || 0} = ${result.score}/25`
            }
          ]
        }
      ]
    }
  }

  generateRecommendations(inputs: HealthScoreInputs, breakdown: any): HealthRecommendation[] {
    const recommendations: HealthRecommendation[] = []
    const { hoursProgressRatio, billingEfficiency, dailyAverage, scores, currentHours, mtdTarget, unbilledHours } = breakdown

    // 1. TIME UTILIZATION OPTIMIZATION (up to 12 points)
    const hoursGap = Math.max(0, mtdTarget - currentHours)
    const utilizationPointsToGain = Math.max(0.1, 12 - (scores?.utilizationScore || 0))

    recommendations.push({
      id: 'improve-time-utilization',
      priority: utilizationPointsToGain >= 6 ? 'high' : utilizationPointsToGain >= 3 ? 'medium' : 'low',
      impact: Math.round(utilizationPointsToGain * 10) / 10,
      effort: hoursGap > 40 ? 'high' : 'medium',
      timeframe: 'weekly',
      title: 'Improve Time Utilization',
      description: hoursGap > 0
        ? `Increase tracked hours by ${Math.round(hoursGap)}h to reach MTD target`
        : `Maintain excellent utilization at ${Math.round(hoursProgressRatio * 100)}%`,
      actionItems: hoursGap > 0 ? [
        `Track ${Math.round(hoursGap)} additional hours this month`,
        'Improve daily time tracking consistency',
        'Focus on billable work during peak hours'
      ] : [
        'Maintain consistent tracking patterns',
        'Optimize high-value time allocation',
        'Document successful productivity habits'
      ],
      metrics: {
        current: `${Math.round(hoursProgressRatio * 100)}% of MTD target`,
        target: '80%+ target achievement',
        pointsToGain: Math.round(utilizationPointsToGain * 10) / 10
      }
    })

    // 2. BILLING EFFICIENCY OPTIMIZATION (up to 5 points)
    const efficiencyGap = Math.max(0, 0.80 - billingEfficiency)
    const billingPointsToGain = Math.max(0.1, 5 - (scores?.billingScore || 0))

    recommendations.push({
      id: 'improve-billing-efficiency',
      priority: billingPointsToGain >= 3 ? 'medium' : 'low',
      impact: Math.round(billingPointsToGain * 10) / 10,
      effort: 'medium',
      timeframe: 'weekly',
      title: 'Improve Billing Efficiency',
      description: efficiencyGap > 0
        ? `Convert ${unbilledHours}h unbilled time to billable hours`
        : `Maintain excellent billing efficiency at ${Math.round(billingEfficiency * 100)}%`,
      actionItems: efficiencyGap > 0 ? [
        'Review and bill all completed unbilled work',
        'Implement real-time billing tracking',
        'Streamline client approval processes'
      ] : [
        'Maintain efficient billing practices',
        'Monitor unbilled hours weekly',
        'Optimize billing workflow processes'
      ],
      metrics: {
        current: `${Math.round(billingEfficiency * 100)}% billing efficiency`,
        target: '80%+ billing efficiency',
        pointsToGain: Math.round(billingPointsToGain * 10) / 10
      }
    })

    // 3. DAILY CONSISTENCY OPTIMIZATION (up to 8 points)
    const consistencyGap = Math.max(0, 3 - dailyAverage)
    const consistencyPointsToGain = Math.max(0.1, 8 - (scores?.consistencyScore || 0))

    recommendations.push({
      id: 'improve-daily-consistency',
      priority: consistencyPointsToGain >= 4 ? 'high' : consistencyPointsToGain >= 2 ? 'medium' : 'low',
      impact: Math.round(consistencyPointsToGain * 10) / 10,
      effort: 'low',
      timeframe: 'immediate',
      title: 'Improve Daily Consistency',
      description: consistencyGap > 0
        ? `Increase daily average from ${dailyAverage.toFixed(1)}h to 3h+ per day`
        : `Maintain consistent daily average of ${dailyAverage.toFixed(1)}h/day`,
      actionItems: consistencyGap > 0 ? [
        'Set daily minimum time tracking goals',
        'Create consistent morning work routines',
        'Use time blocking for focused work sessions'
      ] : [
        'Maintain current daily work patterns',
        'Monitor consistency weekly',
        'Optimize peak productivity hours'
      ],
      metrics: {
        current: `${dailyAverage.toFixed(1)}h/day average`,
        target: '3h+/day consistent tracking',
        pointsToGain: Math.round(consistencyPointsToGain * 10) / 10
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
    const { dashboardMetrics, timeStats } = inputs

    const readyToBillAmount = dashboardMetrics.factureerbaar || 0
    const overdueCount = dashboardMetrics.achterstallig_count || 0
    const overdueAmount = dashboardMetrics.achterstallig || 0

    // FIXED: Remove hours dependency - focus on business continuity risks only

    // Invoice processing risk (independent scoring)
    const invoiceProcessingRisk = Math.min((readyToBillAmount / 5000) * 8, 8)

    // Payment collection risk
    const paymentRisk = (overdueAmount > 10000 ? 5 :
                        overdueAmount > 5000 ? 3 :
                        overdueAmount > 2000 ? 2 : 0)

    // Client concentration risk (simplified)
    const clientRisk = 3 // Fixed risk factor

    // Business continuity risk (subscription health if available)
    const subscriptionRisk = timeStats.subscription ?
      (timeStats.subscription.monthlyActiveUsers?.current || 0) < 5 ? 3 : 0 : 2

    const totalRiskPenalty = invoiceProcessingRisk + paymentRisk +
                           clientRisk + subscriptionRisk
    const finalScore = Math.round(Math.max(0, 25 - totalRiskPenalty))

    return {
      score: finalScore,
      breakdown: {
        readyToBillAmount,
        overdueCount,
        overdueAmount,
        penalties: {
          invoiceProcessingRisk,
          paymentRisk,
          clientRisk,
          subscriptionRisk
        },
        totalPenalty: totalRiskPenalty
      }
    }
  }

  generateExplanation(inputs: HealthScoreInputs, result: { score: number; breakdown: any }): HealthExplanation {
    const { timeStats } = inputs
    const { readyToBillAmount, overdueAmount, overdueCount, penalties } = result.breakdown

    return {
      title: 'Risk Management - Business Continuity (25 points)',
      score: result.score,
      maxScore: 25,
      details: [
        {
          type: 'metrics',
          title: 'Business Continuity Data',
          items: [
            {
              type: 'metric',
              label: 'Ready to Bill',
              value: `€${readyToBillAmount?.toLocaleString() || 0}`,
              description: 'Invoice processing backlog',
              emphasis: readyToBillAmount > 5000 ? 'secondary' : 'primary'
            },
            {
              type: 'metric',
              label: 'Payment Risk',
              value: `€${overdueAmount?.toLocaleString() || 0}`,
              description: `${overdueCount} overdue items`,
              emphasis: overdueAmount > 2000 ? 'secondary' : 'primary'
            },
            {
              type: 'metric',
              label: 'Subscription Health',
              value: timeStats.subscription ?
                `${timeStats.subscription.monthlyActiveUsers?.current || 0} users` :
                'Not applicable',
              description: 'Business model diversification'
            },
            {
              type: 'text',
              description: 'Note: This metric focuses purely on business continuity factors, independent of time tracking or efficiency.'
            }
          ]
        },
        {
          type: 'calculations',
          title: 'Independent Risk Assessment',
          items: [
            {
              type: 'calculation',
              label: '1. Invoice Processing Risk',
              value: `€${readyToBillAmount?.toLocaleString() || 0}`,
              description: `→ -${penalties?.invoiceProcessingRisk?.toFixed(1) || 0}/8 pts`,
              emphasis: 'primary'
            },
            {
              type: 'standard',
              value: 'Risk: >€5k ready-to-bill = processing bottleneck'
            },
            {
              type: 'calculation',
              label: '2. Payment Collection Risk',
              value: `€${overdueAmount?.toLocaleString() || 0} overdue`,
              description: `→ -${penalties?.paymentRisk || 0}/5 pts`,
              emphasis: 'primary'
            },
            {
              type: 'standard',
              value: 'Risk: >€10k=High, €5-10k=Medium, €2-5k=Low, <€2k=Minimal'
            },
            {
              type: 'calculation',
              label: '3. Client Concentration Risk',
              value: 'Fixed moderate risk',
              description: `→ -${penalties?.clientRisk || 0}/3 pts`,
              emphasis: 'primary'
            },
            {
              type: 'calculation',
              label: '4. Business Model Risk',
              value: timeStats.subscription ?
                `${timeStats.subscription.monthlyActiveUsers?.current || 0} subscribers` :
                'Time-based only',
              description: `→ -${penalties?.subscriptionRisk || 0}/3 pts`,
              emphasis: 'primary'
            },
            {
              type: 'formula',
              formula: `Total Score: 25 - ${penalties?.invoiceProcessingRisk?.toFixed(1) || 0} - ${penalties?.paymentRisk || 0} - ${penalties?.clientRisk || 0} - ${penalties?.subscriptionRisk || 0} = ${result.score}/25`
            }
          ]
        }
      ]
    }
  }

  generateRecommendations(inputs: HealthScoreInputs, breakdown: any): HealthRecommendation[] {
    const recommendations: HealthRecommendation[] = []
    const { readyToBillAmount, overdueAmount, penalties } = breakdown
    const { timeStats } = inputs

    // 1. INVOICE PROCESSING OPTIMIZATION (up to 8 points)
    const invoiceGap = Math.max(0, readyToBillAmount - 5000)
    const invoicePointsToGain = Math.max(0.1, penalties.invoiceProcessingRisk)

    recommendations.push({
      id: 'reduce-invoice-processing-risk',
      priority: invoicePointsToGain >= 4 ? 'high' : invoicePointsToGain >= 2 ? 'medium' : 'low',
      impact: Math.round(invoicePointsToGain * 10) / 10,
      effort: readyToBillAmount > 10000 ? 'high' : 'medium',
      timeframe: 'immediate',
      title: 'Reduce Invoice Processing Risk',
      description: invoiceGap > 0
        ? `Process €${Math.round(invoiceGap)} ready-to-bill to eliminate bottleneck`
        : `Maintain efficient invoice processing below €5,000 threshold`,
      actionItems: invoiceGap > 0 ? [
        'Process all pending invoices immediately',
        'Streamline invoice approval workflows',
        'Implement automated invoicing systems'
      ] : [
        'Maintain current efficient processing workflow',
        'Monitor ready-to-bill levels weekly',
        'Prevent future processing bottlenecks'
      ],
      metrics: {
        current: `€${readyToBillAmount?.toLocaleString() || 0} ready-to-bill`,
        target: '€5,000 maximum',
        pointsToGain: Math.round(invoicePointsToGain * 10) / 10
      }
    })

    // 2. PAYMENT COLLECTION OPTIMIZATION (up to 5 points)
    const paymentGap = Math.max(0, overdueAmount - 2000)
    const paymentPointsToGain = Math.max(0.1, penalties.paymentRisk)

    recommendations.push({
      id: 'reduce-payment-collection-risk',
      priority: paymentPointsToGain >= 3 ? 'high' : paymentPointsToGain >= 1 ? 'medium' : 'low',
      impact: Math.round(paymentPointsToGain * 10) / 10,
      effort: overdueAmount > 5000 ? 'high' : 'medium',
      timeframe: 'weekly',
      title: 'Reduce Payment Collection Risk',
      description: paymentGap > 0
        ? `Collect €${Math.round(paymentGap)} overdue to reduce payment risk`
        : `Maintain excellent payment collection below €2,000`,
      actionItems: paymentGap > 0 ? [
        'Prioritize collection of largest overdue amounts',
        'Negotiate payment plans for delinquent accounts',
        'Implement stricter credit policies'
      ] : [
        'Maintain proactive payment follow-up processes',
        'Monitor payment terms compliance',
        'Strengthen client credit assessment'
      ],
      metrics: {
        current: `€${overdueAmount?.toLocaleString() || 0} overdue`,
        target: '€2,000 maximum',
        pointsToGain: Math.round(paymentPointsToGain * 10) / 10
      }
    })

    // 3. BUSINESS MODEL DIVERSIFICATION (up to 3 points)
    const subscriptionPointsToGain = Math.max(0.1, penalties.subscriptionRisk)

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

    // 4. CLIENT CONCENTRATION RISK (up to 3 points)
    const clientRiskPointsToGain = Math.max(0.1, penalties.clientRisk)

    recommendations.push({
      id: 'reduce-client-concentration-risk',
      priority: clientRiskPointsToGain >= 2 ? 'medium' : 'low',
      impact: Math.round(clientRiskPointsToGain * 10) / 10,
      effort: 'high',
      timeframe: 'monthly',
      title: 'Reduce Client Concentration Risk',
      description: clientRiskPointsToGain > 1
        ? 'Diversify client base to reduce dependency on key accounts'
        : 'Maintain healthy client diversification and acquisition',
      actionItems: [
        'Develop new client acquisition strategies',
        'Reduce dependency on largest revenue clients',
        'Build relationships across multiple market segments',
        'Create client retention and expansion programs'
      ],
      metrics: {
        current: 'Moderate concentration risk',
        target: 'Diversified client portfolio',
        pointsToGain: Math.round(clientRiskPointsToGain * 10) / 10
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

class ProfitScoreCalculator {
  calculate(inputs: HealthScoreInputs): { score: number; breakdown: any } {
    const { dashboardMetrics, timeStats, mtdCalculations, profitTargets } = inputs

    // Only calculate if profit targets are set up
    if (!profitTargets?.setup_completed) {
      return {
        score: 0,
        breakdown: {
          available: false,
          reason: 'Profit targets not configured'
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
      // Give full points for disabled subscription stream (user chose not to use it)
      subscriberScore = 6
      subscriptionPricingScore = 6
    }

    // === 2. REVENUE MIX & QUALITY (7 points - NO overlap) ===
    // Handle optional time-based stream

    const targetHours = profitTargets.monthly_hours_target
    const targetHourlyRate = profitTargets.target_hourly_rate // Use component target
    const timeBasedStreamEnabled = targetHours > 0 && targetHourlyRate > 0

    // 2A. Revenue Diversification (3 points) - only relevant if both streams exist
    let revenueMixScore = 3 // Default full points for single-stream setups
    if (subscriptionStreamEnabled && timeBasedStreamEnabled) {
      const timeRevenue = dashboardMetrics.totale_registratie || 0
      const totalRevenue = timeRevenue + currentMRR
      const subscriptionWeight = totalRevenue > 0 ? currentMRR / totalRevenue : 0
      const optimalMix = 0.3 // Target 30% subscription revenue
      const mixOptimization = Math.max(0, 1 - Math.abs(subscriptionWeight - optimalMix))
      revenueMixScore = Math.min(mixOptimization * 3, 3) // 3 points max
    }

    // 2B. Pricing Efficiency (4 points) - Revenue per hour VALUE (not volume)
    let pricingEfficiencyScore = 4 // Default full points for disabled time-based stream
    let rateEfficiencyPerformance = 1
    if (timeBasedStreamEnabled) {
      const timeRevenue = dashboardMetrics.totale_registratie || 0
      const currentHours = timeStats.thisMonth?.hours || 0
      const currentHourlyRate = currentHours > 0 ? timeRevenue / currentHours : 0
      rateEfficiencyPerformance = targetHourlyRate > 0 ? Math.min(currentHourlyRate / targetHourlyRate, 1.5) : 0
      pricingEfficiencyScore = Math.min(rateEfficiencyPerformance * 4, 4) // 4 points max
    }

    // === 3. VALUE CREATION (6 points - NO overlap) ===

    // 3A. Rate Optimization (3 points) - Whether rates meet profit targets
    let rateOptimizationScore = 3 // Default full points for disabled time-based stream
    let hourlyRateContribution = 0
    if (timeBasedStreamEnabled) {
      const timeRevenue = dashboardMetrics.totale_registratie || 0
      hourlyRateContribution = profitTargets?.monthly_revenue_target ?
        (timeRevenue / profitTargets.monthly_revenue_target) : 0
      rateOptimizationScore = Math.min(hourlyRateContribution * 3, 3) // 3 points max
    }

    // 3B. Subscription Pricing Effectiveness (3 points) - Fees supporting profit goals
    let subscriptionEffectivenessScore = 3 // Default full points for disabled subscription stream
    let subscriptionContribution = 0
    if (subscriptionStreamEnabled) {
      subscriptionContribution = profitTargets?.monthly_revenue_target ?
        (currentMRR / profitTargets.monthly_revenue_target) : 0
      subscriptionEffectivenessScore = Math.min(subscriptionContribution * 3, 3) // 3 points max
    }

    // === TOTAL CALCULATION ===
    // Total: 25 points (6+6+3+4+3+3 = 25)
    const driverScore = subscriberScore + subscriptionPricingScore + revenueMixScore +
                       pricingEfficiencyScore + rateOptimizationScore + subscriptionEffectivenessScore

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
      const timeRevenue = dashboardMetrics.totale_registratie || 0
      const currentHours = timeStats.thisMonth?.hours || 0
      const currentHourlyRate = currentHours > 0 ? timeRevenue / currentHours : 0
      if (rateEfficiencyPerformance < 0.7 && currentHourlyRate < 50) { penalties += 2; weakDrivers.push('hourly-rate-value') }
    }

    // Only apply mix penalty if both streams are enabled
    if (subscriptionStreamEnabled && timeBasedStreamEnabled) {
      const timeRevenue = dashboardMetrics.totale_registratie || 0
      const totalRevenue = timeRevenue + currentMRR
      const subscriptionWeight = totalRevenue > 0 ? currentMRR / totalRevenue : 0
      const mixOptimization = Math.max(0, 1 - Math.abs(subscriptionWeight - 0.3))
      if (mixOptimization < 0.5 && totalRevenue > 0) { penalties += 1; weakDrivers.push('revenue-diversification') }
    }

    // 🔍 DEBUG: Log penalty calculations
    console.log('🔍 DEBUG: Profit Score Penalties:', {
      subscriptionStreamEnabled,
      timeBasedStreamEnabled,
      userGrowthPerformance,
      currentUsers: timeStats.subscription?.monthlyActiveUsers?.current || 0,
      pricingPerformance,
      currentSubFee: timeStats.subscription?.averageSubscriptionFee?.current || 0,
      rateEfficiencyPerformance,
      totalPenalties: penalties,
      weakDrivers,
      driverScoreBeforePenalties: subscriberScore + subscriptionPricingScore + revenueMixScore + pricingEfficiencyScore + rateOptimizationScore + subscriptionEffectivenessScore
    })

    // Calculate legacy metrics for backward compatibility
    const estimatedMonthlyCosts = profitTargets.monthly_cost_target
    const timeRevenue = dashboardMetrics.totale_registratie || 0
    const totalRevenue = timeRevenue + currentMRR
    const currentProfit = totalRevenue - estimatedMonthlyCosts
    const dayProgress = mtdCalculations.currentDay / mtdCalculations.daysInMonth
    const mtdProfitTarget = profitTargets.monthly_profit_target * dayProgress
    const progressRatio = mtdProfitTarget > 0 ? currentProfit / mtdProfitTarget : 0

    return {
      score: Math.max(0, Math.round(driverScore) - penalties),
      breakdown: {
        available: true,
        // Stream configuration status
        streamConfiguration: {
          subscriptionStreamEnabled,
          timeBasedStreamEnabled,
          bothStreamsEnabled: subscriptionStreamEnabled && timeBasedStreamEnabled
        },
        // 🎯 CLEARLY DENOTED PROFIT-EXCLUSIVE METRICS
        subscriptionMetrics: {
          enabled: subscriptionStreamEnabled,
          subscriberGrowth: {
            performance: userGrowthPerformance,
            score: subscriberScore,
            target: targetUsers,
            current: subscriptionStreamEnabled ? (timeStats.subscription?.monthlyActiveUsers?.current || 0) : 0
          },
          subscriptionPricing: {
            performance: pricingPerformance,
            score: subscriptionPricingScore,
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
            score: revenueMixScore,
            target: 0.3,
            current: subscriptionStreamEnabled && timeBasedStreamEnabled ?
              (totalRevenue > 0 ? currentMRR / totalRevenue : 0) : 0
          },
          pricingEfficiency: {
            enabled: timeBasedStreamEnabled,
            performance: rateEfficiencyPerformance,
            score: pricingEfficiencyScore,
            target: targetHourlyRate,
            current: timeBasedStreamEnabled ?
              (timeStats.thisMonth?.hours > 0 ? (dashboardMetrics.totale_registratie || 0) / timeStats.thisMonth.hours : 0) : 0
          }
        },
        valueCreation: {
          rateOptimization: {
            enabled: timeBasedStreamEnabled,
            score: rateOptimizationScore,
            contribution: hourlyRateContribution
          },
          subscriptionEffectiveness: {
            enabled: subscriptionStreamEnabled,
            score: subscriptionEffectivenessScore,
            contribution: subscriptionContribution
          }
        },
        penalties,
        weakDrivers,
        totalRevenue,
        timeRevenue,
        subscriptionRevenue: currentMRR,
        // Legacy metrics for backward compatibility
        estimatedCosts: estimatedMonthlyCosts,
        currentProfit,
        mtdProfitTarget,
        monthlyProfitTarget: profitTargets.monthly_profit_target,
        progressRatio,
        progressPercentage: progressRatio * 100,
        dayProgress: dayProgress * 100
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
    const { subscriptionMetrics, revenueMixQuality, valueCreation, weakDrivers, penalties } = breakdown

    return {
      title: 'Profit Health - Driver Performance (25 points)',
      score: result.score,
      maxScore: 25,
      details: [
        {
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
        },
        {
          type: 'metrics',
          title: 'Revenue Quality & Mix (7 points)',
          items: [
            {
              type: 'metric',
              label: 'Revenue Diversification',
              value: `${(revenueMixQuality.revenueDiversification.current * 100).toFixed(1)}% subscription`,
              description: `Target: ${(revenueMixQuality.revenueDiversification.target * 100).toFixed(1)}% → ${revenueMixQuality.revenueDiversification.score.toFixed(1)}/3 pts`,
              emphasis: revenueMixQuality.revenueDiversification.performance >= 0.8 ? 'primary' : 'secondary'
            },
            {
              type: 'metric',
              label: 'Hourly Rate Value',
              value: `€${revenueMixQuality.pricingEfficiency.current.toFixed(0)}/h`,
              description: `Target: €${revenueMixQuality.pricingEfficiency.target}/h → ${revenueMixQuality.pricingEfficiency.score.toFixed(1)}/4 pts`,
              emphasis: revenueMixQuality.pricingEfficiency.performance >= 1 ? 'primary' : 'secondary'
            }
          ]
        },
        {
          type: 'metrics',
          title: 'Value Creation Performance (6 points)',
          items: [
            {
              type: 'metric',
              label: 'Rate Target Contribution',
              value: `${(valueCreation.rateOptimization.contribution * 100).toFixed(1)}%`,
              description: `→ ${valueCreation.rateOptimization.score.toFixed(1)}/3 pts`,
              emphasis: valueCreation.rateOptimization.contribution >= 0.8 ? 'primary' : 'secondary'
            },
            {
              type: 'metric',
              label: 'Subscription Target Contribution',
              value: `${(valueCreation.subscriptionEffectiveness.contribution * 100).toFixed(1)}%`,
              description: `→ ${valueCreation.subscriptionEffectiveness.score.toFixed(1)}/3 pts`,
              emphasis: valueCreation.subscriptionEffectiveness.contribution >= 0.3 ? 'primary' : 'secondary'
            }
          ]
        },
        {
          type: 'calculations',
          title: 'Subscription Business Calculation (12 points)',
          items: [
            {
              type: 'calculation',
              label: '1. Subscriber Growth',
              value: `${subscriptionMetrics.subscriberGrowth.current}/${subscriptionMetrics.subscriberGrowth.target} users`,
              description: `→ ${subscriptionMetrics.subscriberGrowth.score.toFixed(1)}/6 pts`,
              emphasis: 'primary'
            },
            {
              type: 'standard',
              value: 'Scoring: Linear scale 0-6 points based on user target achievement'
            },
            {
              type: 'calculation',
              label: '2. Subscription Pricing',
              value: `€${subscriptionMetrics.subscriptionPricing.current}/€${subscriptionMetrics.subscriptionPricing.target}`,
              description: `→ ${subscriptionMetrics.subscriptionPricing.score.toFixed(1)}/6 pts`,
              emphasis: 'primary'
            },
            {
              type: 'standard',
              value: 'Scoring: Linear scale 0-6 points based on pricing target achievement'
            }
          ]
        },
        {
          type: 'calculations',
          title: 'Revenue Quality Calculation (7 points)',
          items: [
            {
              type: 'calculation',
              label: '3. Revenue Diversification',
              value: `${(revenueMixQuality.revenueDiversification.current * 100).toFixed(1)}% subscription mix`,
              description: `→ ${revenueMixQuality.revenueDiversification.score.toFixed(1)}/3 pts`,
              emphasis: 'primary'
            },
            {
              type: 'standard',
              value: 'Target: 40%+ subscription revenue. Scoring: 0-3 points based on subscription percentage'
            },
            {
              type: 'calculation',
              label: '4. Pricing Efficiency',
              value: `€${revenueMixQuality.pricingEfficiency.current.toFixed(0)}/hour`,
              description: `→ ${revenueMixQuality.pricingEfficiency.score.toFixed(1)}/4 pts`,
              emphasis: 'primary'
            },
            {
              type: 'standard',
              value: 'Scoring: 0-4 points based on hourly rate achievement vs target'
            }
          ]
        },
        {
          type: 'calculations',
          title: 'Value Creation Calculation (6 points)',
          items: [
            {
              type: 'calculation',
              label: '5. Rate Target Contribution',
              value: `${(valueCreation.rateOptimization.contribution * 100).toFixed(1)}% of revenue target`,
              description: `→ ${valueCreation.rateOptimization.score.toFixed(1)}/3 pts`,
              emphasis: 'primary'
            },
            {
              type: 'standard',
              value: 'Target: 80%+ contribution. Scoring: 0-3 points based on revenue target achievement'
            },
            {
              type: 'calculation',
              label: '6. Subscription Effectiveness',
              value: `${(valueCreation.subscriptionEffectiveness.contribution * 100).toFixed(1)}% of revenue target`,
              description: `→ ${valueCreation.subscriptionEffectiveness.score.toFixed(1)}/3 pts`,
              emphasis: 'primary'
            },
            {
              type: 'standard',
              value: 'Target: 30%+ contribution. Scoring: 0-3 points based on subscription revenue achievement'
            }
          ]
        },
        {
          type: 'calculations',
          title: 'Final Score Calculation',
          items: [
            {
              type: 'calculation',
              label: 'Total Driver Score',
              value: `${result.score + penalties}/25`,
              description: penalties > 0 ? `Penalties applied: -${penalties} pts` : 'No penalties applied',
              emphasis: 'primary'
            },
            {
              type: 'formula',
              formula: `${subscriptionMetrics.subscriberGrowth.score.toFixed(1)} + ${subscriptionMetrics.subscriptionPricing.score.toFixed(1)} + ${revenueMixQuality.revenueDiversification.score.toFixed(1)} + ${revenueMixQuality.pricingEfficiency.score.toFixed(1)} + ${valueCreation.rateOptimization.score.toFixed(1)} + ${valueCreation.subscriptionEffectiveness.score.toFixed(1)}${penalties > 0 ? ` - ${penalties}` : ''} = ${result.score}/25`
            },
            ...(weakDrivers.length > 0 ? [{
              type: 'text' as const,
              description: `⚠️ Weak drivers detected: ${weakDrivers.join(', ')}`
            }] : []),
            {
              type: 'text',
              description: 'Note: This metric focuses exclusively on profit-driving business fundamentals, completely independent of time tracking, collection, or operational efficiency.'
            }
          ]
        },
        {
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
        }
      ]
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
    const { subscriptionMetrics, revenueMixQuality, valueCreation, weakDrivers } = breakdown

    // === ALWAYS-ON RECOMMENDATIONS (no thresholds, prioritized by impact) ===

    // 1. SUBSCRIPTION GROWTH OPTIMIZATION (highest impact: 6 points)
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

    // 3. HOURLY RATE VALUE OPTIMIZATION (medium-high impact: 4 points)
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

    // 4. REVENUE DIVERSIFICATION OPTIMIZATION (medium impact: 3 points)
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

    // 5. SUBSCRIPTION EFFECTIVENESS ENHANCEMENT (high impact: up to 3 points)
    // Only create subscription effectiveness recommendation if subscription stream is enabled
    if (breakdown.streamConfiguration.subscriptionStreamEnabled) {
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

    // 6. RATE TARGET ENHANCEMENT (lower impact but strategic: 3 points each)
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
}

// ================== MAIN DECISION TREE ENGINE ==================

export class HealthScoreDecisionTree {
  private cashflowCalculator = new CashFlowScoreCalculator()
  private efficiencyCalculator = new EfficiencyScoreCalculator()
  private riskCalculator = new RiskScoreCalculator()
  private profitCalculator = new ProfitScoreCalculator()

  /**
   * Main decision tree execution: Input → Transform → Output
   * Profit targets are now mandatory - no revenue health fallback
   */
  public process(inputs: HealthScoreInputs): HealthScoreOutputs {
    // Check if profit targets are configured (now mandatory)
    if (!inputs.profitTargets?.setup_completed) {
      throw new Error('Profit targets must be configured to use the dashboard')
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
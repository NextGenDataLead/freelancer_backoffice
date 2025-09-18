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
}

// ================== OUTPUT TYPES ==================
export interface HealthScoreOutputs {
  scores: {
    revenue: number
    cashflow: number
    efficiency: number
    risk: number
    total: number
    totalRounded: number
  }
  explanations: {
    revenue: HealthExplanation
    cashflow: HealthExplanation
    efficiency: HealthExplanation
    risk: HealthExplanation
  }
  recommendations: {
    revenue: HealthRecommendation[]
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

class RevenueScoreCalculator {
  calculate(inputs: HealthScoreInputs): { score: number; breakdown: any } {
    const { dashboardMetrics, timeStats, mtdCalculations } = inputs

    const registeredRevenue = dashboardMetrics.totale_registratie || 0
    const subscriptionRevenue = (timeStats.subscription?.monthlyActiveUsers?.current || 0) *
                               (timeStats.subscription?.averageSubscriptionFee?.current || 0)
    const totalRevenue = registeredRevenue + subscriptionRevenue
    const progressRatio = mtdCalculations.mtdRevenueTarget > 0 ? totalRevenue / mtdCalculations.mtdRevenueTarget : 0
    const score = Math.min(Math.round(progressRatio * 25), 25)

    return {
      score,
      breakdown: {
        registeredRevenue,
        subscriptionRevenue,
        totalRevenue,
        mtdTarget: mtdCalculations.mtdRevenueTarget,
        progressRatio,
        progressPercentage: progressRatio * 100
      }
    }
  }

  generateExplanation(inputs: HealthScoreInputs, result: { score: number; breakdown: any }): HealthExplanation {
    const { mtdCalculations } = inputs

    return {
      title: 'Revenue Health - MTD (25 points max)',
      score: result.score,
      maxScore: 25,
      details: [
        {
          type: 'metrics',
          title: 'Revenue Components',
          items: [
            {
              type: 'metric',
              label: 'Total Revenue (MTD)',
              value: `€${result.breakdown.totalRevenue?.toLocaleString() || 0}`,
              emphasis: 'primary'
            },
            {
              type: 'metric',
              label: 'Registered Time',
              value: `€${result.breakdown.registeredRevenue?.toLocaleString() || 0}`
            },
            {
              type: 'metric',
              label: 'Subscriptions',
              value: `€${result.breakdown.subscriptionRevenue?.toLocaleString() || 0}`
            },
            {
              type: 'metric',
              label: 'MTD Target',
              value: `€${result.breakdown.mtdTarget?.toLocaleString() || 0}`,
              description: `Day ${mtdCalculations.currentDay}/${mtdCalculations.daysInMonth}`
            },
            {
              type: 'metric',
              label: 'Progress',
              value: `${result.breakdown.progressPercentage?.toFixed(1) || 0}%`,
              emphasis: result.breakdown.progressPercentage >= 100 ? 'primary' : 'secondary'
            }
          ]
        },
        {
          type: 'calculations',
          title: '📊 Official Revenue Metrics',
          items: [
            {
              type: 'calculation',
              label: '1. Time Revenue Performance',
              value: `€${result.breakdown.registeredRevenue?.toLocaleString() || 0}`,
              description: `→ ${Math.min(Math.round((result.breakdown.registeredRevenue || 0) / (result.breakdown.mtdTarget || 1) * 25), 25)}/25 pts`,
              emphasis: 'primary'
            },
            {
              type: 'standard',
              value: 'Standard: Time-based revenue from billable hours and consulting work'
            },
            {
              type: 'calculation',
              label: '2. Subscription Revenue',
              value: `€${result.breakdown.subscriptionRevenue?.toLocaleString() || 0}`,
              description: `→ Additional recurring revenue stream`,
              emphasis: 'primary'
            },
            {
              type: 'standard',
              value: 'Standard: Monthly recurring revenue from platform subscriptions'
            },
            {
              type: 'calculation',
              label: '3. MTD Progress Ratio',
              value: `${result.breakdown.progressPercentage?.toFixed(1) || 0}%`,
              description: `→ ${result.score}/25 pts total`,
              emphasis: 'primary'
            },
            {
              type: 'standard',
              value: 'Target: >100%=Excellent, 80-100%=Good, 60-80%=Fair, <60%=Critical'
            },
            {
              type: 'formula',
              formula: `Total Score: min((€${result.breakdown.totalRevenue?.toLocaleString() || 0} ÷ €${result.breakdown.mtdTarget?.toLocaleString() || 0}) × 25, 25) = ${result.score}/25`
            }
          ]
        }
      ]
    }
  }

  generateRecommendations(inputs: HealthScoreInputs, breakdown: any): HealthRecommendation[] {
    const recommendations: HealthRecommendation[] = []
    const shortfall = Math.max(0, breakdown.mtdTarget - breakdown.totalRevenue)
    const currentScore = breakdown.score || 0
    const { timeStats } = inputs

    // High Impact: Direct revenue gap closure
    if (shortfall > 0) {
      const pointsToGain = Math.min(Math.round((shortfall / breakdown.mtdTarget) * 25), 25 - currentScore)
      recommendations.push({
        id: 'revenue-gap-closure',
        priority: 'high',
        impact: pointsToGain,
        effort: shortfall > 2000 ? 'high' : 'medium',
        timeframe: 'immediate',
        title: 'Close Revenue Gap',
        description: `Generate €${Math.round(shortfall)} more revenue to hit MTD target`,
        actionItems: [
          'Focus on high-value client work',
          'Complete pending project deliverables',
          'Invoice ready billable time'
        ],
        metrics: {
          current: `€${breakdown.totalRevenue?.toLocaleString() || 0}`,
          target: `€${breakdown.mtdTarget?.toLocaleString() || 0}`,
          pointsToGain
        }
      })
    }

    // Medium Impact: Hourly rate optimization
    const currentRate = timeStats.thisMonth.hours > 0 ? Math.round(breakdown.registeredRevenue / timeStats.thisMonth.hours) : 0
    if (currentRate > 0 && currentRate < 75) {
      const rateIncrease = 75 - currentRate
      const additionalRevenue = timeStats.thisMonth.hours * rateIncrease
      recommendations.push({
        id: 'rate-optimization',
        priority: 'medium',
        impact: Math.round((additionalRevenue / breakdown.mtdTarget) * 25),
        effort: 'medium',
        timeframe: 'monthly',
        title: 'Optimize Hourly Rates',
        description: `Increase rates by €${rateIncrease}/h to generate €${Math.round(additionalRevenue)} additional revenue`,
        actionItems: [
          'Review current client rate agreements',
          'Benchmark rates against market standards',
          'Propose rate adjustments for new projects'
        ],
        metrics: {
          current: `€${currentRate}/h`,
          target: '€75/h',
          pointsToGain: Math.round((additionalRevenue / breakdown.mtdTarget) * 25)
        }
      })
    }

    return recommendations.slice(0, 3) // Return top 3 recommendations
  }
}

class CashFlowScoreCalculator {
  calculate(inputs: HealthScoreInputs): { score: number; breakdown: any } {
    const { dashboardMetrics } = inputs

    const totalRevenue = dashboardMetrics.totale_registratie || 0
    const overdueAmount = dashboardMetrics.achterstallig || 0
    const paidAmount = totalRevenue - overdueAmount
    const overdueCount = dashboardMetrics.achterstallig_count || 0

    // Calculate components
    const operatingCashFlowRatio = totalRevenue > 0 ? paidAmount / totalRevenue : 1
    const currentLiabilityCoverage = operatingCashFlowRatio // Same calculation for simplicity
    const dsoEquivalent = totalRevenue > 0 ? (overdueAmount / totalRevenue) * 30 : 0

    // Score components
    const ocfScore = (operatingCashFlowRatio >= 0.90 ? 10 :
                     operatingCashFlowRatio >= 0.75 ? 7 :
                     operatingCashFlowRatio >= 0.60 ? 5 :
                     operatingCashFlowRatio >= 0.40 ? 3 : 1)

    const clcScore = (currentLiabilityCoverage >= 1.5 ? 8 :
                     currentLiabilityCoverage >= 1.0 ? 6 :
                     currentLiabilityCoverage >= 0.7 ? 4 :
                     currentLiabilityCoverage >= 0.5 ? 2 : 1)

    const dsoScore = (dsoEquivalent <= 15 ? 4 :
                     dsoEquivalent <= 30 ? 3 :
                     dsoEquivalent <= 45 ? 2 :
                     dsoEquivalent <= 60 ? 1 : 0)

    const riskScore = (overdueCount <= 2 ? 3 :
                      overdueCount <= 4 ? 2 :
                      overdueCount <= 6 ? 1 : 0)

    const finalScore = (ocfScore) + (clcScore) + (dsoScore) + (riskScore)

    return {
      score: finalScore,
      breakdown: {
        totalRevenue,
        overdueAmount,
        paidAmount,
        overdueCount,
        operatingCashFlowRatio,
        currentLiabilityCoverage,
        dsoEquivalent,
        scores: { ocfScore, clcScore, dsoScore, riskScore }
      }
    }
  }

  generateExplanation(inputs: HealthScoreInputs, result: { score: number; breakdown: any }): HealthExplanation {
    return {
      title: 'Cash Flow Health - Accounting Standards (25 points)',
      score: result.score,
      maxScore: 25,
      details: [
        {
          type: 'metrics',
          title: 'Current Financial Position',
          items: [
            {
              type: 'metric',
              label: 'Paid Amount',
              value: `€${result.breakdown.paidAmount?.toLocaleString() || 0}`,
              emphasis: 'primary'
            },
            {
              type: 'metric',
              label: 'Overdue Amount',
              value: `€${result.breakdown.overdueAmount?.toLocaleString() || 0}`,
              emphasis: result.breakdown.overdueAmount > 0 ? 'secondary' : 'muted'
            },
            {
              type: 'metric',
              label: 'Total Revenue',
              value: `€${result.breakdown.totalRevenue?.toLocaleString() || 0}`
            },
            {
              type: 'metric',
              label: 'Overdue Count',
              value: `${result.breakdown.overdueCount} invoices`
            }
          ]
        },
        {
          type: 'calculations',
          title: 'Official Accounting Ratios',
          items: [
            {
              type: 'calculation',
              label: '1. Operating Cash Flow Ratio',
              value: `${(result.breakdown.operatingCashFlowRatio * 100)?.toFixed(1) || 0}%`,
              description: `→ ${result.breakdown.scores?.ocfScore || 0}/10 pts`,
              emphasis: 'primary'
            },
            {
              type: 'standard',
              value: 'Standard: >90%=Excellent, 75-90%=Good, 60-75%=Fair'
            },
            {
              type: 'calculation',
              label: '2. Current Liability Coverage',
              value: `${result.breakdown.currentLiabilityCoverage?.toFixed(2) || 0}x`,
              description: `→ ${result.breakdown.scores?.clcScore || 0}/8 pts`,
              emphasis: 'primary'
            },
            {
              type: 'standard',
              value: 'Standard: >1.5x=Excellent, 1.0-1.5x=Good, 0.7-1.0x=Fair'
            },
            {
              type: 'calculation',
              label: '3. Collection Efficiency (DSO)',
              value: `${result.breakdown.dsoEquivalent?.toFixed(1) || 0} days`,
              description: `→ ${result.breakdown.scores?.dsoScore || 0}/4 pts`,
              emphasis: 'primary'
            },
            {
              type: 'standard',
              value: 'Industry Standard: <30 days=Good, 30-45=Fair, >60=Critical'
            },
            {
              type: 'calculation',
              label: '4. Collection Risk',
              value: `${result.breakdown.overdueCount} overdue`,
              description: `→ ${result.breakdown.scores?.riskScore || 0}/3 pts`,
              emphasis: 'primary'
            },
            {
              type: 'formula',
              formula: `Total Score: ${result.breakdown.scores?.ocfScore || 0} + ${result.breakdown.scores?.clcScore || 0} + ${result.breakdown.scores?.dsoScore || 0} + ${result.breakdown.scores?.riskScore || 0} = ${result.score}/25`
            }
          ]
        }
      ]
    }
  }

  generateRecommendations(inputs: HealthScoreInputs, breakdown: any): HealthRecommendation[] {
    const recommendations: HealthRecommendation[] = []
    const { operatingCashFlowRatio, overdueAmount, totalRevenue, overdueCount, dsoEquivalent, scores } = breakdown

    // High Impact: Operating Cash Flow improvement (up to 10 points)
    if (operatingCashFlowRatio < 0.90 && overdueAmount > 0) {
      const targetCollection = totalRevenue * 0.90
      const needToCollect = targetCollection - (totalRevenue - overdueAmount)
      const pointsToGain = 10 - (scores?.ocfScore || 0)

      recommendations.push({
        id: 'improve-ocf-ratio',
        priority: 'high',
        impact: pointsToGain,
        effort: needToCollect > 2000 ? 'high' : 'medium',
        timeframe: 'immediate',
        title: 'Improve Operating Cash Flow',
        description: `Collect €${Math.round(needToCollect)} overdue to reach 90% ratio`,
        actionItems: [
          'Contact clients with outstanding invoices',
          'Implement automated payment reminders',
          'Review payment terms and conditions'
        ],
        metrics: {
          current: `${(operatingCashFlowRatio * 100).toFixed(1)}%`,
          target: '90%',
          pointsToGain
        }
      })
    }

    // Medium Impact: DSO optimization (up to 4 points)
    if (dsoEquivalent > 15) {
      const pointsToGain = 4 - (scores?.dsoScore || 0)
      recommendations.push({
        id: 'optimize-dso',
        priority: 'medium',
        impact: pointsToGain,
        effort: 'medium',
        timeframe: 'weekly',
        title: 'Reduce Days Sales Outstanding',
        description: `Reduce collection time to under 15 days equivalent`,
        actionItems: [
          'Streamline invoice approval process',
          'Offer early payment discounts',
          'Implement stricter collection procedures'
        ],
        metrics: {
          current: `${dsoEquivalent.toFixed(1)} days`,
          target: '<15 days',
          pointsToGain
        }
      })
    }

    return recommendations.slice(0, 3)
  }
}

class EfficiencyScoreCalculator {
  calculate(inputs: HealthScoreInputs): { score: number; breakdown: any } {
    const { timeStats, mtdCalculations } = inputs

    const currentHours = timeStats.thisMonth.hours || 0
    const mtdTarget = mtdCalculations.mtdHoursTarget
    const progressRatio = mtdTarget > 0 ? currentHours / mtdTarget : 0
    const score = Math.min(Math.round(progressRatio * 25), 25)

    return {
      score,
      breakdown: {
        currentHours,
        mtdTarget,
        progressRatio,
        progressPercentage: progressRatio * 100,
        shortfall: Math.max(0, mtdTarget - currentHours),
        avgHoursPerDay: currentHours / mtdCalculations.currentDay,
        targetHoursPerDay: mtdTarget / mtdCalculations.currentDay
      }
    }
  }

  generateExplanation(inputs: HealthScoreInputs, result: { score: number; breakdown: any }): HealthExplanation {
    const { mtdCalculations, timeStats } = inputs
    const currentRate = timeStats.thisMonth.hours > 0 ? Math.round(timeStats.thisMonth.revenue / timeStats.thisMonth.hours) : 0

    return {
      title: 'Efficiency Health - MTD (25 points max)',
      score: result.score,
      maxScore: 25,
      details: [
        {
          type: 'metrics',
          title: 'Time Tracking Data',
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
              label: 'Monthly Target',
              value: '160h'
            },
            {
              type: 'metric',
              label: 'Progress',
              value: `${result.breakdown.progressPercentage?.toFixed(1)}%`,
              emphasis: result.breakdown.progressPercentage >= 100 ? 'primary' : 'secondary'
            },
            {
              type: 'metric',
              label: 'Current Rate',
              value: `€${currentRate}/h`
            }
          ]
        },
        {
          type: 'calculations',
          title: '📊 Efficiency Analysis',
          items: [
            {
              type: 'calculation',
              label: '1. MTD Hours Target',
              value: `${result.breakdown.mtdTarget?.toFixed(1)}h`,
              description: `Day ${mtdCalculations.currentDay}/${mtdCalculations.daysInMonth} of month`,
              emphasis: 'primary'
            },
            {
              type: 'standard',
              value: `Formula: 160h × (${mtdCalculations.currentDay}/${mtdCalculations.daysInMonth}) = ${result.breakdown.mtdTarget?.toFixed(1)}h`
            },
            {
              type: 'calculation',
              label: '2. Hours Progress',
              value: `${result.breakdown.currentHours}h logged`,
              description: `→ ${result.score}/25 pts`,
              emphasis: 'primary'
            },
            {
              type: 'standard',
              value: 'Performance: >100%=Excellent, 80-100%=Good, 60-80%=Fair, <60%=Needs improvement'
            },
            {
              type: 'formula',
              formula: `Total Score: min((${result.breakdown.currentHours}h ÷ ${result.breakdown.mtdTarget?.toFixed(1)}h) × 25, 25) = ${result.score}/25`
            }
          ]
        }
      ]
    }
  }

  generateRecommendations(inputs: HealthScoreInputs, breakdown: any): HealthRecommendation[] {
    const recommendations: HealthRecommendation[] = []
    const { shortfall, progressPercentage, avgHoursPerDay, targetHoursPerDay } = breakdown
    const { mtdCalculations } = inputs

    // High Impact: Direct hours gap closure
    if (shortfall > 0) {
      const daysRemaining = mtdCalculations.daysInMonth - mtdCalculations.currentDay
      const dailyHoursNeeded = daysRemaining > 0 ? shortfall / daysRemaining : shortfall
      const pointsToGain = Math.round((shortfall / breakdown.mtdTarget) * 25)

      recommendations.push({
        id: 'close-hours-gap',
        priority: progressPercentage < 50 ? 'high' : 'medium',
        impact: pointsToGain,
        effort: shortfall > 30 ? 'high' : 'medium',
        timeframe: 'immediate',
        title: 'Close Hours Gap',
        description: `Log ${Math.round(shortfall)}h more to hit MTD target`,
        actionItems: [
          `Average ${dailyHoursNeeded.toFixed(1)}h/day for remaining ${daysRemaining} days`,
          'Focus on billable client work',
          'Minimize non-billable administrative tasks'
        ],
        metrics: {
          current: `${breakdown.currentHours}h`,
          target: `${breakdown.mtdTarget?.toFixed(1)}h`,
          pointsToGain
        }
      })
    }

    // Medium Impact: Daily productivity optimization
    if (avgHoursPerDay < targetHoursPerDay) {
      const dailyGap = targetHoursPerDay - avgHoursPerDay
      recommendations.push({
        id: 'optimize-daily-productivity',
        priority: 'medium',
        impact: Math.round((dailyGap * mtdCalculations.daysInMonth / breakdown.mtdTarget) * 25),
        effort: 'medium',
        timeframe: 'weekly',
        title: 'Optimize Daily Productivity',
        description: `Increase daily average by ${dailyGap.toFixed(1)}h`,
        actionItems: [
          'Implement time blocking for focused work',
          'Eliminate productivity distractions',
          'Set daily hour targets and track progress'
        ],
        metrics: {
          current: `${avgHoursPerDay.toFixed(1)}h/day`,
          target: `${targetHoursPerDay.toFixed(1)}h/day`,
          pointsToGain: Math.round((dailyGap * mtdCalculations.daysInMonth / breakdown.mtdTarget) * 25)
        }
      })
    }

    return recommendations.slice(0, 3)
  }
}

class RiskScoreCalculator {
  calculate(inputs: HealthScoreInputs): { score: number; breakdown: any } {
    const { dashboardMetrics, timeStats, mtdCalculations } = inputs

    const readyToBillAmount = dashboardMetrics.factureerbaar || 0
    const currentHours = timeStats.thisMonth.hours || 0
    const mtdHoursTarget = mtdCalculations.mtdHoursTarget

    // Risk penalties - use MTD-aware thresholds
    const readyToBillRisk = Math.round(Math.min((readyToBillAmount / 3000) * 12, 12))

    // Workload risk: Scale monthly thresholds to MTD
    const monthlyBurnoutThreshold = 200 // 200h/month
    const mtdBurnoutThreshold = monthlyBurnoutThreshold * mtdCalculations.monthProgress
    // Use the same MTD target as dashboard and Efficiency section for consistency
    const mtdUnderutilizationThreshold = mtdCalculations.mtdHoursTarget

    const workloadRisk = currentHours > mtdBurnoutThreshold ? 5 :
                        currentHours < mtdUnderutilizationThreshold ? 3 : 0
    const clientConcentrationRisk = 3 // Fixed moderate risk

    const score = Math.max(0, 25 - readyToBillRisk - workloadRisk - clientConcentrationRisk)

    return {
      score,
      breakdown: {
        readyToBillAmount,
        currentHours,
        mtdHoursTarget,
        thresholds: {
          mtdBurnoutThreshold,
          mtdUnderutilizationThreshold,
          monthlyBurnoutThreshold,
          monthlyUnderutilizationThreshold: 160 // Fixed monthly threshold
        },
        penalties: {
          readyToBillRisk,
          workloadRisk,
          clientConcentrationRisk
        },
        totalPenalty: readyToBillRisk + workloadRisk + clientConcentrationRisk
      }
    }
  }

  generateExplanation(inputs: HealthScoreInputs, result: { score: number; breakdown: any }): HealthExplanation {
    const { timeStats, mtdCalculations } = inputs
    const { readyToBillAmount, currentHours, penalties, thresholds } = result.breakdown

    return {
      title: 'Risk Management - Operational (25 points max)',
      score: result.score,
      maxScore: 25,
      details: [
        {
          type: 'metrics',
          title: 'Business Risk Data',
          items: [
            {
              type: 'metric',
              label: 'Ready to Bill',
              value: `€${readyToBillAmount?.toLocaleString() || 0}`,
              description: 'Respects client frequencies',
              emphasis: readyToBillAmount > 3000 ? 'secondary' : 'primary'
            },
            {
              type: 'metric',
              label: 'Total Unbilled',
              value: `€${timeStats.unbilled?.revenue?.toLocaleString() || 0}`,
              description: 'Includes current periods'
            },
            {
              type: 'metric',
              label: 'MTD Hours',
              value: `${currentHours}h`,
              description: `Day ${mtdCalculations.currentDay}/${mtdCalculations.daysInMonth}`,
              emphasis: currentHours > thresholds?.mtdBurnoutThreshold || currentHours < thresholds?.mtdUnderutilizationThreshold ? 'secondary' : 'primary'
            }
          ]
        },
        {
          type: 'calculations',
          title: '📊 Risk Assessment Analysis',
          items: [
            {
              type: 'calculation',
              label: '1. Invoice Processing Risk',
              value: `€${readyToBillAmount?.toLocaleString() || 0}`,
              description: `→ -${penalties?.readyToBillRisk || 0}/12 pts`,
              emphasis: 'primary'
            },
            {
              type: 'standard',
              value: 'Risk: >€3k ready-to-bill = delayed invoice processing'
            },
            {
              type: 'calculation',
              label: '2. Workload Risk (MTD)',
              value: `${currentHours}h MTD`,
              description: `→ -${penalties?.workloadRisk || 0}/5 pts`,
              emphasis: 'primary'
            },
            {
              type: 'standard',
              value: `MTD Thresholds: >${thresholds?.mtdBurnoutThreshold?.toFixed(1) || 0}h = Burnout, <${thresholds?.mtdUnderutilizationThreshold?.toFixed(1) || 0}h = Underutilization`
            },
            {
              type: 'standard',
              value: `(Based on monthly: >200h = Burnout, <160h = Underutilization)`
            },
            {
              type: 'calculation',
              label: '3. Business Continuity',
              value: 'Client concentration risk',
              description: `→ -${penalties?.clientConcentrationRisk || 0}/3 pts`,
              emphasis: 'primary'
            },
            {
              type: 'formula',
              formula: `Total Score: 25 - ${penalties?.readyToBillRisk || 0} - ${penalties?.workloadRisk || 0} - ${penalties?.clientConcentrationRisk || 0} = ${result.score}/25`
            }
          ]
        }
      ]
    }
  }

  generateRecommendations(inputs: HealthScoreInputs, breakdown: any): HealthRecommendation[] {
    const recommendations: HealthRecommendation[] = []
    const { readyToBillAmount, currentHours, penalties } = breakdown

    // Calculate MTD thresholds for workload recommendations
    const monthlyBurnoutThreshold = 200 // 200h/month
    const mtdBurnoutThreshold = monthlyBurnoutThreshold * inputs.mtdCalculations.monthProgress
    // Use the same MTD target as Efficiency section for consistency
    const mtdUnderutilizationThreshold = inputs.mtdCalculations.mtdHoursTarget

    // High Impact: Ready-to-bill reduction (up to 12 points)
    if (penalties.readyToBillRisk > 0) {
      const targetReduction = Math.max(0, readyToBillAmount - 3000)
      recommendations.push({
        id: 'reduce-billing-backlog',
        priority: 'high',
        impact: penalties.readyToBillRisk,
        effort: readyToBillAmount > 6000 ? 'high' : 'medium',
        timeframe: 'immediate',
        title: 'Reduce Billing Backlog',
        description: `Invoice €${Math.round(targetReduction)} ready-to-bill to reduce processing risk`,
        actionItems: [
          'Process pending invoices immediately',
          'Review client billing schedules',
          'Implement automated invoicing workflows'
        ],
        metrics: {
          current: `€${readyToBillAmount?.toLocaleString() || 0}`,
          target: '€3,000',
          pointsToGain: penalties.readyToBillRisk
        }
      })
    }

    // Medium Impact: Workload optimization (up to 5 points)
    if (penalties.workloadRisk > 0) {
      if (currentHours > mtdBurnoutThreshold) {
        recommendations.push({
          id: 'reduce-burnout-risk',
          priority: 'medium',
          impact: 5,
          effort: 'medium',
          timeframe: 'weekly',
          title: 'Reduce Burnout Risk',
          description: `Reduce workload by ${Math.round(currentHours - mtdBurnoutThreshold)}h to avoid burnout`,
          actionItems: [
            'Delegate non-critical tasks',
            'Implement better work-life balance',
            'Review project scope and timelines'
          ],
          metrics: {
            current: `${currentHours}h`,
            target: `≤${Math.round(mtdBurnoutThreshold)}h`,
            pointsToGain: 5
          }
        })
      } else if (currentHours < mtdUnderutilizationThreshold) {
        recommendations.push({
          id: 'increase-utilization',
          priority: 'medium',
          impact: 3,
          effort: 'medium',
          timeframe: 'weekly',
          title: 'Increase Utilization',
          description: `Increase activity by ${Math.round(mtdUnderutilizationThreshold - currentHours)}h to reach optimal levels (Target: ${Math.round(mtdUnderutilizationThreshold)}h)`,
          actionItems: [
            'Pursue additional client opportunities',
            'Focus on billable activities',
            'Review capacity planning'
          ],
          metrics: {
            current: `${currentHours}h`,
            target: `≥${Math.round(mtdUnderutilizationThreshold)}h`,
            pointsToGain: 3
          }
        })
      }
    }

    return recommendations.slice(0, 3)
  }
}

// ================== MAIN DECISION TREE ENGINE ==================

export class HealthScoreDecisionTree {
  private revenueCalculator = new RevenueScoreCalculator()
  private cashflowCalculator = new CashFlowScoreCalculator()
  private efficiencyCalculator = new EfficiencyScoreCalculator()
  private riskCalculator = new RiskScoreCalculator()

  /**
   * Main decision tree execution: Input → Transform → Output
   */
  public process(inputs: HealthScoreInputs): HealthScoreOutputs {
    // TRANSFORM: Calculate all scores
    const revenueResult = this.revenueCalculator.calculate(inputs)
    const cashflowResult = this.cashflowCalculator.calculate(inputs)
    const efficiencyResult = this.efficiencyCalculator.calculate(inputs)
    const riskResult = this.riskCalculator.calculate(inputs)

    const total = revenueResult.score + cashflowResult.score + efficiencyResult.score + riskResult.score
    const totalRounded = Math.round(total)

    // OUTPUT: Generate comprehensive results
    return {
      scores: {
        revenue: revenueResult.score,
        cashflow: cashflowResult.score,
        efficiency: efficiencyResult.score,
        risk: riskResult.score,
        total,
        totalRounded
      },
      explanations: {
        revenue: this.revenueCalculator.generateExplanation(inputs, revenueResult),
        cashflow: this.cashflowCalculator.generateExplanation(inputs, cashflowResult),
        efficiency: this.efficiencyCalculator.generateExplanation(inputs, efficiencyResult),
        risk: this.riskCalculator.generateExplanation(inputs, riskResult)
      },
      recommendations: {
        revenue: this.revenueCalculator.generateRecommendations(inputs, revenueResult.breakdown),
        cashflow: this.cashflowCalculator.generateRecommendations(inputs, cashflowResult.breakdown),
        efficiency: this.efficiencyCalculator.generateRecommendations(inputs, efficiencyResult.breakdown),
        risk: this.riskCalculator.generateRecommendations(inputs, riskResult.breakdown)
      },
      insights: this.generateInsights({
        revenue: this.revenueCalculator.generateRecommendations(inputs, revenueResult.breakdown),
        cashflow: this.cashflowCalculator.generateRecommendations(inputs, cashflowResult.breakdown),
        efficiency: this.efficiencyCalculator.generateRecommendations(inputs, efficiencyResult.breakdown),
        risk: this.riskCalculator.generateRecommendations(inputs, riskResult.breakdown)
      })
    }
  }

  private generateInsights(recommendations: any): { topPriorities: string[]; quickWins: string[]; longTermGoals: string[] } {
    const allRecommendations = [
      ...recommendations.revenue,
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
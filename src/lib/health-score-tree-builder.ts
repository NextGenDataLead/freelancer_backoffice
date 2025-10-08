/**
 * Shared Health Score Tree Builder
 * Single source of truth for building health score hierarchical structures
 * Used by both Organogram and Tree View components
 */

export interface HealthScoreTreeNode {
  id: string
  name: string
  score: number
  maxScore: number
  contribution: number
  level: number
  description?: string
  calculationValue?: string
  calculationDescription?: string
  isCalculationDriver?: boolean
  metricId?: string
  hasDetailedBreakdown?: boolean
  children?: HealthScoreTreeNode[]
  detailedCalculation?: any
}

/**
 * Build Profit Health tree structure
 */
export function buildProfitTree(scores: any, breakdown: any): HealthScoreTreeNode {
  const children: HealthScoreTreeNode[] = []

  // Use actual calculated scores from breakdown
  if (breakdown && breakdown.profit && breakdown.profit.scores) {
    const { hourlyRateScore, timeUtilizationScore } = breakdown.profit.scores
    const profitBreakdown = breakdown.profit

    children.push(
      {
        id: 'hourly_rate_value',
        name: 'Hourly Rate Value',
        score: hourlyRateScore || 0,
        maxScore: 10,
        contribution: 40, // 10/25 * 100
        level: 1,
        description: `Current effective hourly rate vs target rate`,
        calculationValue: `${profitBreakdown.targetRate > 0 ? Math.round((profitBreakdown.currentRate / profitBreakdown.targetRate) * 100) : 0}%`,
        calculationDescription: `Current Rate: €${profitBreakdown.currentRate?.toFixed(0) || 0}/hr vs €${profitBreakdown.targetRate || 0}/hr (${profitBreakdown.targetRate > 0 ? Math.round((profitBreakdown.currentRate / profitBreakdown.targetRate) * 100) : 0}%) → ${hourlyRateScore}/10 pts`,
        isCalculationDriver: true,
        metricId: 'hourly_rate_value',
        hasDetailedBreakdown: false
      },
      {
        id: 'time_utilization_efficiency',
        name: 'Time Utilization Efficiency',
        score: timeUtilizationScore || 0,
        maxScore: 15,
        contribution: 60, // 15/25 * 100
        level: 1,
        description: `${profitBreakdown.currentHours || 0}h of ${profitBreakdown.mtdTargetHours || 0}h monthly target (rolling 30-day)`,
        calculationValue: `${profitBreakdown.currentHours || 0}h / ${profitBreakdown.mtdTargetHours || 0}h`,
        calculationDescription: `Current Hours (30-day rolling): ${profitBreakdown.currentHours || 0}h, Monthly Target: ${profitBreakdown.mtdTargetHours || 0}h → ${timeUtilizationScore}/15 pts`,
        isCalculationDriver: true,
        metricId: 'time_utilization_efficiency',
        hasDetailedBreakdown: true,
        detailedCalculation: profitBreakdown.timeUtilizationBreakdown,
        children: [
          {
            id: 'hours_progress',
            name: 'Hours Progress',
            score: profitBreakdown.timeUtilizationComponents?.hoursScore || 0,
            maxScore: 6,
            contribution: 50, // 50% of Time Utilization
            level: 2,
            description: `${profitBreakdown.currentHours || 0}h of ${profitBreakdown.mtdTargetHours || 0}h monthly target (rolling 30-day)`,
            calculationValue: `${((profitBreakdown.currentHours || 0) / Math.max(profitBreakdown.mtdTargetHours || 1, 1) * 100).toFixed(1)}%`,
            calculationDescription: `Hours Progress (30-day rolling): ${profitBreakdown.currentHours || 0}h / ${profitBreakdown.mtdTargetHours || 0}h monthly target (${((profitBreakdown.currentHours || 0) / Math.max(profitBreakdown.mtdTargetHours || 1, 1) * 100).toFixed(1)}%) → ${profitBreakdown.timeUtilizationComponents?.hoursScore || 0}/6 pts`,
            isCalculationDriver: true,
            metricId: 'hours_progress',
            hasDetailedBreakdown: false
          },
          {
            id: 'billable_ratio',
            name: 'Billable Ratio',
            score: profitBreakdown.timeUtilizationComponents?.billableScore || 0,
            maxScore: 6,
            contribution: 50, // 50% of Time Utilization
            level: 2,
            description: `${(profitBreakdown.actualBillableRatio || 0).toFixed(1)}% actual vs ${profitBreakdown.targetBillableRatio || 90}% target (rolling 30-day)`,
            calculationValue: `${(profitBreakdown.actualBillableRatio || 0).toFixed(1)}%`,
            calculationDescription: `Billable Ratio (30-day rolling): ${(profitBreakdown.actualBillableRatio || 0).toFixed(1)}% vs ${profitBreakdown.targetBillableRatio || 90}% (${profitBreakdown.targetBillableRatio > 0 ? ((profitBreakdown.actualBillableRatio / profitBreakdown.targetBillableRatio) * 100).toFixed(1) : 0}%) → ${profitBreakdown.timeUtilizationComponents?.billableScore || 0}/6 pts`,
            isCalculationDriver: true,
            metricId: 'billable_ratio',
            hasDetailedBreakdown: false
          }
        ]
      }
    )
  }

  return {
    id: 'profit',
    name: 'Profit Health',
    score: scores.profit || 0,
    maxScore: 25,
    contribution: 100,
    level: 0,
    description: 'Revenue generation and value creation efficiency',
    metricId: 'profit_health_overview',
    hasDetailedBreakdown: false,
    children: children.length > 0 ? children : undefined
  }
}

/**
 * Build Cash Flow Health tree structure
 */
export function buildCashflowTree(scores: any, breakdown: any): HealthScoreTreeNode {
  const children: HealthScoreTreeNode[] = []

  // Use actual calculated scores from breakdown
  if (breakdown && breakdown.cashflow && breakdown.cashflow.scores) {
    const { dioScore, volumeScore, absoluteAmountScore } = breakdown.cashflow.scores
    children.push(
      {
        id: 'collection_speed',
        name: 'Days Invoices Overdue (DIO)',
        score: dioScore || 0,
        maxScore: 15,
        contribution: 15 / 25 * 100,
        level: 1,
        description: `${breakdown.cashflow.dioEquivalent?.toFixed(1)} days average overdue (${breakdown.cashflow.paymentTerms || 30} day terms)`,
        calculationValue: `${breakdown.cashflow.dioEquivalent?.toFixed(1)} days`,
        calculationDescription: `DIO (Days Invoices Overdue): ${breakdown.cashflow.dioEquivalent?.toFixed(1)} days (Payment Terms: ${breakdown.cashflow.paymentTerms || 30} days) → ${dioScore}/15 pts`,
        isCalculationDriver: true,
        metricId: 'collection_speed',
        hasDetailedBreakdown: false
      },
      {
        id: 'volume_efficiency',
        name: 'Volume Efficiency',
        score: volumeScore || 0,
        maxScore: 5,
        contribution: 5 / 25 * 100,
        level: 1,
        description: `${breakdown.cashflow.overdueCount} overdue ${breakdown.cashflow.overdueCount === 1 ? 'invoice' : 'invoices'}`,
        calculationValue: `${breakdown.cashflow.overdueCount} overdue ${breakdown.cashflow.overdueCount === 1 ? 'invoice' : 'invoices'}`,
        calculationDescription: `Overdue count: ${breakdown.cashflow.overdueCount} ${breakdown.cashflow.overdueCount === 1 ? 'invoice' : 'invoices'} → ${volumeScore}/5 pts`,
        isCalculationDriver: true,
        metricId: 'volume_efficiency',
        hasDetailedBreakdown: false
      },
      {
        id: 'absolute_amount_control',
        name: 'Absolute Amount Control',
        score: absoluteAmountScore || 0,
        maxScore: 5,
        contribution: 5 / 25 * 100,
        level: 1,
        description: `€${breakdown.cashflow.overdueAmount?.toLocaleString() || 0} total overdue`,
        calculationValue: `€${breakdown.cashflow.overdueAmount?.toLocaleString() || 0} overdue`,
        calculationDescription: `Overdue amount: €${breakdown.cashflow.overdueAmount?.toLocaleString() || 0} → ${absoluteAmountScore}/5 pts`,
        isCalculationDriver: true,
        metricId: 'absolute_amount_control',
        hasDetailedBreakdown: false
      }
    )
  }

  return {
    id: 'cashflow',
    name: 'Cash Flow Health',
    score: scores.cashflow || 0,
    maxScore: 25,
    contribution: 100,
    level: 0,
    description: 'Payment collection and outstanding invoice management',
    metricId: 'cashflow_health_overview',
    hasDetailedBreakdown: false,
    children: children.length > 0 ? children : undefined
  }
}

/**
 * Build Efficiency Health tree structure
 */
export function buildEfficiencyTree(scores: any, breakdown: any): HealthScoreTreeNode {
  const children: HealthScoreTreeNode[] = []

  // Use actual calculated scores from breakdown
  if (breakdown && breakdown.efficiency && breakdown.efficiency.scores) {
    const { driScore, volumeScore, absoluteAmountScore } = breakdown.efficiency.scores
    children.push(
      {
        id: 'invoicing_speed',
        name: 'Days Ready to Invoice (DRI)',
        score: driScore || 0,
        maxScore: 15,
        contribution: 15 / 25 * 100,
        level: 1,
        description: `${breakdown.efficiency.averageDRI?.toFixed(1)} days average ready-to-invoice time`,
        calculationValue: `${breakdown.efficiency.averageDRI?.toFixed(1)} days`,
        calculationDescription: `DRI: ${breakdown.efficiency.averageDRI?.toFixed(1)} days → ${driScore}/15 pts`,
        isCalculationDriver: true,
        metricId: 'invoicing_speed',
        hasDetailedBreakdown: false
      },
      {
        id: 'volume_efficiency_unbilled',
        name: 'Volume Efficiency',
        score: volumeScore || 0,
        maxScore: 5,
        contribution: 5 / 25 * 100,
        level: 1,
        description: `${breakdown.efficiency.unbilledCount || 0} clients with ready-to-invoice work`,
        calculationValue: `${breakdown.efficiency.unbilledCount || 0} clients`,
        calculationDescription: `Volume: ${breakdown.efficiency.unbilledCount || 0} clients ready to invoice → ${volumeScore}/5 pts`,
        isCalculationDriver: true,
        metricId: 'volume_efficiency',
        hasDetailedBreakdown: false
      },
      {
        id: 'absolute_amount_unbilled',
        name: 'Absolute Amount Control',
        score: absoluteAmountScore || 0,
        maxScore: 5,
        contribution: 5 / 25 * 100,
        level: 1,
        description: `€${breakdown.efficiency.unbilledValue?.toFixed(0) || 0} ready to invoice`,
        calculationValue: `€${breakdown.efficiency.unbilledValue?.toFixed(0) || 0}`,
        calculationDescription: `Amount: €${breakdown.efficiency.unbilledValue?.toFixed(0) || 0} ready to invoice → ${absoluteAmountScore}/5 pts`,
        isCalculationDriver: true,
        metricId: 'absolute_amount_control',
        hasDetailedBreakdown: false
      }
    )
  }

  return {
    id: 'efficiency',
    name: 'Efficiency Health',
    score: scores.efficiency || 0,
    maxScore: 25,
    contribution: 100,
    level: 0,
    description: 'How well work is converted to revenue',
    metricId: 'efficiency_health_overview',
    hasDetailedBreakdown: false,
    children: children.length > 0 ? children : undefined
  }
}

/**
 * Build Risk Management tree structure
 */
export function buildRiskTree(scores: any, breakdown: any): HealthScoreTreeNode {
  const children: HealthScoreTreeNode[] = []

  // Risk uses penalty-based scoring: Final Score = 25 - total penalties
  if (breakdown && breakdown.risk && breakdown.risk.penalties) {
    const { clientRisk, businessContinuityRisk, dailyConsistencyRisk, daysRisk, hoursRisk } = breakdown.risk.penalties
    const topClient = breakdown.risk.topClient
    const topClientShare = breakdown.risk.topClientShare || 0

    // Business Continuity Risk breakdown data
    const businessBreakdown = breakdown.risk.businessContinuityBreakdown || {}
    const {
      revenueStabilityRisk = 0,
      clientConcentrationTrendRisk = 0,
      consistencyTrendRisk = 0,
      current30DaysBillableRevenue = 0,
      previous30DaysBillableRevenue = 0,
      current30DaysClientShare = 0,
      previous30DaysClientShare = 0,
      current30DaysDailyHours = 0,
      previous30DaysDailyHours = 0
    } = businessBreakdown

    // Daily Consistency data
    const targetDaysPerWeek = breakdown.risk.targetDaysPerWeek || 5
    const estimatedDaysPerWeek = breakdown.risk.estimatedDaysPerWeek || 0
    const targetDailyHours = breakdown.risk.targetDailyHours || 8
    const actualDailyHours = breakdown.risk.actualDailyHours || 0

    const clientRiskValue = topClient
      ? `${topClientShare.toFixed(1)}%`
      : 'No client data'

    children.push(
      {
        id: 'client_concentration_risk',
        name: 'Client Concentration Risk',
        score: Math.max(0, 9 - (clientRisk || 0)),
        maxScore: 9,
        contribution: 36, // 36% of Risk category
        level: 1,
        description: `Top client: ${topClientShare.toFixed(1)}% of revenue (rolling 30 days)`,
        calculationValue: `${topClientShare.toFixed(1)}% concentration`,
        calculationDescription: topClient
          ? `Client concentration (30-day): ${topClient.name} (${topClientShare.toFixed(1)}%) → ${Math.max(0, 9 - (clientRisk || 0)).toFixed(1)}/9 pts`
          : `Client concentration (30-day): ${topClientShare.toFixed(1)}% → ${Math.max(0, 9 - (clientRisk || 0)).toFixed(1)}/9 pts`,
        isCalculationDriver: true,
        metricId: 'client_concentration_risk',
        hasDetailedBreakdown: false
      },
      {
        id: 'daily_consistency_risk',
        name: 'Daily Consistency Risk',
        score: Math.max(0, 8 - (dailyConsistencyRisk || 0)),
        maxScore: 8,
        contribution: 32, // 32% of Risk category
        level: 1,
        description: `${actualDailyHours.toFixed(1)}h/day vs ${targetDailyHours}h target (rolling 30 days)`,
        calculationValue: `${((Math.abs(actualDailyHours - targetDailyHours) / targetDailyHours) * 100).toFixed(1)}% deviation`,
        calculationDescription: `Daily consistency (30-day): ${actualDailyHours.toFixed(1)}h vs ${targetDailyHours}h → ${Math.max(0, 8 - (dailyConsistencyRisk || 0)).toFixed(1)}/8 pts`,
        isCalculationDriver: true,
        metricId: 'daily_consistency_risk',
        hasDetailedBreakdown: true,
        children: [
          {
            id: 'days_per_week_risk',
            name: 'Days/Week',
            score: Math.max(0, 4 - (daysRisk || 0)),
            maxScore: 4,
            contribution: 50, // 50% of Daily Consistency
            level: 2,
            description: `${estimatedDaysPerWeek.toFixed(1)} days/week vs ${targetDaysPerWeek} target (rolling 30 days)`,
            calculationValue: `${estimatedDaysPerWeek.toFixed(1)} days`,
            calculationDescription: `Days/week (30-day): ${estimatedDaysPerWeek.toFixed(1)} vs ${targetDaysPerWeek} target → ${Math.max(0, 4 - (daysRisk || 0)).toFixed(1)}/4 pts`,
            isCalculationDriver: true,
            metricId: 'days_per_week_risk',
            hasDetailedBreakdown: false
          },
          {
            id: 'hours_per_day_risk',
            name: 'Hours/Day',
            score: Math.max(0, 4 - (hoursRisk || 0)),
            maxScore: 4,
            contribution: 50, // 50% of Daily Consistency
            level: 2,
            description: `${actualDailyHours.toFixed(1)}h/day vs ${targetDailyHours.toFixed(1)}h target (rolling 30 days)`,
            calculationValue: `${actualDailyHours.toFixed(1)}h`,
            calculationDescription: `Hours/day (30-day): ${actualDailyHours.toFixed(1)} vs ${targetDailyHours.toFixed(1)} target → ${Math.max(0, 4 - (hoursRisk || 0)).toFixed(1)}/4 pts`,
            isCalculationDriver: true,
            metricId: 'hours_per_day_risk',
            hasDetailedBreakdown: false
          }
        ]
      },
      {
        id: 'business_continuity_risk',
        name: 'Business Continuity Risk',
        score: Math.max(0, 8 - (businessContinuityRisk || 0)),
        maxScore: 8,
        contribution: 32, // 32% of Risk category
        level: 1,
        description: 'Revenue and stability trend analysis (rolling 30 days)',
        calculationValue: `${businessContinuityRisk.toFixed(1)} penalty`,
        calculationDescription: `Business trends (30-day): ${businessContinuityRisk.toFixed(1)} penalty → ${Math.max(0, 8 - (businessContinuityRisk || 0)).toFixed(1)}/8 pts`,
        isCalculationDriver: true,
        metricId: 'business_continuity_risk',
        hasDetailedBreakdown: true,
        children: [
          {
            id: 'revenue_stability_risk',
            name: 'Revenue Stream Stability',
            score: Math.max(0, 3 - (revenueStabilityRisk || 0)),
            maxScore: 3,
            contribution: 37.5, // 37.5% of Business Continuity
            level: 2,
            description: `${current30DaysBillableRevenue > previous30DaysBillableRevenue ? 'Growing' : 'Declining'} (rolling 30 days)`,
            calculationValue: `${previous30DaysBillableRevenue > 0 ? ((current30DaysBillableRevenue / previous30DaysBillableRevenue) * 100).toFixed(1) : '0'}% vs prev 30d`,
            calculationDescription: `Revenue trend: €${current30DaysBillableRevenue.toFixed(0)} vs €${previous30DaysBillableRevenue.toFixed(0)} (prev 30d) → ${Math.max(0, 3 - (revenueStabilityRisk || 0)).toFixed(1)}/3 pts`,
            isCalculationDriver: true,
            metricId: 'revenue_stability_risk',
            hasDetailedBreakdown: false
          },
          {
            id: 'client_concentration_trend_risk',
            name: 'Client Concentration Trend',
            score: Math.max(0, 2.5 - (clientConcentrationTrendRisk || 0)),
            maxScore: 2.5,
            contribution: 31.25, // 31.25% of Business Continuity
            level: 2,
            description: `${current30DaysClientShare > previous30DaysClientShare ? 'Concentrating' : 'Diversifying'} (rolling 30 days)`,
            calculationValue: `${current30DaysClientShare.toFixed(1)}% (was ${previous30DaysClientShare.toFixed(1)}%)`,
            calculationDescription: `Client trend: ${current30DaysClientShare.toFixed(1)}% vs ${previous30DaysClientShare.toFixed(1)}% (prev 30d) → ${Math.max(0, 2.5 - (clientConcentrationTrendRisk || 0)).toFixed(1)}/2.5 pts`,
            isCalculationDriver: true,
            metricId: 'client_concentration_trend_risk',
            hasDetailedBreakdown: false
          },
          {
            id: 'consistency_trend_risk',
            name: 'Daily Consistency Trend',
            score: Math.max(0, 2.5 - (consistencyTrendRisk || 0)),
            maxScore: 2.5,
            contribution: 31.25, // 31.25% of Business Continuity
            level: 2,
            description: `${current30DaysDailyHours > previous30DaysDailyHours ? 'Improving' : 'Deteriorating'} (rolling 30 days)`,
            calculationValue: `${current30DaysDailyHours.toFixed(1)}h/day (was ${previous30DaysDailyHours.toFixed(1)}h)`,
            calculationDescription: `Consistency trend: ${current30DaysDailyHours.toFixed(1)}h vs ${previous30DaysDailyHours.toFixed(1)}h (prev 30d) → ${Math.max(0, 2.5 - (consistencyTrendRisk || 0)).toFixed(1)}/2.5 pts`,
            isCalculationDriver: true,
            metricId: 'consistency_trend_risk',
            hasDetailedBreakdown: false
          }
        ]
      }
    )
  }

  return {
    id: 'risk',
    name: 'Risk Management',
    score: scores.risk || 0,
    maxScore: 25,
    contribution: 100,
    level: 0,
    description: 'Business continuity and operational risk factors',
    metricId: 'risk_health_overview',
    hasDetailedBreakdown: false,
    children: children.length > 0 ? children : [{
      id: 'no_data_risk',
      name: 'No Data Available',
      score: 0,
      maxScore: 25,
      contribution: 100,
      level: 1,
      hasDetailedBreakdown: false
    }]
  }
}

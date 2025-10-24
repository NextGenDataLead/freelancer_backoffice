import { describe, it, expect } from 'vitest'
import { healthScoreEngine, type HealthScoreInputs } from '../health-score-engine'

function createBaseInputs(overrides: Partial<HealthScoreInputs> = {}): HealthScoreInputs {
  const nowIso = new Date().toISOString()

  const baseInputs: HealthScoreInputs = {
    dashboardMetrics: {
      totale_registratie: 12000,
      achterstallig: 1500,
      achterstallig_count: 3,
      factureerbaar: 11000,
      factureerbaar_count: 5,
      actual_dso: 25,
      average_payment_terms: 30,
      average_dri: 12,
      rolling30DaysRevenue: {
        current: 12000,
        previous: 11000
      },
      lastRecurringExpenseRegistration: nowIso
    },
    timeStats: {
      thisMonth: {
        hours: 90,
        revenue: 9000,
        billableHours: 80,
        nonBillableHours: 10
      },
      unbilled: {
        hours: 6,
        revenue: 600,
        value: 600
      },
      subscription: {
        monthlyActiveUsers: { current: 0 },
        averageSubscriptionFee: { current: 0 }
      },
      rolling30Days: {
        current: {
          billableRevenue: 9000,
          distinctWorkingDays: 18,
          totalHours: 90,
          dailyHours: 5,
          billableHours: 80,
          nonBillableHours: 10,
          unbilledHours: 6,
          unbilledValue: 600
        },
        previous: {
          billableRevenue: 8500,
          distinctWorkingDays: 17,
          totalHours: 85,
          dailyHours: 5,
          billableHours: 75,
          nonBillableHours: 10,
          unbilledHours: 8,
          unbilledValue: 800
        }
      }
    },
    mtdCalculations: {
      currentDay: 15,
      daysInMonth: 30,
      monthProgress: 0.5,
      mtdRevenueTarget: 6000,
      mtdHoursTarget: 80
    },
    profitTargets: {
      monthly_revenue_target: 15000,
      monthly_cost_target: 6000,
      monthly_profit_target: 9000,
      monthly_hours_target: 120,
      target_hourly_rate: 75,
      target_billable_ratio: 90,
      target_working_days_per_week: [1, 2, 3, 4, 5],
      target_monthly_active_users: 0,
      target_avg_subscription_fee: 0,
      setup_completed: true
    }
  }

  return {
    ...baseInputs,
    ...overrides,
    dashboardMetrics: {
      ...baseInputs.dashboardMetrics,
      ...overrides.dashboardMetrics
    },
    timeStats: {
      ...baseInputs.timeStats,
      ...overrides.timeStats
    },
    mtdCalculations: {
      ...baseInputs.mtdCalculations,
      ...overrides.mtdCalculations
    },
    profitTargets: {
      ...baseInputs.profitTargets,
      ...overrides.profitTargets
    }
  }
}

describe('Cash Flow recurring expense penalties', () => {
  it('does not apply a penalty when recurring expenses are up to date', () => {
    const result = healthScoreEngine.process(createBaseInputs())

    expect(result.breakdown.cashflow.recurringExpensePenalty).toBe(0)
    expect(result.breakdown.cashflow.recurringExpensePenaltyBreakdown).toBeNull()
  })

  it('applies a moderate penalty when a small number of recurring expenses are overdue', () => {
    const inputs = createBaseInputs({
      dashboardMetrics: {
        recurringExpensesDue: {
          totalCount: 2,
          totalAmount: 800,
          templates: [
            {
              templateId: 'template-1',
              templateName: 'SaaS subscription',
              frequency: 'monthly',
              occurrencesDue: 2,
              totalAmount: 800,
              nextOccurrenceDate: '2024-10-15',
              lastOccurrenceDate: '2024-09-15'
            }
          ]
        }
      }
    })

    const baseScore = healthScoreEngine.process(createBaseInputs())
    const result = healthScoreEngine.process(inputs)

    expect(result.breakdown.cashflow.recurringExpensePenalty).toBe(2)
    expect(result.breakdown.cashflow.recurringExpensePenaltyBreakdown?.type).toBe('due_occurrences')
    expect(result.breakdown.cashflow.recurringExpensePenaltyBreakdown?.totalCount).toBe(2)
    expect(result.scores.cashflow).toBeCloseTo(baseScore.scores.cashflow - 2, 1)
  })

  it('applies the maximum penalty when several recurring expenses are missed', () => {
    const inputs = createBaseInputs({
      dashboardMetrics: {
        recurringExpensesDue: {
          totalCount: 6,
          totalAmount: 4200,
          templates: [
            {
              templateId: 'template-2',
              templateName: 'Office rent',
              frequency: 'monthly',
              occurrencesDue: 3,
              totalAmount: 3000,
              nextOccurrenceDate: '2024-10-01',
              lastOccurrenceDate: '2024-08-01'
            },
            {
              templateId: 'template-3',
              templateName: 'Software bundle',
              frequency: 'monthly',
              occurrencesDue: 3,
              totalAmount: 1200,
              nextOccurrenceDate: '2024-10-12',
              lastOccurrenceDate: '2024-08-12'
            }
          ]
        }
      }
    })

    const baseScore = healthScoreEngine.process(createBaseInputs())
    const result = healthScoreEngine.process(inputs)

    expect(result.breakdown.cashflow.recurringExpensePenalty).toBe(5)
    expect(result.breakdown.cashflow.recurringExpensePenaltyBreakdown?.severity).toBe('high')
    expect(result.scores.cashflow).toBeCloseTo(baseScore.scores.cashflow - 5, 1)
  })
})

/**
 * Health Score Redistribution Tests
 *
 * Tests the new fair scoring system that redistributes points based on business model
 * to eliminate the 18 free points bug for time-only freelancers.
 */

import { describe, it, expect, vi } from 'vitest'

// Import the health score engine
import { healthScoreEngine } from '../health-score-engine'
import type { HealthScoreInputs } from '../health-score-engine'

describe('Health Score Redistribution', () => {
  // Test data setup
  const baseDashboardMetrics = {
    totale_registratie: 5000, // €5,000 revenue
    achterstallig: 500,       // €500 overdue
    achterstallig_count: 2,   // 2 overdue invoices
    factureerbaar: 4500       // €4,500 billable
  }

  const baseMtdCalculations = {
    currentDay: 15,
    daysInMonth: 30,
    monthProgress: 0.5,
    mtdRevenueTarget: 2500,
    mtdHoursTarget: 60
  }

  const createTimeStats = (subscription = false) => ({
    thisMonth: {
      hours: 100,      // 100 hours worked
      revenue: 5000    // €5,000 revenue
    },
    unbilled: {
      hours: 10,       // 10 unbilled hours
      revenue: 700,    // €700 unbilled revenue
      value: 700
    },
    subscription: subscription ? {
      monthlyActiveUsers: { current: 13 },
      averageSubscriptionFee: { current: 75 }
    } : undefined
  })

  describe('Business Model Detection', () => {
    it('should detect time-only business model', () => {
      const inputs: HealthScoreInputs = {
        dashboardMetrics: baseDashboardMetrics,
        timeStats: createTimeStats(false),
        mtdCalculations: baseMtdCalculations,
        profitTargets: {
          monthly_revenue_target: 8000,
          monthly_cost_target: 3000,
          monthly_profit_target: 5000,
          monthly_hours_target: 120,       // ✅ Time-based enabled
          target_hourly_rate: 70,          // ✅ Time-based enabled
          target_monthly_active_users: 0,  // ❌ SaaS disabled
          target_avg_subscription_fee: 0,  // ❌ SaaS disabled
          setup_completed: true
        }
      }

      const result = healthScoreEngine.calculate(inputs)

      expect(result.scores.profit).toBeGreaterThan(0)
      expect(result.explanations.profit.breakdown?.redistribution?.businessModel).toBe('time-only')
      expect(result.explanations.profit.breakdown?.redistribution?.pointsRedistributed).toBe(true)
    })

    it('should detect saas-only business model', () => {
      const inputs: HealthScoreInputs = {
        dashboardMetrics: baseDashboardMetrics,
        timeStats: createTimeStats(true),
        mtdCalculations: baseMtdCalculations,
        profitTargets: {
          monthly_revenue_target: 8000,
          monthly_cost_target: 3000,
          monthly_profit_target: 5000,
          monthly_hours_target: 0,            // ❌ Time-based disabled
          target_hourly_rate: 0,              // ❌ Time-based disabled
          target_monthly_active_users: 15,    // ✅ SaaS enabled
          target_avg_subscription_fee: 75,    // ✅ SaaS enabled
          setup_completed: true
        }
      }

      const result = healthScoreEngine.calculate(inputs)

      expect(result.scores.profit).toBeGreaterThan(0)
      expect(result.explanations.profit.breakdown?.redistribution?.businessModel).toBe('saas-only')
      expect(result.explanations.profit.breakdown?.redistribution?.pointsRedistributed).toBe(true)
    })

    it('should detect hybrid business model', () => {
      const inputs: HealthScoreInputs = {
        dashboardMetrics: baseDashboardMetrics,
        timeStats: createTimeStats(true),
        mtdCalculations: baseMtdCalculations,
        profitTargets: {
          monthly_revenue_target: 8000,
          monthly_cost_target: 3000,
          monthly_profit_target: 5000,
          monthly_hours_target: 120,          // ✅ Time-based enabled
          target_hourly_rate: 70,             // ✅ Time-based enabled
          target_monthly_active_users: 15,    // ✅ SaaS enabled
          target_avg_subscription_fee: 75,    // ✅ SaaS enabled
          setup_completed: true
        }
      }

      const result = healthScoreEngine.calculate(inputs)

      expect(result.scores.profit).toBeGreaterThan(0)
      expect(result.explanations.profit.breakdown?.redistribution?.businessModel).toBe('hybrid')
      expect(result.explanations.profit.breakdown?.redistribution?.pointsRedistributed).toBe(false)
    })
  })

  describe('Point Redistribution Logic', () => {
    it('should redistribute 18 SaaS points to time-based categories for time-only model', () => {
      const inputs: HealthScoreInputs = {
        dashboardMetrics: baseDashboardMetrics,
        timeStats: createTimeStats(false),
        mtdCalculations: baseMtdCalculations,
        profitTargets: {
          monthly_revenue_target: 8000,
          monthly_cost_target: 3000,
          monthly_profit_target: 5000,
          monthly_hours_target: 120,
          target_hourly_rate: 70,
          target_monthly_active_users: 0,  // Disabled
          target_avg_subscription_fee: 0,  // Disabled
          setup_completed: true
        }
      }

      const result = healthScoreEngine.calculate(inputs)
      const breakdown = result.explanations.profit.breakdown

      // SaaS metrics should be 0 (no free points)
      expect(breakdown?.subscriptionMetrics?.subscriberGrowth?.score).toBe(0)
      expect(breakdown?.subscriptionMetrics?.subscriptionPricing?.score).toBe(0)
      expect(breakdown?.valueCreation?.subscriptionEffectiveness?.score).toBe(0)

      // Time-based metrics should be redistributed (enhanced points)
      const pricingScore = breakdown?.revenueMixQuality?.pricingEfficiency?.score || 0
      const rateScore = breakdown?.valueCreation?.rateOptimization?.score || 0
      const timeUtilizationScore = breakdown?.newTimeBasedMetrics?.timeUtilization?.score || 0
      const revenueQualityScore = breakdown?.newTimeBasedMetrics?.revenueQuality?.score || 0

      // Should have enhanced scoring for time-based metrics
      expect(pricingScore).toBeGreaterThan(0)
      expect(rateScore).toBeGreaterThan(0)
      expect(timeUtilizationScore).toBeGreaterThan(0)
      expect(revenueQualityScore).toBeGreaterThan(0)

      // Total should still be around 25 points (before penalties)
      const totalRedistributed = breakdown?.redistribution?.redistributedTotal || 0
      expect(totalRedistributed).toBeGreaterThan(20) // Allow for some penalties
      expect(totalRedistributed).toBeLessThanOrEqual(25)
    })

    it('should redistribute 7 time-based points to SaaS categories for saas-only model', () => {
      const inputs: HealthScoreInputs = {
        dashboardMetrics: baseDashboardMetrics,
        timeStats: createTimeStats(true),
        mtdCalculations: baseMtdCalculations,
        profitTargets: {
          monthly_revenue_target: 8000,
          monthly_cost_target: 3000,
          monthly_profit_target: 5000,
          monthly_hours_target: 0,            // Disabled
          target_hourly_rate: 0,              // Disabled
          target_monthly_active_users: 15,
          target_avg_subscription_fee: 75,
          setup_completed: true
        }
      }

      const result = healthScoreEngine.calculate(inputs)
      const breakdown = result.explanations.profit.breakdown

      // Time-based metrics should be 0 (no free points)
      expect(breakdown?.revenueMixQuality?.pricingEfficiency?.score).toBe(0)
      expect(breakdown?.valueCreation?.rateOptimization?.score).toBe(0)
      expect(breakdown?.newTimeBasedMetrics?.timeUtilization?.score).toBe(0)
      expect(breakdown?.newTimeBasedMetrics?.revenueQuality?.score).toBe(0)

      // SaaS metrics should be enhanced
      const subscriberScore = breakdown?.subscriptionMetrics?.subscriberGrowth?.score || 0
      const pricingScore = breakdown?.subscriptionMetrics?.subscriptionPricing?.score || 0
      const effectivenessScore = breakdown?.valueCreation?.subscriptionEffectiveness?.score || 0

      expect(subscriberScore).toBeGreaterThan(0)
      expect(pricingScore).toBeGreaterThan(0)
      expect(effectivenessScore).toBeGreaterThan(0)

      // Total should still be around 25 points
      const totalRedistributed = breakdown?.redistribution?.redistributedTotal || 0
      expect(totalRedistributed).toBeGreaterThan(20)
      expect(totalRedistributed).toBeLessThanOrEqual(25)
    })

    it('should not redistribute points for hybrid model', () => {
      const inputs: HealthScoreInputs = {
        dashboardMetrics: baseDashboardMetrics,
        timeStats: createTimeStats(true),
        mtdCalculations: baseMtdCalculations,
        profitTargets: {
          monthly_revenue_target: 8000,
          monthly_cost_target: 3000,
          monthly_profit_target: 5000,
          monthly_hours_target: 120,
          target_hourly_rate: 70,
          target_monthly_active_users: 15,
          target_avg_subscription_fee: 75,
          setup_completed: true
        }
      }

      const result = healthScoreEngine.calculate(inputs)
      const breakdown = result.explanations.profit.breakdown

      // Should not redistribute points
      expect(breakdown?.redistribution?.pointsRedistributed).toBe(false)
      expect(breakdown?.redistribution?.businessModel).toBe('hybrid')

      // Both types of metrics should be active
      expect(breakdown?.subscriptionMetrics?.enabled).toBe(true)
      expect(breakdown?.revenueMixQuality?.pricingEfficiency?.enabled).toBe(true)
    })
  })

  describe('Fairness Validation', () => {
    it('should eliminate the 18 free points bug for time-only freelancers', () => {
      // Poor performing time-only freelancer
      const poorTimeOnlyInputs: HealthScoreInputs = {
        dashboardMetrics: {
          totale_registratie: 1000, // Low revenue
          achterstallig: 800,       // High overdue
          achterstallig_count: 5,
          factureerbaar: 1000
        },
        timeStats: {
          thisMonth: { hours: 20, revenue: 1000 }, // Low hours, low rate
          unbilled: { hours: 10, revenue: 500, value: 500 }
        },
        mtdCalculations: baseMtdCalculations,
        profitTargets: {
          monthly_revenue_target: 8000,
          monthly_cost_target: 3000,
          monthly_profit_target: 5000,
          monthly_hours_target: 120,
          target_hourly_rate: 70,
          target_monthly_active_users: 0,  // Time-only
          target_avg_subscription_fee: 0,
          setup_completed: true
        }
      }

      // Good performing SaaS+Time business
      const goodHybridInputs: HealthScoreInputs = {
        dashboardMetrics: {
          totale_registratie: 6000, // Good revenue
          achterstallig: 100,       // Low overdue
          achterstallig_count: 1,
          factureerbaar: 6000
        },
        timeStats: {
          thisMonth: { hours: 80, revenue: 6000 },
          unbilled: { hours: 2, revenue: 150, value: 150 },
          subscription: {
            monthlyActiveUsers: { current: 12 },
            averageSubscriptionFee: { current: 65 }
          }
        },
        mtdCalculations: baseMtdCalculations,
        profitTargets: {
          monthly_revenue_target: 8000,
          monthly_cost_target: 3000,
          monthly_profit_target: 5000,
          monthly_hours_target: 120,
          target_hourly_rate: 70,
          target_monthly_active_users: 15,
          target_avg_subscription_fee: 75,
          setup_completed: true
        }
      }

      const poorResult = healthScoreEngine.calculate(poorTimeOnlyInputs)
      const goodResult = healthScoreEngine.calculate(goodHybridInputs)

      // The good performer should score higher than the poor performer
      // (Previously, poor time-only got 18 free points and could score higher)
      expect(goodResult.scores.profit).toBeGreaterThan(poorResult.scores.profit)

      // Poor time-only freelancer should get low score (no free points)
      expect(poorResult.scores.profit).toBeLessThan(15) // Should be genuinely low
    })

    it('should maintain 25-point scaling across all business models', () => {
      const businessModels = [
        { name: 'time-only', timeTargets: { hours: 120, rate: 70 }, saasTargets: { users: 0, fee: 0 } },
        { name: 'saas-only', timeTargets: { hours: 0, rate: 0 }, saasTargets: { users: 15, fee: 75 } },
        { name: 'hybrid', timeTargets: { hours: 120, rate: 70 }, saasTargets: { users: 15, fee: 75 } }
      ]

      businessModels.forEach(model => {
        const inputs: HealthScoreInputs = {
          dashboardMetrics: baseDashboardMetrics,
          timeStats: createTimeStats(model.saasTargets.users > 0),
          mtdCalculations: baseMtdCalculations,
          profitTargets: {
            monthly_revenue_target: 8000,
            monthly_cost_target: 3000,
            monthly_profit_target: 5000,
            monthly_hours_target: model.timeTargets.hours,
            target_hourly_rate: model.timeTargets.rate,
            target_monthly_active_users: model.saasTargets.users,
            target_avg_subscription_fee: model.saasTargets.fee,
            setup_completed: true
          }
        }

        const result = healthScoreEngine.calculate(inputs)
        const redistributedTotal = result.explanations.profit.breakdown?.redistribution?.redistributedTotal || 0

        // Each model should have potential for full 25 points
        expect(redistributedTotal).toBeGreaterThan(15) // Should have meaningful scoring
        expect(redistributedTotal).toBeLessThanOrEqual(25) // Should not exceed maximum
      })
    })
  })

  describe('New Metrics Calculation', () => {
    it('should calculate time utilization score correctly', () => {
      const inputs: HealthScoreInputs = {
        dashboardMetrics: baseDashboardMetrics,
        timeStats: {
          thisMonth: { hours: 100, revenue: 5000 },
          unbilled: { hours: 20, revenue: 1000, value: 1000 } // Some unbilled work
        },
        mtdCalculations: baseMtdCalculations,
        profitTargets: {
          monthly_revenue_target: 8000,
          monthly_cost_target: 3000,
          monthly_profit_target: 5000,
          monthly_hours_target: 120, // Target 120 hours
          target_hourly_rate: 70,
          target_monthly_active_users: 0,
          target_avg_subscription_fee: 0,
          setup_completed: true
        }
      }

      const result = healthScoreEngine.calculate(inputs)
      const timeUtilization = result.explanations.profit.breakdown?.newTimeBasedMetrics?.timeUtilization

      expect(timeUtilization?.enabled).toBe(true)
      expect(timeUtilization?.score).toBeGreaterThan(0)
      expect(timeUtilization?.score).toBeLessThanOrEqual(6) // Max 6 points when redistributed
      expect(timeUtilization?.components?.hoursTarget).toBe(120)
      expect(timeUtilization?.components?.currentHours).toBe(100)
      expect(timeUtilization?.components?.unbilledHours).toBe(20)
    })

    it('should calculate revenue quality score correctly', () => {
      const inputs: HealthScoreInputs = {
        dashboardMetrics: {
          totale_registratie: 5000,
          achterstallig: 500, // Some overdue amount
          achterstallig_count: 2,
          factureerbaar: 5000
        },
        timeStats: {
          thisMonth: { hours: 100, revenue: 5000 },
          unbilled: { hours: 10, revenue: 700, value: 700 } // Some unbilled value
        },
        mtdCalculations: baseMtdCalculations,
        profitTargets: {
          monthly_revenue_target: 8000,
          monthly_cost_target: 3000,
          monthly_profit_target: 5000,
          monthly_hours_target: 120,
          target_hourly_rate: 70,
          target_monthly_active_users: 0,
          target_avg_subscription_fee: 0,
          setup_completed: true
        }
      }

      const result = healthScoreEngine.calculate(inputs)
      const revenueQuality = result.explanations.profit.breakdown?.newTimeBasedMetrics?.revenueQuality

      expect(revenueQuality?.enabled).toBe(true)
      expect(revenueQuality?.score).toBeGreaterThan(0)
      expect(revenueQuality?.score).toBeLessThanOrEqual(4) // Max 4 points when redistributed
      expect(revenueQuality?.components?.totalRevenue).toBe(5000)
      expect(revenueQuality?.components?.unbilledValue).toBe(700)
      expect(revenueQuality?.components?.overdueAmount).toBe(500)
    })
  })

  describe('Backward Compatibility', () => {
    it('should maintain existing API structure', () => {
      const inputs: HealthScoreInputs = {
        dashboardMetrics: baseDashboardMetrics,
        timeStats: createTimeStats(true),
        mtdCalculations: baseMtdCalculations,
        profitTargets: {
          monthly_revenue_target: 8000,
          monthly_cost_target: 3000,
          monthly_profit_target: 5000,
          monthly_hours_target: 120,
          target_hourly_rate: 70,
          target_monthly_active_users: 15,
          target_avg_subscription_fee: 75,
          setup_completed: true
        }
      }

      const result = healthScoreEngine.calculate(inputs)

      // Verify existing structure is maintained
      expect(result.scores).toBeDefined()
      expect(result.scores.profit).toBeDefined()
      expect(result.scores.cashflow).toBeDefined()
      expect(result.scores.efficiency).toBeDefined()
      expect(result.scores.risk).toBeDefined()
      expect(result.scores.total).toBeDefined()

      expect(result.explanations).toBeDefined()
      expect(result.explanations.profit).toBeDefined()
      expect(result.recommendations).toBeDefined()
      expect(result.insights).toBeDefined()

      // Verify profit breakdown has expected structure
      const breakdown = result.explanations.profit.breakdown
      expect(breakdown?.subscriptionMetrics).toBeDefined()
      expect(breakdown?.revenueMixQuality).toBeDefined()
      expect(breakdown?.valueCreation).toBeDefined()
    })

    it('should work with incomplete profit targets', () => {
      const inputs: HealthScoreInputs = {
        dashboardMetrics: baseDashboardMetrics,
        timeStats: createTimeStats(false),
        mtdCalculations: baseMtdCalculations,
        profitTargets: {
          monthly_revenue_target: 8000,
          monthly_cost_target: 3000,
          monthly_profit_target: 5000,
          monthly_hours_target: 0, // Incomplete setup
          target_hourly_rate: 0,
          target_monthly_active_users: 0,
          target_avg_subscription_fee: 0,
          setup_completed: false
        }
      }

      const result = healthScoreEngine.calculate(inputs)

      // Should handle gracefully with disabled/incomplete targets
      expect(result.scores.profit).toBe(0)
      expect(result.explanations.profit.breakdown?.available).toBe(false)
    })
  })
})
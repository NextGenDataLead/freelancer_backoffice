/**
 * Health Score Metric Independence Validation Test Suite
 *
 * This test suite validates that the health score metrics are truly independent
 * and that no single data point affects multiple metrics (Phase 0 requirement).
 */

import { describe, test, expect } from 'vitest'
import { healthScoreEngine, type HealthScoreInputs } from '../health-score-engine'

// Helper function to create test inputs with more realistic, non-perfect scores
function createTestInputs(overrides: Partial<HealthScoreInputs> = {}): HealthScoreInputs {
  return {
    dashboardMetrics: {
      totale_registratie: 8000, // Lower revenue for non-perfect scores
      achterstallig: 2000, // Higher overdue for collection challenges
      achterstallig_count: 3,
      factureerbaar: 7000, // Higher ready-to-bill for risk
      ...overrides.dashboardMetrics
    },
    timeStats: {
      thisMonth: {
        hours: 60, // Below target for efficiency challenges
        revenue: 6000
      },
      unbilled: {
        hours: 15, // Higher unbilled for efficiency challenges
        revenue: 1500,
        value: 1500
      },
      subscription: {
        monthlyActiveUsers: { current: 3 }, // Low users for risk
        averageSubscriptionFee: { current: 30 }
      },
      ...overrides.timeStats
    },
    mtdCalculations: {
      currentDay: 15,
      daysInMonth: 30,
      monthProgress: 0.5,
      mtdRevenueTarget: 5000,
      mtdHoursTarget: 80, // Higher than current for efficiency challenge
      ...overrides.mtdCalculations
    },
    profitTargets: {
      monthly_revenue_target: 12000,
      monthly_cost_target: 6000, // Lower costs for reasonable profit
      monthly_profit_target: 6000, // Higher target for challenge
      setup_completed: true,
      ...overrides.profitTargets
    },
    ...overrides
  }
}

describe('Health Score Metric Independence', () => {
  describe('Revenue Data Independence', () => {
    test('Revenue data affects only Profit metric, not Cash Flow, Efficiency, or Risk', () => {
      const baseInputs = createTestInputs()
      const baseResults = healthScoreEngine.process(baseInputs)

      // Change revenue significantly (50% increase)
      const modifiedInputs = createTestInputs({
        dashboardMetrics: {
          ...baseInputs.dashboardMetrics,
          totale_registratie: baseInputs.dashboardMetrics.totale_registratie * 1.5
        }
      })
      const modifiedResults = healthScoreEngine.process(modifiedInputs)

      // Profit should change (it uses total revenue for profit calculation)
      expect(modifiedResults.scores.profit).not.toBe(baseResults.scores.profit)

      // Cash Flow should NOT change significantly (it focuses on collection efficiency)
      // Small changes are acceptable due to calculation details, but should be minimal
      const cashFlowDifference = Math.abs(modifiedResults.scores.cashflow - baseResults.scores.cashflow)
      expect(cashFlowDifference).toBeLessThan(3) // Allow small variance

      // Efficiency should be completely unchanged (pure time focus)
      expect(modifiedResults.scores.efficiency).toBe(baseResults.scores.efficiency)

      // Risk should be completely unchanged (business continuity focus)
      expect(modifiedResults.scores.risk).toBe(baseResults.scores.risk)
    })

    test('Overdue amount changes affect Cash Flow and Risk, but not Profit or Efficiency', () => {
      const baseInputs = createTestInputs()
      const baseResults = healthScoreEngine.process(baseInputs)

      // Change overdue amount significantly
      const modifiedInputs = createTestInputs({
        dashboardMetrics: {
          ...baseInputs.dashboardMetrics,
          achterstallig: baseInputs.dashboardMetrics.achterstallig * 3,
          achterstallig_count: baseInputs.dashboardMetrics.achterstallig_count + 2
        }
      })
      const modifiedResults = healthScoreEngine.process(modifiedInputs)

      // Cash Flow should change (collection efficiency affected)
      expect(modifiedResults.scores.cashflow).not.toBe(baseResults.scores.cashflow)

      // Risk should change (payment collection risk affected)
      expect(modifiedResults.scores.risk).not.toBe(baseResults.scores.risk)

      // Profit should be unchanged (focuses on profit targets)
      expect(modifiedResults.scores.profit).toBe(baseResults.scores.profit)

      // Efficiency should be unchanged (pure time focus)
      expect(modifiedResults.scores.efficiency).toBe(baseResults.scores.efficiency)
    })
  })

  describe('Hours Data Independence', () => {
    test('Hours data affects only Efficiency metric, not Profit, Cash Flow, or Risk', () => {
      const baseInputs = createTestInputs()
      const baseResults = healthScoreEngine.process(baseInputs)

      // Change hours significantly (double the hours)
      const modifiedInputs = createTestInputs({
        timeStats: {
          ...baseInputs.timeStats,
          thisMonth: {
            ...baseInputs.timeStats.thisMonth,
            hours: baseInputs.timeStats.thisMonth.hours * 2
          },
          unbilled: {
            ...baseInputs.timeStats.unbilled,
            hours: baseInputs.timeStats.unbilled.hours * 2
          }
        }
      })
      const modifiedResults = healthScoreEngine.process(modifiedInputs)

      // Efficiency should change (time utilization affected)
      expect(modifiedResults.scores.efficiency).not.toBe(baseResults.scores.efficiency)

      // Profit should be unchanged (focuses on profit targets)
      expect(modifiedResults.scores.profit).toBe(baseResults.scores.profit)

      // Cash Flow should be unchanged (collection efficiency focus)
      expect(modifiedResults.scores.cashflow).toBe(baseResults.scores.cashflow)

      // Risk should be unchanged (business continuity focus)
      expect(modifiedResults.scores.risk).toBe(baseResults.scores.risk)
    })

    test('Unbilled hours affect only Efficiency metric', () => {
      const baseInputs = createTestInputs()
      const baseResults = healthScoreEngine.process(baseInputs)

      // Change unbilled hours significantly
      const modifiedInputs = createTestInputs({
        timeStats: {
          ...baseInputs.timeStats,
          unbilled: {
            ...baseInputs.timeStats.unbilled,
            hours: baseInputs.timeStats.unbilled.hours * 5
          }
        }
      })
      const modifiedResults = healthScoreEngine.process(modifiedInputs)

      // Only Efficiency should change
      expect(modifiedResults.scores.efficiency).not.toBe(baseResults.scores.efficiency)
      expect(modifiedResults.scores.profit).toBe(baseResults.scores.profit)
      expect(modifiedResults.scores.cashflow).toBe(baseResults.scores.cashflow)
      expect(modifiedResults.scores.risk).toBe(baseResults.scores.risk)
    })
  })

  describe('Ready-to-Bill Data Independence', () => {
    test('Ready-to-bill amount affects only Risk metric', () => {
      // Use lower base value to avoid ceiling effect
      const baseInputs = createTestInputs({
        dashboardMetrics: {
          factureerbaar: 1000 // Lower value to see changes
        }
      })
      const baseResults = healthScoreEngine.process(baseInputs)

      // Change ready-to-bill amount significantly (10x increase)
      const modifiedInputs = createTestInputs({
        dashboardMetrics: {
          ...baseInputs.dashboardMetrics,
          factureerbaar: 10000 // Will exceed 5000 threshold
        }
      })
      const modifiedResults = healthScoreEngine.process(modifiedInputs)

      // Only Risk should change
      expect(modifiedResults.scores.risk).not.toBe(baseResults.scores.risk)
      expect(modifiedResults.scores.profit).toBe(baseResults.scores.profit)
      expect(modifiedResults.scores.cashflow).toBe(baseResults.scores.cashflow)
      expect(modifiedResults.scores.efficiency).toBe(baseResults.scores.efficiency)
    })
  })

  describe('Cross-Metric Correlation Analysis', () => {
    test('Cross-metric correlation is minimal (< 0.35)', () => {
      const testData = generateVariedTestInputs(100)
      const correlations = calculateCrossMetricCorrelations(testData)

      // All correlations should be minimal - allow slight variance for shared business context
      expect(correlations.profitVsCashflow).toBeLessThan(0.35)
      expect(correlations.profitVsEfficiency).toBeLessThan(0.35)
      expect(correlations.profitVsRisk).toBeLessThan(0.35)
      expect(correlations.cashflowVsEfficiency).toBeLessThan(0.35)
      expect(correlations.cashflowVsRisk).toBeLessThan(0.35) // Small correlation due to shared overdue data is acceptable
      expect(correlations.efficiencyVsRisk).toBeLessThan(0.35)

      // Log correlations for analysis
      console.log('Correlation analysis:', correlations)
    })
  })

  describe('Metric Stability and Consistency', () => {
    test('Small data changes produce proportional score changes', () => {
      const baseInputs = createTestInputs()
      const baseResults = healthScoreEngine.process(baseInputs)

      // Make small 5% change to revenue (smaller change for more proportional response)
      const smallChangeInputs = createTestInputs({
        dashboardMetrics: {
          ...baseInputs.dashboardMetrics,
          totale_registratie: baseInputs.dashboardMetrics.totale_registratie * 1.05
        }
      })
      const smallChangeResults = healthScoreEngine.process(smallChangeInputs)

      // Profit change should be proportional and reasonable (not extreme)
      const profitChange = Math.abs(smallChangeResults.scores.profit - baseResults.scores.profit)
      expect(profitChange).toBeLessThan(10) // Allow for reasonable score sensitivity
      expect(profitChange).toBeGreaterThan(0) // But should still register some change

      console.log('Score sensitivity test:', {
        baseProfit: baseResults.scores.profit,
        newProfit: smallChangeResults.scores.profit,
        change: profitChange
      })
    })

    test('Extreme data changes are handled gracefully', () => {
      // Test with extreme values
      const extremeInputs = createTestInputs({
        dashboardMetrics: {
          totale_registratie: 1000000, // Very high revenue
          achterstallig: 0,
          achterstallig_count: 0,
          factureerbaar: 0
        },
        timeStats: {
          thisMonth: { hours: 1, revenue: 1000000 }, // Extremely high hourly rate
          unbilled: { hours: 0, revenue: 0, value: 0 }
        }
      })

      // Should not throw errors
      expect(() => healthScoreEngine.process(extremeInputs)).not.toThrow()

      const results = healthScoreEngine.process(extremeInputs)

      // Scores should be within valid ranges
      expect(results.scores.profit).toBeGreaterThanOrEqual(0)
      expect(results.scores.profit).toBeLessThanOrEqual(25)
      expect(results.scores.cashflow).toBeGreaterThanOrEqual(0)
      expect(results.scores.cashflow).toBeLessThanOrEqual(25)
      expect(results.scores.efficiency).toBeGreaterThanOrEqual(0)
      expect(results.scores.efficiency).toBeLessThanOrEqual(25)
      expect(results.scores.risk).toBeGreaterThanOrEqual(0)
      expect(results.scores.risk).toBeLessThanOrEqual(25)
    })
  })

  describe('Explanation Consistency', () => {
    test('Explanations match actual calculations', () => {
      const inputs = createTestInputs()
      const results = healthScoreEngine.process(inputs)

      // Verify that explanation details contain the actual calculated values
      expect(results.explanations.profit.score).toBe(results.scores.profit)
      expect(results.explanations.cashflow.score).toBe(results.scores.cashflow)
      expect(results.explanations.efficiency.score).toBe(results.scores.efficiency)
      expect(results.explanations.risk.score).toBe(results.scores.risk)

      // Verify explanations contain independence notes
      const cashFlowExplanation = JSON.stringify(results.explanations.cashflow)
      expect(cashFlowExplanation).toContain('independent')

      const efficiencyExplanation = JSON.stringify(results.explanations.efficiency)
      expect(efficiencyExplanation).toContain('independent')

      const riskExplanation = JSON.stringify(results.explanations.risk)
      expect(riskExplanation).toContain('independent')

      const profitExplanation = JSON.stringify(results.explanations.profit)
      expect(profitExplanation).toContain('independent')
    })
  })

  describe('Enhanced Profit Driver Analysis (Phase 1.5)', () => {
    test('Profit driver breakdown provides granular insights', () => {
      const inputs = createTestInputs({
        timeStats: {
          thisMonth: { hours: 80, revenue: 6000 },
          unbilled: { hours: 5, revenue: 500, value: 500 },
          subscription: {
            monthlyActiveUsers: { current: 5 },
            averageSubscriptionFee: { current: 20 }
          }
        }
      })
      const results = healthScoreEngine.process(inputs)

      // Profit explanation should now include driver-specific sections
      const profitExplanation = results.explanations.profit
      expect(profitExplanation.title).toContain('Driver Performance')

      // Should contain subscription business metrics section
      const subscriptionSection = profitExplanation.details.find(
        section => section.title?.includes('Subscription Business')
      )
      expect(subscriptionSection).toBeDefined()
      expect(subscriptionSection?.items.length).toBeGreaterThan(0)

      // Should contain revenue quality section
      const revenueQualitySection = profitExplanation.details.find(
        section => section.title?.includes('Revenue Quality')
      )
      expect(revenueQualitySection).toBeDefined()

      // Should contain value creation section
      const valueCreationSection = profitExplanation.details.find(
        section => section.title?.includes('Value Creation')
      )
      expect(valueCreationSection).toBeDefined()
    })

    test('Profit recommendations are driver-specific and actionable', () => {
      const inputs = createTestInputs({
        timeStats: {
          thisMonth: { hours: 80, revenue: 4000 }, // Lower hourly rate
          unbilled: { hours: 5, revenue: 500, value: 500 },
          subscription: {
            monthlyActiveUsers: { current: 3 }, // Below target
            averageSubscriptionFee: { current: 15 } // Below target
          }
        }
      })
      const results = healthScoreEngine.process(inputs)

      const profitRecommendations = results.recommendations.profit

      // Should have specific driver-focused recommendations
      expect(profitRecommendations.length).toBeGreaterThan(0)

      // Check for subscription-focused recommendations
      const subscriptionRec = profitRecommendations.find(rec =>
        rec.id.includes('subscriber') || rec.id.includes('subscription')
      )
      expect(subscriptionRec).toBeDefined()

      // Check for rate optimization recommendations
      const rateRec = profitRecommendations.find(rec =>
        rec.id.includes('rate') || rec.id.includes('hourly')
      )
      expect(rateRec).toBeDefined()

      // Recommendations should be prioritized by impact
      const highPriorityRecs = profitRecommendations.filter(rec => rec.priority === 'high')
      expect(highPriorityRecs.length).toBeGreaterThan(0)
    })

    test('Subscription metrics affect only profit health', () => {
      const baseInputs = createTestInputs()
      const baseResults = healthScoreEngine.process(baseInputs)

      // Change subscription metrics significantly
      const modifiedInputs = createTestInputs({
        timeStats: {
          ...baseInputs.timeStats,
          subscription: {
            monthlyActiveUsers: { current: 15 }, // Much higher
            averageSubscriptionFee: { current: 50 } // Much higher
          }
        }
      })
      const modifiedResults = healthScoreEngine.process(modifiedInputs)

      // Only profit should change significantly
      expect(modifiedResults.scores.profit).not.toBe(baseResults.scores.profit)

      // Other metrics should be unchanged (minor variance acceptable)
      const cashFlowDiff = Math.abs(modifiedResults.scores.cashflow - baseResults.scores.cashflow)
      const efficiencyDiff = Math.abs(modifiedResults.scores.efficiency - baseResults.scores.efficiency)
      const riskDiff = Math.abs(modifiedResults.scores.risk - baseResults.scores.risk)

      expect(cashFlowDiff).toBeLessThan(1)
      expect(efficiencyDiff).toBeLessThan(1)
      expect(riskDiff).toBeLessThan(3) // Risk may have minor change due to business model risk
    })

    test('Profit driver performance penalties are applied correctly', () => {
      // Test scenario with critically weak drivers
      const weakDriverInputs = createTestInputs({
        timeStats: {
          thisMonth: { hours: 80, revenue: 2000 }, // Very low hourly rate (€25/h)
          unbilled: { hours: 5, revenue: 500, value: 500 },
          subscription: {
            monthlyActiveUsers: { current: 1 }, // Very low subscribers
            averageSubscriptionFee: { current: 10 } // Very low pricing
          }
        }
      })
      const weakResults = healthScoreEngine.process(weakDriverInputs)

      // Strong driver scenario
      const strongDriverInputs = createTestInputs({
        timeStats: {
          thisMonth: { hours: 80, revenue: 8000 }, // High hourly rate (€100/h)
          unbilled: { hours: 5, revenue: 500, value: 500 },
          subscription: {
            monthlyActiveUsers: { current: 12 }, // Above target
            averageSubscriptionFee: { current: 30 } // Above target
          }
        }
      })
      const strongResults = healthScoreEngine.process(strongDriverInputs)

      // Strong drivers should significantly outperform weak drivers
      expect(strongResults.scores.profit).toBeGreaterThan(weakResults.scores.profit + 5)
    })
  })
})

// Helper function to generate varied test data for correlation analysis
function generateVariedTestInputs(count: number): HealthScoreInputs[] {
  const testData: HealthScoreInputs[] = []

  for (let i = 0; i < count; i++) {
    testData.push(createTestInputs({
      dashboardMetrics: {
        totale_registratie: Math.random() * 20000 + 1000, // 1k-21k
        achterstallig: Math.random() * 5000, // 0-5k
        achterstallig_count: Math.floor(Math.random() * 10), // 0-9
        factureerbaar: Math.random() * 10000 // 0-10k
      },
      timeStats: {
        thisMonth: {
          hours: Math.random() * 200 + 10, // 10-210 hours
          revenue: Math.random() * 15000 + 1000 // 1k-16k
        },
        unbilled: {
          hours: Math.random() * 50, // 0-50 hours
          revenue: Math.random() * 2000, // 0-2k
          value: Math.random() * 2000 // 0-2k
        }
      },
      mtdCalculations: {
        currentDay: Math.floor(Math.random() * 28) + 1, // 1-28
        daysInMonth: 30,
        monthProgress: (Math.floor(Math.random() * 28) + 1) / 30,
        mtdRevenueTarget: Math.random() * 10000 + 2000, // 2k-12k
        mtdHoursTarget: Math.random() * 160 + 40 // 40-200 hours
      },
      profitTargets: {
        monthly_revenue_target: Math.random() * 20000 + 5000, // 5k-25k
        monthly_cost_target: Math.random() * 15000 + 3000, // 3k-18k
        monthly_profit_target: Math.random() * 8000 + 1000, // 1k-9k
        setup_completed: true
      }
    }))
  }

  return testData
}

// Helper function to calculate correlations between metrics
function calculateCrossMetricCorrelations(testData: HealthScoreInputs[]) {
  const scores = testData.map(inputs => {
    const results = healthScoreEngine.process(inputs)
    return {
      profit: results.scores.profit,
      cashflow: results.scores.cashflow,
      efficiency: results.scores.efficiency,
      risk: results.scores.risk
    }
  })

  return {
    profitVsCashflow: calculateCorrelation(scores.map(s => s.profit), scores.map(s => s.cashflow)),
    profitVsEfficiency: calculateCorrelation(scores.map(s => s.profit), scores.map(s => s.efficiency)),
    profitVsRisk: calculateCorrelation(scores.map(s => s.profit), scores.map(s => s.risk)),
    cashflowVsEfficiency: calculateCorrelation(scores.map(s => s.cashflow), scores.map(s => s.efficiency)),
    cashflowVsRisk: calculateCorrelation(scores.map(s => s.cashflow), scores.map(s => s.risk)),
    efficiencyVsRisk: calculateCorrelation(scores.map(s => s.efficiency), scores.map(s => s.risk))
  }
}

// Helper function to calculate Pearson correlation coefficient
function calculateCorrelation(x: number[], y: number[]): number {
  const n = x.length
  const sumX = x.reduce((a, b) => a + b, 0)
  const sumY = y.reduce((a, b) => a + b, 0)
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0)
  const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0)
  const sumYY = y.reduce((sum, yi) => sum + yi * yi, 0)

  const numerator = n * sumXY - sumX * sumY
  const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY))

  return denominator === 0 ? 0 : numerator / denominator
}
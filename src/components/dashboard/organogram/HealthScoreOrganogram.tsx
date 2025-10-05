/**
 * HealthScoreOrganogram Component
 * Displays business health score breakdown in an organogram (org chart) style visualization
 */

import React, { useState, useCallback, useMemo } from 'react'
import { OrganogramNode, type OrganogramNodeData } from './OrganogramNode'
import { ConnectionLines } from './ConnectionLines'
import type { HealthScoreOutputs } from '@/lib/health-score-engine'

// Animation timing configuration
const ANIMATION_CONFIG = {
  COLLAPSE_DURATION: 200,
  SCALE_DURATION: 300,
  EXPAND_DURATION: 300,
  STAGGER_DELAY: 100,
  EASING: 'ease-out'
} as const

// Enhanced state interface for exclusive expansion
interface OrganogramState {
  activeSecondLevelNode: string | null
  expansionState: 'idle' | 'transitioning'
  nodeScales: Map<string, number>
}

interface HealthScoreOrganogramProps {
  healthScoreResults: HealthScoreOutputs
  category: 'profit' | 'cashflow' | 'efficiency' | 'risk'
  onMetricClick: (metricId: string, metricName: string, score: number, maxScore: number, currentValue?: number) => void
  onCalculationClick?: (metricId: string, metricName: string, calculationValue?: string, calculationDescription?: string, score: number, maxScore: number, detailedCalculation?: any) => void
  className?: string
}

export function HealthScoreOrganogram({
  healthScoreResults,
  category,
  onMetricClick,
  onCalculationClick,
  className = ''
}: HealthScoreOrganogramProps) {
  // Enhanced state for exclusive expansion and zoom-out effects
  const [organogramState, setOrganogramState] = useState<OrganogramState>({
    activeSecondLevelNode: null,
    expansionState: 'idle',
    nodeScales: new Map()
  })

  // Keep root category always expanded
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set([category]))

  // Calculate which nodes should be scaled down
  const getNodeScale = useCallback((nodeId: string, level: number): number => {
    if (level <= 1) return 1 // Root and first level always normal scale

    const { activeSecondLevelNode } = organogramState

    // If no second-level node is active, all are normal scale
    if (!activeSecondLevelNode) return 1

    // If this is the active second-level node or its children, normal scale
    if (nodeId === activeSecondLevelNode) return 1

    // If this is a sibling of the active node (same level), zoom out
    if (level === 1) return 0.75

    return 1
  }, [organogramState])

  // Helper function to find node level in tree
  const findNodeLevel = useCallback((node: OrganogramNodeData, targetId: string, currentLevel = 0): number | null => {
    if (node.id === targetId) return currentLevel
    if (node.children) {
      for (const child of node.children) {
        const found = findNodeLevel(child, targetId, currentLevel + 1)
        if (found !== null) return found
      }
    }
    return null
  }, [])


  // Organogram tree builder and memoized data will be defined after helper functions

  // Toggle function will be defined after organogram data

  const buildProfitOrganogram = (scores: any, breakdown: any): OrganogramNodeData => {
    const children: OrganogramNodeData[] = []

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
          description: `${profitBreakdown.currentHours || 0}h of ${profitBreakdown.mtdTargetHours || 0}h MTD target`,
          calculationValue: `${profitBreakdown.currentHours || 0}h / ${profitBreakdown.mtdTargetHours || 0}h`,
          calculationDescription: `Current Hours: ${profitBreakdown.currentHours || 0}h, MTD Target: ${profitBreakdown.mtdTargetHours || 0}h → ${timeUtilizationScore}/15 pts`,
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
              contribution: 50, // 50% of Time Utilization (was 40%)
              level: 2,
              description: `${profitBreakdown.currentHours || 0}h of ${profitBreakdown.mtdTargetHours || 0}h MTD target`,
              calculationValue: `${((profitBreakdown.currentHours || 0) / Math.max(profitBreakdown.mtdTargetHours || 1, 1) * 100).toFixed(1)}%`,
              calculationDescription: `Hours Progress: ${profitBreakdown.currentHours || 0}h / ${profitBreakdown.mtdTargetHours || 0}h MTD (${((profitBreakdown.currentHours || 0) / Math.max(profitBreakdown.mtdTargetHours || 1, 1) * 100).toFixed(1)}%) → ${profitBreakdown.timeUtilizationComponents?.hoursScore || 0}/6 pts`,
              isCalculationDriver: true,
              metricId: 'hours_progress',
              hasDetailedBreakdown: false
            },
            {
              id: 'billable_ratio',
              name: 'Billable Ratio',
              score: profitBreakdown.timeUtilizationComponents?.billableScore || 0,
              maxScore: 6,
              contribution: 50, // 50% of Time Utilization (was 40%)
              level: 2,
              description: `${(profitBreakdown.actualBillableRatio || 0).toFixed(1)}% actual vs ${profitBreakdown.targetBillableRatio || 90}% target`,
              calculationValue: `${(profitBreakdown.actualBillableRatio || 0).toFixed(1)}%`,
              calculationDescription: `Billable Ratio: ${(profitBreakdown.actualBillableRatio || 0).toFixed(1)}% vs ${profitBreakdown.targetBillableRatio || 90}% (${profitBreakdown.targetBillableRatio > 0 ? ((profitBreakdown.actualBillableRatio / profitBreakdown.targetBillableRatio) * 100).toFixed(1) : 0}%) → ${profitBreakdown.timeUtilizationComponents?.billableScore || 0}/6 pts`,
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
      layout: 'responsive',
      children: children.length > 0 ? children : undefined
    }
  }

  // Helper function to round scores to one decimal place
  const roundScore = (score: number): number => {
    return Math.round(score * 10) / 10
  }

  // Helper functions to calculate collection metrics from dashboard data
  const calculateCollectionRate = (breakdown: any): number => {
    // Get overdue amount from cashflow breakdown if available
    const overdueAmount = breakdown?.cashflow?.overdueAmount || 0
    const totalRevenue = healthScoreResults?.breakdown?.profit?.totalRevenue || 1

    // Calculate collection rate: (Total Revenue - Overdue) / Total Revenue * 100
    const collectedAmount = Math.max(0, totalRevenue - overdueAmount)
    const collectionRate = totalRevenue > 0 ? (collectedAmount / totalRevenue) * 100 : 100

    return Math.round(collectionRate)
  }

  const getCollectionRateDetails = (breakdown: any) => {
    const overdueAmount = breakdown?.cashflow?.overdueAmount || 0
    const totalRevenue = healthScoreResults?.breakdown?.profit?.totalRevenue || 1
    const collectedAmount = Math.max(0, totalRevenue - overdueAmount)
    const collectionRate = totalRevenue > 0 ? (collectedAmount / totalRevenue) * 100 : 100

    return {
      totalRevenue: Math.round(totalRevenue),
      collectedAmount: Math.round(collectedAmount),
      overdueAmount: Math.round(overdueAmount),
      collectionRate: Math.round(collectionRate)
    }
  }

  const calculateOverdueDays = (breakdown: any): number => {
    // Get DIO (Days Invoice Overdue) from cashflow breakdown
    const dioEquivalent = breakdown?.cashflow?.dioEquivalent || 0

    // Data validation for DIO calculation integrity
    if (dioEquivalent < 0 || dioEquivalent > 100) {
      console.warn('⚠️ DIO value outside expected range:', dioEquivalent)
    }

    return Math.round(dioEquivalent)
  }

  // REMOVED: Old explanation-based parsing code that was causing the vague Revenue Quality & Collection modal

  // Build legitimate Level 1 efficiency components, but prevent artificial Level 2 sub-breakdowns
  const buildRealEfficiencySubComponents = (parentLabel: string, breakdown: any): OrganogramNodeData[] | undefined => {
    // Efficiency metrics are already at their lowest calculation level based on
    // the health score engine's breakdown.scores, not from artificial sub-breakdowns
    return undefined
  }

  // Build real sub-components using actual breakdown data
  const buildRealSubComponents = (parentLabel: string, breakdown: any): OrganogramNodeData[] | undefined => {
    if (!breakdown) return undefined

    const children: OrganogramNodeData[] = []

    if (parentLabel.includes('Time Utilization')) {
      // For Time Utilization, use actual breakdown data if available
      if (breakdown.hoursProgressRatio !== undefined && breakdown.mtdTarget !== undefined) {
        const utilizationScore = breakdown.scores?.utilizationScore || roundScore(breakdown.hoursProgressRatio * 12) // Rough estimation
        const consistencyScore = breakdown.scores?.consistencyScore || roundScore(breakdown.dailyAverage > 3 ? 3 : 2) // Rough estimation

        children.push(
          {
            id: 'utilization_progress',
            name: 'Utilization Progress',
            score: roundScore(utilizationScore * 0.7),
            maxScore: roundScore(12 * 0.7),
            contribution: 0,
            level: 2,
            description: `${(breakdown.hoursProgressRatio * 100)?.toFixed(1)}% progress toward monthly target`,
            calculationValue: `${(breakdown.hoursProgressRatio * 100)?.toFixed(1)}%`,
            metricId: 'utilization_progress',
            hasDetailedBreakdown: false
          },
          {
            id: 'time_consistency',
            name: 'Time Consistency',
            score: roundScore(consistencyScore * 0.3),
            maxScore: roundScore(8 * 0.3),
            contribution: 0,
            level: 2,
            description: `${breakdown.dailyAverage?.toFixed(1)}h average per day`,
            calculationValue: `${breakdown.dailyAverage?.toFixed(1)}h/day`,
            metricId: 'time_consistency',
            hasDetailedBreakdown: false
          }
        )
      }
    } else if (parentLabel.includes('Revenue Quality') || parentLabel.includes('Collection')) {
      // For Revenue Quality & Collection, use breakdown data if available
      if (breakdown.billingEfficiency !== undefined) {
        const billingScore = breakdown.scores?.billingScore || roundScore(breakdown.billingEfficiency * 5) // Rough estimation
        const collectionScore = roundScore(4 - (billingScore * 0.4)) // Complementary scoring

        children.push(
          {
            id: 'collection_efficiency',
            name: 'Collection Efficiency',
            score: roundScore(collectionScore * 0.6),
            maxScore: roundScore(4 * 0.6),
            contribution: 0,
            level: 2,
            description: 'Speed and effectiveness of payment collection',
            calculationValue: `${(breakdown.billingEfficiency * 100)?.toFixed(1)}%`,
            metricId: 'collection_efficiency',
            hasDetailedBreakdown: false
          },
          {
            id: 'billing_quality',
            name: 'Billing Quality',
            score: roundScore(billingScore * 0.4),
            maxScore: roundScore(4 * 0.4),
            contribution: 0,
            level: 2,
            description: 'Quality and timeliness of invoicing',
            calculationValue: `${(breakdown.billingEfficiency * 100)?.toFixed(1)}%`,
            metricId: 'billing_quality',
            hasDetailedBreakdown: false
          }
        )
      }
    }

    return children.length > 0 ? children : undefined
  }

  // Cashflow metrics are already at their lowest calculation level - no sub-components needed
  const buildRealCashflowSubComponents = (parentLabel: string, breakdown: any): OrganogramNodeData[] | undefined => {
    // All cashflow metrics (Collection Speed, Volume Efficiency, Absolute Amount Control)
    // are already lowest-level calculations and should not have artificial sub-breakdowns
    return undefined
  }

  // Risk metrics are already at their lowest calculation level - no sub-components needed
  const buildRealRiskSubComponents = (parentLabel: string, breakdown: any): OrganogramNodeData[] | undefined => {
    // All risk metrics (Invoice Processing Risk, Payment Collection Risk, etc.)
    // are already lowest-level calculations and should not have artificial sub-breakdowns
    return undefined
  }

  // REMOVED: All dead explanation parsing code and duplicates cleaned up

  const buildComponentChildren = (parentLabel: string, allItems: any[]): OrganogramNodeData[] => {
    const children: OrganogramNodeData[] = []
    let foundParent = false

    for (const item of allItems) {
      // Look for component breakdown items after finding the parent metric
      // Use flexible matching to handle numbered labels like "2. Time Utilization Efficiency"
      const itemLabel = item.label || ''
      const matchesParent = itemLabel.includes(parentLabel.replace(/^\d+\.\s*/, '')) ||
                           parentLabel.includes(itemLabel.replace(/^\d+\.\s*/, ''))

      if (matchesParent) {
        foundParent = true
        continue
      }

      // Stop when we reach the next main metric
      if (foundParent && item.emphasis === 'primary') {
        break
      }

      // Add component items
      if (foundParent && item.type === 'calculation' && !item.emphasis) {
        const score = extractScoreFromDescription(item.description)
        const maxScore = extractMaxScoreFromDescription(item.description)

        children.push({
          id: getMetricIdFromLabel(item.label),
          name: item.label || 'Component',
          score: score,
          maxScore: maxScore,
          contribution: 0, // Components don't have direct contribution to total
          level: 2,
          description: item.description,
          calculationValue: item.value,
          calculationDescription: item.description,
          metricId: getMetricIdFromLabel(item.label),
          hasDetailedBreakdown: false
        })
      }
    }

    return children
  }

  const buildCashflowOrganogram = (scores: any, breakdown: any): OrganogramNodeData => {
    const explanation = healthScoreResults?.explanations?.cashflow

    // Build cashflow metrics using actual calculated scores (same as hierarchical tree)
    const children: OrganogramNodeData[] = []


    // Use actual calculated scores from breakdown instead of parsing strings
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
          isCalculationDriver: true, // Triggers CalculationDetailModal
          metricId: 'collection_speed',
          hasDetailedBreakdown: false // No Level 2 artificial breakdowns
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
          isCalculationDriver: true, // Triggers CalculationDetailModal
          metricId: 'volume_efficiency',
          hasDetailedBreakdown: false // No Level 2 artificial breakdowns
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
          isCalculationDriver: true, // Triggers CalculationDetailModal
          metricId: 'absolute_amount_control',
          hasDetailedBreakdown: false // No Level 2 artificial breakdowns
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
      layout: 'responsive', // RESPONSIVE: Horizontal on desktop, vertical on mobile
      children: children.length > 0 ? children : undefined
    }

    // Fallback structure if breakdown.scores not available
    if (!explanation || !explanation.details) {
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
        layout: 'responsive', // RESPONSIVE: Horizontal on desktop, vertical on mobile
        children: [
          {
            id: 'collection_speed',
            name: 'Collection Speed',
            score: 10,
            maxScore: 10,
            contribution: 40,
            level: 1,
            description: 'How quickly payments are collected',
            metricId: 'collection_speed',
            hasDetailedBreakdown: true,
            children: [
              {
                id: 'average_collection_days',
                name: 'Average Collection Days',
                score: 5,
                maxScore: 5,
                contribution: 0,
                level: 2,
                description: 'Average days to collect payments',
                metricId: 'average_collection_days',
                hasDetailedBreakdown: false
              },
              {
                id: 'collection_efficiency',
                name: 'Collection Efficiency',
                score: 5,
                maxScore: 5,
                contribution: 0,
                level: 2,
                description: 'Efficiency of collection processes',
                metricId: 'collection_efficiency_cashflow',
                hasDetailedBreakdown: false
              }
            ]
          },
          {
            id: 'volume_efficiency',
            name: 'Volume Efficiency',
            score: 10,
            maxScore: 10,
            contribution: 40,
            level: 1,
            description: 'Management of invoice volume and count',
            metricId: 'volume_efficiency',
            hasDetailedBreakdown: true,
            children: [
              {
                id: 'outstanding_count_management',
                name: 'Outstanding Count Management',
                score: 6,
                maxScore: 6,
                contribution: 0,
                level: 2,
                description: 'Management of outstanding invoice count',
                metricId: 'outstanding_count_management',
                hasDetailedBreakdown: false
              },
              {
                id: 'invoice_volume_control',
                name: 'Invoice Volume Control',
                score: 4,
                maxScore: 4,
                contribution: 0,
                level: 2,
                description: 'Control over total invoice volume',
                metricId: 'invoice_volume_control',
                hasDetailedBreakdown: false
              }
            ]
          },
          {
            id: 'absolute_amount_control',
            name: 'Absolute Amount Control',
            score: 5,
            maxScore: 5,
            contribution: 20,
            level: 1,
            description: 'Control over outstanding amounts',
            metricId: 'absolute_amount_control',
            hasDetailedBreakdown: true,
            children: [
              {
                id: 'total_outstanding',
                name: 'Total Outstanding',
                score: 3,
                maxScore: 3,
                contribution: 0,
                level: 2,
                description: 'Total outstanding amount management',
                metricId: 'total_outstanding',
                hasDetailedBreakdown: false
              },
              {
                id: 'amount_risk_control',
                name: 'Amount Risk Control',
                score: 2,
                maxScore: 2,
                contribution: 0,
                level: 2,
                description: 'Risk control for large amounts',
                metricId: 'amount_risk_control',
                hasDetailedBreakdown: false
              }
            ]
          }
        ]
      }
    }

  }

  const buildEfficiencyOrganogram = (scores: any, breakdown: any): OrganogramNodeData => {
    const explanation = healthScoreResults?.explanations?.efficiency

    // Build efficiency metrics using actual calculated scores (same as hierarchical tree)
    const children: OrganogramNodeData[] = []


    // Use actual calculated scores from breakdown instead of parsing strings
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
          isCalculationDriver: true, // Triggers CalculationDetailModal
          metricId: 'invoicing_speed',
          hasDetailedBreakdown: false // No Level 2 artificial breakdowns
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
      layout: 'responsive', // RESPONSIVE: Horizontal on desktop, vertical on mobile
      children: children.length > 0 ? children : undefined
    }

    // Fallback structure if breakdown.scores not available
    if (!explanation || !explanation.details) {
      return {
        id: 'efficiency',
        name: 'Efficiency Health',
        score: scores.efficiency || 0,
        maxScore: 25,
        contribution: 100,
        level: 0,
        description: 'Time utilization and billing effectiveness',
        metricId: 'efficiency_health_overview',
        hasDetailedBreakdown: false,
        layout: 'responsive', // RESPONSIVE: Horizontal on desktop, vertical on mobile
        children: [
          {
            id: 'time_utilization_progress',
            name: 'Time Utilization Progress',
            score: 12,
            maxScore: 12,
            contribution: 48,
            level: 1,
            description: 'Progress toward monthly time targets',
            metricId: 'time_utilization_progress',
            hasDetailedBreakdown: true,
            children: [
              {
                id: 'monthly_progress',
                name: 'Monthly Progress',
                score: 8,
                maxScore: 8,
                contribution: 0,
                level: 2,
                description: 'Progress toward monthly hour targets',
                metricId: 'monthly_progress',
                hasDetailedBreakdown: false
              },
              {
                id: 'target_achievement',
                name: 'Target Achievement',
                score: 4,
                maxScore: 4,
                contribution: 0,
                level: 2,
                description: 'Achievement of set time targets',
                metricId: 'target_achievement_efficiency',
                hasDetailedBreakdown: false
              }
            ]
          },
          {
            id: 'billing_efficiency',
            name: 'Billing Efficiency',
            score: 5,
            maxScore: 5,
            contribution: 20,
            level: 1,
            description: 'Efficiency of billing processes',
            metricId: 'billing_efficiency',
            hasDetailedBreakdown: true,
            children: [
              {
                id: 'billing_speed',
                name: 'Billing Speed',
                score: 3,
                maxScore: 3,
                contribution: 0,
                level: 2,
                description: 'Speed of converting work to invoices',
                metricId: 'billing_speed',
                hasDetailedBreakdown: false
              },
              {
                id: 'billing_accuracy',
                name: 'Billing Accuracy',
                score: 2,
                maxScore: 2,
                contribution: 0,
                level: 2,
                description: 'Accuracy and completeness of billing',
                metricId: 'billing_accuracy',
                hasDetailedBreakdown: false
              }
            ]
          },
          {
            id: 'daily_consistency',
            name: 'Daily Consistency',
            score: 8,
            maxScore: 8,
            contribution: 32,
            level: 1,
            description: 'Consistency of daily productivity',
            metricId: 'daily_consistency',
            hasDetailedBreakdown: true,
            children: [
              {
                id: 'daily_hours',
                name: 'Daily Hours',
                score: 5,
                maxScore: 5,
                contribution: 0,
                level: 2,
                description: 'Average daily productive hours',
                metricId: 'daily_hours',
                hasDetailedBreakdown: false
              },
              {
                id: 'consistency_pattern',
                name: 'Consistency Pattern',
                score: 3,
                maxScore: 3,
                contribution: 0,
                level: 2,
                description: 'Pattern of consistent daily work',
                metricId: 'consistency_pattern',
                hasDetailedBreakdown: false
              }
            ]
          }
        ]
      }
    }
  }

  const buildRiskOrganogram = (scores: any, breakdown: any): OrganogramNodeData => {
    const explanation = healthScoreResults?.explanations?.risk

    // Build risk metrics using actual calculated scores
    const children: OrganogramNodeData[] = []

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
      layout: 'responsive', // RESPONSIVE: Horizontal on desktop, vertical on mobile
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


  // Build organogram tree structure (memoized for performance)
  const buildOrganogramTree = useCallback((): OrganogramNodeData => {
    const { scores, breakdown } = healthScoreResults

    switch (category) {
      case 'profit':
        return buildProfitOrganogram(scores, breakdown)
      case 'cashflow':
        return buildCashflowOrganogram(scores, breakdown)
      case 'efficiency':
        return buildEfficiencyOrganogram(scores, breakdown)
      case 'risk':
        return buildRiskOrganogram(scores, breakdown)
      default:
        throw new Error(`Unknown category: ${category}`)
    }
  }, [healthScoreResults, category])

  // Memoized organogram data
  const organogramData = useMemo(() => buildOrganogramTree(), [buildOrganogramTree])

  // Enhanced toggle function with exclusive expansion logic
  const toggleNode = useCallback((nodeId: string) => {
    const nodeLevel = findNodeLevel(organogramData, nodeId)

    // Handle root node - always keep expanded
    if (nodeLevel === 0) {
      return
    }

    // Handle first-level (second-layer) nodes with exclusive expansion
    if (nodeLevel === 1) {
      const isCurrentlyActive = organogramState.activeSecondLevelNode === nodeId

      // Step 1: Set transitioning state and start staggered animations
      setOrganogramState(prev => ({
        ...prev,
        activeSecondLevelNode: isCurrentlyActive ? null : nodeId,
        expansionState: 'transitioning'
      }))

      // Step 2: Staggered animation sequence for sibling nodes
      const firstLevelChildren = organogramData.children || []
      firstLevelChildren.forEach((child, index) => {
        if (child.id !== nodeId) {
          // Stagger the scaling animation for non-active nodes
          setTimeout(() => {
            // Trigger individual node scaling animation
            setOrganogramState(prev => {
              const newScales = new Map(prev.nodeScales)
              newScales.set(child.id, isCurrentlyActive ? 1 : 0.75)
              return {
                ...prev,
                nodeScales: newScales
              }
            })
          }, index * ANIMATION_CONFIG.STAGGER_DELAY)
        }
      })

      // Step 3: Reset transition state after all animations complete
      const totalAnimationTime = ANIMATION_CONFIG.SCALE_DURATION +
        (firstLevelChildren.length * ANIMATION_CONFIG.STAGGER_DELAY)

      setTimeout(() => {
        setOrganogramState(prev => ({
          ...prev,
          expansionState: 'idle'
        }))
      }, totalAnimationTime)

      // Step 4: Update expanded nodes for the new active node
      const newExpanded = new Set([category]) // Always keep root expanded
      if (!isCurrentlyActive) {
        newExpanded.add(nodeId)
      }
      setExpandedNodes(newExpanded)
    } else {
      // Handle deeper level nodes normally
      const newExpanded = new Set(expandedNodes)
      if (expandedNodes.has(nodeId)) {
        newExpanded.delete(nodeId)
      } else {
        newExpanded.add(nodeId)
      }
      setExpandedNodes(newExpanded)
    }
  }, [findNodeLevel, organogramData, category, organogramState, expandedNodes])

  // Handle node interactions
  const handleNodeClick = (node: OrganogramNodeData) => {
    onMetricClick(
      node.metricId || node.id,
      node.name,
      node.score,
      node.maxScore,
      node.score
    )
  }

  const handleCalculationClick = (node: OrganogramNodeData) => {
    if (onCalculationClick) {
      onCalculationClick(
        node.metricId || node.id,
        node.name,
        node.calculationValue,
        node.calculationDescription,
        node.score,
        node.maxScore,
        node.detailedCalculation
      )
    }
  }


  // Safety check
  if (!healthScoreResults) {
    return (
      <div className={`w-full text-center py-12 ${className}`}>
        <p className="text-muted-foreground">Loading health score data...</p>
      </div>
    )
  }

  return (
    <div className={`w-full overflow-x-auto ${className}`}>
      {/* Category Overview */}
      <div className="text-center mb-8">
        <h3 className="text-lg font-semibold mb-2">
          {organogramData.name} Score Breakdown
        </h3>
        <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
          {organogramData.description}
        </p>
        <div className="text-xs text-muted-foreground mt-2">
          Score: {organogramData.score}/{organogramData.maxScore} | Children: {organogramData.children?.length || 0}
        </div>
      </div>

      {/* Main Organogram */}
      <div className="relative flex flex-col items-center space-y-8 min-h-96 px-4 lg:px-0">
        {/* Connection Lines Background */}
        <ConnectionLines
          rootNode={organogramData}
          expandedNodes={expandedNodes}
          className="absolute inset-0 pointer-events-none"
        />

        {/* Interactive Nodes */}
        <div className="relative z-10 w-full max-w-full">
          <OrganogramNode
            node={organogramData}
            isExpanded={expandedNodes.has(organogramData.id)}
            onToggleExpand={toggleNode}
            onNodeClick={handleNodeClick}
            onCalculationClick={handleCalculationClick}
            expandedNodes={expandedNodes}
            scale={1} // Root is always normal scale
            isZoomedOut={false}
            animationState={organogramState.expansionState}
            activeSecondLevelNode={organogramState.activeSecondLevelNode}
            nodeScales={organogramState.nodeScales}
          />
        </div>
      </div>

      {/* Scoring Legend */}
      <div className="mt-8 bg-muted/30 rounded-lg p-6">
        <h4 className="text-sm font-semibold mb-4 text-center">Scoring System Legend</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-xs">

          {/* Performance Bands */}
          <div className="space-y-3">
            <h5 className="font-medium text-muted-foreground">Performance Levels</h5>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-green-500"></div>
                <span>Excellent: 90%+</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-blue-500"></div>
                <span>Good: 70-89%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-orange-500"></div>
                <span>Needs Work: 50-69%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-red-500"></div>
                <span>Critical: &lt;50%</span>
              </div>
            </div>
          </div>

          {/* Scoring Examples */}
          <div className="space-y-3">
            <h5 className="font-medium text-muted-foreground">Score Calculation</h5>
            <div className="space-y-2">
              <div className="text-muted-foreground">
                <div className="font-medium">Format:</div>
                <div>Actual vs Target → Score</div>
              </div>
              <div className="text-muted-foreground">
                <div className="font-medium">Example:</div>
                <div>€85/hr vs €75/hr → 10/10 pts</div>
              </div>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="space-y-3">
            <h5 className="font-medium text-muted-foreground">Category Breakdown</h5>
            <div className="space-y-2">
              <div>
                <span className="font-medium">Profit:</span> Revenue generation
              </div>
              <div>
                <span className="font-medium">Cashflow:</span> Payment timing
              </div>
              <div>
                <span className="font-medium">Efficiency:</span> Work conversion
              </div>
              <div>
                <span className="font-medium">Risk:</span> Business stability
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="space-y-3">
            <h5 className="font-medium text-muted-foreground">Key Metrics</h5>
            <div className="space-y-2">
              <div>
                <span className="font-medium">Rate:</span> Hourly rate value
              </div>
              <div>
                <span className="font-medium">Hours:</span> Time utilization
              </div>
              <div>
                <span className="font-medium">Speed:</span> Collection & invoicing
              </div>
            </div>
          </div>

        </div>

        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            💡 Click calculation details for specific data breakdown • Higher percentages = better performance • Points contribute to overall health score
          </p>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-4 text-center text-xs text-muted-foreground">
        Click on nodes to expand metrics or view detailed explanations
      </div>
    </div>
  )
}

// Helper functions (reused from hierarchical tree)
function extractScoreFromDescription(description?: string): number {
  if (!description) return 0
  const patterns = [
    /→\s*(\d+\.?\d*)\s*\/\s*\d+\s*pts?/,
    /(\d+\.?\d*)\s*\/\s*\d+\s*pts?/,
  ]

  for (const pattern of patterns) {
    const match = description.match(pattern)
    if (match) {
      return parseFloat(match[1])
    }
  }
  return 0
}

function extractMaxScoreFromDescription(description?: string): number {
  if (!description) return 0
  const patterns = [
    /→\s*\d+\.?\d*\s*\/\s*(\d+)\s*pts?/,
    /\d+\.?\d*\s*\/\s*(\d+)\s*pts?/,
  ]

  for (const pattern of patterns) {
    const match = description.match(pattern)
    if (match) {
      return parseInt(match[1])
    }
  }
  return 0
}

function getMetricIdFromLabel(label?: string): string {
  if (!label) return 'unknown_metric'
  return label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
}

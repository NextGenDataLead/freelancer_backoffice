/**
 * Hierarchical Tree Component for Health Score Breakdown
 * Provides a top-down view of where the health score comes from
 */

import React, { useState } from 'react'
import { ChevronRight, ChevronDown, Info, Target, Activity, Clock, Users } from 'lucide-react'
import { getMetricDefinition, type MetricDefinition } from '@/lib/health-score-metric-definitions'
import type { HealthScoreOutputs } from '@/lib/health-score-engine'

interface TreeNode {
  id: string
  name: string
  score: number
  maxScore: number
  contribution: number // percentage contribution to parent
  level: number
  children?: TreeNode[]
  description?: string
  metricId?: string // Links to detailed metric definition
  calculationValue?: string // Shows the actual calculation/formula
  calculationDescription?: string // Shows how it's calculated
  isCalculationDriver?: boolean // Indicates this is a calculation detail
  detailedCalculation?: any // Detailed component breakdown for complex metrics
}

interface HealthScoreTreeProps {
  healthScoreResults: HealthScoreOutputs
  category: 'profit' | 'cashflow' | 'efficiency' | 'risk' // Which category to show
  onMetricClick: (metricId: string, metricName: string, score: number, maxScore: number, currentValue?: number) => void
  onCalculationClick?: (metricId: string, metricName: string, calculationValue?: string, calculationDescription?: string, score: number, maxScore: number, detailedCalculation?: any) => void
  className?: string
}

export function HealthScoreHierarchicalTree({
  healthScoreResults,
  category,
  onMetricClick,
  onCalculationClick,
  className = ''
}: HealthScoreTreeProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set([category]))

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes)
    if (expandedNodes.has(nodeId)) {
      newExpanded.delete(nodeId)
    } else {
      newExpanded.add(nodeId)
    }
    setExpandedNodes(newExpanded)
  }

  // Build the hierarchical tree structure for the specific category
  const buildTreeStructure = (): TreeNode => {
    const { scores, breakdown } = healthScoreResults

    // Build category-specific root node
    switch (category) {
      case 'profit':
        return {
          id: 'profit',
          name: 'Profit Health',
          score: scores.profit,
          maxScore: 25,
          contribution: 100,
          level: 0,
          description: 'Revenue generation and value creation efficiency',
          children: buildProfitBreakdown(breakdown?.profit),
          metricId: 'profit_health_overview'
        }

      case 'cashflow':
        return {
          id: 'cashflow',
          name: 'Cash Flow Health',
          score: scores.cashflow,
          maxScore: 25,
          contribution: 100,
          level: 0,
          description: 'Payment collection and outstanding invoice management',
          children: buildCashFlowBreakdown(breakdown?.cashflow),
          metricId: 'cashflow_health_overview'
        }

      case 'efficiency':
        return {
          id: 'efficiency',
          name: 'Efficiency Health',
          score: scores.efficiency,
          maxScore: 25,
          contribution: 100,
          level: 0,
          description: 'Time utilization and billing effectiveness',
          children: buildEfficiencyBreakdown(breakdown?.efficiency),
          metricId: 'efficiency_health_overview'
        }

      case 'risk':
        return {
          id: 'risk',
          name: 'Risk Management',
          score: scores.risk,
          maxScore: 25,
          contribution: 100,
          level: 0,
          description: 'Business continuity and operational risk factors',
          children: buildRiskBreakdown(breakdown?.risk),
          metricId: 'risk_health_overview'
        }

      default:
        throw new Error(`Unknown category: ${category}`)
    }
  }

  const buildProfitBreakdown = (profitBreakdown: any): TreeNode[] | undefined => {
    return buildCategoryBreakdown('profit')
  }

  // Helper function to extract score from description like "→ 5.2/10 pts" or "Target: €70/h → 8.0/8 pts"
  const extractScoreFromDescription = (description?: string): number => {
    if (!description) return 0
    // Try multiple patterns to match different score formats
    const patterns = [
      /→\s*(\d+\.?\d*)\s*\/\s*\d+\s*pts?/,  // "→ 7.0/7 pts"
      /(\d+\.?\d*)\s*\/\s*\d+\s*pts?/,       // "8.0/8 pts" anywhere in string
    ]

    for (const pattern of patterns) {
      const match = description.match(pattern)
      if (match) {
        return parseFloat(match[1])
      }
    }
    return 0
  }

  // Helper function to extract max score from description like "→ 5.2/10 pts" or "Target: €70/h → 8.0/8 pts"
  const extractMaxScoreFromDescription = (description?: string): number => {
    if (!description) return 0
    // Try multiple patterns to match different score formats
    const patterns = [
      /→\s*\d+\.?\d*\s*\/\s*(\d+)\s*pts?/,   // "→ 7.0/7 pts"
      /\d+\.?\d*\s*\/\s*(\d+)\s*pts?/,       // "8.0/8 pts" anywhere in string
    ]

    for (const pattern of patterns) {
      const match = description.match(pattern)
      if (match) {
        return parseInt(match[1])
      }
    }
    return 0
  }

  // Helper function to map metric labels to metric IDs
  const getMetricIdFromLabel = (label?: string): string => {
    if (!label) return 'unknown_metric'
    return label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
  }

  // Generic function to build category breakdown using actual calculated scores
  const buildCategoryBreakdown = (categoryKey: 'profit' | 'cashflow' | 'efficiency' | 'risk'): TreeNode[] | undefined => {
    const explanation = healthScoreResults?.explanations?.[categoryKey]
    const breakdown = healthScoreResults?.breakdown?.[categoryKey]
    if (!explanation || !breakdown) return undefined

    const nodes: TreeNode[] = []

    // Use actual calculated scores from breakdown instead of parsing strings
    if (categoryKey === 'efficiency' && breakdown.scores) {
      const { utilizationScore, billingScore, consistencyScore } = breakdown.scores
      nodes.push(
        {
          id: 'time_utilization_progress',
          name: 'Time Utilization Progress',
          score: utilizationScore || 0,
          maxScore: 12,
          contribution: 12 / 25 * 100,
          level: 1,
          description: `${(breakdown.hoursProgressRatio * 100)?.toFixed(1)}% progress towards monthly target`,
          calculationValue: `${(breakdown.hoursProgressRatio * 100)?.toFixed(1)}%`,
          calculationDescription: `Current: ${breakdown.currentHours}h, Target: ${breakdown.mtdTarget?.toFixed(1)}h → ${utilizationScore}/12 pts`,
          isCalculationDriver: true,
          metricId: 'time_utilization_efficiency'
        },
        {
          id: 'billing_efficiency',
          name: 'Billing Efficiency',
          score: billingScore || 0,
          maxScore: 5,
          contribution: 5 / 25 * 100,
          level: 1,
          description: `${(breakdown.billingEfficiency * 100)?.toFixed(1)}% of completed work is billed`,
          calculationValue: `${(breakdown.billingEfficiency * 100)?.toFixed(1)}%`,
          calculationDescription: `Billing ratio: ${(breakdown.billingEfficiency * 100)?.toFixed(1)}% → ${billingScore}/5 pts`,
          isCalculationDriver: true,
          metricId: 'billing_efficiency'
        },
        {
          id: 'daily_consistency',
          name: 'Daily Consistency',
          score: consistencyScore || 0,
          maxScore: 8,
          contribution: 8 / 25 * 100,
          level: 1,
          description: `${breakdown.dailyAverage?.toFixed(1)}h average per day`,
          calculationValue: `${breakdown.dailyAverage?.toFixed(1)}h/day`,
          calculationDescription: `Daily average: ${breakdown.dailyAverage?.toFixed(1)}h/day → ${consistencyScore}/8 pts`,
          isCalculationDriver: true,
          metricId: 'daily_consistency'
        }
      )
    } else if (categoryKey === 'cashflow' && breakdown.scores) {
      const { dsoScore, volumeScore, absoluteAmountScore } = breakdown.scores
      nodes.push(
        {
          id: 'collection_speed',
          name: 'Collection Speed',
          score: dsoScore || 0,
          maxScore: 10,
          contribution: 10 / 25 * 100,
          level: 1,
          description: `${breakdown.dsoEquivalent?.toFixed(1)} days equivalent collection time`,
          calculationValue: `${breakdown.dsoEquivalent?.toFixed(1)} days`,
          calculationDescription: `Collection speed: ${breakdown.dsoEquivalent?.toFixed(1)} days → ${dsoScore}/10 pts`,
          isCalculationDriver: true,
          metricId: 'collection_speed'
        },
        {
          id: 'volume_efficiency',
          name: 'Volume Efficiency',
          score: volumeScore || 0,
          maxScore: 10,
          contribution: 10 / 25 * 100,
          level: 1,
          description: `${breakdown.overdueCount} outstanding invoices`,
          calculationValue: `${breakdown.overdueCount} invoices`,
          calculationDescription: `Outstanding count: ${breakdown.overdueCount} invoices → ${volumeScore}/10 pts`,
          isCalculationDriver: true,
          metricId: 'volume_efficiency'
        },
        {
          id: 'absolute_amount_control',
          name: 'Absolute Amount Control',
          score: absoluteAmountScore || 0,
          maxScore: 5,
          contribution: 5 / 25 * 100,
          level: 1,
          description: `€${breakdown.overdueAmount?.toLocaleString() || 0} total outstanding`,
          calculationValue: `€${breakdown.overdueAmount?.toLocaleString() || 0}`,
          calculationDescription: `Outstanding amount: €${breakdown.overdueAmount?.toLocaleString() || 0} → ${absoluteAmountScore}/5 pts`,
          isCalculationDriver: true,
          metricId: 'absolute_amount_control'
        }
      )
    } else if (categoryKey === 'risk' && breakdown.penalties) {
      // Risk uses penalty-based scoring: Final Score = 25 - total penalties
      // So individual contributions = max score - penalty
      const { invoiceProcessingRisk, paymentRisk, clientRisk, subscriptionRisk } = breakdown.penalties
      nodes.push(
        {
          id: 'invoice_processing_risk',
          name: 'Invoice Processing Risk',
          score: Math.max(0, 8 - (invoiceProcessingRisk || 0)),
          maxScore: 8,
          contribution: 8 / 25 * 100,
          level: 1,
          description: `€${breakdown.readyToBillAmount?.toLocaleString() || 0} ready to bill`,
          calculationValue: `€${breakdown.readyToBillAmount?.toLocaleString() || 0}`,
          calculationDescription: `Ready to bill: €${breakdown.readyToBillAmount?.toLocaleString() || 0} → ${Math.max(0, 8 - (invoiceProcessingRisk || 0))}/8 pts`,
          isCalculationDriver: true,
          metricId: 'invoice_processing_risk'
        },
        {
          id: 'payment_collection_risk',
          name: 'Payment Collection Risk',
          score: Math.max(0, 5 - (paymentRisk || 0)),
          maxScore: 5,
          contribution: 5 / 25 * 100,
          level: 1,
          description: `€${breakdown.overdueAmount?.toLocaleString() || 0} overdue`,
          calculationValue: `€${breakdown.overdueAmount?.toLocaleString() || 0}`,
          calculationDescription: `Overdue amount: €${breakdown.overdueAmount?.toLocaleString() || 0} → ${Math.max(0, 5 - (paymentRisk || 0))}/5 pts`,
          isCalculationDriver: true,
          metricId: 'payment_collection_risk'
        },
        {
          id: 'client_concentration_risk',
          name: 'Client Concentration Risk',
          score: Math.max(0, 3 - (clientRisk || 0)),
          maxScore: 3,
          contribution: 3 / 25 * 100,
          level: 1,
          description: 'Business model risk assessment',
          calculationValue: 'Fixed moderate risk',
          calculationDescription: `Client concentration: Fixed moderate risk → ${Math.max(0, 3 - (clientRisk || 0))}/3 pts`,
          isCalculationDriver: true,
          metricId: 'client_concentration_risk'
        },
        {
          id: 'business_continuity_risk',
          name: 'Business Continuity Risk',
          score: Math.max(0, 9 - (subscriptionRisk || 0)), // Remaining points to total 25
          maxScore: 9,
          contribution: 9 / 25 * 100,
          level: 1,
          description: 'Subscription and operational stability',
          calculationValue: subscriptionRisk === 2 ? 'No subscription model' : subscriptionRisk === 3 ? 'Low user count' : 'Subscription active',
          calculationDescription: `Business continuity: ${subscriptionRisk === 2 ? 'No subscription model' : subscriptionRisk === 3 ? 'Low user count' : 'Subscription active'} → ${Math.max(0, 9 - (subscriptionRisk || 0))}/9 pts`,
          isCalculationDriver: true,
          metricId: 'business_continuity_risk'
        }
      )
    } else {
      // Fallback to parsing explanations for profit/risk or when breakdown.scores is not available
      const calculationDetails = explanation.details?.filter(detail => detail.type === 'calculations') || []

      for (const section of calculationDetails) {
        for (const item of section.items || []) {
          if (item.type === 'calculation') {
            const score = extractScoreFromDescription(item.description)
            const maxScore = extractMaxScoreFromDescription(item.description)

            if (maxScore > 0) {
              nodes.push({
                id: `${section.title?.replace(/\s+/g, '_').toLowerCase()}_${item.label?.replace(/\s+/g, '_').toLowerCase()}`,
                name: item.label || 'Unknown Metric',
                score: score,
                maxScore: maxScore,
                contribution: (maxScore / 25) * 100,
                level: 1,
                description: item.description,
                calculationValue: item.value,
                calculationDescription: item.description,
                detailedCalculation: (item as any)?.detailedCalculation, // Add detailed breakdown for complex metrics
                isCalculationDriver: true,
                metricId: getMetricIdFromLabel(item.label)
              })
            }
          }
        }
      }
    }

    return nodes.length > 0 ? nodes : undefined
  }

  const buildCashFlowBreakdown = (cashflowBreakdown: any): TreeNode[] | undefined => {
    return buildCategoryBreakdown('cashflow')
  }

  const buildEfficiencyBreakdown = (efficiencyBreakdown: any): TreeNode[] | undefined => {
    return buildCategoryBreakdown('efficiency')
  }

  const buildRiskBreakdown = (riskBreakdown: any): TreeNode[] | undefined => {
    return buildCategoryBreakdown('risk')
  }

  const getScoreColor = (score: number, maxScore: number): string => {
    const percentage = (score / maxScore) * 100
    if (percentage >= 90) return 'text-green-600 dark:text-green-400'
    if (percentage >= 70) return 'text-blue-600 dark:text-blue-400'
    if (percentage >= 50) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getCategoryIcon = (categoryId: string) => {
    switch (categoryId) {
      case 'profit': return <Target className="h-4 w-4 text-primary" />
      case 'cashflow': return <Activity className="h-4 w-4 text-green-500" />
      case 'efficiency': return <Clock className="h-4 w-4 text-blue-500" />
      case 'risk': return <Users className="h-4 w-4 text-purple-500" />
      default: return <Info className="h-4 w-4 text-muted-foreground" />
    }
  }

  const TreeNodeComponent = ({ node }: { node: TreeNode }) => {
    const isExpanded = expandedNodes.has(node.id)
    const hasChildren = node.children && node.children.length > 0

    return (
      <div className="border rounded-lg bg-card">
        <div
          className={`p-3 cursor-pointer hover:bg-muted/30 transition-colors ${
            node.level === 0 ? 'bg-muted/20' : ''
          }`}
          onClick={() => {
            if (hasChildren) {
              toggleNode(node.id)
            } else if (node.metricId) {
              // Always use calculation modal for consistent experience across all metrics
              if (onCalculationClick) {
                onCalculationClick(
                  node.metricId,
                  node.name,
                  node.calculationValue,
                  node.calculationDescription,
                  node.score,
                  node.maxScore,
                  node.detailedCalculation
                )
              } else {
                // No fallback - this will make missing calculation details obvious
                console.error('Missing calculation details for metric:', node.name, node)
              }
            }
          }}
        >
          <div className="flex items-center gap-3">
            {/* Expand/Collapse Icon */}
            <div className="w-6 flex justify-center">
              {hasChildren ? (
                isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )
              ) : (
                <div className="w-4 h-4 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                </div>
              )}
            </div>

            {/* Category Icon (for level 1) */}
            {node.level === 1 && (
              <div className="flex-shrink-0">
                {getCategoryIcon(node.id)}
              </div>
            )}

            {/* Node Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h4 className={`font-medium truncate ${
                    node.level === 0 ? 'text-lg' :
                    node.level === 1 ? 'text-base' : 'text-sm'
                  }`}>
                    {node.name}
                  </h4>
                  {/* Show calculation value for driver nodes, otherwise description */}
                  {node.isCalculationDriver && node.calculationValue ? (
                    <div className="text-xs mt-1">
                      <div className="font-mono text-blue-600 dark:text-blue-400">
                        {node.calculationValue}
                      </div>
                      {node.calculationDescription && (
                        <div className="text-muted-foreground mt-0.5 line-clamp-1">
                          {node.calculationDescription}
                        </div>
                      )}
                    </div>
                  ) : node.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                      {node.description}
                    </p>
                  )}
                </div>

                {/* Score Display */}
                <div className="text-right flex-shrink-0">
                  <div className={`font-bold ${getScoreColor(node.score, node.maxScore)} ${
                    node.level === 0 ? 'text-xl' :
                    node.level === 1 ? 'text-lg' : 'text-base'
                  }`}>
                    {Math.round(node.score * 10) / 10}/{node.maxScore}
                  </div>
                  {node.level > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {Math.round(node.contribution)}% contribution
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Click hint for leaf nodes */}
            {!hasChildren && node.metricId && (
              <div className="flex-shrink-0">
                <Info className="h-4 w-4 text-muted-foreground/50" />
              </div>
            )}
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="p-3 pt-0 space-y-2">
            {node.children!.map((child, index) => (
              <div key={child.id} className={`${child.level > 1 ? 'ml-6' : 'ml-3'}`}>
                <TreeNodeComponent node={child} />
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const tree = buildTreeStructure()

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="text-sm text-muted-foreground mb-4">
        This shows how your {category === 'profit' ? 'Profit Health' :
                              category === 'cashflow' ? 'Cash Flow Health' :
                              category === 'efficiency' ? 'Efficiency Health' : 'Risk Management'} score is calculated.
        Click on any metric name for detailed explanations in layman's terms.
      </div>

      <TreeNodeComponent node={tree} />
    </div>
  )
}
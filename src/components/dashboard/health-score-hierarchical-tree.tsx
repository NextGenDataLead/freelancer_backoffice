/**
 * Hierarchical Tree Component for Health Score Breakdown
 * Provides a top-down view of where the health score comes from
 */

import React, { useState } from 'react'
import { ChevronRight, ChevronDown, Info, Target, Activity, Clock, Users } from 'lucide-react'
import { getMetricDefinition, type MetricDefinition } from '@/lib/health-score-metric-definitions'
import type { HealthScoreOutputs } from '@/lib/health-score-engine'
import { buildProfitTree, buildCashflowTree, buildEfficiencyTree, buildRiskTree, type HealthScoreTreeNode } from '@/lib/health-score-tree-builder'

// Use shared interface from tree builder
type TreeNode = HealthScoreTreeNode

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

    // Build category-specific root node using shared builders
    switch (category) {
      case 'profit':
        return buildProfitTree(scores, breakdown)

      case 'cashflow':
        return buildCashflowTree(scores, breakdown)

      case 'efficiency':
        return buildEfficiencyTree(scores, breakdown)

      case 'risk':
        return buildRiskTree(scores, breakdown)

      default:
        throw new Error(`Unknown category: ${category}`)
    }
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
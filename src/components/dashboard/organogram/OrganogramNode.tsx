/**
 * OrganogramNode Component
 * Renders individual nodes in the health score organogram with performance indicators and interactions
 */

import React from 'react'
import { ChevronDown, ChevronRight, Target, TrendingUp, AlertTriangle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface OrganogramNodeData {
  id: string
  name: string
  score: number
  maxScore: number
  contribution: number // percentage contribution to parent
  level: number
  children?: OrganogramNodeData[]
  description?: string
  metricId?: string
  calculationValue?: string
  calculationDescription?: string
  isCalculationDriver?: boolean
  detailedCalculation?: any
  hasDetailedBreakdown: boolean
  layout?: 'vertical' | 'horizontal' | 'responsive' // Layout hint for children arrangement
}

interface OrganogramNodeProps {
  node: OrganogramNodeData
  isExpanded: boolean
  onToggleExpand: (nodeId: string) => void
  onNodeClick: (node: OrganogramNodeData) => void
  onCalculationClick?: (node: OrganogramNodeData) => void
  className?: string
  expandedNodes?: Set<string> // Add this to pass expanded state down
  scale?: number // Dynamic scale for zoom-out effects
  isZoomedOut?: boolean // Visual state indicator
  animationState?: 'idle' | 'transitioning' // Animation coordination
  activeSecondLevelNode?: string | null // For determining which first-level children to zoom out
  nodeScales?: Map<string, number> // Individual node scale overrides
}

export function OrganogramNode({
  node,
  isExpanded,
  onToggleExpand,
  onNodeClick,
  onCalculationClick,
  className = '',
  expandedNodes,
  scale = 1,
  isZoomedOut = false,
  animationState = 'idle',
  activeSecondLevelNode = null,
  nodeScales
}: OrganogramNodeProps) {
  const { score, maxScore, name, children = [], hasDetailedBreakdown } = node

  // Calculate performance level
  const performanceRatio = maxScore > 0 ? score / maxScore : 0
  const performanceLevel = getPerformanceLevel(performanceRatio)

  // Determine if node has children and is expandable
  const hasChildren = children.length > 0
  const isExpandable = hasChildren || hasDetailedBreakdown

  // Calculate node width - standardized to match Profit Health box width
  const getNodeWidth = (maxScore: number) => {
    return 'w-48' // Uniform width for all nodes to match Profit Health box
  }

  const handleClick = () => {
    if (isExpandable) {
      onToggleExpand(node.id)
    } else if (onCalculationClick) {
      // For all non-expandable metrics, always use the detailed calculation modal
      // This ensures consistent modal experience across all metrics
      onCalculationClick(node)
    } else {
      // No fallback - this will cause an error if calculation data is missing
      // This makes it easy to spot missing calculation details
      console.error('Missing calculation details for metric:', node.name, node)
    }
  }

  const handleCalculationClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onCalculationClick) {
      onCalculationClick(node)
    }
  }

  // Calculate final scale (prioritize individual node scale over prop scale)
  const finalScale = nodeScales?.get(node.id) ?? scale

  return (
    <div
      className={cn(
        'flex gap-6',
        node.layout === 'horizontal'
          ? 'flex-row items-center' // Horizontal: parent on left, children on right, vertically centered
          : node.layout === 'responsive'
          ? 'flex-col items-center lg:flex-row lg:items-center' // Responsive: vertical on mobile, horizontal on desktop
          : 'flex-col items-center', // Vertical: parent above, children below
        className
      )}
      style={{
        transform: `scale(${finalScale})`,
        transformOrigin: 'center',
        transition: animationState === 'transitioning' ? 'transform 300ms ease-out, opacity 200ms ease-out' : 'transform 200ms ease-out',
        opacity: isZoomedOut ? 0.7 : 1,
        willChange: animationState === 'transitioning' ? 'transform, opacity' : 'auto'
      }}
    >
      {/* Main Node Card */}
      <div
        className={cn(
          'relative rounded-lg border-2 cursor-pointer transition-all duration-200 flex-shrink-0',
          node.layout === 'horizontal'
            ? 'p-3'
            : node.layout === 'responsive'
            ? 'p-4 lg:p-3' // Standard padding on mobile, compact on desktop
            : 'p-4', // Standard padding for vertical
          // Remove hover:scale-105 when zoomed out to avoid conflicting transforms
          !isZoomedOut && 'hover:shadow-lg hover:scale-105',
          getNodeWidth(maxScore),
          getNodeStyling(performanceLevel),
          isExpanded && hasChildren && 'shadow-lg',
          // Add subtle visual changes for zoomed out state
          isZoomedOut && 'border-opacity-60'
        )}
        onClick={handleClick}
      >
        {/* Performance Ring Indicator */}
        <div className="absolute -top-2 -right-2">
          <PerformanceRing score={score} maxScore={maxScore} level={performanceLevel} />
        </div>

        {/* Expand/Collapse Icon */}
        {isExpandable && (
          <div className="absolute -top-1 -left-1 bg-background border rounded-full p-1">
            {isExpanded ? (
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            )}
          </div>
        )}

        {/* Node Content */}
        <div className="space-y-2">
          {/* Title */}
          <h4 className="font-semibold text-sm text-center leading-tight">
            {name}
          </h4>

          {/* Score Display */}
          <div className="text-center">
            <div className="text-lg font-bold">
              {score.toFixed(1)}/{maxScore}
            </div>
            <div className="text-xs text-muted-foreground">
              {getPerformanceLabel(performanceLevel)}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className={cn(
                'h-2 rounded-full transition-all duration-300',
                getProgressBarColor(performanceLevel)
              )}
              style={{ width: `${Math.min(performanceRatio * 100, 100)}%` }}
            />
          </div>

          {/* Calculation Value (if available) - Only for leaf nodes */}
          {node.calculationValue && !node.hasDetailedBreakdown && (
            <button
              onClick={handleCalculationClick}
              className="text-xs text-muted-foreground hover:text-primary underline underline-offset-2 text-center w-full"
            >
              {node.calculationValue}
            </button>
          )}
        </div>
      </div>

      {/* Horizontal connector line */}
      {isExpanded && hasChildren && (node.layout === 'horizontal' || node.layout === 'responsive') && (
        <div className={cn(
          "items-center self-center",
          node.layout === 'responsive'
            ? "hidden lg:flex" // Hidden on mobile, visible on desktop
            : "flex"
        )}>
          <div className="w-8 h-px bg-border"></div>
        </div>
      )}

      {/* Children Nodes (when expanded) */}
      {isExpanded && hasChildren && (
        <div className={cn(
          node.layout === 'horizontal'
            ? "flex flex-col gap-4 items-center min-w-0" // Horizontal: children stacked vertically on the right, centered
            : node.layout === 'responsive'
            ? "mt-6 flex flex-col items-center gap-4 lg:mt-0 lg:gap-4 lg:items-center lg:min-w-0" // Responsive: vertical spacing on mobile, horizontal on desktop
            : "mt-6 flex flex-col items-center gap-4" // Vertical: children below parent
        )}>
          {children.map((child) => {
            // For root node's children (first-level), apply scaling logic
            const isFirstLevelChild = node.level === 0
            const shouldZoomOut = isFirstLevelChild &&
              activeSecondLevelNode !== null &&
              activeSecondLevelNode !== child.id

            return (
              <OrganogramNode
                key={child.id}
                node={{
                  ...child,
                  layout: node.layout // Inherit layout from parent
                }}
                isExpanded={expandedNodes ? expandedNodes.has(child.id) : false}
                onToggleExpand={onToggleExpand}
                onNodeClick={onNodeClick}
                onCalculationClick={onCalculationClick}
                expandedNodes={expandedNodes}
                className={cn(
                  "flex-shrink-0",
                  node.layout === 'horizontal'
                    ? "min-w-[220px]" // Minimum width for horizontal cards
                    : node.layout === 'responsive'
                    ? "w-full lg:min-w-[220px] lg:w-auto" // Full width on mobile, constrained on desktop
                    : ""
                )}
                scale={shouldZoomOut ? 0.75 : 1}
                isZoomedOut={shouldZoomOut}
                animationState={animationState}
                activeSecondLevelNode={activeSecondLevelNode} // Pass through for deeper levels
                nodeScales={nodeScales} // Pass through individual node scales
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

// Performance calculation helper
function getPerformanceLevel(ratio: number): 'excellent' | 'good' | 'needs-improvement' | 'critical' {
  if (ratio >= 0.9) return 'excellent'
  if (ratio >= 0.7) return 'good'
  if (ratio >= 0.5) return 'needs-improvement'
  return 'critical'
}

// Performance label helper
function getPerformanceLabel(level: string): string {
  switch (level) {
    case 'excellent': return 'Excellent'
    case 'good': return 'Good'
    case 'needs-improvement': return 'Needs Work'
    case 'critical': return 'Critical'
    default: return 'Unknown'
  }
}

// Node styling based on performance
function getNodeStyling(level: string): string {
  const baseStyles = 'bg-card'

  switch (level) {
    case 'excellent':
      return `${baseStyles} border-green-500/50 hover:border-green-500 hover:bg-green-50/50`
    case 'good':
      return `${baseStyles} border-blue-500/50 hover:border-blue-500 hover:bg-blue-50/50`
    case 'needs-improvement':
      return `${baseStyles} border-orange-500/50 hover:border-orange-500 hover:bg-orange-50/50`
    case 'critical':
      return `${baseStyles} border-red-500/50 hover:border-red-500 hover:bg-red-50/50`
    default:
      return `${baseStyles} border-border hover:border-primary/50`
  }
}

// Progress bar colors
function getProgressBarColor(level: string): string {
  switch (level) {
    case 'excellent': return 'bg-green-500'
    case 'good': return 'bg-blue-500'
    case 'needs-improvement': return 'bg-orange-500'
    case 'critical': return 'bg-red-500'
    default: return 'bg-muted-foreground'
  }
}

// Performance Ring Component
interface PerformanceRingProps {
  score: number
  maxScore: number
  level: string
}

function PerformanceRing({ score, maxScore, level }: PerformanceRingProps) {
  const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0
  const circumference = 2 * Math.PI * 8 // radius = 8
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  const getIconComponent = () => {
    switch (level) {
      case 'excellent':
        return <Target className="h-3 w-3 text-green-600" />
      case 'good':
        return <TrendingUp className="h-3 w-3 text-blue-600" />
      case 'needs-improvement':
        return <AlertTriangle className="h-3 w-3 text-orange-600" />
      case 'critical':
        return <XCircle className="h-3 w-3 text-red-600" />
      default:
        return <Target className="h-3 w-3 text-muted-foreground" />
    }
  }

  const getRingColor = () => {
    switch (level) {
      case 'excellent': return 'stroke-green-500'
      case 'good': return 'stroke-blue-500'
      case 'needs-improvement': return 'stroke-orange-500'
      case 'critical': return 'stroke-red-500'
      default: return 'stroke-muted-foreground'
    }
  }

  return (
    <div className="relative w-6 h-6 flex items-center justify-center">
      {/* Background Ring */}
      <svg className="absolute inset-0 w-6 h-6 transform -rotate-90" viewBox="0 0 20 20">
        <circle
          cx="10"
          cy="10"
          r="8"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-muted/20"
        />
        <circle
          cx="10"
          cy="10"
          r="8"
          fill="none"
          strokeWidth="2"
          className={getRingColor()}
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          style={{
            transition: 'stroke-dashoffset 0.5s ease-in-out',
          }}
        />
      </svg>
      {/* Center Icon */}
      <div className="relative z-10 bg-background rounded-full p-0.5">
        {getIconComponent()}
      </div>
    </div>
  )
}
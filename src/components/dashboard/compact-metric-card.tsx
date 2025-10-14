'use client'

import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Info, LucideIcon } from 'lucide-react'
import { ReactNode } from 'react'

interface CompactMetricCardProps {
  icon: LucideIcon
  iconColor: string
  title: string
  value: string | number
  subtitle: string
  progress?: number // 0-100
  progressColor?: string
  targetLine?: number // 0-100 - position of target line on progress bar
  badge?: {
    label: string
    variant?: 'success' | 'warning' | 'danger' | 'info'
  }
  trendComparison?: {
    icon: LucideIcon
    value: string
    label: string
    isPositive: boolean
  }
  splitMetrics?: {
    label1: string
    value1: string
    label2: string
    value2: string
  }
  footer?: ReactNode
  onClick?: () => void
  tooltip?: {
    title: string
    description: string
  }
}

export function CompactMetricCard({
  icon: Icon,
  iconColor,
  title,
  value,
  subtitle,
  progress,
  progressColor = 'bg-primary',
  targetLine,
  badge,
  trendComparison,
  splitMetrics,
  footer,
  onClick,
  tooltip
}: CompactMetricCardProps) {
  const getBadgeColor = (variant?: string) => {
    switch (variant) {
      case 'success':
        return 'bg-green-500/10 text-green-600 border-green-500/20'
      case 'warning':
        return 'bg-orange-500/10 text-orange-600 border-orange-500/20'
      case 'danger':
        return 'bg-red-500/10 text-red-600 border-red-500/20'
      case 'info':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20'
      default:
        return 'bg-primary/10 text-primary border-primary/20'
    }
  }

  return (
    <div
      className={`mobile-card-glass p-3 space-y-2 transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:shadow-md hover:scale-[1.02]' : ''
      }`}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 ${iconColor} rounded-lg`}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex items-center gap-1">
            <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
            {tooltip && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-muted-foreground/50 hover:text-muted-foreground transition-colors cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs" side="top">
                  <p className="text-xs font-semibold mb-1">{tooltip.title}</p>
                  <p className="text-xs">{tooltip.description}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
        {badge && (
          <Badge className={`text-xs px-1.5 py-0 h-5 ${getBadgeColor(badge.variant)}`}>
            {badge.label}
          </Badge>
        )}
      </div>

      {/* Value */}
      <div className="space-y-1">
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold metric-number truncate">{value}</span>
          <span className="text-xs text-muted-foreground truncate">{subtitle}</span>
        </div>

        {/* Trend Comparison */}
        {trendComparison && (
          <div className="flex items-center gap-1.5">
            <trendComparison.icon className={`h-3 w-3 ${trendComparison.isPositive ? 'text-green-500' : 'text-red-500'}`} />
            <span className={`text-xs font-medium ${trendComparison.isPositive ? 'text-green-500' : 'text-red-500'}`}>
              {trendComparison.value}
            </span>
            <span className="text-xs text-muted-foreground">{trendComparison.label}</span>
          </div>
        )}

        {/* Progress Bar */}
        {progress !== undefined && (
          <div className="relative progress-bar h-1">
            <div
              className={`progress-fill h-1 ${progressColor}`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
            {targetLine !== undefined && (
              <div
                className="absolute top-0 h-full w-0.5 bg-red-500 z-10"
                style={{ left: `${Math.min(targetLine, 100)}%` }}
              />
            )}
          </div>
        )}
      </div>

      {/* Split Metrics */}
      {splitMetrics && (
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">{splitMetrics.label1}</p>
            <p className="text-xs font-semibold">{splitMetrics.value1}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">{splitMetrics.label2}</p>
            <p className="text-xs font-semibold">{splitMetrics.value2}</p>
          </div>
        </div>
      )}

      {/* Footer */}
      {footer && !splitMetrics && (
        <div className="text-xs text-muted-foreground pt-1 border-t border-border/50">
          {footer}
        </div>
      )}
    </div>
  )
}

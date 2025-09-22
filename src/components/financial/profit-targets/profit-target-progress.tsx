'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Target,
  TrendingUp,
  Calculator,
  Trophy,
  AlertTriangle,
  CheckCircle,
  Zap
} from 'lucide-react'
import { useProfitTargets } from '@/hooks/use-profit-targets'
import { motion } from 'framer-motion'

interface ProfitTargetProgressProps {
  currentRevenue?: number
  currentCosts?: number
  className?: string
}

export function ProfitTargetProgress({
  currentRevenue = 0,
  currentCosts = 0,
  className
}: ProfitTargetProgressProps) {
  const { targets, isLoading } = useProfitTargets()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || isLoading || !targets?.setup_completed) {
    return null
  }

  const currentProfit = currentRevenue - currentCosts
  const revenueProgress = targets.monthly_revenue_target > 0
    ? Math.min((currentRevenue / targets.monthly_revenue_target) * 100, 100)
    : 0
  const costProgress = targets.monthly_cost_target > 0
    ? Math.min((currentCosts / targets.monthly_cost_target) * 100, 100)
    : 0
  const profitProgress = targets.monthly_profit_target > 0
    ? Math.min((currentProfit / targets.monthly_profit_target) * 100, 100)
    : 0

  const isRevenueOnTrack = revenueProgress >= 70
  const areCostsUnderControl = costProgress <= 80
  const isProfitOnTrack = profitProgress >= 70

  const getProgressColor = (progress: number, isReverse = false) => {
    if (isReverse) {
      // For costs - lower is better
      if (progress <= 60) return 'bg-green-500'
      if (progress <= 80) return 'bg-yellow-500'
      return 'bg-red-500'
    } else {
      // For revenue/profit - higher is better
      if (progress >= 80) return 'bg-green-500'
      if (progress >= 60) return 'bg-yellow-500'
      return 'bg-red-500'
    }
  }

  const getStatusIcon = (isOnTrack: boolean) => {
    return isOnTrack
      ? <CheckCircle className="h-4 w-4 text-green-500" />
      : <AlertTriangle className="h-4 w-4 text-yellow-500" />
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Monthly Progress vs Targets</CardTitle>
          </div>
          <Badge
            variant="secondary"
            className={`${
              isProfitOnTrack && isRevenueOnTrack && areCostsUnderControl
                ? 'bg-green-100 text-green-700 border-green-200'
                : 'bg-yellow-100 text-yellow-700 border-yellow-200'
            }`}
          >
            <Trophy className="h-3 w-3 mr-1" />
            {isProfitOnTrack && isRevenueOnTrack && areCostsUnderControl ? 'On Track' : 'Needs Attention'}
          </Badge>
        </div>
        <CardDescription>
          Track your monthly financial performance against your profit targets
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Revenue Progress */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Revenue Progress</span>
              {getStatusIcon(isRevenueOnTrack)}
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">
                €{currentRevenue.toLocaleString('nl-NL')} / €{targets.monthly_revenue_target.toLocaleString('nl-NL')}
              </p>
              <p className="text-xs text-muted-foreground">{revenueProgress.toFixed(1)}%</p>
            </div>
          </div>
          <Progress
            value={revenueProgress}
            className="h-2"
            indicatorClassName={getProgressColor(revenueProgress)}
          />
        </div>

        {/* Cost Progress */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium">Cost Control</span>
              {getStatusIcon(areCostsUnderControl)}
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">
                €{currentCosts.toLocaleString('nl-NL')} / €{targets.monthly_cost_target.toLocaleString('nl-NL')}
              </p>
              <p className="text-xs text-muted-foreground">{costProgress.toFixed(1)}%</p>
            </div>
          </div>
          <Progress
            value={costProgress}
            className="h-2"
            indicatorClassName={getProgressColor(costProgress, true)}
          />
        </div>

        {/* Profit Progress */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Profit Target</span>
              {getStatusIcon(isProfitOnTrack)}
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">
                €{currentProfit.toLocaleString('nl-NL')} / €{targets.monthly_profit_target.toLocaleString('nl-NL')}
              </p>
              <p className="text-xs text-muted-foreground">{profitProgress.toFixed(1)}%</p>
            </div>
          </div>
          <Progress
            value={profitProgress}
            className="h-2"
            indicatorClassName={getProgressColor(profitProgress)}
          />
        </div>

        {/* Summary Insights */}
        <div className="pt-4 border-t space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Quick Insights
          </h4>
          <div className="space-y-2">
            {isProfitOnTrack && isRevenueOnTrack && areCostsUnderControl ? (
              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 p-2 rounded-lg">
                <CheckCircle className="h-4 w-4 flex-shrink-0" />
                <span>Excellent! You're on track to meet all your monthly targets.</span>
              </div>
            ) : (
              <div className="space-y-2">
                {!isRevenueOnTrack && (
                  <div className="flex items-center gap-2 text-sm text-yellow-700 bg-yellow-50 p-2 rounded-lg">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    <span>Revenue is below target. Consider focusing on sales activities.</span>
                  </div>
                )}
                {!areCostsUnderControl && (
                  <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 p-2 rounded-lg">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    <span>Costs are exceeding target. Review expenses for optimization.</span>
                  </div>
                )}
                {!isProfitOnTrack && isRevenueOnTrack && areCostsUnderControl && (
                  <div className="flex items-center gap-2 text-sm text-yellow-700 bg-yellow-50 p-2 rounded-lg">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    <span>Profit margin needs attention. Consider pricing or cost strategies.</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Activity,
  ChevronDown,
  FileText,
  DollarSign,
  TrendingUp,
  Target,
  AlertTriangle,
  BarChart3,
  CreditCard,
  HelpCircle
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface CompactBusinessHealthProps {
  healthScores: {
    totalRounded: number
    profit: number
    cashflow: number
    efficiency: number
    risk: number
  }
  dateRange: string
  onShowHealthReport: () => void
  onShowExplanation: (metric: string) => void
  className?: string
}

export function CompactBusinessHealth({
  healthScores,
  dateRange,
  onShowHealthReport,
  onShowExplanation,
  className = ''
}: CompactBusinessHealthProps) {
  const [isOpen, setIsOpen] = useState(false)

  const getHealthColor = (score: number) => {
    if (score >= 85) return 'text-green-500'
    if (score >= 70) return 'text-blue-500'
    if (score >= 50) return 'text-orange-500'
    return 'text-red-500'
  }

  const getPillarColor = (score: number, maxScore: number = 25) => {
    const percentage = (score / maxScore) * 100
    if (percentage >= 85) return 'text-green-500'
    if (percentage >= 70) return 'text-blue-500'
    if (percentage >= 50) return 'text-orange-500'
    return 'text-red-500'
  }

  const getHealthBadge = (score: number) => {
    if (score >= 85) return { emoji: '👑', label: 'LEGEND', color: 'bg-green-500' }
    if (score >= 70) return { emoji: '⭐', label: 'CHAMPION', color: 'bg-blue-500' }
    if (score >= 50) return { emoji: '📊', label: 'BUILDER', color: 'bg-orange-500' }
    return { emoji: '🎯', label: 'STARTER', color: 'bg-red-500' }
  }

  const badge = getHealthBadge(healthScores.totalRounded)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      <Card className="overflow-hidden border-blue-500/20 bg-gradient-to-r from-blue-500/[0.02] to-transparent">
        <CollapsibleTrigger asChild>
          <div className="p-3 cursor-pointer hover:bg-blue-500/[0.03] transition-colors">
            <div className="flex items-center justify-between gap-4">
              {/* Left: Health Score Summary */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`p-2 rounded-lg bg-blue-500/10 transition-all ${isOpen ? 'rotate-0' : ''}`}>
                  <Activity className={`h-5 w-5 ${getHealthColor(healthScores.totalRounded)}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold">Business Health:</h3>
                    <span className={`text-lg font-bold ${getHealthColor(healthScores.totalRounded)}`}>
                      {healthScores.totalRounded}/100
                    </span>
                    <Badge className={`${badge.color} text-white text-xs px-2 py-0.5`}>
                      {badge.emoji} {badge.label}
                    </Badge>
                    <Badge className="bg-blue-500/10 text-blue-600 text-xs px-2 py-0.5">
                      <BarChart3 className="h-3 w-3 mr-1" />
                      Rolling 30d
                    </Badge>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-3 w-3 text-blue-600/50 hover:text-blue-600 cursor-help transition-colors" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs" side="top">
                        <p className="text-xs font-semibold mb-1">Rolling 30-Day Window</p>
                        <p className="text-xs">Business Health uses a rolling 30-day window for long-term trend analysis. This provides consistent scoring across time, unlike MTD which resets each month.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {dateRange} • Long-term trend
                  </p>
                </div>
              </div>

              {/* Middle: Quick Metrics */}
              <div className="hidden lg:flex items-center gap-4">
                <div className="text-center px-3 border-l border-border/50">
                  <p className="text-xs text-muted-foreground">Profit</p>
                  <p className={`text-sm font-bold ${getPillarColor(healthScores.profit)}`}>
                    {healthScores.profit}/25
                  </p>
                </div>
                <div className="text-center px-3 border-l border-border/50">
                  <p className="text-xs text-muted-foreground">Cash Flow</p>
                  <p className={`text-sm font-bold ${getPillarColor(healthScores.cashflow)}`}>
                    {healthScores.cashflow}/25
                  </p>
                </div>
                <div className="text-center px-3 border-l border-border/50">
                  <p className="text-xs text-muted-foreground">Efficiency</p>
                  <p className={`text-sm font-bold ${getPillarColor(healthScores.efficiency)}`}>
                    {healthScores.efficiency}/25
                  </p>
                </div>
                <div className="text-center px-3 border-l border-border/50">
                  <p className="text-xs text-muted-foreground">Risk</p>
                  <p className={`text-sm font-bold ${getPillarColor(healthScores.risk)}`}>
                    {healthScores.risk}/25
                  </p>
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-3">
                <div className="hidden lg:block h-8 w-px bg-border/50" />

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation()
                    onShowHealthReport()
                  }}
                  className="bg-muted/50 hover:bg-muted border border-border/50 hover:border-border text-foreground hover:shadow-sm transition-all"
                >
                  <FileText className="h-3.5 w-3.5 mr-1.5" />
                  <span className="hidden xl:inline">View Report</span>
                  <span className="xl:hidden">Report</span>
                </Button>

                <div className={`p-1.5 rounded-full transition-all duration-300 ${
                  isOpen ? 'bg-primary/10 rotate-180' : 'bg-muted/50 hover:bg-primary/10'
                }`}>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-300" />
                </div>
              </div>
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 pb-3 pt-2 border-t border-border/50">
            {/* Detailed Health Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Profit Score */}
              <button
                onClick={() => onShowExplanation('profit')}
                className="group relative overflow-hidden rounded-lg bg-gradient-to-br from-primary/5 to-primary/10 p-3 transition-all duration-300 hover:from-primary/10 hover:to-primary/20 hover:scale-105 hover:shadow-md border border-primary/20 hover:border-primary/40 cursor-pointer text-left"
              >
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-lg bg-primary/20 group-hover:bg-primary/30 transition-colors">
                        <DollarSign className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-left leading-none">Total Profit</p>
                        <p className="text-xs text-muted-foreground leading-none">
                          {healthScores.profit >= 20 ? 'Crushing it!' :
                           healthScores.profit >= 15 ? 'Strong performance' :
                           healthScores.profit >= 10 ? 'Room to grow' : 'Needs attention'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-bold text-primary">{healthScores.profit}</span>
                        <span className="text-xs text-muted-foreground">/25</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 w-full bg-primary/20 rounded-full h-1 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-primary to-primary/80 h-1 rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${(healthScores.profit / 25) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </button>

              {/* Cash Flow Score */}
              <button
                onClick={() => onShowExplanation('cashflow')}
                className="group relative overflow-hidden rounded-lg bg-gradient-to-br from-cyan-500/5 to-cyan-500/10 p-3 transition-all duration-300 hover:from-cyan-500/10 hover:to-cyan-500/20 hover:scale-105 hover:shadow-md border border-cyan-500/20 hover:border-cyan-500/40 cursor-pointer text-left"
              >
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-lg bg-cyan-500/20 group-hover:bg-cyan-500/30 transition-colors">
                        <CreditCard className="h-3.5 w-3.5 text-cyan-600" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-left leading-none">Cash Flow</p>
                        <p className="text-xs text-muted-foreground leading-none">
                          {healthScores.cashflow >= 20 ? 'Money flowing!' :
                           healthScores.cashflow >= 15 ? 'Healthy collections' :
                           healthScores.cashflow >= 10 ? 'Some delays' : 'Collection issues'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-bold text-cyan-600">{healthScores.cashflow}</span>
                        <span className="text-xs text-muted-foreground">/25</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 w-full bg-cyan-500/20 rounded-full h-1 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-cyan-500 to-cyan-400 h-1 rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${(healthScores.cashflow / 25) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </button>

              {/* Efficiency Score */}
              <button
                onClick={() => onShowExplanation('efficiency')}
                className="group relative overflow-hidden rounded-lg bg-gradient-to-br from-green-500/5 to-green-500/10 p-3 transition-all duration-300 hover:from-green-500/10 hover:to-green-500/20 hover:scale-105 hover:shadow-md border border-green-500/20 hover:border-green-500/40 cursor-pointer text-left"
              >
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-lg bg-green-500/20 group-hover:bg-green-500/30 transition-colors">
                        <Target className="h-3.5 w-3.5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-left leading-none">Efficiency</p>
                        <p className="text-xs text-muted-foreground leading-none">
                          {healthScores.efficiency >= 20 ? 'Peak productivity!' :
                           healthScores.efficiency >= 15 ? 'Working efficiently' :
                           healthScores.efficiency >= 10 ? 'Can optimize' : 'Needs focus'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-bold text-green-600">{healthScores.efficiency}</span>
                        <span className="text-xs text-muted-foreground">/25</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 w-full bg-green-500/20 rounded-full h-1 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-green-500 to-green-400 h-1 rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${(healthScores.efficiency / 25) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </button>

              {/* Risk Score */}
              <button
                onClick={() => onShowExplanation('risk')}
                className="group relative overflow-hidden rounded-lg bg-gradient-to-br from-purple-500/5 to-purple-500/10 p-3 transition-all duration-300 hover:from-purple-500/10 hover:to-purple-500/20 hover:scale-105 hover:shadow-md border border-purple-500/20 hover:border-purple-500/40 cursor-pointer text-left"
              >
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-lg bg-purple-500/20 group-hover:bg-purple-500/30 transition-colors">
                        <AlertTriangle className="h-3.5 w-3.5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-left leading-none">Risk Management</p>
                        <p className="text-xs text-muted-foreground leading-none">
                          {healthScores.risk >= 20 ? 'Well protected!' :
                           healthScores.risk >= 15 ? 'Low risk' :
                           healthScores.risk >= 10 ? 'Some exposure' : 'High risk'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-bold text-purple-600">{healthScores.risk}</span>
                        <span className="text-xs text-muted-foreground">/25</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 w-full bg-purple-500/20 rounded-full h-1 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-purple-400 h-1 rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${(healthScores.risk / 25) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </button>
            </div>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}

'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useScrollDirection } from '@/hooks/use-scroll-direction'
import {
  Play,
  Receipt,
  FileText,
  Calculator,
  Clock,
  Plus
} from 'lucide-react'

interface QuickActionsBarProps {
  onStartTimer: () => void
  onLogExpense: () => void
  onCreateInvoice: () => void
  onViewTax: () => void
  unbilledAmount?: number
  taxQuarterStatus?: number // 0-100 percentage
}

export function QuickActionsBar({
  onStartTimer,
  onLogExpense,
  onCreateInvoice,
  onViewTax,
  unbilledAmount = 0,
  taxQuarterStatus = 0
}: QuickActionsBarProps) {
  const { scrollDirection, isStuck } = useScrollDirection({ threshold: 10 })

  return (
    <div
      className={`
        w-full
        sticky top-[52px] z-30
        bg-gradient-to-r from-primary/5 via-primary/3 to-accent/5
        border-y border-border/50
        backdrop-blur-sm
        transition-all duration-300 ease-in-out
        ${isStuck ? 'shadow-md bg-background/95' : ''}
        ${scrollDirection === 'down' ? 'md:translate-y-0 -translate-y-full' : 'translate-y-0'}
      `}
    >
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          {/* Left side: Title */}
          <div className="flex items-center gap-2 min-w-0">
            <Clock className="h-5 w-5 text-primary flex-shrink-0" />
            <h3 className="text-sm font-semibold text-foreground truncate">Quick Actions</h3>
          </div>

          {/* Right side: Action buttons */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Start Timer */}
            <Button
              onClick={onStartTimer}
              size="sm"
              className="bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-800 hover:to-slate-700 text-white shadow-sm hover:shadow-md transition-all duration-200 flex-shrink-0"
            >
              <Play className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Start Timer</span>
              <span className="sm:hidden">Timer</span>
            </Button>

            {/* Log Expense */}
            <Button
              onClick={onLogExpense}
              size="sm"
              variant="outline"
              className="border-accent/30 hover:bg-accent/10 hover:border-accent/50 transition-all duration-200 flex-shrink-0"
            >
              <Receipt className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Log Expense</span>
              <span className="sm:hidden">Expense</span>
            </Button>

            {/* Create Invoice */}
            <Button
              onClick={onCreateInvoice}
              size="sm"
              variant="outline"
              className="border-green-500/30 hover:bg-green-500/10 hover:border-green-500/50 transition-all duration-200 relative flex-shrink-0"
            >
              <FileText className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Create Invoice</span>
              <span className="sm:hidden">Invoice</span>
              {unbilledAmount > 0 && (
                <Badge className="ml-2 bg-green-500 text-white text-xs px-1.5 py-0 h-5">
                  €{(unbilledAmount / 1000).toFixed(1)}K
                </Badge>
              )}
            </Button>

            {/* Quarterly Tax */}
            <Button
              onClick={onViewTax}
              size="sm"
              variant="outline"
              className="border-purple-500/30 hover:bg-purple-500/10 hover:border-purple-500/50 transition-all duration-200 relative flex-shrink-0"
            >
              <Calculator className="h-4 w-4 mr-2" />
              <span className="hidden md:inline">Q4 Tax</span>
              <span className="md:hidden">Tax</span>
              {taxQuarterStatus > 0 && (
                <div className="ml-2 flex items-center gap-1">
                  <div className="w-12 h-1.5 bg-purple-500/20 rounded-full overflow-hidden hidden lg:block">
                    <div
                      className="h-full bg-purple-500 transition-all duration-300"
                      style={{ width: `${taxQuarterStatus}%` }}
                    />
                  </div>
                  <span className="text-xs text-purple-600 font-medium">{taxQuarterStatus}%</span>
                </div>
              )}
            </Button>
          </div>
        </div>

        {/* Mobile hint */}
        <div className="mt-2 text-xs text-muted-foreground text-center sm:hidden">
          Tip: Use keyboard shortcuts - T for Timer, E for Expense
        </div>
      </div>
    </div>
  )
}

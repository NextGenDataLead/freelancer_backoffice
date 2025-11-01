'use client'

import { forwardRef } from 'react'
import { DayButton } from 'react-day-picker'
import { format } from 'date-fns'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  getDayData,
  formatHours,
  formatCurrency,
  shouldShowMultipleIndicators,
  getPrimaryClientColor
} from '@/lib/utils/calendar'
import type { CalendarMonthData } from '@/lib/types/calendar'

interface CalendarDayButtonProps extends React.ComponentProps<typeof DayButton> {
  monthData?: CalendarMonthData | null
  onCreateEntry?: () => void
}

export const CalendarDayButton = forwardRef<HTMLButtonElement, CalendarDayButtonProps>(
  ({ day, modifiers, monthData, onCreateEntry, className, ...props }, ref) => {
    // Normalize DayPicker's UTC-based date to local midnight to avoid weekday shifts
    const normalizedDate = new Date(day.date.getFullYear(), day.date.getMonth(), day.date.getDate())

    const dayData = getDayData(normalizedDate, monthData || undefined)
    const hasEntries = dayData.hasEntries
    const showMultiple = shouldShowMultipleIndicators(normalizedDate, monthData || undefined)
    const primaryColor = getPrimaryClientColor(normalizedDate, monthData || undefined)

    return (
      <Button
        {...props}
        ref={ref}
        variant="ghost"
        asChild={false}
        data-day={format(normalizedDate, 'yyyy-MM-dd')}
        data-entry-count={dayData.entryCount}
        className={cn(
          "relative h-16 w-full p-2 text-sm font-normal cursor-pointer overflow-hidden",
          "flex flex-col items-start justify-between",
          "hover:bg-accent hover:text-accent-foreground",
          "focus:bg-accent focus:text-accent-foreground",
          "data-[selected=true]:bg-primary data-[selected=true]:text-primary-foreground",
          "rounded-md border border-transparent hover:border-accent",
          hasEntries && "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
          modifiers?.today && "bg-accent text-accent-foreground font-medium border-accent",
          modifiers?.outside && "text-muted-foreground opacity-50",
          modifiers?.disabled && "text-muted-foreground opacity-30 cursor-not-allowed",
          className
        )}
      >
        {/* Day Number - Top Left */}
        <span className="absolute top-2 left-2 text-base font-medium">
          {format(day.date, 'd')}
        </span>

        {/* Content Area - Centered */}
        <div className="absolute inset-0 flex items-center justify-center">
          {hasEntries ? (
            <div className="flex flex-col items-center gap-0.5">
              {/* Time */}
              <div className="text-xs text-muted-foreground">
                {formatHours(dayData.totalHours)}
              </div>

              {/* Value */}
              <div className="text-xs font-medium">
                {formatCurrency(dayData.totalValue)}
              </div>
            </div>
          ) : (
            /* Empty Day - Show Add Button on Hover */
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <div
                className="h-6 w-6 p-1 rounded hover:bg-primary/10 flex items-center justify-center cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation()
                  onCreateEntry?.()
                }}
              >
                <Plus className="h-3 w-3" />
              </div>
            </div>
          )}
        </div>

        {/* Entry Count Badge - Bottom Right */}
        {hasEntries && showMultiple && (
          <div className="absolute bottom-1 right-1 bg-primary text-primary-foreground text-[9px] px-1 py-0.5 rounded-full font-medium leading-none">
            {dayData.entryCount}
          </div>
        )}

        {/* Hover/Focus Overlay */}
        <div className="absolute inset-0 bg-primary/10 opacity-0 hover:opacity-100 transition-opacity rounded-md pointer-events-none" />

        {/* Today Indicator */}
        {modifiers?.today && (
          <div className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
        )}

        {/* Entry Status Indicators */}
        {hasEntries && (
          <div className="absolute top-1 left-1 flex gap-1">
            {/* Invoiced Indicator */}
            {dayData.entries.some(entry => entry.invoiced) && (
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
            )}
            
            {/* Billable Indicator */}
            {dayData.entries.some(entry => entry.billable) && (
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
            )}
            
            {/* Non-billable Indicator */}
            {dayData.entries.some(entry => !entry.billable) && (
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
            )}
          </div>
        )}
      </Button>
    )
  }
)

CalendarDayButton.displayName = "CalendarDayButton"

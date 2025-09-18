'use client'

import { forwardRef } from 'react'
import { DayButton } from 'react-day-picker'
import { format } from 'date-fns'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
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
    const dayData = getDayData(day.date, monthData || undefined)
    const hasEntries = dayData.hasEntries
    const showMultiple = shouldShowMultipleIndicators(day.date, monthData || undefined)
    const primaryColor = getPrimaryClientColor(day.date, monthData || undefined)

    return (
      <div
        {...props}
        ref={ref}
        className={cn(
          "relative h-16 w-full p-2 text-sm font-normal cursor-pointer",
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
        {/* Day Number */}
        <span className="text-base font-medium">
          {format(day.date, 'd')}
        </span>

        {/* Content Area */}
        <div className="flex-1 w-full flex flex-col justify-end items-start">
          {hasEntries ? (
            <div className="space-y-1 w-full">
              {/* Time Summary */}
              <div className="text-xs text-muted-foreground">
                {formatHours(dayData.totalHours)}
              </div>
              
              {/* Value Summary */}
              <div className="text-xs font-medium">
                {formatCurrency(dayData.totalValue)}
              </div>

              {/* Visual Indicators */}
              <div className="flex items-center justify-between w-full">
                {/* Client Color Indicators */}
                <div className="flex items-center gap-1">
                  {dayData.clientColors.slice(0, 3).map((color, index) => (
                    <div
                      key={index}
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  {showMultiple && dayData.clientColors.length > 3 && (
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/50 flex items-center justify-center">
                      <span className="text-[6px] text-white">+</span>
                    </div>
                  )}
                </div>

                {/* Entry Count Badge */}
                {showMultiple && (
                  <div className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                    {dayData.entryCount}
                  </div>
                )}
              </div>

            </div>
          ) : (
            /* Empty Day - Show Add Button on Hover */
            <div className="opacity-0 group-hover:opacity-100 transition-opacity w-full">
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
      </div>
    )
  }
)

CalendarDayButton.displayName = "CalendarDayButton"
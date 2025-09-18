'use client'

import { useState, useEffect } from 'react'
import { format, isSameMonth, isToday } from 'date-fns'
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Plus,
  Clock,
  Euro,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CalendarDayButton } from '@/components/financial/time/calendar-day-button'
import { useCalendarTimeEntries } from '@/hooks/use-calendar-time-entries'
import { 
  formatHours, 
  formatCurrency, 
  getCalendarModifiers,
  getDayTooltipContent
} from '@/lib/utils/calendar'
import type { CalendarViewProps } from '@/lib/types/calendar'

interface CalendarTimeEntryViewProps {
  selectedMonth: Date
  onMonthChange: (date: Date) => void
  onDateSelect: (date: Date) => void
  onCreateTimeEntry: (date: Date) => void
  refreshTrigger?: number // Add refresh trigger prop
  className?: string
}

export function CalendarTimeEntryView({
  selectedMonth,
  onMonthChange,
  onDateSelect,
  onCreateTimeEntry,
  refreshTrigger,
  className = ''
}: CalendarTimeEntryViewProps) {
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>()
  
  const calendarHook = useCalendarTimeEntries({
    initialMonth: selectedMonth,
    autoRefresh: true,
    refreshInterval: 30000
  })

  const {
    currentMonth,
    monthData,
    loading,
    error,
    goToMonth,
    goToNextMonth,
    goToPreviousMonth,
    goToToday,
    refreshData,
    getDayData,
    hasTimeEntries,
    getTimeEntriesForDate
  } = calendarHook

  // Handle date selection
  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return

    setSelectedDate(date)
    onDateSelect(date)

    // Always open timer dialog when any date is clicked
    onCreateTimeEntry(date)
  }

  // Sync prop changes with hook state
  useEffect(() => {
    if (selectedMonth.getTime() !== currentMonth.getTime()) {
      goToMonth(selectedMonth)
    }
  }, [selectedMonth, currentMonth, goToMonth])

  // Refresh data when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger !== undefined) {
      refreshData()
    }
  }, [refreshTrigger, refreshData])

  // Handle month navigation
  const handleMonthChange = (date: Date) => {
    goToMonth(date)
    onMonthChange(date)
  }

  // Get calendar modifiers for styling
  const modifiers = getCalendarModifiers(monthData)

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Calendar Header with Navigation and Summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={goToPreviousMonth}
            disabled={loading}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-xl font-semibold">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
          </div>
          
          <Button
            variant="outline"
            size="icon"
            onClick={goToNextMonth}
            disabled={loading}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-4">
          {/* Month Summary */}
          {monthData && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{formatHours(monthData.totalHours)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Euro className="h-4 w-4" />
                <span>{formatCurrency(monthData.totalValue)}</span>
              </div>
              <Badge variant="outline">
                {monthData.totalEntries} registraties
              </Badge>
            </div>
          )}
          
          {/* Action Buttons */}
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            disabled={loading}
          >
            Vandaag
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Vernieuwen'
            )}
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Fout bij laden van tijdregistraties: {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-6">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            month={currentMonth}
            onMonthChange={handleMonthChange}
            modifiers={modifiers}
            disabled={{ before: new Date('2020-01-01') }}
            className="w-full"
            classNames={{
              months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 flex-1",
              month: "space-y-4 w-full flex flex-col",
              table: "w-full h-full border-collapse space-y-1",
              head_row: "",
              head_cell: "rounded-md w-full font-normal text-[0.8rem] text-muted-foreground",
              row: "w-full",
              cell: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected].day-range-middle)]:rounded-none",
              day: "h-16 w-full p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
              day_range_start: "day-range-start",
              day_range_middle: "day-range-middle", 
              day_range_end: "day-range-end",
              day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
              day_today: "bg-accent text-accent-foreground font-medium",
              day_outside: "day-outside text-muted-foreground opacity-50  aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
              day_disabled: "text-muted-foreground opacity-50",
              day_hidden: "invisible",
            }}
            components={{
              DayButton: ({ day, modifiers, ...props }) => (
                <CalendarDayButton
                  day={day}
                  modifiers={modifiers}
                  monthData={monthData}
                  onCreateEntry={() => onCreateTimeEntry(day.date)}
                  {...props}
                />
              )
            }}
          />
        </CardContent>
      </Card>


      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}
    </div>
  )
}
'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar, ChevronDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface DateRange {
  from: Date
  to: Date
  label: string
}

interface DateRangePickerProps {
  selectedRange: DateRange
  onRangeChange: (range: DateRange) => void
  className?: string
}

const predefinedRanges: DateRange[] = [
  {
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    to: new Date(),
    label: 'Last 7 days'
  },
  {
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date(),
    label: 'Last 30 days'
  },
  {
    from: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    to: new Date(),
    label: 'Last 3 months'
  },
  {
    from: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
    to: new Date(),
    label: 'Last 6 months'
  },
  {
    from: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
    to: new Date(),
    label: 'Last year'
  }
]

export function DateRangePicker({ selectedRange, onRangeChange, className = '' }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <div className={`relative ${className}`}>
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between"
      >
        <div className="flex items-center">
          <Calendar className="h-4 w-4 mr-2" />
          {selectedRange.label}
        </div>
        <ChevronDown className="h-4 w-4" />
      </Button>

      {isOpen && (
        <Card className="absolute top-full left-0 mt-2 w-full z-50 shadow-lg">
          <CardContent className="p-2">
            <div className="space-y-1">
              {predefinedRanges.map((range) => (
                <Button
                  key={range.label}
                  variant={selectedRange.label === range.label ? "default" : "ghost"}
                  className="w-full justify-start text-sm"
                  onClick={() => {
                    onRangeChange(range)
                    setIsOpen(false)
                  }}
                >
                  {range.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Analytics filter component
interface AnalyticsFilter {
  id: string
  label: string
  value: string
  options: Array<{ value: string; label: string }>
}

interface AnalyticsFiltersProps {
  filters: AnalyticsFilter[]
  dateRange: DateRange
  onFilterChange: (filterId: string, value: string) => void
  onDateRangeChange: (range: DateRange) => void
  onReset: () => void
  className?: string
}

export function AnalyticsFilters({
  filters,
  dateRange,
  onFilterChange,
  onDateRangeChange,
  onReset,
  className = ''
}: AnalyticsFiltersProps) {
  const hasActiveFilters = filters.some(filter => filter.value !== 'all') || 
                          dateRange.label !== 'Last 30 days'

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Date Range */}
      <div>
        <label className="text-sm font-medium text-slate-700 mb-2 block">
          Date Range
        </label>
        <DateRangePicker
          selectedRange={dateRange}
          onRangeChange={onDateRangeChange}
        />
      </div>

      {/* Other Filters */}
      {filters.map((filter) => (
        <div key={filter.id}>
          <label className="text-sm font-medium text-slate-700 mb-2 block">
            {filter.label}
          </label>
          <div className="relative">
            <select
              value={filter.value}
              onChange={(e) => onFilterChange(filter.id, e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      ))}

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">Active Filters</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              Reset All
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {dateRange.label !== 'Last 30 days' && (
              <Badge variant="secondary" className="text-xs">
                {dateRange.label}
              </Badge>
            )}
            {filters
              .filter(filter => filter.value !== 'all')
              .map((filter) => {
                const selectedOption = filter.options.find(opt => opt.value === filter.value)
                return (
                  <Badge key={filter.id} variant="secondary" className="text-xs">
                    {filter.label}: {selectedOption?.label}
                  </Badge>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}
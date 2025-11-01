'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, X, Filter, Calendar as CalendarIcon, DollarSign, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'
import type { ExpenseCategory } from '@/lib/types/financial'

export interface ExpenseFilters {
  search: string
  categories: ExpenseCategory[]
  dateFrom: string | null
  dateTo: string | null
  amountMin: number | null
  amountMax: number | null
  status: 'all' | 'approved' | 'draft'
}

interface ExpenseFilterBarProps {
  filters: ExpenseFilters
  onFiltersChange: (filters: ExpenseFilters) => void
  totalCount: number
  filteredCount: number
}

const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'kantoorbenodigdheden', label: 'Office Supplies' },
  { value: 'reiskosten', label: 'Travel' },
  { value: 'maaltijden_zakelijk', label: 'Meals & Business' },
  { value: 'marketing_reclame', label: 'Marketing' },
  { value: 'software_ict', label: 'Software & ICT' },
  { value: 'afschrijvingen', label: 'Depreciation' },
  { value: 'verzekeringen', label: 'Insurance' },
  { value: 'professionele_diensten', label: 'Professional Services' },
  { value: 'werkruimte_kantoor', label: 'Workspace' },
  { value: 'voertuigkosten', label: 'Vehicle' },
  { value: 'telefoon_communicatie', label: 'Communication' },
  { value: 'vakliteratuur', label: 'Literature' },
  { value: 'werkkleding', label: 'Work Clothing' },
  { value: 'relatiegeschenken_representatie', label: 'Business Gifts' },
  { value: 'overige_zakelijk', label: 'Other' },
]

export function ExpenseFilterBar({
  filters,
  onFiltersChange,
  totalCount,
  filteredCount,
}: ExpenseFilterBarProps) {
  const [localSearch, setLocalSearch] = useState(filters.search)
  const [isExpanded, setIsExpanded] = useState(false)

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== filters.search) {
        onFiltersChange({ ...filters, search: localSearch })
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [localSearch, filters, onFiltersChange])

  const handleClearFilters = useCallback(() => {
    setLocalSearch('')
    onFiltersChange({
      search: '',
      categories: [],
      dateFrom: null,
      dateTo: null,
      amountMin: null,
      amountMax: null,
      status: 'all',
    })
  }, [onFiltersChange])

  const hasActiveFilters =
    filters.search ||
    filters.categories.length > 0 ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.amountMin !== null ||
    filters.amountMax !== null ||
    filters.status !== 'all'

  const activeFilterCount =
    (filters.search ? 1 : 0) +
    filters.categories.length +
    (filters.dateFrom || filters.dateTo ? 1 : 0) +
    (filters.amountMin !== null || filters.amountMax !== null ? 1 : 0) +
    (filters.status !== 'all' ? 1 : 0)

  return (
    <div
      className="glass-card"
      style={{
        padding: '1rem',
        marginBottom: '1rem',
      }}
    >
      {/* Main filter row */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search input */}
        <div className="flex-1 min-w-[200px] relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
            style={{ color: 'rgba(255, 255, 255, 0.4)' }}
          />
          <Input
            type="text"
            placeholder="Search expenses..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="pl-10 pr-8 bg-slate-900/50 border-slate-700 focus:border-slate-600 text-slate-200"
          />
          {localSearch && (
            <button
              onClick={() => setLocalSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter toggle button */}
        <Button
          variant="outline"
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            'relative bg-slate-900/50 border-slate-700 hover:bg-slate-800/50 text-slate-200',
            hasActiveFilters && 'border-blue-500/50 bg-blue-500/10'
          )}
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {activeFilterCount > 0 && (
            <span
              className="ml-2 px-1.5 py-0.5 rounded-full text-xs font-medium"
              style={{
                background: 'rgba(59, 130, 246, 0.2)',
                color: 'rgba(59, 130, 246, 0.9)',
              }}
            >
              {activeFilterCount}
            </span>
          )}
        </Button>

        {/* Clear filters button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            onClick={handleClearFilters}
            className="text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          >
            Clear all
          </Button>
        )}

        {/* Results count */}
        <div className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
          {filteredCount === totalCount
            ? `${totalCount} expenses`
            : `${filteredCount} of ${totalCount} expenses`}
        </div>
      </div>

      {/* Expanded filters */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-slate-700/50 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Category filter */}
          <div>
            <label className="text-sm font-medium mb-2 block" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              Category
            </label>
            <Select
              value={filters.categories[0] || 'all'}
              onValueChange={(value) =>
                onFiltersChange({
                  ...filters,
                  categories: value === 'all' ? [] : [value as ExpenseCategory],
                })
              }
            >
              <SelectTrigger className="bg-slate-900/50 border-slate-700 text-slate-200">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date from filter */}
          <div>
            <label className="text-sm font-medium mb-2 block" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              Date From
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left bg-slate-900/50 border-slate-700 text-slate-200"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateFrom ? new Date(filters.dateFrom).toLocaleDateString() : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={filters.dateFrom ? new Date(filters.dateFrom) : undefined}
                  onSelect={(date) =>
                    onFiltersChange({ ...filters, dateFrom: date?.toISOString().split('T')[0] || null })
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Date to filter */}
          <div>
            <label className="text-sm font-medium mb-2 block" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              Date To
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left bg-slate-900/50 border-slate-700 text-slate-200"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateTo ? new Date(filters.dateTo).toLocaleDateString() : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={filters.dateTo ? new Date(filters.dateTo) : undefined}
                  onSelect={(date) =>
                    onFiltersChange({ ...filters, dateTo: date?.toISOString().split('T')[0] || null })
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Status filter */}
          <div>
            <label className="text-sm font-medium mb-2 block" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              Status
            </label>
            <Select
              value={filters.status}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, status: value as 'all' | 'approved' | 'draft' })
              }
            >
              <SelectTrigger className="bg-slate-900/50 border-slate-700 text-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Amount range */}
          <div className="md:col-span-2">
            <label className="text-sm font-medium mb-2 block" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              Amount Range
            </label>
            <div className="flex gap-2 items-center">
              <Input
                type="number"
                placeholder="Min"
                value={filters.amountMin ?? ''}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    amountMin: e.target.value ? parseFloat(e.target.value) : null,
                  })
                }
                className="bg-slate-900/50 border-slate-700 text-slate-200"
              />
              <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>to</span>
              <Input
                type="number"
                placeholder="Max"
                value={filters.amountMax ?? ''}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    amountMax: e.target.value ? parseFloat(e.target.value) : null,
                  })
                }
                className="bg-slate-900/50 border-slate-700 text-slate-200"
              />
            </div>
          </div>
        </div>
      )}

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div className="mt-3 flex flex-wrap gap-2">
          {filters.search && (
            <FilterChip
              label={`Search: "${filters.search}"`}
              onRemove={() => {
                setLocalSearch('')
                onFiltersChange({ ...filters, search: '' })
              }}
            />
          )}
          {filters.categories.map((cat) => (
            <FilterChip
              key={cat}
              label={EXPENSE_CATEGORIES.find((c) => c.value === cat)?.label || cat}
              onRemove={() =>
                onFiltersChange({
                  ...filters,
                  categories: filters.categories.filter((c) => c !== cat),
                })
              }
            />
          ))}
          {(filters.dateFrom || filters.dateTo) && (
            <FilterChip
              label={`Date: ${filters.dateFrom ? new Date(filters.dateFrom).toLocaleDateString() : '...'} - ${filters.dateTo ? new Date(filters.dateTo).toLocaleDateString() : '...'}`}
              onRemove={() =>
                onFiltersChange({ ...filters, dateFrom: null, dateTo: null })
              }
            />
          )}
          {(filters.amountMin !== null || filters.amountMax !== null) && (
            <FilterChip
              label={`Amount: €${filters.amountMin ?? '0'} - €${filters.amountMax ?? '∞'}`}
              onRemove={() =>
                onFiltersChange({ ...filters, amountMin: null, amountMax: null })
              }
            />
          )}
          {filters.status !== 'all' && (
            <FilterChip
              label={`Status: ${filters.status}`}
              onRemove={() => onFiltersChange({ ...filters, status: 'all' })}
            />
          )}
        </div>
      )}
    </div>
  )
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <div
      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs"
      style={{
        background: 'rgba(59, 130, 246, 0.15)',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        color: 'rgba(59, 130, 246, 0.9)',
      }}
    >
      <span>{label}</span>
      <button
        onClick={onRemove}
        className="hover:bg-blue-500/20 rounded p-0.5 transition-colors"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}

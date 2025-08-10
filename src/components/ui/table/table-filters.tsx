"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { 
  Filter,
  X,
  ChevronDown,
  Calendar,
  Search,
  SlidersHorizontal,
  RefreshCw
} from "lucide-react"

// Filter types
export type FilterType = 
  | 'text'
  | 'number'
  | 'select'
  | 'multiselect'
  | 'date'
  | 'daterange'
  | 'boolean'
  | 'range'

export interface FilterOption {
  label: string
  value: any
  count?: number
}

export interface TableFilterConfig {
  key: string
  label: string
  type: FilterType
  placeholder?: string
  options?: FilterOption[]
  min?: number
  max?: number
  step?: number
  defaultValue?: any
  width?: string
  className?: string
  render?: (value: any, onChange: (value: any) => void) => React.ReactNode
}

export interface TableFiltersProps {
  filters: TableFilterConfig[]
  values: Record<string, any>
  onChange: (key: string, value: any) => void
  onClear: (key?: string) => void
  onReset: () => void
  className?: string
  orientation?: 'horizontal' | 'vertical'
  showClearAll?: boolean
  showApply?: boolean
  onApply?: () => void
  compact?: boolean
}

/**
 * Advanced table filtering component with multiple filter types
 */
export function TableFilters({
  filters,
  values,
  onChange,
  onClear,
  onReset,
  className,
  orientation = 'horizontal',
  showClearAll = true,
  showApply = false,
  onApply,
  compact = false
}: TableFiltersProps) {
  
  const [isOpen, setIsOpen] = React.useState(false)
  const activeFiltersCount = Object.values(values).filter(value => 
    value != null && value !== '' && (!Array.isArray(value) || value.length > 0)
  ).length
  
  const renderFilter = (filter: TableFilterConfig) => {
    const value = values[filter.key]
    
    // Custom render function
    if (filter.render) {
      return filter.render(value, (newValue) => onChange(filter.key, newValue))
    }
    
    const baseProps = {
      className: cn("w-full", filter.className),
      style: filter.width ? { width: filter.width } : undefined
    }
    
    switch (filter.type) {
      case 'text':
        return (
          <div className="space-y-2">
            <Label htmlFor={`filter-${filter.key}`} className="text-sm font-medium">
              {filter.label}
            </Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id={`filter-${filter.key}`}
                type="text"
                placeholder={filter.placeholder || `Search ${filter.label.toLowerCase()}...`}
                value={value || ''}
                onChange={(e) => onChange(filter.key, e.target.value)}
                className="pl-8"
                {...baseProps}
              />
            </div>
          </div>
        )
        
      case 'number':
        return (
          <div className="space-y-2">
            <Label htmlFor={`filter-${filter.key}`} className="text-sm font-medium">
              {filter.label}
            </Label>
            <Input
              id={`filter-${filter.key}`}
              type="number"
              placeholder={filter.placeholder || `Enter ${filter.label.toLowerCase()}...`}
              value={value || ''}
              onChange={(e) => onChange(filter.key, e.target.value)}
              min={filter.min}
              max={filter.max}
              step={filter.step}
              {...baseProps}
            />
          </div>
        )
        
      case 'select':
        return (
          <div className="space-y-2">
            <Label className="text-sm font-medium">{filter.label}</Label>
            <Select value={value || '__all__'} onValueChange={(newValue) => onChange(filter.key, newValue === '__all__' ? '' : newValue)}>
              <SelectTrigger {...baseProps}>
                <SelectValue placeholder={filter.placeholder || `Select ${filter.label.toLowerCase()}...`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All {filter.label}</SelectItem>
                {filter.options?.map((option) => (
                  <SelectItem key={option.value} value={option.value || '__empty__'}>
                    <div className="flex items-center justify-between w-full">
                      <span>{option.label}</span>
                      {option.count !== undefined && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {option.count}
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )
        
      case 'multiselect':
        const selectedValues = Array.isArray(value) ? value : []
        return (
          <div className="space-y-2">
            <Label className="text-sm font-medium">{filter.label}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("justify-between", baseProps.className)}
                  style={baseProps.style}
                >
                  {selectedValues.length > 0 
                    ? `${selectedValues.length} selected`
                    : filter.placeholder || `Select ${filter.label.toLowerCase()}...`
                  }
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="start">
                <div className="space-y-2">
                  {filter.options?.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`${filter.key}-${option.value}`}
                        checked={selectedValues.includes(option.value)}
                        onCheckedChange={(checked) => {
                          const newValue = checked
                            ? [...selectedValues, option.value]
                            : selectedValues.filter(v => v !== option.value)
                          onChange(filter.key, newValue)
                        }}
                      />
                      <Label 
                        htmlFor={`${filter.key}-${option.value}`}
                        className="flex-1 text-sm font-normal cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <span>{option.label}</span>
                          {option.count !== undefined && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              {option.count}
                            </Badge>
                          )}
                        </div>
                      </Label>
                    </div>
                  ))}
                </div>
                {selectedValues.length > 0 && (
                  <>
                    <Separator className="my-2" />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onChange(filter.key, [])}
                      className="w-full"
                    >
                      Clear Selection
                    </Button>
                  </>
                )}
              </PopoverContent>
            </Popover>
            
            {/* Display selected values as badges */}
            {selectedValues.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedValues.slice(0, 3).map((selectedValue) => {
                  const option = filter.options?.find(opt => opt.value === selectedValue)
                  return (
                    <Badge key={selectedValue} variant="secondary" className="text-xs">
                      {option?.label || selectedValue}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-1 h-auto p-0 text-xs"
                        onClick={() => {
                          const newValue = selectedValues.filter(v => v !== selectedValue)
                          onChange(filter.key, newValue)
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  )
                })}
                {selectedValues.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{selectedValues.length - 3} more
                  </Badge>
                )}
              </div>
            )}
          </div>
        )
        
      case 'boolean':
        return (
          <div className="space-y-2">
            <Label className="text-sm font-medium">{filter.label}</Label>
            <RadioGroup
              value={value?.toString() || ''}
              onValueChange={(newValue) => onChange(filter.key, newValue === '' ? null : newValue === 'true')}
              className="flex flex-col space-y-1"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="" id={`${filter.key}-all`} />
                <Label htmlFor={`${filter.key}-all`} className="text-sm font-normal">
                  All
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="true" id={`${filter.key}-true`} />
                <Label htmlFor={`${filter.key}-true`} className="text-sm font-normal">
                  Yes
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="false" id={`${filter.key}-false`} />
                <Label htmlFor={`${filter.key}-false`} className="text-sm font-normal">
                  No
                </Label>
              </div>
            </RadioGroup>
          </div>
        )
        
      case 'range':
        const rangeValue = value || { min: '', max: '' }
        return (
          <div className="space-y-2">
            <Label className="text-sm font-medium">{filter.label}</Label>
            <div className="flex items-center space-x-2">
              <Input
                type="number"
                placeholder="Min"
                value={rangeValue.min}
                onChange={(e) => onChange(filter.key, { ...rangeValue, min: e.target.value })}
                min={filter.min}
                max={filter.max}
                step={filter.step}
                className="w-20"
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="number"
                placeholder="Max"
                value={rangeValue.max}
                onChange={(e) => onChange(filter.key, { ...rangeValue, max: e.target.value })}
                min={filter.min}
                max={filter.max}
                step={filter.step}
                className="w-20"
              />
            </div>
          </div>
        )
        
      case 'date':
        return (
          <div className="space-y-2">
            <Label htmlFor={`filter-${filter.key}`} className="text-sm font-medium">
              {filter.label}
            </Label>
            <div className="relative">
              <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id={`filter-${filter.key}`}
                type="date"
                value={value || ''}
                onChange={(e) => onChange(filter.key, e.target.value)}
                className="pl-8"
                {...baseProps}
              />
            </div>
          </div>
        )
        
      case 'daterange':
        const dateRangeValue = value || { from: '', to: '' }
        return (
          <div className="space-y-2">
            <Label className="text-sm font-medium">{filter.label}</Label>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  placeholder="From"
                  value={dateRangeValue.from}
                  onChange={(e) => onChange(filter.key, { ...dateRangeValue, from: e.target.value })}
                  className="pl-8 w-32"
                />
              </div>
              <span className="text-muted-foreground">to</span>
              <div className="relative">
                <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  placeholder="To"
                  value={dateRangeValue.to}
                  onChange={(e) => onChange(filter.key, { ...dateRangeValue, to: e.target.value })}
                  className="pl-8 w-32"
                />
              </div>
            </div>
          </div>
        )
        
      default:
        return null
    }
  }
  
  if (compact) {
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className={className}>
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Filter
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Filters</h4>
              {activeFiltersCount > 0 && (
                <Button variant="ghost" size="sm" onClick={() => onClear()}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Reset
                </Button>
              )}
            </div>
            
            <Separator />
            
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {filters.map((filter) => (
                <div key={filter.key}>
                  {renderFilter(filter)}
                </div>
              ))}
            </div>
            
            {showApply && (
              <>
                <Separator />
                <div className="flex items-center justify-end space-x-2">
                  <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => {
                      onApply?.()
                      setIsOpen(false)
                    }}
                  >
                    Apply
                  </Button>
                </div>
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>
    )
  }
  
  const containerClass = cn(
    "space-y-4",
    orientation === 'horizontal' && "flex flex-wrap items-end gap-4 space-y-0",
    className
  )
  
  return (
    <div className={containerClass}>
      {filters.map((filter) => (
        <div key={filter.key} className={orientation === 'horizontal' ? filter.width || 'w-48' : undefined}>
          {renderFilter(filter)}
        </div>
      ))}
      
      {/* Action buttons */}
      <div className={cn(
        "flex items-center gap-2",
        orientation === 'horizontal' && "ml-auto"
      )}>
        {showClearAll && activeFiltersCount > 0 && (
          <Button variant="ghost" size="sm" onClick={() => onClear()}>
            <X className="h-4 w-4 mr-1" />
            Clear All
          </Button>
        )}
        
        {showApply && (
          <Button size="sm" onClick={onApply}>
            Apply Filters
          </Button>
        )}
      </div>
    </div>
  )
}

/**
 * Quick filter bar component for common filters
 */
export interface QuickFiltersProps {
  filters: Array<{
    key: string
    label: string
    options: FilterOption[]
    multiple?: boolean
  }>
  values: Record<string, any>
  onChange: (key: string, value: any) => void
  className?: string
}

export function QuickFilters({ filters, values, onChange, className }: QuickFiltersProps) {
  return (
    <div className={cn("flex items-center gap-2 flex-wrap", className)}>
      {filters.map((filter) => {
        const value = values[filter.key]
        const activeCount = Array.isArray(value) ? value.length : (value ? 1 : 0)
        
        return (
          <Popover key={filter.key}>
            <PopoverTrigger asChild>
              <Button 
                variant={activeCount > 0 ? "default" : "outline"} 
                size="sm"
                className="h-8"
              >
                {filter.label}
                {activeCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 w-4 p-0 text-xs">
                    {activeCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48" align="start">
              <div className="space-y-2">
                {filter.options.map((option) => {
                  const isSelected = filter.multiple
                    ? Array.isArray(value) && value.includes(option.value)
                    : value === option.value
                    
                  return (
                    <div key={option.value} className="flex items-center space-x-2">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          if (filter.multiple) {
                            const currentValue = Array.isArray(value) ? value : []
                            const newValue = checked
                              ? [...currentValue, option.value]
                              : currentValue.filter(v => v !== option.value)
                            onChange(filter.key, newValue)
                          } else {
                            onChange(filter.key, checked ? option.value : null)
                          }
                        }}
                      />
                      <Label className="flex-1 text-sm font-normal cursor-pointer">
                        <div className="flex items-center justify-between">
                          <span>{option.label}</span>
                          {option.count !== undefined && (
                            <span className="text-xs text-muted-foreground">
                              {option.count}
                            </span>
                          )}
                        </div>
                      </Label>
                    </div>
                  )
                })}
              </div>
            </PopoverContent>
          </Popover>
        )
      })}
    </div>
  )
}
"use client"

import * as React from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Filter,
  Download,
  MoreHorizontal,
  Trash2,
  Edit
} from "lucide-react"

// Core interfaces for the data table
export interface DataTableColumn<T> {
  key: string
  title: string
  dataIndex: keyof T
  sortable?: boolean
  filterable?: boolean
  searchable?: boolean
  render?: (value: any, record: T, index: number) => React.ReactNode
  width?: string | number
  align?: 'left' | 'center' | 'right'
  className?: string
}

export interface DataTableAction<T> {
  key: string
  label: string
  icon?: React.ComponentType<{ className?: string }>
  onClick: (record: T, index: number) => void
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost'
  disabled?: (record: T) => boolean
  show?: (record: T) => boolean
}

export interface DataTableBulkAction<T> {
  key: string
  label: string
  icon?: React.ComponentType<{ className?: string }>
  onClick: (selectedRecords: T[]) => void
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost'
  disabled?: (selectedRecords: T[]) => boolean
}

export interface DataTableSortState {
  column: string | null
  direction: 'asc' | 'desc' | null
}

export interface DataTableFilterState {
  [key: string]: any
}

export interface DataTableProps<T> {
  data: T[]
  columns: DataTableColumn<T>[]
  loading?: boolean
  className?: string
  
  // Selection
  selectable?: boolean
  selectedRowKeys?: (string | number)[]
  onSelectionChange?: (selectedKeys: (string | number)[], selectedRows: T[]) => void
  rowKey?: keyof T | ((record: T) => string | number)
  
  // Sorting
  sortable?: boolean
  defaultSort?: DataTableSortState
  onSortChange?: (sort: DataTableSortState) => void
  
  // Filtering and Search  
  filterable?: boolean
  searchable?: boolean
  defaultFilter?: DataTableFilterState
  onFilterChange?: (filters: DataTableFilterState) => void
  searchPlaceholder?: string
  
  // Pagination
  pagination?: boolean
  pageSize?: number
  currentPage?: number
  total?: number
  onPageChange?: (page: number, pageSize: number) => void
  pageSizeOptions?: number[]
  
  // Actions
  actions?: DataTableAction<T>[]
  bulkActions?: DataTableBulkAction<T>[]
  
  // Styling and Layout
  size?: 'small' | 'medium' | 'large'
  bordered?: boolean
  striped?: boolean
  hover?: boolean
  
  // Accessibility
  ariaLabel?: string
  ariaLabelledby?: string
  
  // Empty state
  emptyText?: string
  emptyIcon?: React.ReactNode
  
  // Custom rendering
  header?: React.ReactNode
  footer?: React.ReactNode
}

/**
 * Advanced data table component with sorting, filtering, pagination, and selection
 * Built on top of shadcn/ui table components with full TypeScript support
 */
export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  className,
  
  // Selection
  selectable = false,
  selectedRowKeys = [],
  onSelectionChange,
  rowKey = 'id',
  
  // Sorting
  sortable = true,
  defaultSort = { column: null, direction: null },
  onSortChange,
  
  // Filtering and Search
  filterable = false,
  searchable = false,
  defaultFilter = {},
  onFilterChange,
  searchPlaceholder = "Search...",
  
  // Pagination
  pagination = true,
  pageSize = 10,
  currentPage = 1,
  total,
  onPageChange,
  pageSizeOptions = [5, 10, 25, 50, 100],
  
  // Actions
  actions = [],
  bulkActions = [],
  
  // Styling
  size = 'medium',
  bordered = false,
  striped = false,
  hover = true,
  
  // Accessibility
  ariaLabel = "Data table",
  ariaLabelledby,
  
  // Empty state
  emptyText = "No data available",
  emptyIcon,
  
  // Custom rendering
  header,
  footer
}: DataTableProps<T>) {
  
  // Internal state
  const [internalSort, setInternalSort] = React.useState<DataTableSortState>(defaultSort)
  const [internalFilter, setInternalFilter] = React.useState<DataTableFilterState>(defaultFilter)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [internalSelectedKeys, setInternalSelectedKeys] = React.useState<(string | number)[]>(selectedRowKeys)
  
  // Use controlled or internal state
  const sortState = onSortChange ? (internalSort.column ? internalSort : defaultSort) : internalSort
  const selectedKeys = onSelectionChange ? selectedRowKeys : internalSelectedKeys
  
  // Helper function to get row key
  const getRowKey = React.useCallback((record: T, index: number): string | number => {
    if (typeof rowKey === 'function') {
      return rowKey(record)
    }
    return record[rowKey] ?? index
  }, [rowKey])
  
  // Handle sorting
  const handleSort = React.useCallback((columnKey: string) => {
    const newSort: DataTableSortState = {
      column: columnKey,
      direction: 
        sortState.column === columnKey 
          ? sortState.direction === 'asc' ? 'desc' : sortState.direction === 'desc' ? null : 'asc'
          : 'asc'
    }
    
    if (newSort.direction === null) {
      newSort.column = null
    }
    
    setInternalSort(newSort)
    onSortChange?.(newSort)
  }, [sortState, onSortChange])
  
  // Handle selection
  const handleRowSelection = React.useCallback((recordKey: string | number, checked: boolean) => {
    const newSelectedKeys = checked
      ? [...selectedKeys, recordKey]
      : selectedKeys.filter(key => key !== recordKey)
    
    setInternalSelectedKeys(newSelectedKeys)
    
    if (onSelectionChange) {
      const selectedRecords = data.filter((record, index) => 
        newSelectedKeys.includes(getRowKey(record, index))
      )
      onSelectionChange(newSelectedKeys, selectedRecords)
    }
  }, [selectedKeys, data, getRowKey, onSelectionChange])
  
  // Handle select all
  const handleSelectAll = React.useCallback((checked: boolean) => {
    const newSelectedKeys = checked ? data.map((record, index) => getRowKey(record, index)) : []
    
    setInternalSelectedKeys(newSelectedKeys)
    
    if (onSelectionChange) {
      const selectedRecords = checked ? data : []
      onSelectionChange(newSelectedKeys, selectedRecords)
    }
  }, [data, getRowKey, onSelectionChange])
  
  // Process data (filtering, searching, sorting)
  const processedData = React.useMemo(() => {
    let filtered = [...data]
    
    // Apply search filter
    if (searchTerm && searchable) {
      const searchableColumns = columns.filter(col => col.searchable !== false)
      filtered = filtered.filter(record =>
        searchableColumns.some(col => {
          const value = record[col.dataIndex]
          return value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
        })
      )
    }
    
    // Apply sorting
    if (sortState.column && sortState.direction) {
      const column = columns.find(col => col.key === sortState.column)
      if (column) {
        filtered.sort((a, b) => {
          const aValue = a[column.dataIndex]
          const bValue = b[column.dataIndex]
          
          // Handle null/undefined values
          if (aValue == null && bValue == null) return 0
          if (aValue == null) return sortState.direction === 'asc' ? 1 : -1
          if (bValue == null) return sortState.direction === 'asc' ? -1 : 1
          
          // Compare values
          let comparison = 0
          if (aValue < bValue) comparison = -1
          if (aValue > bValue) comparison = 1
          
          return sortState.direction === 'asc' ? comparison : -comparison
        })
      }
    }
    
    return filtered
  }, [data, columns, searchTerm, searchable, sortState])
  
  // Pagination calculations
  const totalRecords = total ?? processedData.length
  const totalPages = Math.ceil(totalRecords / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, processedData.length)
  const paginatedData = pagination ? processedData.slice(startIndex, endIndex) : processedData
  
  // Selection state calculations
  const allSelected = selectedKeys.length === data.length && data.length > 0
  const someSelected = selectedKeys.length > 0 && selectedKeys.length < data.length
  const indeterminate = someSelected
  
  // Render sort icon
  const renderSortIcon = (columnKey: string) => {
    if (sortState.column !== columnKey) {
      return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
    }
    
    if (sortState.direction === 'asc') {
      return <ArrowUp className="ml-2 h-4 w-4" />
    }
    
    if (sortState.direction === 'desc') {
      return <ArrowDown className="ml-2 h-4 w-4" />
    }
    
    return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
  }
  
  // Size classes
  const sizeClasses = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-base'
  }
  
  return (
    <div className={cn("w-full space-y-4", className)}>
      {/* Header */}
      {header && (
        <div className="flex items-center justify-between">
          {header}
        </div>
      )}
      
      {/* Toolbar */}
      {(searchable || bulkActions.length > 0) && (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {/* Search */}
            {searchable && (
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                />
              </div>
            )}
            
            {/* Filter button */}
            {filterable && (
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            )}
          </div>
          
          {/* Bulk actions */}
          {bulkActions.length > 0 && selectedKeys.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {selectedKeys.length} selected
              </span>
              {bulkActions.map((action) => (
                <Button
                  key={action.key}
                  variant={action.variant || 'outline'}
                  size="sm"
                  onClick={() => {
                    const selectedRecords = data.filter((record, index) =>
                      selectedKeys.includes(getRowKey(record, index))
                    )
                    action.onClick(selectedRecords)
                  }}
                  disabled={action.disabled?.(data.filter((record, index) =>
                    selectedKeys.includes(getRowKey(record, index))
                  ))}
                >
                  {action.icon && <action.icon className="h-4 w-4 mr-2" />}
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Table */}
      <div className={cn(
        "rounded-md border",
        bordered && "border-2",
        sizeClasses[size]
      )}>
        <Table aria-label={ariaLabel} aria-labelledby={ariaLabelledby}>
          <TableHeader>
            <TableRow>
              {/* Selection column */}
              {selectable && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={allSelected}
                    indeterminate={indeterminate}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all rows"
                  />
                </TableHead>
              )}
              
              {/* Data columns */}
              {columns.map((column) => (
                <TableHead 
                  key={column.key}
                  className={cn(
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right',
                    column.className
                  )}
                  style={column.width ? { width: column.width } : undefined}
                >
                  {column.sortable !== false && sortable ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3 h-8 data-[state=open]:bg-accent"
                      onClick={() => handleSort(column.key)}
                    >
                      {column.title}
                      {renderSortIcon(column.key)}
                    </Button>
                  ) : (
                    column.title
                  )}
                </TableHead>
              ))}
              
              {/* Actions column */}
              {actions.length > 0 && (
                <TableHead className="w-12">
                  <span className="sr-only">Actions</span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell 
                  colSpan={columns.length + (selectable ? 1 : 0) + (actions.length > 0 ? 1 : 0)}
                  className="h-24 text-center"
                >
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    <span className="ml-2">Loading...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : paginatedData.length === 0 ? (
              <TableRow>
                <TableCell 
                  colSpan={columns.length + (selectable ? 1 : 0) + (actions.length > 0 ? 1 : 0)}
                  className="h-24 text-center"
                >
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    {emptyIcon}
                    <span>{emptyText}</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((record, index) => {
                const recordKey = getRowKey(record, startIndex + index)
                const isSelected = selectedKeys.includes(recordKey)
                
                return (
                  <TableRow
                    key={recordKey}
                    data-state={isSelected ? "selected" : undefined}
                    className={cn(
                      striped && index % 2 === 0 && "bg-muted/25",
                      hover && "hover:bg-muted/50",
                      isSelected && "bg-muted"
                    )}
                  >
                    {/* Selection cell */}
                    {selectable && (
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleRowSelection(recordKey, checked as boolean)}
                          aria-label={`Select row ${startIndex + index + 1}`}
                        />
                      </TableCell>
                    )}
                    
                    {/* Data cells */}
                    {columns.map((column) => (
                      <TableCell
                        key={column.key}
                        className={cn(
                          column.align === 'center' && 'text-center',
                          column.align === 'right' && 'text-right',
                          column.className
                        )}
                      >
                        {column.render 
                          ? column.render(record[column.dataIndex], record, startIndex + index)
                          : record[column.dataIndex]
                        }
                      </TableCell>
                    ))}
                    
                    {/* Actions cell */}
                    {actions.length > 0 && (
                      <TableCell>
                        <div className="flex items-center justify-center">
                          {actions
                            .filter(action => action.show?.(record) !== false)
                            .map((action) => (
                              <Button
                                key={action.key}
                                variant={action.variant || 'ghost'}
                                size="sm"
                                onClick={() => action.onClick(record, startIndex + index)}
                                disabled={action.disabled?.(record)}
                                className="h-8 w-8 p-0"
                              >
                                {action.icon ? (
                                  <action.icon className="h-4 w-4" />
                                ) : (
                                  <MoreHorizontal className="h-4 w-4" />
                                )}
                                <span className="sr-only">{action.label}</span>
                              </Button>
                            ))}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Pagination */}
      {pagination && !loading && paginatedData.length > 0 && (
        <div className="flex items-center justify-between px-2">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {endIndex} of {totalRecords} entries
          </div>
          
          <div className="flex items-center space-x-6 lg:space-x-8">
            {/* Page size selector */}
            <div className="flex items-center space-x-2">
              <p className="text-sm font-medium">Rows per page</p>
              <select
                value={pageSize}
                onChange={(e) => onPageChange?.(1, Number(e.target.value))}
                className="h-8 w-16 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              >
                {pageSizeOptions.map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>
            
            {/* Pagination controls */}
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange?.(1, pageSize)}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0"
              >
                <ChevronsLeft className="h-4 w-4" />
                <span className="sr-only">Go to first page</span>
              </Button>
              
              <Button
                variant="outline" 
                size="sm"
                onClick={() => onPageChange?.(currentPage - 1, pageSize)}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Go to previous page</span>
              </Button>
              
              <div className="flex items-center justify-center text-sm font-medium">
                Page {currentPage} of {totalPages}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange?.(currentPage + 1, pageSize)}
                disabled={currentPage === totalPages}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
                <span className="sr-only">Go to next page</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange?.(totalPages, pageSize)}
                disabled={currentPage === totalPages}
                className="h-8 w-8 p-0"
              >
                <ChevronsRight className="h-4 w-4" />
                <span className="sr-only">Go to last page</span>
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Footer */}
      {footer && (
        <div className="mt-4">
          {footer}
        </div>
      )}
    </div>
  )
}

// Export commonly used action configurations
export const commonActions = {
  edit: (onClick: (record: any) => void): DataTableAction<any> => ({
    key: 'edit',
    label: 'Edit',
    icon: Edit,
    onClick,
    variant: 'ghost'
  }),
  
  delete: (onClick: (record: any) => void): DataTableAction<any> => ({
    key: 'delete',
    label: 'Delete', 
    icon: Trash2,
    onClick,
    variant: 'ghost'
  })
}

export const commonBulkActions = {
  delete: (onClick: (records: any[]) => void): DataTableBulkAction<any> => ({
    key: 'bulk-delete',
    label: 'Delete Selected',
    icon: Trash2,
    onClick,
    variant: 'destructive'
  }),
  
  export: (onClick: (records: any[]) => void): DataTableBulkAction<any> => ({
    key: 'bulk-export',
    label: 'Export Selected',
    icon: Download,
    onClick,
    variant: 'outline'
  })
}
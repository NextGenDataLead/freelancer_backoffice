"use client"

import * as React from "react"
import { DataTableSortState, DataTableFilterState } from "@/components/ui/table/data-table"

export interface UseTableStateOptions<T> {
  data: T[]
  initialPageSize?: number
  initialPage?: number
  initialSort?: DataTableSortState
  initialFilter?: DataTableFilterState
  initialSearch?: string
  initialSelection?: (string | number)[]
}

export interface UseTableStateReturn<T> {
  // Data state
  processedData: T[]
  filteredData: T[]
  paginatedData: T[]
  
  // Pagination state
  currentPage: number
  pageSize: number
  totalPages: number
  totalRecords: number
  setCurrentPage: (page: number) => void
  setPageSize: (size: number) => void
  goToFirstPage: () => void
  goToLastPage: () => void
  goToNextPage: () => void
  goToPreviousPage: () => void
  
  // Sorting state
  sortState: DataTableSortState
  setSortState: (sort: DataTableSortState) => void
  clearSort: () => void
  
  // Filter state
  filterState: DataTableFilterState
  setFilterState: (filters: DataTableFilterState) => void
  updateFilter: (key: string, value: any) => void
  clearFilter: (key?: string) => void
  clearAllFilters: () => void
  
  // Search state
  searchTerm: string
  setSearchTerm: (term: string) => void
  clearSearch: () => void
  
  // Selection state
  selectedKeys: (string | number)[]
  selectedRecords: T[]
  setSelectedKeys: (keys: (string | number)[]) => void
  selectAll: () => void
  selectNone: () => void
  isSelected: (key: string | number) => boolean
  isAllSelected: boolean
  isSomeSelected: boolean
  
  // Actions
  refresh: () => void
  reset: () => void
}

/**
 * Comprehensive hook for managing data table state
 * Handles pagination, sorting, filtering, search, and selection
 */
export function useTableState<T extends Record<string, any>>({
  data,
  initialPageSize = 10,
  initialPage = 1,
  initialSort = { column: null, direction: null },
  initialFilter = {},
  initialSearch = "",
  initialSelection = []
}: UseTableStateOptions<T>): UseTableStateReturn<T> {
  
  // Internal state
  const [currentPage, setCurrentPage] = React.useState(initialPage)
  const [pageSize, setPageSize] = React.useState(initialPageSize)
  const [sortState, setSortState] = React.useState<DataTableSortState>(initialSort)
  const [filterState, setFilterState] = React.useState<DataTableFilterState>(initialFilter)
  const [searchTerm, setSearchTerm] = React.useState(initialSearch)
  const [selectedKeys, setSelectedKeys] = React.useState<(string | number)[]>(initialSelection)
  
  // Get row key helper (assumes 'id' field or index)
  const getRowKey = React.useCallback((record: T, index: number): string | number => {
    return record.id ?? index
  }, [])
  
  // Filter and search data
  const filteredData = React.useMemo(() => {
    let filtered = [...data]
    
    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(record => 
        Object.values(record).some(value => 
          value?.toString().toLowerCase().includes(searchLower)
        )
      )
    }
    
    // Apply column filters
    Object.entries(filterState).forEach(([key, value]) => {
      if (value != null && value !== '') {
        filtered = filtered.filter(record => {
          const recordValue = record[key]
          
          // Handle different filter types
          if (Array.isArray(value)) {
            return value.includes(recordValue)
          }
          
          if (typeof value === 'object' && value.min !== undefined && value.max !== undefined) {
            const numValue = Number(recordValue)
            return numValue >= value.min && numValue <= value.max
          }
          
          return recordValue?.toString().toLowerCase().includes(value.toString().toLowerCase())
        })
      }
    })
    
    return filtered
  }, [data, searchTerm, filterState])
  
  // Sort data
  const processedData = React.useMemo(() => {
    if (!sortState.column || !sortState.direction) {
      return filteredData
    }
    
    return [...filteredData].sort((a, b) => {
      const aValue = a[sortState.column!]
      const bValue = b[sortState.column!]
      
      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0
      if (aValue == null) return sortState.direction === 'asc' ? 1 : -1
      if (bValue == null) return sortState.direction === 'asc' ? -1 : 1
      
      // Compare values
      let comparison = 0
      
      // Handle different data types
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue
      } else if (aValue instanceof Date && bValue instanceof Date) {
        comparison = aValue.getTime() - bValue.getTime()
      } else {
        comparison = aValue.toString().localeCompare(bValue.toString())
      }
      
      return sortState.direction === 'asc' ? comparison : -comparison
    })
  }, [filteredData, sortState])
  
  // Pagination calculations
  const totalRecords = processedData.length
  const totalPages = Math.ceil(totalRecords / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalRecords)
  const paginatedData = processedData.slice(startIndex, endIndex)
  
  // Selection calculations
  const selectedRecords = React.useMemo(() => {
    return data.filter((record, index) => 
      selectedKeys.includes(getRowKey(record, index))
    )
  }, [data, selectedKeys, getRowKey])
  
  const isAllSelected = selectedKeys.length === data.length && data.length > 0
  const isSomeSelected = selectedKeys.length > 0 && selectedKeys.length < data.length
  
  // Auto-adjust current page if it exceeds total pages
  React.useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])
  
  // Selection methods
  const selectAll = React.useCallback(() => {
    const allKeys = data.map((record, index) => getRowKey(record, index))
    setSelectedKeys(allKeys)
  }, [data, getRowKey])
  
  const selectNone = React.useCallback(() => {
    setSelectedKeys([])
  }, [])
  
  const isSelected = React.useCallback((key: string | number) => {
    return selectedKeys.includes(key)
  }, [selectedKeys])
  
  // Filter methods
  const updateFilter = React.useCallback((key: string, value: any) => {
    setFilterState(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1) // Reset to first page when filtering
  }, [])
  
  const clearFilter = React.useCallback((key?: string) => {
    if (key) {
      setFilterState(prev => {
        const newState = { ...prev }
        delete newState[key]
        return newState
      })
    } else {
      setFilterState({})
    }
    setCurrentPage(1)
  }, [])
  
  const clearAllFilters = React.useCallback(() => {
    setFilterState({})
    setCurrentPage(1)
  }, [])
  
  // Search methods
  const clearSearch = React.useCallback(() => {
    setSearchTerm("")
    setCurrentPage(1)
  }, [])
  
  // Sorting methods
  const clearSort = React.useCallback(() => {
    setSortState({ column: null, direction: null })
  }, [])
  
  // Pagination methods
  const goToFirstPage = React.useCallback(() => setCurrentPage(1), [])
  const goToLastPage = React.useCallback(() => setCurrentPage(totalPages), [totalPages])
  const goToNextPage = React.useCallback(() => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1)
  }, [currentPage, totalPages])
  const goToPreviousPage = React.useCallback(() => {
    if (currentPage > 1) setCurrentPage(currentPage - 1)
  }, [currentPage])
  
  // Enhanced page size setter
  const handleSetPageSize = React.useCallback((size: number) => {
    setPageSize(size)
    setCurrentPage(1) // Reset to first page when changing page size
  }, [])
  
  // Utility methods
  const refresh = React.useCallback(() => {
    // This would trigger a data refetch in a real application
    // For now, it just resets the current page to 1
    setCurrentPage(1)
  }, [])
  
  const reset = React.useCallback(() => {
    setCurrentPage(initialPage)
    setPageSize(initialPageSize)
    setSortState(initialSort)
    setFilterState(initialFilter)
    setSearchTerm(initialSearch)
    setSelectedKeys(initialSelection)
  }, [initialPage, initialPageSize, initialSort, initialFilter, initialSearch, initialSelection])
  
  return {
    // Data state
    processedData,
    filteredData,
    paginatedData,
    
    // Pagination state
    currentPage,
    pageSize,
    totalPages,
    totalRecords,
    setCurrentPage,
    setPageSize: handleSetPageSize,
    goToFirstPage,
    goToLastPage,
    goToNextPage,
    goToPreviousPage,
    
    // Sorting state
    sortState,
    setSortState,
    clearSort,
    
    // Filter state
    filterState,
    setFilterState,
    updateFilter,
    clearFilter,
    clearAllFilters,
    
    // Search state
    searchTerm,
    setSearchTerm,
    clearSearch,
    
    // Selection state
    selectedKeys,
    selectedRecords,
    setSelectedKeys,
    selectAll,
    selectNone,
    isSelected,
    isAllSelected,
    isSomeSelected,
    
    // Actions
    refresh,
    reset
  }
}

/**
 * Hook for managing table columns with dynamic show/hide functionality
 */
export interface UseTableColumnsOptions<T> {
  allColumns: Array<{
    key: string
    title: string
    dataIndex: keyof T
    visible?: boolean
  }>
  defaultVisible?: string[]
}

export function useTableColumns<T>({ allColumns, defaultVisible }: UseTableColumnsOptions<T>) {
  const [visibleColumns, setVisibleColumns] = React.useState<string[]>(() => {
    if (defaultVisible) return defaultVisible
    return allColumns.filter(col => col.visible !== false).map(col => col.key)
  })
  
  const toggleColumn = React.useCallback((columnKey: string) => {
    setVisibleColumns(prev => 
      prev.includes(columnKey)
        ? prev.filter(key => key !== columnKey)
        : [...prev, columnKey]
    )
  }, [])
  
  const showColumn = React.useCallback((columnKey: string) => {
    setVisibleColumns(prev => 
      prev.includes(columnKey) ? prev : [...prev, columnKey]
    )
  }, [])
  
  const hideColumn = React.useCallback((columnKey: string) => {
    setVisibleColumns(prev => prev.filter(key => key !== columnKey))
  }, [])
  
  const showAllColumns = React.useCallback(() => {
    setVisibleColumns(allColumns.map(col => col.key))
  }, [allColumns])
  
  const hideAllColumns = React.useCallback(() => {
    setVisibleColumns([])
  }, [])
  
  const resetColumns = React.useCallback(() => {
    const defaultCols = defaultVisible || allColumns.filter(col => col.visible !== false).map(col => col.key)
    setVisibleColumns(defaultCols)
  }, [allColumns, defaultVisible])
  
  const visibleColumnConfigs = React.useMemo(() => {
    return allColumns.filter(col => visibleColumns.includes(col.key))
  }, [allColumns, visibleColumns])
  
  return {
    visibleColumns,
    visibleColumnConfigs,
    setVisibleColumns,
    toggleColumn,
    showColumn,
    hideColumn,
    showAllColumns,
    hideAllColumns,
    resetColumns,
    isColumnVisible: (columnKey: string) => visibleColumns.includes(columnKey)
  }
}
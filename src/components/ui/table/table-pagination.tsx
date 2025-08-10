"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { 
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from "lucide-react"

export interface TablePaginationProps {
  currentPage: number
  totalPages: number
  pageSize: number
  totalRecords: number
  pageSizeOptions?: number[]
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  className?: string
  showPageSizeSelector?: boolean
  showRecordCount?: boolean
  compact?: boolean
}

/**
 * Advanced pagination component with smart page number display
 * Supports page size selection and accessibility features
 */
export function TablePagination({
  currentPage,
  totalPages,
  pageSize,
  totalRecords,
  pageSizeOptions = [5, 10, 25, 50, 100],
  onPageChange,
  onPageSizeChange,
  className,
  showPageSizeSelector = true,
  showRecordCount = true,
  compact = false
}: TablePaginationProps) {
  
  const startRecord = (currentPage - 1) * pageSize + 1
  const endRecord = Math.min(currentPage * pageSize, totalRecords)
  
  // Generate page numbers with ellipsis logic
  const generatePageNumbers = React.useMemo(() => {
    const pages: (number | string)[] = []
    const maxVisiblePages = compact ? 3 : 5
    const sidePages = Math.floor(maxVisiblePages / 2)
    
    if (totalPages <= maxVisiblePages + 2) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(1)
      
      // Calculate start and end of middle section
      let start = Math.max(2, currentPage - sidePages)
      let end = Math.min(totalPages - 1, currentPage + sidePages)
      
      // Adjust if we're near the beginning
      if (currentPage <= sidePages + 1) {
        end = maxVisiblePages
      }
      
      // Adjust if we're near the end
      if (currentPage >= totalPages - sidePages) {
        start = totalPages - maxVisiblePages + 1
      }
      
      // Add ellipsis if needed before middle section
      if (start > 2) {
        pages.push('...')
      }
      
      // Add middle pages
      for (let i = start; i <= end; i++) {
        if (i > 1 && i < totalPages) {
          pages.push(i)
        }
      }
      
      // Add ellipsis if needed after middle section
      if (end < totalPages - 1) {
        pages.push('...')
      }
      
      // Always show last page if more than 1 page
      if (totalPages > 1) {
        pages.push(totalPages)
      }
    }
    
    return pages
  }, [currentPage, totalPages, compact])
  
  if (totalPages <= 1 && !showRecordCount && !showPageSizeSelector) {
    return null
  }
  
  return (
    <div className={cn(
      "flex items-center justify-between px-2",
      compact && "flex-col space-y-2 sm:flex-row sm:space-y-0",
      className
    )}>
      {/* Record count */}
      {showRecordCount && (
        <div className="text-sm text-muted-foreground">
          {totalRecords === 0 
            ? "No entries found"
            : `Showing ${startRecord} to ${endRecord} of ${totalRecords} entries`
          }
        </div>
      )}
      
      <div className={cn(
        "flex items-center space-x-6 lg:space-x-8",
        compact && "flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-4"
      )}>
        {/* Page size selector */}
        {showPageSizeSelector && (
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Rows per page</p>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => onPageSizeChange(Number(value))}
            >
              <SelectTrigger className="h-8 w-16">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        
        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex items-center space-x-2">
            {/* First page */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
              className="h-8 w-8 p-0"
              aria-label="Go to first page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            
            {/* Previous page */}
            <Button
              variant="outline" 
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="h-8 w-8 p-0"
              aria-label="Go to previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            {/* Page numbers */}
            <div className="flex items-center space-x-1">
              {generatePageNumbers.map((page, index) => (
                page === '...' ? (
                  <span key={`ellipsis-${index}`} className="px-2 text-sm text-muted-foreground">
                    ...
                  </span>
                ) : (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => onPageChange(page as number)}
                    className="h-8 w-8 p-0"
                    aria-label={`Go to page ${page}`}
                    aria-current={currentPage === page ? "page" : undefined}
                  >
                    {page}
                  </Button>
                )
              ))}
            </div>
            
            {/* Next page */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="h-8 w-8 p-0"
              aria-label="Go to next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            
            {/* Last page */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="h-8 w-8 p-0"
              aria-label="Go to last page"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Simple pagination component for basic use cases
 */
export interface SimplePaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

export function SimplePagination({
  currentPage,
  totalPages,
  onPageChange,
  className
}: SimplePaginationProps) {
  
  if (totalPages <= 1) return null
  
  return (
    <div className={cn("flex items-center justify-center space-x-2", className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Previous
      </Button>
      
      <span className="text-sm text-muted-foreground px-2">
        Page {currentPage} of {totalPages}
      </span>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Next page"
      >
        Next
        <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  )
}

/**
 * Hook for managing pagination state
 */
export interface UsePaginationOptions {
  totalRecords: number
  initialPageSize?: number
  initialPage?: number
}

export interface UsePaginationReturn {
  currentPage: number
  pageSize: number
  totalPages: number
  setCurrentPage: (page: number) => void
  setPageSize: (size: number) => void
  goToFirstPage: () => void
  goToLastPage: () => void
  goToNextPage: () => void
  goToPreviousPage: () => void
  canGoNext: boolean
  canGoPrevious: boolean
}

export function usePagination({
  totalRecords,
  initialPageSize = 10,
  initialPage = 1
}: UsePaginationOptions): UsePaginationReturn {
  
  const [currentPage, setCurrentPageState] = React.useState(initialPage)
  const [pageSize, setPageSizeState] = React.useState(initialPageSize)
  
  const totalPages = Math.ceil(totalRecords / pageSize)
  const canGoNext = currentPage < totalPages
  const canGoPrevious = currentPage > 1
  
  // Auto-adjust current page if it exceeds total pages
  React.useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPageState(totalPages)
    }
  }, [currentPage, totalPages])
  
  const setCurrentPage = React.useCallback((page: number) => {
    const newPage = Math.max(1, Math.min(page, totalPages))
    setCurrentPageState(newPage)
  }, [totalPages])
  
  const setPageSize = React.useCallback((size: number) => {
    setPageSizeState(size)
    setCurrentPageState(1) // Reset to first page when changing page size
  }, [])
  
  const goToFirstPage = React.useCallback(() => setCurrentPage(1), [setCurrentPage])
  const goToLastPage = React.useCallback(() => setCurrentPage(totalPages), [setCurrentPage, totalPages])
  const goToNextPage = React.useCallback(() => {
    if (canGoNext) setCurrentPage(currentPage + 1)
  }, [canGoNext, currentPage, setCurrentPage])
  const goToPreviousPage = React.useCallback(() => {
    if (canGoPrevious) setCurrentPage(currentPage - 1)
  }, [canGoPrevious, currentPage, setCurrentPage])
  
  return {
    currentPage,
    pageSize,
    totalPages,
    setCurrentPage,
    setPageSize,
    goToFirstPage,
    goToLastPage,
    goToNextPage,
    goToPreviousPage,
    canGoNext,
    canGoPrevious
  }
}
'use client'

import { useCallback, useEffect, useState, useMemo, useRef } from 'react'
import { toast } from 'sonner'
import {
  ChevronDown,
  ChevronRight,
  Edit,
  Receipt,
  CheckCircle,
  AlertCircle,
  Loader2,
  Trash2,
  Calendar
} from 'lucide-react'
import { DeleteConfirmationModal } from '@/components/ui/modal'
import type { ExpenseWithSupplier } from '@/lib/types/financial'
import { formatEuropeanCurrency } from '@/lib/utils/formatEuropeanNumber'
import { SkeletonExpenseList } from './skeleton-expense-card'
import { ExpenseFilterBar, type ExpenseFilters } from './expense-filter-bar'
import { BulkActionBar } from './bulk-action-bar'
import { Checkbox } from '@/components/ui/checkbox'
import { useLocalStorage } from '@/hooks/use-local-storage'
import { useSearchParams, useRouter } from 'next/navigation'

interface ExpenseListProps {
  onAddExpense?: () => void
  onEditExpense?: (expense: ExpenseWithSupplier) => void
  onViewExpense?: (expense: ExpenseWithSupplier) => void
}

interface ExpensesResponse {
  data: ExpenseWithSupplier[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

interface MonthGroup {
  monthKey: string
  monthDisplay: string
  expenses: ExpenseWithSupplier[]
  total: number
  count: number
  categoryBreakdown: CategorySummary[]
}

interface CategorySummary {
  categoryKey: string
  categoryDisplay: string
  total: number
  count: number
  color: string
}

const getCategoryDisplayName = (category: string) => {
  const categories: Record<string, string> = {
    'kantoorbenodigdheden': 'Office Supplies',
    'reiskosten': 'Travel Expenses',
    'maaltijden_zakelijk': 'Meals & Business',
    'marketing_reclame': 'Marketing',
    'software_ict': 'Software & ICT',
    'afschrijvingen': 'Depreciation',
    'verzekeringen': 'Insurance',
    'professionele_diensten': 'Professional Services',
    'werkruimte_kantoor': 'Workspace',
    'voertuigkosten': 'Vehicle',
    'telefoon_communicatie': 'Communication',
    'vakliteratuur': 'Literature',
    'werkkleding': 'Work Clothing',
    'relatiegeschenken_representatie': 'Business Gifts',
    'overige_zakelijk': 'Other'
  }
  return categories[category] || category
}

const getCategoryColor = (index: number) => {
  const colors = [
    'rgba(251, 146, 60, 0.7)',   // Orange
    'rgba(59, 130, 246, 0.7)',   // Blue
    'rgba(139, 92, 246, 0.7)',   // Purple
    'rgba(34, 211, 238, 0.7)',   // Cyan
    'rgba(236, 72, 153, 0.7)',   // Pink
    'rgba(34, 197, 94, 0.7)',    // Green
  ]
  return colors[index % colors.length]
}

export function ExpenseList({ onAddExpense, onEditExpense, onViewExpense }: ExpenseListProps) {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [expenses, setExpenses] = useState<ExpenseWithSupplier[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<ExpenseWithSupplier | null>(null)

  // Persistent state with localStorage
  const [expandedMonthsArray, setExpandedMonthsArray] = useLocalStorage<string[]>('expense-expanded-months', [])
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set(expandedMonthsArray))

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const ITEMS_PER_PAGE = 50

  // Initialize filters from URL params
  const initialFilters: ExpenseFilters = useMemo(() => {
    if (typeof window === 'undefined') {
      return {
        search: '',
        categories: [],
        dateFrom: null,
        dateTo: null,
        amountMin: null,
        amountMax: null,
        status: 'all',
      }
    }

    return {
      search: searchParams.get('search') || '',
      categories: searchParams.get('category') ? [searchParams.get('category') as any] : [],
      dateFrom: searchParams.get('dateFrom') || null,
      dateTo: searchParams.get('dateTo') || null,
      amountMin: searchParams.get('amountMin') ? parseFloat(searchParams.get('amountMin')!) : null,
      amountMax: searchParams.get('amountMax') ? parseFloat(searchParams.get('amountMax')!) : null,
      status: (searchParams.get('status') as 'all' | 'approved' | 'draft') || 'all',
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Filter state
  const [filters, setFilters] = useState<ExpenseFilters>(initialFilters)

  // Selection state for bulk actions
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<Set<string>>(new Set())

  // Category expansion state (per month)
  const [expandedCategoriesMonths, setExpandedCategoriesMonths] = useState<Set<string>>(new Set())

  // Intersection observer ref for infinite scroll
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const fetchExpenses = useCallback(async (page: number = 1, append: boolean = false) => {
    try {
      if (append) {
        setLoadingMore(true)
      } else {
        setLoading(true)
      }

      // Build query string with filters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: ITEMS_PER_PAGE.toString(),
      })

      // Add filter parameters
      if (filters.search) {
        params.append('search', filters.search)
      }
      if (filters.categories.length > 0) {
        params.append('category', filters.categories[0]) // API supports single category for now
      }
      if (filters.dateFrom) {
        params.append('date_from', filters.dateFrom)
      }
      if (filters.dateTo) {
        params.append('date_to', filters.dateTo)
      }
      if (filters.status !== 'all') {
        params.append('status', filters.status)
      }

      const response = await fetch(`/api/expenses?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Failed to fetch expenses')
      }

      const data: ExpensesResponse = await response.json()

      // Apply client-side filters (search, amount range) if needed
      let filteredData = data.data

      // Search filter (client-side for description/vendor)
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        filteredData = filteredData.filter(
          (expense) =>
            expense.description?.toLowerCase().includes(searchLower) ||
            expense.title?.toLowerCase().includes(searchLower) ||
            expense.vendor_name?.toLowerCase().includes(searchLower)
        )
      }

      // Amount range filter (client-side)
      if (filters.amountMin !== null) {
        filteredData = filteredData.filter(
          (expense) => parseFloat(expense.amount) >= filters.amountMin!
        )
      }
      if (filters.amountMax !== null) {
        filteredData = filteredData.filter(
          (expense) => parseFloat(expense.amount) <= filters.amountMax!
        )
      }

      setExpenses(prev => append ? [...prev, ...filteredData] : filteredData)
      setTotalCount(data.pagination.total)
      setCurrentPage(page)
      setHasMore(page < data.pagination.totalPages)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [ITEMS_PER_PAGE, filters])

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchExpenses(currentPage + 1, true)
    }
  }, [loadingMore, hasMore, currentPage, fetchExpenses])

  const handleFiltersChange = useCallback((newFilters: ExpenseFilters) => {
    setFilters(newFilters)
    // Reset pagination when filters change
    setCurrentPage(1)
    setExpenses([])

    // Update URL params for deep linking
    const params = new URLSearchParams()
    if (newFilters.search) params.set('search', newFilters.search)
    if (newFilters.categories.length > 0) params.set('category', newFilters.categories[0])
    if (newFilters.dateFrom) params.set('dateFrom', newFilters.dateFrom)
    if (newFilters.dateTo) params.set('dateTo', newFilters.dateTo)
    if (newFilters.amountMin !== null) params.set('amountMin', newFilters.amountMin.toString())
    if (newFilters.amountMax !== null) params.set('amountMax', newFilters.amountMax.toString())
    if (newFilters.status !== 'all') params.set('status', newFilters.status)

    const queryString = params.toString()
    const newUrl = queryString ? `?${queryString}` : window.location.pathname
    window.history.replaceState({}, '', newUrl)
  }, [])

  // Handle category chip click
  const handleCategoryClick = useCallback((category: string) => {
    setFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(category as any)
        ? []
        : [category as any]
    }))
    setCurrentPage(1)
    setExpenses([])
  }, [])

  // Toggle category expansion for a month
  const toggleCategoryExpansion = useCallback((monthKey: string) => {
    setExpandedCategoriesMonths(prev => {
      const newSet = new Set(prev)
      if (newSet.has(monthKey)) {
        newSet.delete(monthKey)
      } else {
        newSet.add(monthKey)
      }
      return newSet
    })
  }, [])

  // Selection handlers
  const toggleExpenseSelection = useCallback((expenseId: string) => {
    setSelectedExpenseIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(expenseId)) {
        newSet.delete(expenseId)
      } else {
        newSet.add(expenseId)
      }
      return newSet
    })
  }, [])

  const toggleMonthSelection = useCallback((monthExpenses: ExpenseWithSupplier[]) => {
    const monthExpenseIds = monthExpenses.map(e => e.id)
    const allSelected = monthExpenseIds.every(id => selectedExpenseIds.has(id))

    setSelectedExpenseIds(prev => {
      const newSet = new Set(prev)
      if (allSelected) {
        // Deselect all in month
        monthExpenseIds.forEach(id => newSet.delete(id))
      } else {
        // Select all in month
        monthExpenseIds.forEach(id => newSet.add(id))
      }
      return newSet
    })
  }, [selectedExpenseIds])

  const clearSelection = useCallback(() => {
    setSelectedExpenseIds(new Set())
  }, [])

  // Bulk action handlers
  const handleBulkDelete = useCallback(async () => {
    const idsToDelete = Array.from(selectedExpenseIds)

    try {
      // Delete each expense
      await Promise.all(
        idsToDelete.map(id =>
          fetch(`/api/expenses/${id}`, { method: 'DELETE' })
        )
      )

      // Refresh the list
      await fetchExpenses(1, false)
      clearSelection()
    } catch (error) {
      throw error
    }
  }, [selectedExpenseIds, fetchExpenses, clearSelection])

  const handleBulkApprove = useCallback(async () => {
    const idsToApprove = Array.from(selectedExpenseIds)

    try {
      // Approve each expense (would need a PATCH endpoint)
      await Promise.all(
        idsToApprove.map(id =>
          fetch(`/api/expenses/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'approved' })
          })
        )
      )

      // Refresh the list
      await fetchExpenses(1, false)
      clearSelection()
    } catch (error) {
      throw error
    }
  }, [selectedExpenseIds, fetchExpenses, clearSelection])

  // Group expenses by month
  const groupedExpenses = useMemo(() => {
    const monthMap = new Map<string, MonthGroup>()

    expenses.forEach(expense => {
      const expenseDate = new Date(expense.expense_date)
      const monthKey = `${expenseDate.getFullYear()}-${String(expenseDate.getMonth() + 1).padStart(2, '0')}`
      const monthDisplay = expenseDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })

      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, {
          monthKey,
          monthDisplay,
          expenses: [],
          total: 0,
          count: 0,
          categoryBreakdown: []
        })
      }

      const monthGroup = monthMap.get(monthKey)!
      const expenseTotal = parseFloat(expense.amount) + parseFloat(expense.vat_amount || '0')

      monthGroup.expenses.push(expense)
      monthGroup.total += expenseTotal
      monthGroup.count += 1
    })

    // Calculate category breakdowns for each month
    monthMap.forEach(monthGroup => {
      const categoryMap = new Map<string, { total: number; count: number }>()

      monthGroup.expenses.forEach(expense => {
        const categoryKey = expense.category || 'uncategorized'
        const expenseTotal = parseFloat(expense.amount) + parseFloat(expense.vat_amount || '0')

        if (!categoryMap.has(categoryKey)) {
          categoryMap.set(categoryKey, { total: 0, count: 0 })
        }

        const catData = categoryMap.get(categoryKey)!
        catData.total += expenseTotal
        catData.count += 1
      })

      // Convert to array and sort by total (highest first)
      monthGroup.categoryBreakdown = Array.from(categoryMap.entries())
        .map(([categoryKey, data], index) => ({
          categoryKey,
          categoryDisplay: getCategoryDisplayName(categoryKey),
          total: data.total,
          count: data.count,
          color: getCategoryColor(index)
        }))
        .sort((a, b) => b.total - a.total)

      // Sort expenses by date (newest first within month)
      monthGroup.expenses.sort((a, b) =>
        new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime()
      )
    })

    // Convert to array and sort by month (newest first)
    return Array.from(monthMap.values()).sort((a, b) => b.monthKey.localeCompare(a.monthKey))
  }, [expenses])

  // Initialize current month as expanded
  useEffect(() => {
    if (groupedExpenses.length > 0 && expandedMonths.size === 0) {
      const currentMonthKey = groupedExpenses[0]?.monthKey
      if (currentMonthKey) {
        setExpandedMonths(new Set([currentMonthKey]))
      }
    }
  }, [groupedExpenses, expandedMonths.size])

  useEffect(() => {
    fetchExpenses()
  }, [fetchExpenses])

  // Refetch when filters change
  useEffect(() => {
    if (currentPage === 1) {
      fetchExpenses(1, false)
    }
  }, [filters]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleRefresh = () => fetchExpenses()
    window.addEventListener('expense:created', handleRefresh)
    window.addEventListener('expense:deleted', handleRefresh)

    return () => {
      window.removeEventListener('expense:created', handleRefresh)
      window.removeEventListener('expense:deleted', handleRefresh)
    }
  }, [fetchExpenses])

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current || !hasMore || loadingMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore()
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(loadMoreRef.current)

    return () => observer.disconnect()
  }, [hasMore, loadingMore, loadMore])

  const toggleMonth = (monthKey: string) => {
    setExpandedMonths(prev => {
      const newSet = new Set(prev)
      if (newSet.has(monthKey)) {
        newSet.delete(monthKey)
      } else {
        newSet.add(monthKey)
      }
      // Persist to localStorage
      setExpandedMonthsArray(Array.from(newSet))
      return newSet
    })
  }

  const handleDelete = async (expense: ExpenseWithSupplier) => {
    setConfirmDelete(expense)
  }

  const performDelete = async (expense: ExpenseWithSupplier) => {
    setDeletingExpenseId(expense.id)
    try {
      const response = await fetch(`/api/expenses/${expense.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete expense')
      }

      toast.success('Expense deleted successfully')
      fetchExpenses()
    } catch (error) {
      console.error('Error deleting expense:', error)
      toast.error('Failed to delete expense')
    } finally {
    setDeletingExpenseId(null)
    }
  }

  if (loading && currentPage === 1) {
    return <SkeletonExpenseList count={3} />
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
        <AlertCircle className="h-8 w-8 mb-2" />
        <p>{error}</p>
      </div>
    )
  }

  if (groupedExpenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
        <Receipt className="h-12 w-12 mb-4" />
        <p className="text-lg">No expenses found</p>
        <p className="text-sm">Add your first expense to get started</p>
      </div>
    )
  }

  return (
    <>
      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedExpenseIds.size}
        onClearSelection={clearSelection}
        onBulkDelete={handleBulkDelete}
        onBulkApprove={handleBulkApprove}
      />

      <div className="space-y-4">
        {/* Filter Bar */}
        <ExpenseFilterBar
          filters={filters}
          onFiltersChange={handleFiltersChange}
          totalCount={totalCount}
          filteredCount={expenses.length}
        />

      {/* Expense count indicator */}
      {totalCount > 0 && (
        <div className="flex items-center justify-between px-4 py-2 rounded-lg" style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <p style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)' }}>
            Showing {expenses.length} of {totalCount} expenses
          </p>
          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="px-3 py-1 rounded text-sm transition-colors"
              style={{
                background: 'rgba(59, 130, 246, 0.15)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                color: 'rgba(59, 130, 246, 0.9)'
              }}
            >
              {loadingMore ? 'Loading...' : `Load ${Math.min(ITEMS_PER_PAGE, totalCount - expenses.length)} more`}
            </button>
          )}
        </div>
      )}

      {groupedExpenses.map((monthGroup, monthIndex) => {
        const isExpanded = expandedMonths.has(monthGroup.monthKey)
        const isCurrentMonth = monthIndex === 0

        return (
          <div
            key={monthGroup.monthKey}
            className="glass-card"
            style={{
              background: isCurrentMonth
                ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(37, 99, 235, 0.05))'
                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02))',
              padding: '1.5rem',
              transition: 'all 0.3s ease'
            }}
          >
            {/* Month Header */}
            <div
              className="flex items-center justify-between cursor-pointer mb-4"
              onClick={() => toggleMonth(monthGroup.monthKey)}
            >
              <div className="flex items-center gap-3">
                {/* Select all checkbox */}
                <div onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={monthGroup.expenses.every(e => selectedExpenseIds.has(e.id))}
                    onCheckedChange={() => toggleMonthSelection(monthGroup.expenses)}
                    className="border-slate-600 data-[state=checked]:bg-blue-600"
                  />
                </div>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  background: 'rgba(59, 130, 246, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Calendar className="h-5 w-5" style={{ color: 'rgba(59, 130, 246, 0.9)' }} />
                </div>
                <div>
                  <h3 style={{
                    fontSize: '1.125rem',
                    fontWeight: 600,
                    color: 'rgba(255, 255, 255, 0.95)',
                    marginBottom: '0.25rem'
                  }}>
                    {monthGroup.monthDisplay}
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                    {monthGroup.count} {monthGroup.count === 1 ? 'expense' : 'expenses'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'rgba(255, 255, 255, 0.95)' }}>
                    {formatEuropeanCurrency(monthGroup.total)}
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronDown className="h-5 w-5 text-slate-400" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-slate-400" />
                )}
              </div>
            </div>

            {/* Category Breakdown - Always Visible */}
            {monthGroup.categoryBreakdown.length > 0 && (
              <div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '0.75rem',
                  marginBottom: isExpanded ? '1.5rem' : '0',
                  paddingBottom: isExpanded ? '1.5rem' : '0',
                  borderBottom: isExpanded ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
                  transition: 'all 0.3s ease'
                }}>
                  {(expandedCategoriesMonths.has(monthGroup.monthKey)
                    ? monthGroup.categoryBreakdown
                    : monthGroup.categoryBreakdown.slice(0, 6)
                  ).map((category) => {
                    const isActive = filters.categories.includes(category.categoryKey as any)
                    return (
                      <button
                        key={category.categoryKey}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCategoryClick(category.categoryKey)
                        }}
                        className="text-left transition-all duration-200 hover:scale-[1.02]"
                        style={{
                          padding: '0.75rem',
                          borderRadius: '8px',
                          background: isActive
                            ? 'rgba(59, 130, 246, 0.15)'
                            : 'rgba(255, 255, 255, 0.03)',
                          border: isActive
                            ? '1px solid rgba(59, 130, 246, 0.4)'
                            : '1px solid rgba(255, 255, 255, 0.08)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          cursor: 'pointer'
                        }}
                      >
                        <div
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '2px',
                            background: category.color,
                            flexShrink: 0
                          }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: '0.75rem',
                            color: isActive ? 'rgba(59, 130, 246, 0.9)' : 'rgba(255, 255, 255, 0.6)',
                            marginBottom: '0.125rem',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {category.categoryDisplay}
                          </div>
                          <div style={{
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            color: isActive ? 'rgba(59, 130, 246, 1)' : 'rgba(255, 255, 255, 0.9)'
                          }}>
                            {formatEuropeanCurrency(category.total)}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>

                {/* Show all categories button */}
                {monthGroup.categoryBreakdown.length > 6 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleCategoryExpansion(monthGroup.monthKey)
                    }}
                    className="mt-2 text-sm transition-colors"
                    style={{
                      color: 'rgba(59, 130, 246, 0.8)',
                      textDecoration: 'none'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'rgba(59, 130, 246, 1)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'rgba(59, 130, 246, 0.8)'
                    }}
                  >
                    {expandedCategoriesMonths.has(monthGroup.monthKey)
                      ? `Show less (${monthGroup.categoryBreakdown.length - 6} hidden)`
                      : `Show all ${monthGroup.categoryBreakdown.length} categories`}
                  </button>
                )}
              </div>
            )}

            {/* Expense List */}
            {isExpanded && (
              <div className="space-y-2">
                {monthGroup.expenses.map((expense) => (
                  <div
                    key={expense.id}
                    style={{
                      padding: '1rem',
                      borderRadius: '8px',
                      background: selectedExpenseIds.has(expense.id)
                        ? 'rgba(59, 130, 246, 0.10)'
                        : 'rgba(255, 255, 255, 0.03)',
                      border: selectedExpenseIds.has(expense.id)
                        ? '1px solid rgba(59, 130, 246, 0.3)'
                        : '1px solid rgba(255, 255, 255, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!selectedExpenseIds.has(expense.id)) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!selectedExpenseIds.has(expense.id)) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'
                      }
                    }}
                  >
                    {/* Checkbox */}
                    <div onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedExpenseIds.has(expense.id)}
                        onCheckedChange={() => toggleExpenseSelection(expense.id)}
                        className="border-slate-600 data-[state=checked]:bg-blue-600"
                      />
                    </div>

                    {/* Date */}
                    <div style={{ width: '60px', flexShrink: 0 }}>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                        {new Date(expense.expense_date).toLocaleDateString('en-US', { month: 'short' })}
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)' }}>
                        {new Date(expense.expense_date).getDate()}
                      </div>
                    </div>

                    {/* Description & Vendor */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '0.9375rem',
                        fontWeight: 500,
                        color: 'rgba(255, 255, 255, 0.95)',
                        marginBottom: '0.25rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {expense.description || expense.title}
                      </div>
                      {expense.vendor_name && (
                        <div style={{ fontSize: '0.8125rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                          {expense.vendor_name}
                        </div>
                      )}
                    </div>

                    {/* Category Badge */}
                    <div style={{
                      padding: '0.25rem 0.625rem',
                      borderRadius: '6px',
                      background: 'rgba(139, 92, 246, 0.15)',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      fontSize: '0.75rem',
                      color: 'rgba(139, 92, 246, 0.9)',
                      whiteSpace: 'nowrap'
                    }}>
                      {getCategoryDisplayName(expense.category || '')}
                    </div>

                    {/* Amount */}
                    <div style={{ textAlign: 'right', minWidth: '100px' }}>
                      <div style={{ fontSize: '1rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.95)' }}>
                        {formatEuropeanCurrency(parseFloat(expense.amount) + parseFloat(expense.vat_amount || '0'))}
                      </div>
                      {parseFloat(expense.vat_amount || '0') > 0 && (
                        <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                          +{formatEuropeanCurrency(parseFloat(expense.vat_amount))} VAT
                        </div>
                      )}
                    </div>

                    {/* Status */}
                    <div style={{ width: '80px', textAlign: 'center' }}>
                      {expense.status === 'approved' ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          fontSize: '0.75rem',
                          color: 'rgba(34, 197, 94, 0.9)',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '6px',
                          background: 'rgba(34, 197, 94, 0.1)'
                        }}>
                          <CheckCircle className="h-3 w-3" />
                          Approved
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          fontSize: '0.75rem',
                          color: 'rgba(234, 179, 8, 0.9)',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '6px',
                          background: 'rgba(234, 179, 8, 0.1)'
                        }}>
                          <AlertCircle className="h-3 w-3" />
                          Draft
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onEditExpense?.(expense)
                        }}
                        className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                        title="Edit expense"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(expense)
                        }}
                        disabled={deletingExpenseId === expense.id}
                        className="p-1.5 rounded hover:bg-red-900/30 text-slate-400 hover:text-red-400 transition-colors disabled:opacity-50"
                        title="Delete expense"
                      >
                        {deletingExpenseId === expense.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {/* Infinite scroll trigger */}
      {hasMore && (
        <div ref={loadMoreRef} className="flex items-center justify-center py-8">
          {loadingMore && (
            <div className="flex items-center gap-2 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span style={{ fontSize: '0.875rem' }}>Loading more expenses...</span>
            </div>
          )}
        </div>
      )}

        {/* End of list indicator */}
        {!hasMore && expenses.length > 0 && (
          <div className="flex items-center justify-center py-6">
            <p style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.5)' }}>
              All expenses loaded
            </p>
          </div>
        )}
      </div>

      {confirmDelete && (
        <DeleteConfirmationModal
          open={!!confirmDelete}
          onOpenChange={(open) => {
            if (!open) {
              setConfirmDelete(null)
            }
          }}
          itemName="expense"
          description={`Are you sure you want to delete "${confirmDelete.description || 'this expense'}"? This action cannot be undone.`}
          onConfirm={async () => {
            await performDelete(confirmDelete)
            setConfirmDelete(null)
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </>
  )
}

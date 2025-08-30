'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import { 
  MoreHorizontal, 
  Eye, 
  Edit, 
  Trash2, 
  Send, 
  Download,
  Filter,
  Search,
  Plus
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'

import { 
  Expense, 
  ExpenseListResponse, 
  ExpenseStatus,
  ExpenseType,
  EXPENSE_STATUS_LABELS,
  EXPENSE_TYPE_LABELS,
  PAYMENT_METHOD_LABELS
} from '@/lib/types/expenses'

interface ExpenseListProps {
  onExpenseSelect?: (expense: Expense) => void
  showActions?: boolean
  userId?: string
  statusFilter?: string // Comma-separated status values
}

// Status badge variants
const getStatusBadgeVariant = (status: ExpenseStatus): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case 'approved':
      return 'default'
    case 'submitted':
    case 'under_review':
      return 'secondary'
    case 'rejected':
      return 'destructive'
    case 'draft':
      return 'outline'
    default:
      return 'outline'
  }
}

export function ExpenseList({ onExpenseSelect, showActions = true, userId, statusFilter }: ExpenseListProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [summary, setSummary] = useState<any>(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [internalStatusFilter, setInternalStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [dateFromFilter, setDateFromFilter] = useState('')
  const [dateToFilter, setDateToFilter] = useState('')
  
  // Use external statusFilter prop if provided, otherwise use internal state
  const activeStatusFilter = statusFilter || internalStatusFilter

  // Fetch expenses
  const fetchExpenses = async (page: number = 1) => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        sort_by: 'created_at',
        sort_order: 'desc'
      })

      if (searchQuery) params.append('search', searchQuery)
      if (activeStatusFilter !== 'all') params.append('status', activeStatusFilter)
      if (typeFilter !== 'all') params.append('expense_type', typeFilter)
      if (dateFromFilter) params.append('date_from', dateFromFilter)
      if (dateToFilter) params.append('date_to', dateToFilter)

      const response = await fetch(`/api/expense-management/expenses?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch expenses')
      }

      const data: ExpenseListResponse = await response.json()
      
      setExpenses(data.expenses)
      setTotalCount(data.total_count)
      setCurrentPage(data.page)
      setTotalPages(data.total_pages)
      setSummary(data.summary)
    } catch (error) {
      console.error('Error fetching expenses:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch expenses')
    } finally {
      setLoading(false)
    }
  }

  // Initial load and when filters change
  useEffect(() => {
    fetchExpenses(1)
  }, [searchQuery, activeStatusFilter, typeFilter, dateFromFilter, dateToFilter])

  // Handle page changes
  const handlePageChange = (page: number) => {
    fetchExpenses(page)
  }

  // Handle actions
  const handleView = (expense: Expense) => {
    if (onExpenseSelect) {
      onExpenseSelect(expense)
    } else {
      router.push(`/dashboard/expense-management/${expense.id}`)
    }
  }

  const handleEdit = (expense: Expense) => {
    router.push(`/dashboard/expense-management/${expense.id}/edit`)
  }

  const handleSubmit = async (expense: Expense) => {
    try {
      const response = await fetch(`/api/expense-management/expenses/${expense.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      if (!response.ok) {
        throw new Error('Failed to submit expense')
      }

      // Refresh the list
      fetchExpenses(currentPage)
    } catch (error) {
      console.error('Error submitting expense:', error)
      // TODO: Show toast notification
    }
  }

  const handleDelete = async (expense: Expense) => {
    if (!confirm(`Are you sure you want to delete "${expense.title}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/expense-management/expenses/${expense.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete expense')
      }

      // Refresh the list
      fetchExpenses(currentPage)
    } catch (error) {
      console.error('Error deleting expense:', error)
      // TODO: Show toast notification
    }
  }

  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }

  if (loading && expenses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">
                {formatCurrency(summary.total_amount, summary.currency)}
              </div>
              <p className="text-sm text-muted-foreground">Total Expenses</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">
                {summary.status_breakdown.submitted || 0}
              </div>
              <p className="text-sm text-muted-foreground">Pending Approval</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">
                {summary.status_breakdown.approved || 0}
              </div>
              <p className="text-sm text-muted-foreground">Approved</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">
                {summary.status_breakdown.draft || 0}
              </div>
              <p className="text-sm text-muted-foreground">Draft</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>Expenses</CardTitle>
            <div className="flex gap-2">
              <Button onClick={() => router.push('/dashboard/expense-management/new')}>
                <Plus className="h-4 w-4 mr-2" />
                New Expense
              </Button>
            </div>
          </div>
          
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search expenses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
{!statusFilter && (
              <Select value={internalStatusFilter} onValueChange={setInternalStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {Object.entries(EXPENSE_STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(EXPENSE_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          {expenses.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No expenses found</p>
              <Button 
                className="mt-4"
                onClick={() => router.push('/dashboard/expense-management/new')}
              >
                Create your first expense
              </Button>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment</TableHead>
                      {showActions && <TableHead className="w-[50px]"></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell className="font-medium">
                          <div>
                            <p className="font-medium">{expense.title}</p>
                            {expense.vendor_name && (
                              <p className="text-sm text-muted-foreground">
                                {expense.vendor_name}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(new Date(expense.expense_date), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(expense.amount, expense.currency)}
                        </TableCell>
                        <TableCell>
                          {EXPENSE_TYPE_LABELS[expense.expense_type]}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(expense.status)}>
                            {EXPENSE_STATUS_LABELS[expense.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {PAYMENT_METHOD_LABELS[expense.payment_method]}
                          </span>
                          {expense.requires_reimbursement && (
                            <Badge variant="outline" className="ml-1 text-xs">
                              Reimburse
                            </Badge>
                          )}
                        </TableCell>
                        {showActions && (
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleView(expense)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View
                                </DropdownMenuItem>
                                {['draft', 'rejected'].includes(expense.status) && (
                                  <>
                                    <DropdownMenuItem onClick={() => handleEdit(expense)}>
                                      <Edit className="mr-2 h-4 w-4" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDelete(expense)}>
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {expense.status === 'draft' && (
                                  <DropdownMenuItem onClick={() => handleSubmit(expense)}>
                                    <Send className="mr-2 h-4 w-4" />
                                    Submit
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {expenses.length} of {totalCount} expenses
                  </p>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                          className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                      
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const page = i + 1
                        return (
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => handlePageChange(page)}
                              isActive={page === currentPage}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        )
                      })}
                      
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                          className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
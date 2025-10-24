'use client'

import { useCallback, useEffect, useState } from 'react'
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
  Plus, 
  Edit, 
  Eye, 
  Receipt, 
  CheckCircle, 
  AlertCircle, 
  Building2,
  Calendar,
  Euro,
  Loader2,
  Trash2
} from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import type { ExpenseWithSupplier } from '@/lib/types/financial'

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

export function ExpenseList({ onAddExpense, onEditExpense, onViewExpense }: ExpenseListProps) {
  const [expenses, setExpenses] = useState<ExpenseWithSupplier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [approvingExpenses, setApprovingExpenses] = useState<Set<string>>(new Set())
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null)
  const [verifyingExpenses, setVerifyingExpenses] = useState<Set<string>>(new Set())

  const fetchExpenses = useCallback(async (page: number = 1) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/expenses?page=${page}&limit=20`)

      if (!response.ok) {
        throw new Error('Failed to fetch expenses')
      }

      const data: ExpensesResponse = await response.json()
      setExpenses(data.data)
      setCurrentPage(data.pagination.page)
      setTotalPages(data.pagination.totalPages)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleApprovalToggle = async (expense: ExpenseWithSupplier) => {
    const expenseId = expense.id
    const newApprovedStatus = expense.status !== 'approved'

    // If removing approval, show confirmation dialog
    if (!newApprovedStatus) {
      const confirmed = window.confirm(
        `Weet je zeker dat je de goedkeuring van uitgave "${expense.description}" wilt intrekken?\n\n` +
        `Dit kan impact hebben op rapportages en administratie.`
      )
      if (!confirmed) return
    }

    setApprovingExpenses(prev => new Set(prev).add(expenseId))

    try {
      const response = await fetch(`/api/expenses/${expenseId}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: newApprovedStatus })
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('API Error Response:', error)
        throw new Error(error.message || 'Failed to update expense approval')
      }

      // Update the expense in the local state
      setExpenses(prev => prev.map(exp =>
        exp.id === expenseId
          ? { ...exp, status: newApprovedStatus ? 'approved' : 'draft' }
          : exp
      ))

      // Show success message
      console.log(`Expense ${newApprovedStatus ? 'approved' : 'unapproved'} successfully`)

    } catch (error) {
      console.error('Error updating expense approval:', error)
      alert(error instanceof Error ? error.message : 'Failed to update approval')
    } finally {
      setApprovingExpenses(prev => {
        const updated = new Set(prev)
        updated.delete(expenseId)
        return updated
      })
    }
  }

  const handleVerificationToggle = async (expense: ExpenseWithSupplier) => {
    const expenseId = expense.id
    const newVerifiedStatus = expense.manual_verification_required // If it requires verification, we're verifying it

    setVerifyingExpenses(prev => new Set(prev).add(expenseId))

    try {
      const response = await fetch(`/api/expenses/${expenseId}/verify`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verified: newVerifiedStatus })
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('API Error Response:', error)
        throw new Error(error.message || 'Failed to update expense verification')
      }

      // Refresh the expense list to get updated verification status
      await fetchExpenses(currentPage)

    } catch (error) {
      console.error('Error updating expense verification:', error)
      alert(error instanceof Error ? error.message : 'Failed to update verification')
    } finally {
      setVerifyingExpenses(prev => {
        const updated = new Set(prev)
        updated.delete(expenseId)
        return updated
      })
    }
  }

  useEffect(() => {
    fetchExpenses()
  }, [fetchExpenses])

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

  const handleDeleteExpense = async (expense: ExpenseWithSupplier) => {
    if (deletingExpenseId) return
    const confirmed = window.confirm(`Weet je zeker dat je de uitgave "${expense.description}" wilt verwijderen? Dit kan niet ongedaan gemaakt worden.`)
    if (!confirmed) return

    setDeletingExpenseId(expense.id)

    try {
      const response = await fetch(`/api/expenses/${expense.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || 'Verwijderen van uitgave is mislukt')
      }

      const result = await response.json().catch(() => ({}))

      const nextPage = expenses.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage
      await fetchExpenses(nextPage)

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('expense:deleted', {
          detail: {
            expenseId: expense.id,
            templateId: result?.metricsRefreshHint?.templateId,
            source: 'expense_list'
          }
        }))
      }
    } catch (error) {
      console.error('Expense delete error:', error)
      alert(error instanceof Error ? error.message : 'Verwijderen van uitgave is mislukt')
    } finally {
      setDeletingExpenseId(null)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const getCategoryLabel = (category: string) => {
    const categories: Record<string, string> = {
      'kantoorbenodigdheden': 'Kantoorbenodigdheden',
      'reiskosten': 'Reiskosten',
      'maaltijden_zakelijk': 'Maaltijden & Zakelijk Entertainment',
      'marketing_reclame': 'Marketing & Reclame',
      'software_ict': 'Software & ICT',
      'afschrijvingen': 'Afschrijvingen Bedrijfsmiddelen',
      'verzekeringen': 'Verzekeringen',
      'professionele_diensten': 'Professionele Diensten',
      'werkruimte_kantoor': 'Werkruimte & Kantoorkosten',
      'voertuigkosten': 'Voertuigkosten',
      'telefoon_communicatie': 'Telefoon & Communicatie',
      'vakliteratuur': 'Vakliteratuur',
      'werkkleding': 'Werkkleding',
      'relatiegeschenken_representatie': 'Relatiegeschenken & Representatie',
      'overige_zakelijk': 'Overige Zakelijke Kosten'
    }
    return categories[category] || category
  }

  const getVerificationBadge = (expense: ExpenseWithSupplier) => {
    const isVerifying = verifyingExpenses.has(expense.id)

    if (!expense.manual_verification_required) {
      return (
        <button
          onClick={() => handleVerificationToggle(expense)}
          disabled={isVerifying}
          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 gap-1 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors cursor-pointer disabled:opacity-50"
        >
          {isVerifying ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
          Geverifieerd
        </button>
      )
    }

    if (expense.verified_at) {
      return (
        <button
          onClick={() => handleVerificationToggle(expense)}
          disabled={isVerifying}
          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 gap-1 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors cursor-pointer disabled:opacity-50"
        >
          {isVerifying ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
          Handmatig
        </button>
      )
    }

    return (
      <button
        onClick={() => handleVerificationToggle(expense)}
        disabled={isVerifying}
        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 gap-1 hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors cursor-pointer disabled:opacity-50"
      >
        {isVerifying ? <Loader2 className="h-3 w-3 animate-spin" /> : <AlertCircle className="h-3 w-3" />}
        Te controleren
      </button>
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center space-x-4">
            <div className="h-4 bg-muted animate-pulse rounded w-16"></div>
            <div className="h-4 bg-muted animate-pulse rounded flex-1"></div>
            <div className="h-4 bg-muted animate-pulse rounded w-20"></div>
            <div className="h-4 bg-muted animate-pulse rounded w-20"></div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 dark:text-red-400 mb-4">
          Fout bij laden van uitgaven: {error}
        </div>
        <Button onClick={() => fetchExpenses()}>
          Opnieuw proberen
        </Button>
      </div>
    )
  }

  return (
    <>
      {expenses.length === 0 ? (
        <div className="text-center py-12">
          <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nog geen uitgaven</h3>
          <p className="text-muted-foreground mb-4">
            Voeg je eerste uitgave toe om je kosten bij te houden
          </p>
          {onAddExpense && (
            <Button onClick={onAddExpense}>
              <Plus className="h-4 w-4 mr-2" />
              Eerste uitgave toevoegen
            </Button>
          )}
        </div>
      ) : (
        <>
          <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Goedkeuring</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead>Leverancier</TableHead>
                  <TableHead>Beschrijving</TableHead>
                  <TableHead>Categorie</TableHead>
                  <TableHead className="text-right">Bedrag</TableHead>
                  <TableHead className="text-right">BTW</TableHead>
                  <TableHead className="text-right">Totaal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center">
                        {approvingExpenses.has(expense.id) ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : (
                          <Checkbox
                            checked={expense.status === 'approved'}
                            onCheckedChange={() => handleApprovalToggle(expense)}
                            className="h-4 w-4"
                          />
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {formatDate(expense.expense_date)}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3 w-3 text-muted-foreground" />
                        <div>
                          <div className="font-medium text-sm">
                            {expense.supplier?.company_name || expense.supplier?.name || expense.vendor_name || 'Onbekend'}
                          </div>
                          {expense.supplier?.country_code && expense.supplier.country_code !== 'NL' && (
                            <div className="text-xs text-muted-foreground">
                              {expense.supplier.country_code}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="max-w-48">
                        <div className="text-sm font-medium truncate" title={expense.description}>
                          {expense.description}
                        </div>
                        {expense.receipt_url && (
                          <div className="flex items-center gap-1 mt-1">
                            <Receipt className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                            <span className="text-xs text-blue-600 dark:text-blue-400">
                              Bon beschikbaar
                            </span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <span className="text-xs bg-muted px-2 py-1 rounded-full">
                        {getCategoryLabel(expense.category)}
                      </span>
                    </TableCell>
                    
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(parseFloat(expense.amount.toString()))}
                    </TableCell>
                    
                    <TableCell className="text-right font-mono text-sm">
                      {expense.vat_rate > 0 ? (
                        <div>
                          <div>{formatCurrency(parseFloat(expense.vat_amount.toString()))}</div>
                          <div className="text-xs text-muted-foreground">
                            {Math.round(parseFloat(expense.vat_rate.toString()) * 100)}%
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">€0.00</span>
                      )}
                    </TableCell>
                    
                    <TableCell className="text-right font-mono text-sm font-medium">
                      {formatCurrency(parseFloat(expense.total_amount.toString()))}
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-1">
                        {getVerificationBadge(expense)}
                        {expense.is_deductible && (
                          <div>
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                              Aftrekbaar
                            </span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onViewExpense?.(expense)}
                          className="h-7 w-7"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEditExpense?.(expense)}
                          className="h-7 w-7"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteExpense(expense)}
                          className="h-7 w-7 text-red-600 hover:text-red-700"
                          disabled={deletingExpenseId === expense.id}
                        >
                          {deletingExpenseId === expense.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-muted-foreground">
                  Pagina {currentPage} van {totalPages}
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchExpenses(currentPage - 1)}
                    disabled={currentPage <= 1}
                  >
                    Vorige
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchExpenses(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                  >
                    Volgende
                  </Button>
                </div>
              </div>
            )}
        </>
      )}
    </>
  )
}

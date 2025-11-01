'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Edit, Eye, Send, Check, AlertCircle, Clock, FileText, Download, Loader2, Bell, CheckCircle } from 'lucide-react'
import type { InvoiceWithClient, ReminderLevel } from '@/lib/types/financial'
import { toast } from 'sonner'
import { PaymentReminderModal } from './payment-reminder-modal'
import { Badge } from '@/components/ui/badge'
import { getCurrentDate } from '@/lib/current-date'

interface InvoiceListProps {
  onAddInvoice?: () => void
  onEditInvoice?: (invoice: InvoiceWithClient) => void
  onViewInvoice?: (invoice: InvoiceWithClient) => void
  statusFilter?: string
}

interface InvoicesResponse {
  data: InvoiceWithClient[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export function InvoiceList({ onAddInvoice, onEditInvoice, onViewInvoice, statusFilter }: InvoiceListProps) {
  const [invoices, setInvoices] = useState<InvoiceWithClient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [sendingInvoices, setSendingInvoices] = useState<Set<string>>(new Set())
  const [reminderInvoice, setReminderInvoice] = useState<InvoiceWithClient | null>(null)
  const [reminderLevels, setReminderLevels] = useState<Record<string, ReminderLevel | null | undefined>>({})

  // Helper function to check if an invoice is actually overdue
  const isInvoiceOverdue = (invoice: InvoiceWithClient): boolean => {
    // Check if status already indicates overdue
    const hasOverdueStatus = ['overdue', 'overdue_reminder_1', 'overdue_reminder_2', 'overdue_reminder_3'].includes(invoice.status)
    if (hasOverdueStatus) return true

    // For 'sent' invoices, check if due date has passed
    if (invoice.status === 'sent') {
      const today = getCurrentDate()
      const dueDate = new Date(invoice.due_date)
      return dueDate < today
    }

    return false
  }

  const fetchInvoices = async (page: number = 1) => {
    try {
      setLoading(true)

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      })

      if (statusFilter) {
        params.append('status', statusFilter)
      }

      const response = await fetch(`/api/invoices?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Failed to fetch invoices')
      }

      const data: InvoicesResponse = await response.json()
      setInvoices(data.data)
      setCurrentPage(data.pagination.page)
      setTotalPages(data.pagination.totalPages)

      // Fetch reminder levels for overdue invoices
      fetchReminderLevels(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const fetchReminderLevels = async (invoicesList: InvoiceWithClient[]) => {
    // Only fetch for sent or overdue invoices (including reminder statuses)
    const overdueInvoices = invoicesList.filter(inv =>
      inv.status === 'sent' ||
      inv.status === 'overdue' ||
      inv.status === 'overdue_reminder_1' ||
      inv.status === 'overdue_reminder_2' ||
      inv.status === 'overdue_reminder_3'
    )

    const levels: Record<string, ReminderLevel | null | undefined> = {}

    await Promise.all(
      overdueInvoices.map(async (invoice) => {
        try {
          const response = await fetch(`/api/invoices/${invoice.id}/reminders`)
          if (response.ok) {
            const data = await response.json()
            // Only show the reminder level if it can actually be sent
            // Otherwise show null (which will display a checkmark)
            if (data.data.canSendReminder && data.data.nextReminderLevel) {
              levels[invoice.id] = data.data.nextReminderLevel
            } else if (data.data.nextReminderLevel === null) {
              // All reminders sent
              levels[invoice.id] = null
            } else {
              // Waiting period not elapsed - don't show a badge
              levels[invoice.id] = undefined
            }
          }
        } catch (error) {
          console.error(`Error fetching reminder level for invoice ${invoice.id}:`, error)
        }
      })
    )

    setReminderLevels(levels)
  }

  useEffect(() => {
    fetchInvoices()
  }, [statusFilter])

  const getReminderBadgeVariant = (level: ReminderLevel): 'default' | 'secondary' | 'destructive' => {
    switch (level) {
      case 1:
        return 'default' // Blue
      case 2:
        return 'secondary' // Orange
      case 3:
        return 'destructive' // Red
      default:
        return 'default'
    }
  }

  const handleSendInvoice = async (invoice: InvoiceWithClient) => {
    const invoiceId = invoice.id
    setSendingInvoices(prev => new Set(prev).add(invoiceId))
    
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'sent' })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to send invoice')
      }
      
      setInvoices(prev => prev.map(inv =>
        inv.id === invoiceId ? { ...inv, status: 'sent' } : inv
      ))
      toast.success('Invoice sent successfully')
    } catch (error) {
      console.error('Error sending invoice:', error)
      toast.error('Failed to send invoice', {
        description: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setSendingInvoices(prev => {
        const updated = new Set(prev)
        updated.delete(invoiceId)
        return updated
      })
    }
  }

  const handleStatusUpdate = async (invoice: InvoiceWithClient, newStatus: string) => {
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update status')
      }

      // Refresh the invoice list
      fetchInvoices(currentPage)
      toast.success('Invoice status updated')
    } catch (err) {
      toast.error('Failed to update status', {
        description: err instanceof Error ? err.message : 'Unknown error'
      })
    }
  }

  const handlePDFDownload = async (invoice: InvoiceWithClient) => {
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/pdf`)
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to generate PDF')
      }

      // Create download link
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `invoice-${invoice.invoice_number}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      toast.success('PDF downloaded successfully')
    } catch (err) {
      toast.error('Failed to download PDF', {
        description: err instanceof Error ? err.message : 'Unknown error'
      })
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <Edit className="h-3 w-3" />
      case 'sent':
        return <Send className="h-3 w-3" />
      case 'paid':
        return <Check className="h-3 w-3" />
      case 'overdue':
      case 'overdue_reminder_1':
      case 'overdue_reminder_2':
      case 'overdue_reminder_3':
        return <AlertCircle className="h-3 w-3" />
      case 'cancelled':
        return <Clock className="h-3 w-3" />
      default:
        return <FileText className="h-3 w-3" />
    }
  }

  const getStatusBadge = (status: string, invoice?: InvoiceWithClient) => {
    const baseClasses = "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium gap-1"

    // Check if 'sent' invoice is actually overdue
    if (status === 'sent' && invoice && isInvoiceOverdue(invoice)) {
      return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300`
    }

    switch (status) {
      case 'draft':
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300`
      case 'sent':
        return `${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300`
      case 'paid':
        return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300`
      case 'overdue':
        return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300`
      case 'overdue_reminder_1':
        return `${baseClasses} bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300`
      case 'overdue_reminder_2':
        return `${baseClasses} bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300`
      case 'overdue_reminder_3':
        return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300`
      case 'cancelled':
        return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300`
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300`
    }
  }

  const getStatusLabel = (status: string, invoice?: InvoiceWithClient) => {
    // Check if 'sent' invoice is actually overdue
    if (status === 'sent' && invoice && isInvoiceOverdue(invoice)) {
      return 'Overdue'
    }

    switch (status) {
      case 'draft':
        return 'Draft'
      case 'sent':
        return 'Sent'
      case 'paid':
        return 'Paid'
      case 'overdue':
        return 'Overdue'
      case 'overdue_reminder_1':
        return 'Overdue (1 reminder sent)'
      case 'overdue_reminder_2':
        return 'Overdue (2 reminders sent)'
      case 'overdue_reminder_3':
        return 'Overdue (3 reminders sent)'
      case 'cancelled':
        return 'Cancelled'
      default:
        return status
    }
  }

  const getVATTypeLabel = (vatType: string) => {
    switch (vatType) {
      case 'standard':
        return 'Standard VAT'
      case 'reverse_charge':
        return 'Reverse charge'
      case 'exempt':
        return 'VAT exempt'
      case 'reduced':
        return 'Reduced rate'
      default:
        return vatType
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-600 dark:text-red-400">
            Error loading invoices: {error}
          </div>
          <Button onClick={() => fetchInvoices()} className="mt-4">
            Try again
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
        <div>
          <CardTitle>Invoices</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Manage your invoices and their status
          </p>
        </div>
        <Button
          onClick={onAddInvoice}
          variant="ghost"
          className="bg-slate-900/40 border border-slate-700/20 hover:bg-slate-800/50 hover:border-slate-600/30"
        >
          <Plus className="h-4 w-4 mr-2" />
          Start Invoice Wizard
        </Button>
      </CardHeader>
      
      <CardContent>
        {invoices.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No invoices yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first invoice to start billing
            </p>
            <Button onClick={onAddInvoice}>
              <Plus className="h-4 w-4 mr-2" />
              Create first invoice
            </Button>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice No.</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>VAT Type</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-mono text-sm font-medium">
                      {invoice.invoice_number}
                    </TableCell>
                    
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {invoice.client?.company_name || invoice.client?.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {invoice.client?.email}
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-sm">
                      {formatDate(invoice.invoice_date)}
                    </TableCell>
                    
                    <TableCell className="text-sm">
                      {formatDate(invoice.due_date)}
                    </TableCell>
                    
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {getVATTypeLabel(invoice.vat_type)}
                      </span>
                    </TableCell>
                    
                    <TableCell className="text-right font-medium">
                      {formatCurrency(parseFloat(invoice.total_amount.toString()))}
                    </TableCell>
                    
                    <TableCell>
                      <span className={getStatusBadge(invoice.status, invoice)}>
                        {getStatusIcon(invoice.status)}
                        {getStatusLabel(invoice.status, invoice)}
                      </span>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handlePDFDownload(invoice)}
                          className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-900/20"
                          title="Download PDF"
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onViewInvoice?.(invoice)}
                          className="h-7 w-7"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>

                        {invoice.status === 'draft' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleSendInvoice(invoice)}
                            className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/20"
                            title="Send invoice"
                            disabled={sendingInvoices.has(invoice.id)}
                          >
                            {sendingInvoices.has(invoice.id) ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Send className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                        
                        {invoice.status === 'sent' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleStatusUpdate(invoice, 'paid')}
                            className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-900/20"
                            title="Mark as paid"
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        )}

                        {/* Always show payment reminder bell for overdue invoices */}
                        {/* Badge shows action state: number (can send), checkmark (all sent), or no badge (waiting) */}
                        {isInvoiceOverdue(invoice) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setReminderInvoice(invoice)}
                            className="h-7 w-7 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:text-orange-400 dark:hover:text-orange-300 dark:hover:bg-orange-900/20 relative"
                            title={`Send payment reminder${typeof reminderLevels[invoice.id] === 'number' ? ` (Level ${reminderLevels[invoice.id]})` : ''}`}
                          >
                            <Bell className="h-3 w-3" />
                            {/* Show numbered badge when reminder can be sent (number type) */}
                            {typeof reminderLevels[invoice.id] === 'number' && (
                              <Badge
                                variant={getReminderBadgeVariant(reminderLevels[invoice.id]!)}
                                className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[9px] font-bold"
                              >
                                {reminderLevels[invoice.id]}
                              </Badge>
                            )}
                            {/* Show checkmark when all reminders sent (null) */}
                            {reminderLevels[invoice.id] === null && (
                              <CheckCircle className="absolute -top-1 -right-1 h-3 w-3 text-green-500 bg-white dark:bg-slate-900 rounded-full" />
                            )}
                            {/* No badge shown during waiting period (undefined) - user can still click to view history */}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchInvoices(currentPage - 1)}
                    disabled={currentPage <= 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchInvoices(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>

      {/* Payment Reminder Modal */}
      <PaymentReminderModal
        invoice={reminderInvoice}
        isOpen={!!reminderInvoice}
        onClose={() => setReminderInvoice(null)}
        onSuccess={() => {
          setReminderInvoice(null)
          fetchInvoices(currentPage)
        }}
      />
    </Card>
  )
}
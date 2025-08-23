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
import { Plus, Edit, Eye, Send, Check, AlertCircle, Clock, FileText, Download } from 'lucide-react'
import type { InvoiceWithClient } from '@/lib/types/financial'

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInvoices()
  }, [statusFilter])

  const handleStatusUpdate = async (invoice: InvoiceWithClient, newStatus: string) => {
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update status')
      }

      // Refresh the invoice list
      fetchInvoices(currentPage)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error updating status')
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
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error downloading PDF')
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
        return <AlertCircle className="h-3 w-3" />
      case 'cancelled':
        return <Clock className="h-3 w-3" />
      default:
        return <FileText className="h-3 w-3" />
    }
  }

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium gap-1"
    
    switch (status) {
      case 'draft':
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300`
      case 'sent':
        return `${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300`
      case 'paid':
        return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300`
      case 'overdue':
        return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300`
      case 'cancelled':
        return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300`
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300`
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft':
        return 'Concept'
      case 'sent':
        return 'Verzonden'
      case 'paid':
        return 'Betaald'
      case 'overdue':
        return 'Achterstallig'
      case 'cancelled':
        return 'Geannuleerd'
      default:
        return status
    }
  }

  const getVATTypeLabel = (vatType: string) => {
    switch (vatType) {
      case 'standard':
        return 'Standaard BTW'
      case 'reverse_charge':
        return 'BTW verlegd'
      case 'exempt':
        return 'BTW vrij'
      case 'reduced':
        return 'Verlaagd tarief'
      default:
        return vatType
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Facturen</CardTitle>
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
          <CardTitle>Facturen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-600 dark:text-red-400">
            Fout bij laden van facturen: {error}
          </div>
          <Button onClick={() => fetchInvoices()} className="mt-4">
            Opnieuw proberen
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
        <div>
          <CardTitle>Facturen</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Beheer je facturen en hun status
          </p>
        </div>
        <Button onClick={onAddInvoice}>
          <Plus className="h-4 w-4 mr-2" />
          Nieuwe factuur
        </Button>
      </CardHeader>
      
      <CardContent>
        {invoices.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nog geen facturen</h3>
            <p className="text-muted-foreground mb-4">
              Maak je eerste factuur om te beginnen met factureren
            </p>
            <Button onClick={onAddInvoice}>
              <Plus className="h-4 w-4 mr-2" />
              Eerste factuur maken
            </Button>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Factuurnr.</TableHead>
                  <TableHead>Klant</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead>Vervaldatum</TableHead>
                  <TableHead>BTW Type</TableHead>
                  <TableHead className="text-right">Totaal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24">Acties</TableHead>
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
                      <span className={getStatusBadge(invoice.status)}>
                        {getStatusIcon(invoice.status)}
                        {getStatusLabel(invoice.status)}
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
                            onClick={() => onEditInvoice?.(invoice)}
                            className="h-7 w-7"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        )}
                        
                        {invoice.status === 'draft' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleStatusUpdate(invoice, 'sent')}
                            className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/20"
                            title="Factuur verzenden"
                          >
                            <Send className="h-3 w-3" />
                          </Button>
                        )}
                        
                        {invoice.status === 'sent' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleStatusUpdate(invoice, 'paid')}
                            className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-900/20"
                            title="Markeren als betaald"
                          >
                            <Check className="h-3 w-3" />
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
                  Pagina {currentPage} van {totalPages}
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchInvoices(currentPage - 1)}
                    disabled={currentPage <= 1}
                  >
                    Vorige
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchInvoices(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                  >
                    Volgende
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
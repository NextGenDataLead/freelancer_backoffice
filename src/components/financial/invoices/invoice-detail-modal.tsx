'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  FileText,
  Download,
  Send,
  Check,
  Edit,
  Printer,
  Eye,
  X,
  Calendar,
  User,
  Euro,
  Clock,
  AlertTriangle,
  Bell,
  Mail,
  CheckCircle2,
  XCircle,
  Loader2
} from 'lucide-react'
import type { InvoiceWithClient, PaymentReminder } from '@/lib/types/financial'
import { PaymentRecordingModal } from './payment-recording-modal'
import { PaymentReminderModal } from './payment-reminder-modal'

interface InvoiceDetailModalProps {
  invoice: InvoiceWithClient | null
  isOpen: boolean
  onClose: () => void
  onEdit?: (invoice: InvoiceWithClient) => void
  onStatusUpdate?: (invoice: InvoiceWithClient, newStatus: string) => void
}

export function InvoiceDetailModal({
  invoice,
  isOpen,
  onClose,
  onEdit,
  onStatusUpdate
}: InvoiceDetailModalProps) {
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showReminderModal, setShowReminderModal] = useState(false)
  const [reminders, setReminders] = useState<PaymentReminder[]>([])
  const [isLoadingReminders, setIsLoadingReminders] = useState(false)

  // Fetch reminders when modal opens
  useEffect(() => {
    if (isOpen && invoice) {
      fetchReminders()
    }
  }, [isOpen, invoice?.id])

  const fetchReminders = async () => {
    if (!invoice) return

    try {
      setIsLoadingReminders(true)
      const response = await fetch(`/api/invoices/${invoice.id}/reminders`)

      if (!response.ok) {
        throw new Error('Failed to fetch reminders')
      }

      const data = await response.json()
      setReminders(data.data?.reminders || [])
    } catch (error) {
      console.error('Error fetching reminders:', error)
      // Don't show error toast, just silently fail for reminders
    } finally {
      setIsLoadingReminders(false)
    }
  }

  if (!invoice) return null

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
        return <Edit className="h-4 w-4" />
      case 'sent':
        return <Send className="h-4 w-4" />
      case 'paid':
        return <Check className="h-4 w-4" />
      case 'overdue':
        return <AlertTriangle className="h-4 w-4" />
      case 'cancelled':
        return <X className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
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
        return 'Standaard BTW (21%)'
      case 'reverse_charge':
        return 'BTW verlegd (0%)'
      case 'exempt':
        return 'BTW vrij (0%)'
      case 'reduced':
        return 'Verlaagd tarief (9%)'
      default:
        return vatType
    }
  }

  const handleStatusUpdate = async (newStatus: string) => {
    if (!onStatusUpdate) return
    
    setIsUpdatingStatus(true)
    try {
      await onStatusUpdate(invoice, newStatus)
    } catch (error) {
      console.error('Status update failed:', error)
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleDownloadPDF = async () => {
    if (!invoice) return
    
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/pdf`)
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `invoice-${invoice.invoice_number}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error downloading PDF:', error)
      toast.error('Failed to download PDF', {
        description: 'An error occurred while downloading the PDF'
      })
    }
  }

  const handleSendEmail = () => {
    // TODO: Implement email sending
    console.log('Send email for invoice:', invoice.id)
  }

  const handlePrint = () => {
    // TODO: Implement print functionality
    window.print()
  }

  const handlePaymentSuccess = (payment: any) => {
    setShowPaymentModal(false)
    // Trigger a status update or refresh
    if (onStatusUpdate && payment.invoice) {
      // The payment API already updated the status, so we need to refresh
      onClose()
      window.location.reload()
    }
  }

  const handleReminderSuccess = () => {
    setShowReminderModal(false)
    // Refresh reminders list
    fetchReminders()
    // Optionally refresh the invoice to update status
    window.location.reload()
  }

  const getDeliveryStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return { icon: <Mail className="h-3 w-3" />, color: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30' }
      case 'delivered':
        return { icon: <CheckCircle2 className="h-3 w-3" />, color: 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30' }
      case 'bounced':
      case 'failed':
        return { icon: <XCircle className="h-3 w-3" />, color: 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30' }
      default:
        return { icon: <Mail className="h-3 w-3" />, color: 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30' }
    }
  }

  const getReminderLevelColor = (level: number) => {
    switch (level) {
      case 1:
        return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30'
      case 2:
        return 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30'
      case 3:
        return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30'
      default:
        return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30'
    }
  }

  const getReminderLevelLabel = (level: number) => {
    switch (level) {
      case 1:
        return 'Gentle Reminder'
      case 2:
        return 'Follow-up'
      case 3:
        return 'Final Notice'
      default:
        return `Level ${level}`
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6" />
              <span>Factuur {invoice.invoice_number}</span>
              <Badge className={getStatusBadge(invoice.status)}>
                {getStatusIcon(invoice.status)}
                {getStatusLabel(invoice.status)}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
              >
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPDF}
              >
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Invoice Header Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Client Information */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-4 w-4" />
                  Klantgegevens
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="font-medium">{invoice.client?.company_name || invoice.client?.name}</p>
                  {invoice.client?.company_name && (
                    <p className="text-sm text-muted-foreground">{invoice.client.name}</p>
                  )}
                </div>
                {invoice.client?.email && (
                  <p className="text-sm text-muted-foreground">{invoice.client.email}</p>
                )}
                {invoice.client?.vat_number && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">BTW nummer:</span> {invoice.client.vat_number}
                  </p>
                )}
                <p className="text-sm">
                  <span className="text-muted-foreground">Land:</span> {invoice.client?.country_code}
                </p>
              </CardContent>
            </Card>

            {/* Invoice Information */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="h-4 w-4" />
                  Factuurgegevens
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Factuurnummer:</span>
                  <span className="font-mono">{invoice.invoice_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Factuurdatum:</span>
                  <span>{formatDate(invoice.invoice_date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vervaldatum:</span>
                  <span>{formatDate(invoice.due_date)}</span>
                </div>
                {invoice.reference && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Referentie:</span>
                    <span>{invoice.reference}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">BTW Type:</span>
                  <span className="text-sm">{getVATTypeLabel(invoice.vat_type)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Invoice Items */}
          <Card>
            <CardHeader>
              <CardTitle>Factuurregels</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Beschrijving</TableHead>
                    <TableHead className="text-center">Aantal</TableHead>
                    <TableHead className="text-right">Prijs per stuk</TableHead>
                    <TableHead className="text-right">Totaal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.items?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="max-w-md">
                          <p className="whitespace-pre-wrap">{item.description}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(parseFloat(item.unit_price.toString()))}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(parseFloat(item.line_total.toString()))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Invoice Totals */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Euro className="h-5 w-5" />
                Totalen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-w-md ml-auto">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotaal:</span>
                  <span>{formatCurrency(parseFloat(invoice.subtotal.toString()))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    BTW ({Math.round(invoice.vat_rate * 100)}%):
                  </span>
                  <span>{formatCurrency(parseFloat(invoice.vat_amount.toString()))}</span>
                </div>
                <div className="flex justify-between border-t pt-2 font-bold text-lg">
                  <span>Totaal:</span>
                  <span>{formatCurrency(parseFloat(invoice.total_amount.toString()))}</span>
                </div>
                
                {/* Payment Information */}
                {parseFloat(invoice.paid_amount?.toString() || '0') > 0 && (
                  <>
                    <div className="flex justify-between text-green-600 dark:text-green-400">
                      <span>Betaald:</span>
                      <span>-{formatCurrency(parseFloat(invoice.paid_amount.toString()))}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 font-bold text-lg">
                      <span>Openstaand:</span>
                      <span className={
                        parseFloat(invoice.paid_amount.toString()) >= parseFloat(invoice.total_amount.toString())
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-orange-600 dark:text-orange-400'
                      }>
                        {formatCurrency(
                          parseFloat(invoice.total_amount.toString()) - parseFloat(invoice.paid_amount.toString())
                        )}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {invoice.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Opmerkingen</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">{invoice.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Reminder History */}
          {(invoice.status === 'sent' || invoice.status === 'overdue') && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-orange-500" />
                    Betalingsherinneringen
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowReminderModal(true)}
                    className="text-orange-600 hover:text-orange-700 border-orange-200 hover:border-orange-300"
                  >
                    <Bell className="h-4 w-4 mr-2" />
                    Herinnering versturen
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingReminders ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    Herinneringen laden...
                  </div>
                ) : !Array.isArray(reminders) || reminders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>Nog geen herinneringen verstuurd</p>
                    <p className="text-sm mt-1">
                      Klik op de knop hierboven om een betalingsherinnering te versturen
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {Array.isArray(reminders) && reminders.map((reminder, index) => {
                      const statusBadge = getDeliveryStatusBadge(reminder.delivery_status)
                      const levelColor = getReminderLevelColor(reminder.reminder_level)

                      return (
                        <div
                          key={reminder.id}
                          className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-slate-50 dark:bg-slate-900/30"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Badge className={`${levelColor} px-2 py-1 text-xs font-medium`}>
                                Level {reminder.reminder_level}
                              </Badge>
                              <Badge className={`${statusBadge.color} px-2 py-1 text-xs font-medium flex items-center gap-1`}>
                                {statusBadge.icon}
                                {reminder.delivery_status}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatDate(reminder.sent_at)}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Onderwerp:</p>
                              <p className="text-sm font-medium">{reminder.email_subject}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Verzonden naar:</p>
                              <p className="text-sm">{reminder.email_sent_to}</p>
                            </div>
                            {reminder.opened_at && (
                              <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                                <CheckCircle2 className="h-3 w-3" />
                                Geopend op {formatDate(reminder.opened_at)}
                              </div>
                            )}
                            {reminder.notes && (
                              <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                                <p className="text-xs text-muted-foreground mb-1">Notitie:</p>
                                <p className="text-sm">{reminder.notes}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between pt-4 border-t">
            <div className="flex gap-2">
              {invoice.status === 'draft' && onEdit && (
                <Button onClick={() => onEdit(invoice)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Bewerken
                </Button>
              )}
              
              {invoice.status === 'draft' && (
                <Button
                  variant="outline"
                  onClick={() => handleStatusUpdate('sent')}
                  disabled={isUpdatingStatus}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Verzenden
                </Button>
              )}
              
              {invoice.status === 'sent' && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setShowPaymentModal(true)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <Euro className="h-4 w-4 mr-2" />
                    Betaling registreren
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleStatusUpdate('paid')}
                    disabled={isUpdatingStatus}
                    className="text-green-600 hover:text-green-700"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Markeer als betaald
                  </Button>
                </>
              )}

              {invoice.status === 'overdue' && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setShowPaymentModal(true)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <Euro className="h-4 w-4 mr-2" />
                    Betaling registreren
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleStatusUpdate('paid')}
                    disabled={isUpdatingStatus}
                    className="text-green-600 hover:text-green-700"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Markeer als betaald
                  </Button>
                </>
              )}

            </div>

            <Button variant="outline" onClick={onClose}>
              Sluiten
            </Button>
          </div>
        </div>
      </DialogContent>
      
      {/* Payment Recording Modal */}
      <PaymentRecordingModal
        invoice={invoice}
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={handlePaymentSuccess}
      />

      {/* Payment Reminder Modal */}
      <PaymentReminderModal
        invoice={invoice}
        isOpen={showReminderModal}
        onClose={() => setShowReminderModal(false)}
        onSuccess={handleReminderSuccess}
      />
    </Dialog>
  )
}
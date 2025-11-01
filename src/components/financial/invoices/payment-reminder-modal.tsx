'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Bell, Send, Loader2, AlertTriangle, CheckCircle, Building, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type {
  InvoiceWithClient,
  ReminderTemplate,
  SendReminderResponse,
  PaymentReminder
} from '@/lib/types/financial'

interface PaymentReminderModalProps {
  invoice: InvoiceWithClient | null
  isOpen: boolean
  onClose: () => void
  onSuccess?: (response: SendReminderResponse) => void
}

export function PaymentReminderModal({
  invoice,
  isOpen,
  onClose,
  onSuccess
}: PaymentReminderModalProps) {
  const [templates, setTemplates] = useState<ReminderTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [personalNote, setPersonalNote] = useState('')
  const [sendCopyToSelf, setSendCopyToSelf] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isFetchingTemplates, setIsFetchingTemplates] = useState(false)
  const [previewSubject, setPreviewSubject] = useState('')
  const [previewBody, setPreviewBody] = useState('')
  const [hasBusinessName, setHasBusinessName] = useState(true)
  const [isCheckingProfile, setIsCheckingProfile] = useState(true)
  const [userProfile, setUserProfile] = useState<{
    first_name?: string
    last_name?: string
    business_name?: string
    email: string
  } | null>(null)
  const [reminderHistory, setReminderHistory] = useState<PaymentReminder[]>([])
  const [nextReminderLevel, setNextReminderLevel] = useState<number | null>(null)
  const [canSendReminder, setCanSendReminder] = useState(true)
  const [reminderMessage, setReminderMessage] = useState<string | undefined>()

  // Fetch reminder history and check business profile when modal opens
  useEffect(() => {
    if (isOpen && invoice) {
      fetchReminderHistory()
      checkBusinessProfile()
      setPersonalNote('')
      setSendCopyToSelf(false)
    }
  }, [isOpen, invoice?.id])

  // Fetch templates after reminder history is loaded
  useEffect(() => {
    if (isOpen && nextReminderLevel !== undefined) {
      fetchTemplates()
    }
  }, [isOpen, nextReminderLevel])

  // Update preview when template changes or user profile loads
  useEffect(() => {
    if (selectedTemplateId && invoice) {
      const template = templates.find(t => t.id === selectedTemplateId)
      if (template) {
        const variables = prepareVariables(invoice)
        setPreviewSubject(renderTemplate(template.subject, variables))
        setPreviewBody(renderTemplate(template.body, variables))
      }
    }
  }, [selectedTemplateId, invoice, templates, userProfile])

  const fetchReminderHistory = async () => {
    if (!invoice) return

    try {
      const response = await fetch(`/api/invoices/${invoice.id}/reminders`)
      if (!response.ok) {
        throw new Error('Failed to fetch reminder history')
      }
      const data = await response.json()
      setReminderHistory(data.data.reminders || [])
      setNextReminderLevel(data.data.nextReminderLevel)
      setCanSendReminder(data.data.canSendReminder)
      setReminderMessage(data.data.message)
    } catch (error) {
      console.error('Error fetching reminder history:', error)
    }
  }

  const fetchTemplates = async () => {
    try {
      setIsFetchingTemplates(true)
      const response = await fetch('/api/reminders/templates')
      if (!response.ok) {
        throw new Error('Failed to fetch templates')
      }
      const data = await response.json()
      setTemplates(data.data || [])

      // Auto-select template based on next reminder level
      if (nextReminderLevel) {
        const appropriateTemplate = (data.data || []).find(
          (t: ReminderTemplate) => t.reminder_level === nextReminderLevel && t.is_default
        )
        if (appropriateTemplate) {
          setSelectedTemplateId(appropriateTemplate.id)
        }
      } else {
        // Fallback to default template if available
        const defaultTemplate = (data.data || []).find((t: ReminderTemplate) => t.is_default)
        if (defaultTemplate) {
          setSelectedTemplateId(defaultTemplate.id)
        }
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
      toast.error('Failed to load reminder templates')
    } finally {
      setIsFetchingTemplates(false)
    }
  }

  const checkBusinessProfile = async () => {
    try {
      setIsCheckingProfile(true)
      const response = await fetch('/api/user/business')
      if (response.ok) {
        const { data } = await response.json()
        setUserProfile(data)
        setHasBusinessName(Boolean(data?.business_name))
      } else {
        // If profile doesn't exist, business_name is definitely missing
        setUserProfile(null)
        setHasBusinessName(false)
      }
    } catch (error) {
      console.error('Error checking business profile:', error)
      // On error, assume business_name might be missing
      setUserProfile(null)
      setHasBusinessName(false)
    } finally {
      setIsCheckingProfile(false)
    }
  }

  const prepareVariables = (invoice: InvoiceWithClient) => {
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('nl-NL', {
        style: 'currency',
        currency: 'EUR'
      }).format(amount)
    }

    const formatDate = (date: Date | string) => {
      const d = typeof date === 'string' ? new Date(date) : date
      return new Intl.DateTimeFormat('nl-NL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).format(d)
    }

    const calculateDaysOverdue = () => {
      const dueDate = typeof invoice.due_date === 'string' ? new Date(invoice.due_date) : invoice.due_date
      const today = new Date()
      const diffTime = today.getTime() - dueDate.getTime()
      return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
    }

    // Build sender name matching the API logic
    const fullName = userProfile
      ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim()
      : ''

    let senderName: string
    if (userProfile?.business_name && fullName) {
      // Best case: "Name from Company"
      senderName = `${fullName} from ${userProfile.business_name}`
    } else if (fullName) {
      // Fallback: Just the name
      senderName = fullName
    } else if (userProfile?.email) {
      // Last resort: Email address
      senderName = userProfile.email
    } else {
      // If no profile data available yet
      senderName = 'Your Business'
    }

    // Extract administration contact for greeting
    const adminContact = (invoice.client as any).contacts?.find(
      (c: any) => c.contact_type === 'administration'
    )
    const adminName = adminContact?.first_name || 'Contactpersoon'

    return {
      client_name: invoice.client.company_name || invoice.client.name,
      admin_name: adminName,
      invoice_number: invoice.invoice_number,
      invoice_date: formatDate(invoice.invoice_date),
      due_date: formatDate(invoice.due_date),
      days_overdue: calculateDaysOverdue().toString(),
      total_amount: formatCurrency(parseFloat(invoice.total_amount.toString())),
      business_name: senderName
    }
  }

  const renderTemplate = (template: string, variables: Record<string, string>) => {
    let rendered = template
    Object.entries(variables).forEach(([key, value]) => {
      rendered = rendered.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value)
    })
    return rendered
  }

  const handleSendReminder = async () => {
    if (!invoice) return

    try {
      setIsLoading(true)

      const response = await fetch(`/api/invoices/${invoice.id}/send-reminder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice_id: invoice.id,
          template_id: selectedTemplateId || undefined,
          personal_note: personalNote || undefined,
          send_copy_to_sender: sendCopyToSelf
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to send reminder')
      }

      const data = await response.json()
      toast.success('Payment reminder sent successfully')

      if (onSuccess) {
        onSuccess(data.data)
      }

      onClose()
    } catch (error) {
      console.error('Error sending reminder:', error)
      toast.error('Failed to send reminder', {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!invoice) return null

  const daysOverdue = (() => {
    const dueDate = typeof invoice.due_date === 'string' ? new Date(invoice.due_date) : invoice.due_date
    const today = new Date()
    const diffTime = today.getTime() - dueDate.getTime()
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
  })()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={cn(
          'max-w-3xl max-h-[90vh] overflow-y-auto',
          'bg-gradient-to-br from-slate-950/95 via-slate-900/90 to-slate-950/95',
          'border border-white/10 backdrop-blur-2xl',
          'shadow-[0_40px_120px_rgba(15,23,42,0.45)] text-slate-100'
        )}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-orange-400" />
            Send Payment Reminder
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Send a payment reminder for invoice {invoice.invoice_number}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Invoice Info Alert */}
          <Alert className="border-orange-500/20 bg-orange-500/10">
            <AlertTriangle className="h-4 w-4 text-orange-400" />
            <AlertDescription className="text-slate-200">
              This invoice is {daysOverdue} days overdue. Amount: {new Intl.NumberFormat('nl-NL', {
                style: 'currency',
                currency: 'EUR'
              }).format(parseFloat(invoice.total_amount.toString()))}
            </AlertDescription>
          </Alert>

          {/* Business Name Warning */}
          {!isCheckingProfile && !hasBusinessName && (
            <Alert className="border-blue-500/20 bg-blue-500/10">
              <Building className="h-4 w-4 text-blue-400" />
              <AlertDescription className="text-slate-200">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-medium mb-1">Professionele uitstraling tip</p>
                    <p className="text-sm text-slate-300">
                      Uw bedrijfsnaam ontbreekt. De e-mail zal ondertekend worden met uw naam in plaats van uw bedrijfsnaam.
                      Voor een professionelere uitstraling, vul uw bedrijfsinformatie in.
                    </p>
                  </div>
                  <Link
                    href="/dashboard/settings/business"
                    target="_blank"
                    className="flex items-center gap-1 text-xs text-blue-300 hover:text-blue-200 whitespace-nowrap"
                  >
                    Instellen
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Reminder History */}
          {reminderHistory.length > 0 && (
            <Alert className="border-slate-600/20 bg-slate-800/10">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <AlertDescription className="text-slate-200">
                <div className="space-y-1">
                  <p className="font-medium text-sm">Previous Reminders:</p>
                  {reminderHistory.map((reminder, idx) => (
                    <p key={reminder.id} className="text-xs text-slate-300">
                      ✓ Level {reminder.reminder_level} sent on{' '}
                      {new Date(reminder.sent_at).toLocaleDateString('nl-NL', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}{' '}
                      to {reminder.email_sent_to}
                    </p>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Warning if all reminders sent or can't send */}
          {!canSendReminder && reminderMessage && (
            <Alert className="border-red-500/20 bg-red-500/10">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-slate-200">
                {reminderMessage}
              </AlertDescription>
            </Alert>
          )}

          {/* Next Reminder Level Indicator */}
          {nextReminderLevel && (
            <Alert className="border-blue-500/20 bg-blue-500/10">
              <Bell className="h-4 w-4 text-blue-400" />
              <AlertDescription className="text-slate-200">
                Next Reminder: <span className="font-semibold">Level {nextReminderLevel}</span>{' '}
                {nextReminderLevel === 1 && '(Gentle Reminder)'}
                {nextReminderLevel === 2 && '(Follow-up)'}
                {nextReminderLevel === 3 && '(Final Notice)'}
              </AlertDescription>
            </Alert>
          )}

          {/* Template Selection */}
          <div className="space-y-2">
            <Label htmlFor="template">Reminder Template</Label>
            {isFetchingTemplates ? (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading templates...
              </div>
            ) : (
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger className="bg-slate-900/50 border-slate-700">
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name} (Level {template.reminder_level})
                      {template.is_default && ' - Default'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Preview */}
          {previewSubject && previewBody && (
            <div className="space-y-4 rounded-lg border border-slate-700 bg-slate-900/30 p-4">
              <div>
                <Label className="text-xs text-slate-400">Subject Preview</Label>
                <p className="mt-1 font-medium text-slate-100">{previewSubject}</p>
              </div>
              <div>
                <Label className="text-xs text-slate-400">Body Preview</Label>
                <div className="mt-1 max-h-64 overflow-y-auto rounded border border-slate-700 bg-slate-950/50 p-3">
                  <pre className="whitespace-pre-wrap font-sans text-sm text-slate-300">
                    {previewBody}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Personal Note */}
          <div className="space-y-2">
            <Label htmlFor="personalNote">Personal Note (Optional)</Label>
            <Textarea
              id="personalNote"
              placeholder="Add a personal note to append to the email..."
              value={personalNote}
              onChange={(e) => setPersonalNote(e.target.value)}
              rows={3}
              className="bg-slate-900/50 border-slate-700"
            />
          </div>

          {/* Send Copy Checkbox */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="sendCopy"
              checked={sendCopyToSelf}
              onChange={(e) => setSendCopyToSelf(e.target.checked)}
              className="rounded border-slate-700"
            />
            <Label htmlFor="sendCopy" className="cursor-pointer text-sm">
              Send a copy to myself
            </Label>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleSendReminder}
            disabled={isLoading || !selectedTemplateId || !canSendReminder}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                {nextReminderLevel ? `Send Level ${nextReminderLevel} Reminder` : 'Send Reminder'}
              </>
            )}
          </Button>        </div>
      </DialogContent>
    </Dialog>
  )
}

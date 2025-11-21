'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Mail, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { InvoiceWithClient } from '@/lib/types/financial'

interface SendInvoiceEmailModalProps {
  invoice: InvoiceWithClient
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function SendInvoiceEmailModal({
  invoice,
  isOpen,
  onClose,
  onSuccess
}: SendInvoiceEmailModalProps) {
  const [isSending, setIsSending] = useState(false)
  const [emailTo, setEmailTo] = useState(invoice.client?.email || '')
  const [emailCc, setEmailCc] = useState('')
  const [emailSubject, setEmailSubject] = useState(
    `Invoice ${invoice.invoice_number}`
  )
  const [emailMessage, setEmailMessage] = useState('')

  const handleSend = async () => {
    if (!emailTo) {
      toast.error('Please enter a recipient email address')
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailTo)) {
      toast.error('Please enter a valid email address')
      return
    }

    if (emailCc && !emailRegex.test(emailCc)) {
      toast.error('Please enter a valid CC email address')
      return
    }

    setIsSending(true)

    try {
      const response = await fetch(`/api/invoices/${invoice.id}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: emailTo,
          cc: emailCc || undefined,
          subject: emailSubject,
          message: emailMessage || undefined
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to send invoice email')
      }

      toast.success('Invoice sent successfully', {
        description: `Invoice ${invoice.invoice_number} has been sent to ${emailTo}`
      })

      onSuccess?.()
      onClose()
    } catch (error) {
      console.error('Error sending invoice email:', error)
      toast.error('Failed to send invoice', {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px]" data-testid="email-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Invoice via Email
          </DialogTitle>
          <DialogDescription>
            Send invoice {invoice.invoice_number} to your client
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email-to">To *</Label>
            <Input
              id="email-to"
              type="email"
              name="to"
              placeholder="client@example.com"
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
              required
              data-testid="email-to-input"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email-cc">CC (Optional)</Label>
            <Input
              id="email-cc"
              type="email"
              placeholder="copy@example.com"
              value={emailCc}
              onChange={(e) => setEmailCc(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email-subject">Subject</Label>
            <Input
              id="email-subject"
              type="text"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              placeholder="Invoice subject"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email-message">Custom Message (Optional)</Label>
            <Textarea
              id="email-message"
              placeholder="Add a personal message to the invoice email..."
              value={emailMessage}
              onChange={(e) => setEmailMessage(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              A default professional message will be used if left empty
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSend}
            disabled={isSending || !emailTo}
            data-testid="send-email-button"
          >
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Send Invoice
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Euro, 
  CreditCard, 
  Calendar,
  FileText,
  Loader2,
  AlertCircle
} from 'lucide-react'
import type { InvoiceWithClient, PaymentMethod } from '@/lib/types/financial'

const PaymentRecordingSchema = z.object({
  amount: z.number().min(0.01, 'Bedrag moet positief zijn'),
  payment_date: z.string().refine((date) => !isNaN(Date.parse(date)), 'Ongeldige datum'),
  payment_method: z.enum(['bank_transfer', 'credit_card', 'cash', 'paypal', 'other']).default('bank_transfer'),
  reference: z.string().optional(),
  notes: z.string().optional()
})

interface PaymentRecordingModalProps {
  invoice: InvoiceWithClient | null
  isOpen: boolean
  onClose: () => void
  onSuccess?: (payment: any) => void
}

export function PaymentRecordingModal({ 
  invoice, 
  isOpen, 
  onClose, 
  onSuccess 
}: PaymentRecordingModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<z.infer<typeof PaymentRecordingSchema>>({
    resolver: zodResolver(PaymentRecordingSchema),
    defaultValues: {
      amount: 0,
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'bank_transfer',
      reference: '',
      notes: ''
    }
  })

  if (!invoice) return null

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const getPaymentMethodLabel = (method: PaymentMethod) => {
    switch (method) {
      case 'bank_transfer':
        return 'Bankoverschrijving'
      case 'credit_card':
        return 'Creditcard'
      case 'cash':
        return 'Contant'
      case 'paypal':
        return 'PayPal'
      case 'other':
        return 'Anders'
      default:
        return method
    }
  }

  const currentPaidAmount = parseFloat(invoice.paid_amount?.toString() || '0')
  const totalAmount = parseFloat(invoice.total_amount.toString())
  const remainingBalance = totalAmount - currentPaidAmount

  const onSubmit = async (data: z.infer<typeof PaymentRecordingSchema>) => {
    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/invoices/${invoice.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to record payment')
      }

      const result = await response.json()
      
      // Reset form and close modal
      form.reset()
      onClose()
      
      // Call success callback
      onSuccess?.(result.data)

    } catch (error) {
      console.error('Payment recording error:', error)
      alert(error instanceof Error ? error.message : 'Er is een fout opgetreden')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Set maximum amount to remaining balance
  const handleAmountChange = (value: string) => {
    const numValue = parseFloat(value) || 0
    const maxAmount = Math.min(numValue, remainingBalance)
    form.setValue('amount', maxAmount)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <CreditCard className="h-6 w-6" />
            Betaling registreren - Factuur {invoice.invoice_number}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Invoice Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" />
                Factuuroverzicht
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Totaal bedrag:</span>
                  <span className="float-right font-medium">
                    {formatCurrency(totalAmount)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Reeds betaald:</span>
                  <span className="float-right font-medium">
                    {formatCurrency(currentPaidAmount)}
                  </span>
                </div>
                <div className="col-span-2 border-t pt-2">
                  <span className="text-muted-foreground">Openstaand bedrag:</span>
                  <span className="float-right font-bold text-lg text-blue-600">
                    {formatCurrency(remainingBalance)}
                  </span>
                </div>
              </div>
              
              {remainingBalance <= 0 && (
                <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <p className="text-sm text-green-800 dark:text-green-200">
                      Deze factuur is al volledig betaald.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Form */}
          {remainingBalance > 0 && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Euro className="h-4 w-4" />
                          Bedrag
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0.01"
                            max={remainingBalance}
                            step="0.01"
                            placeholder="0.00"
                            {...field}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value) || 0
                              field.onChange(value)
                            }}
                          />
                        </FormControl>
                        <FormDescription>
                          Maximum: {formatCurrency(remainingBalance)}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="payment_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Betalingsdatum
                        </FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="payment_method"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Betalingsmethode</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecteer betalingsmethode" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="bank_transfer">Bankoverschrijving</SelectItem>
                          <SelectItem value="credit_card">Creditcard</SelectItem>
                          <SelectItem value="cash">Contant</SelectItem>
                          <SelectItem value="paypal">PayPal</SelectItem>
                          <SelectItem value="other">Anders</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Referentie</FormLabel>
                      <FormControl>
                        <Input placeholder="Transactie-ID of referentienummer" {...field} />
                      </FormControl>
                      <FormDescription>
                        Optionele referentie zoals transactie-ID of kenmerk
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Opmerkingen</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Extra informatie over deze betaling..."
                          className="resize-none"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Form Actions */}
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    disabled={isSubmitting}
                  >
                    Annuleren
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting || form.watch('amount') <= 0}
                  >
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Betaling registreren
                  </Button>
                </div>
              </form>
            </Form>
          )}

          {/* No Payment Needed */}
          {remainingBalance <= 0 && (
            <div className="flex justify-end">
              <Button variant="outline" onClick={onClose}>
                Sluiten
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
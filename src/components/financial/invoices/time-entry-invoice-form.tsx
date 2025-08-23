'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import { 
  FileText, 
  Calendar, 
  Euro,
  Loader2,
  AlertCircle,
  Clock,
  User
} from 'lucide-react'
import type { ClientInvoicingSummary, TimeEntryWithClient } from '@/lib/types/financial'
import { z } from 'zod'

const TimeEntryInvoiceSchema = z.object({
  invoice_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  reference: z.string().optional(),
  notes: z.string().optional(),
})

interface TimeEntryInvoiceFormProps {
  client: ClientInvoicingSummary
  selectedTimeEntries: TimeEntryWithClient[]
  onSuccess?: (invoice: any) => void
  onCancel?: () => void
}

export function TimeEntryInvoiceForm({ 
  client, 
  selectedTimeEntries, 
  onSuccess, 
  onCancel 
}: TimeEntryInvoiceFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Calculate due date based on client's payment terms
  const getDefaultDueDate = () => {
    const today = new Date()
    const dueDate = new Date(today)
    dueDate.setDate(today.getDate() + (client.default_payment_terms || 30))
    return dueDate.toISOString().split('T')[0]
  }

  const form = useForm<z.infer<typeof TimeEntryInvoiceSchema>>({
    resolver: zodResolver(TimeEntryInvoiceSchema),
    defaultValues: {
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: getDefaultDueDate(),
      reference: '',
      notes: '',
    },
  })

  const calculateSummary = () => {
    const totalHours = selectedTimeEntries.reduce((sum, entry) => sum + (entry.hours || 0), 0)
    const totalAmount = selectedTimeEntries.reduce((sum, entry) => 
      sum + ((entry.hours || 0) * (entry.hourly_rate || 0)), 0
    )
    
    return {
      totalEntries: selectedTimeEntries.length,
      totalHours,
      totalAmount,
      averageRate: totalHours > 0 ? totalAmount / totalHours : 0
    }
  }

  const summary = calculateSummary()

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const formatHours = (hours: number) => {
    return `${hours.toFixed(1)}u`
  }

  const onSubmit = async (values: z.infer<typeof TimeEntryInvoiceSchema>) => {
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/invoices/from-time-entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: client.id,
          time_entry_ids: selectedTimeEntries.map(entry => entry.id),
          invoice_date: values.invoice_date,
          due_date: values.due_date,
          reference: values.reference || undefined,
          notes: values.notes || undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
        throw new Error(errorData.message || `HTTP ${response.status}`)
      }

      const result = await response.json()
      onSuccess?.(result.data.invoice)

    } catch (err) {
      console.error('Error creating invoice:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Invoice Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Factuur overzicht
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">Klant</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{client.company_name || client.name}</span>
                </div>
                {client.email && (
                  <div className="text-muted-foreground">{client.email}</div>
                )}
                <div className="text-muted-foreground">
                  {client.country_code} • {client.default_payment_terms} dagen betaaltermijn
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-3">Tijd registraties</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{summary.totalEntries} registraties</span>
                </div>
                <div className="flex items-center gap-2">
                  <Euro className="h-4 w-4 text-muted-foreground" />
                  <span>{formatHours(summary.totalHours)} • {formatCurrency(summary.totalAmount)}</span>
                </div>
                <div className="text-muted-foreground">
                  Gemiddeld {formatCurrency(summary.averageRate)}/uur
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Form */}
      <Card>
        <CardHeader>
          <CardTitle>Factuurgegevens</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="invoice_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Factuurdatum
                      </FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="due_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vervaldatum</FormLabel>
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
                name="reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Referentie (optioneel)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Bijv. Project naam, PO nummer, etc." 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notities (optioneel)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Extra informatie voor de factuur..."
                        className="min-h-20"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {error && (
                <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-md">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isSubmitting}
                >
                  Annuleren
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || selectedTimeEntries.length === 0}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Factuur aanmaken...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Factuur aanmaken
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
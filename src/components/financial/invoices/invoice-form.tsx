'use client'

import { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Plus,
  Trash2,
  Calculator,
  FileText,
  User,
  Calendar,
  Euro,
  Loader2,
  AlertCircle,
  Search
} from 'lucide-react'
import { CreateInvoiceSchema } from '@/lib/validations/financial'
import type { InvoiceWithClient, Client, InvoiceCalculation } from '@/lib/types/financial'
import { BusinessProfileWarning } from '@/components/business/business-profile-warning'
import { z } from 'zod'
import { toast } from 'sonner'

interface InvoiceFormProps {
  invoice?: InvoiceWithClient
  onSuccess?: (invoice: InvoiceWithClient) => void
  onCancel?: () => void
}

interface ClientOption {
  id: string
  name: string
  company_name?: string
  is_business: boolean
  country_code: string
  vat_number?: string
  default_payment_terms: number
}

interface InvoiceTemplate {
  id: string
  name: string
  description?: string
  default_payment_terms_days?: number
  items: Array<{
    description: string
    quantity: number
    unit_price: number
  }>
}

export function InvoiceForm({ invoice, onSuccess, onCancel }: InvoiceFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [clients, setClients] = useState<ClientOption[]>([])
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null)
  const [vatCalculation, setVatCalculation] = useState<InvoiceCalculation | null>(null)
  const [isCalculatingVAT, setIsCalculatingVAT] = useState(false)
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>('none')
  const [templateSearch, setTemplateSearch] = useState<string>('')

  const form = useForm<z.infer<typeof CreateInvoiceSchema>>({
    resolver: zodResolver(CreateInvoiceSchema),
    defaultValues: {
      client_id: invoice?.client_id || '',
      invoice_date: invoice?.invoice_date || new Date().toISOString().split('T')[0],
      due_date: invoice?.due_date || '',
      reference: invoice?.reference || '',
      notes: invoice?.notes || '',
      items: invoice?.items || [
        { description: '', quantity: 1, unit_price: 0 }
      ]
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items'
  })

  // Load clients and templates on component mount
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await fetch('/api/clients?all=true')
        if (response.ok) {
          const data = await response.json()
          setClients(data.data)

          // Set selected client if editing existing invoice
          if (invoice?.client_id) {
            const client = data.data.find((c: ClientOption) => c.id === invoice.client_id)
            if (client) {
              setSelectedClient(client)
            }
          }
        }
      } catch (error) {
        console.error('Failed to load clients:', error)
      }
    }

    const fetchTemplates = async () => {
      try {
        const response = await fetch('/api/invoice-templates')
        if (response.ok) {
          const data = await response.json()
          setTemplates(data.data || [])
        }
      } catch (error) {
        console.error('Failed to load templates:', error)
      }
    }

    fetchClients()
    fetchTemplates()
  }, [invoice])

  // Calculate VAT when client or items change
  const watchedClientId = form.watch('client_id')
  const watchedItems = form.watch('items')

  useEffect(() => {
    if (watchedClientId && watchedItems.length > 0) {
      const client = clients.find(c => c.id === watchedClientId)
      if (client && watchedItems.some(item => item.quantity > 0 && item.unit_price > 0)) {
        calculateVAT(client, watchedItems)
      }
    }
  }, [watchedClientId, watchedItems, clients])

  const calculateVAT = async (client: ClientOption, items: any[]) => {
    setIsCalculatingVAT(true)
    
    try {
      const response = await fetch('/api/vat/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_country: client.country_code,
          client_is_business: client.is_business,
          client_has_vat_number: !!client.vat_number,
          items: items.map(item => ({
            quantity: item.quantity,
            unit_price: item.unit_price
          }))
        })
      })

      if (response.ok) {
        const result = await response.json()
        setVatCalculation(result.data)
      }
    } catch (error) {
      console.error('VAT calculation error:', error)
    } finally {
      setIsCalculatingVAT(false)
    }
  }

  const handleClientChange = (clientId: string) => {
    const client = clients.find(c => c.id === clientId)
    if (client) {
      setSelectedClient(client)

      // Auto-set due date based on payment terms
      const invoiceDate = new Date(form.getValues('invoice_date'))
      const dueDate = new Date(invoiceDate)
      dueDate.setDate(dueDate.getDate() + client.default_payment_terms)
      form.setValue('due_date', dueDate.toISOString().split('T')[0])
    }
  }

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId)

    if (!templateId || templateId === 'none') return

    const template = templates.find(t => t.id === templateId)
    if (!template) return

    // Replace the current form items in a single update to avoid freeze loops
    form.setValue('items', template.items.map(item => ({
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price
    })))

    // Apply default payment terms if present
    if (template.default_payment_terms_days) {
      const invoiceDate = new Date(form.getValues('invoice_date'))
      const dueDate = new Date(invoiceDate)
      dueDate.setDate(dueDate.getDate() + template.default_payment_terms_days)
      form.setValue('due_date', dueDate.toISOString().split('T')[0])
    }

    toast.success('Template applied', {
      description: `${template.items.length} items added to invoice`
    })
  }

  const onSubmit = async (data: z.infer<typeof CreateInvoiceSchema>) => {
    if (!vatCalculation) {
      toast.error('VAT calculation not ready', {
        description: 'Please try again in a moment'
      })
      return
    }

    setIsSubmitting(true)

    try {
      const invoiceData = {
        ...data,
        items: data.items.map(item => ({
          ...item,
          total: item.quantity * item.unit_price
        })),
        // Include VAT calculation results
        subtotal: vatCalculation.subtotal,
        vat_amount: vatCalculation.vat_amount,
        total_amount: vatCalculation.total_amount,
        vat_type: vatCalculation.vat_type,
        vat_rate: vatCalculation.vat_rate
      }

      const url = invoice ? `/api/invoices/${invoice.id}` : '/api/invoices'
      const method = invoice ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || `Failed to ${invoice ? 'update' : 'create'} invoice`)
      }

      const result = await response.json()
      toast.success(invoice ? 'Invoice updated successfully' : 'Invoice created successfully')
      onSuccess?.(result.data)

      // Reset form if creating new invoice
      if (!invoice) {
        form.reset()
        setVatCalculation(null)
        setSelectedClient(null)
      }
    } catch (error) {
      console.error('Invoice form error:', error)
      toast.error('Failed to save invoice', {
        description: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Business Profile Warning */}
      <BusinessProfileWarning showInvoiceSpecific={true} />
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {invoice ? 'Factuur bewerken' : 'Nieuwe factuur'}
          </CardTitle>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" data-testid="invoice-form">
              {/* Invoice Template Selector */}
              {!invoice && templates.length > 0 && (
                <div className="pb-4 border-b">
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Factuursjabloon (optioneel)
                    </FormLabel>
                    <Select
                      value={selectedTemplate}
                      onValueChange={handleTemplateChange}
                    >
                      <SelectTrigger data-testid="template-selector">
                        <SelectValue placeholder="Selecteer een sjabloon om snel te starten" />
                      </SelectTrigger>
                      <SelectContent>
                        {/* Search Input */}
                        <div className="p-2 border-b sticky top-0 bg-background">
                          <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              data-testid="template-search"
                              placeholder="Zoek sjabloon..."
                              value={templateSearch}
                              onChange={(e) => setTemplateSearch(e.target.value)}
                              className="pl-8"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>

                        <SelectItem value="none">Geen sjabloon</SelectItem>
                        {templates
                          .filter((template) =>
                            templateSearch === '' ||
                            template.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
                            template.description?.toLowerCase().includes(templateSearch.toLowerCase())
                          )
                          .map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                              {template.description && (
                                <span className="text-xs text-muted-foreground ml-2">
                                  - {template.description}
                                </span>
                              )}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Kies een sjabloon om factuurregels automatisch in te vullen
                    </FormDescription>
                  </FormItem>
                </div>
              )}

              {/* Client and Date Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="client_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Klant
                      </FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value)
                          handleClientChange(value)
                        }}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecteer klant" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clients.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.company_name || client.name}
                              {client.is_business && (
                                <span className="text-xs text-muted-foreground ml-2">
                                  (B2B - {client.country_code})
                                </span>
                              )}
                            </SelectItem>
                          ))}
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
                        <Input placeholder="Project ABC" {...field} />
                      </FormControl>
                      <FormDescription>
                        Optionele referentie voor deze factuur
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <FormDescription>
                        {selectedClient && `Standaard ${selectedClient.default_payment_terms} dagen`}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Invoice Items */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Factuurregels</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ description: '', quantity: 1, unit_price: 0 })}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Regel toevoegen
                  </Button>
                </div>

                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <Card key={field.id} className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                        <div className="md:col-span-6">
                          <FormField
                            control={form.control}
                            name={`items.${index}.description`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Beschrijving</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Websiteontwikkeling..."
                                    className="resize-none"
                                    rows={2}
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="md:col-span-2">
                          <FormField
                            control={form.control}
                            name={`items.${index}.quantity`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Aantal</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="md:col-span-3">
                          <FormField
                            control={form.control}
                            name={`items.${index}.unit_price`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-1">
                                  <Euro className="h-3 w-3" />
                                  Prijs per stuk
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="md:col-span-1 flex items-end">
                          {fields.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => remove(index)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Show line total */}
                      <div className="mt-2 text-right text-sm text-muted-foreground">
                        Regel totaal: {formatCurrency(
                          (form.watch(`items.${index}.quantity`) || 0) * 
                          (form.watch(`items.${index}.unit_price`) || 0)
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* VAT Calculation Display */}
              {vatCalculation && (
                <Card className="border-green-200 dark:border-green-800">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-200">
                      <Calculator className="h-5 w-5" />
                      BTW Berekening
                      {isCalculatingVAT && <Loader2 className="h-4 w-4 animate-spin" />}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Subtotaal:</span>
                        <span className="float-right font-medium">
                          {formatCurrency(vatCalculation.subtotal)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">BTW Type:</span>
                        <span className="float-right text-xs">
                          {getVATTypeLabel(vatCalculation.vat_type)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">BTW Bedrag:</span>
                        <span className="float-right font-medium">
                          {formatCurrency(vatCalculation.vat_amount)}
                        </span>
                      </div>
                      <div className="border-t pt-2">
                        <span className="font-semibold">Totaal:</span>
                        <span className="float-right font-bold text-lg">
                          {formatCurrency(vatCalculation.total_amount)}
                        </span>
                      </div>
                    </div>

                    {vatCalculation.explanation && (
                      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-blue-800 dark:text-blue-200">
                            {vatCalculation.explanation}
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Opmerkingen</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Extra informatie voor deze factuur..."
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Deze opmerkingen worden weergegeven op de factuur
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Form Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={isSubmitting || !vatCalculation}
                  className="flex-1"
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {invoice ? 'Factuur bijwerken' : 'Factuur maken'}
                </Button>

                {onCancel && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={isSubmitting}
                  >
                    Annuleren
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}

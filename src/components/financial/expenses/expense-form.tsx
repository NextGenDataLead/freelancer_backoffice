'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { 
  Receipt, 
  Upload, 
  Camera, 
  Calculator, 
  Euro,
  Loader2,
  AlertCircle,
  CheckCircle,
  Building2,
  Calendar
} from 'lucide-react'
import { CreateExpenseSchema } from '@/lib/validations/financial'
import type { ExpenseWithSupplier, Client } from '@/lib/types/financial'
import { z } from 'zod'

interface ExpenseFormProps {
  expense?: ExpenseWithSupplier
  onSuccess?: (expense: ExpenseWithSupplier) => void
  onCancel?: () => void
}

interface SupplierOption {
  id: string
  name: string
  company_name?: string
  is_business: boolean
  country_code: string
}

// Dutch expense categories with translations
const EXPENSE_CATEGORIES = [
  { value: 'office_supplies', label: 'Kantoorbenodigdheden' },
  { value: 'software_subscriptions', label: 'Software abonnementen' },
  { value: 'marketing_advertising', label: 'Marketing & Reclame' },
  { value: 'travel_accommodation', label: 'Reis & Verblijf' },
  { value: 'meals_entertainment', label: 'Maaltijden & Entertainment' },
  { value: 'professional_services', label: 'Professionele diensten' },
  { value: 'equipment_hardware', label: 'Apparatuur & Hardware' },
  { value: 'telecommunications', label: 'Telecommunicatie' },
  { value: 'training_education', label: 'Training & Onderwijs' },
  { value: 'insurance', label: 'Verzekeringen' },
  { value: 'banking_fees', label: 'Bankkosten' },
  { value: 'utilities', label: 'Nutsvoorzieningen' },
  { value: 'rent_lease', label: 'Huur & Lease' },
  { value: 'repairs_maintenance', label: 'Reparaties & Onderhoud' },
  { value: 'other', label: 'Overig' }
]

// Common VAT rates in Netherlands
const VAT_RATES = [
  { value: 0.21, label: '21% (Standaard tarief)' },
  { value: 0.09, label: '9% (Verlaagd tarief)' },
  { value: 0.00, label: '0% (Vrijgesteld/EU)' }
]

export function ExpenseForm({ expense, onSuccess, onCancel }: ExpenseFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([])
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [ocrProcessing, setOcrProcessing] = useState(false)
  const [ocrResult, setOcrResult] = useState<any>(null)

  const form = useForm<z.infer<typeof CreateExpenseSchema>>({
    resolver: zodResolver(CreateExpenseSchema),
    defaultValues: {
      supplier_id: expense?.supplier_id || '',
      expense_date: expense?.expense_date || new Date().toISOString().split('T')[0],
      description: expense?.description || '',
      category: expense?.category || 'other',
      amount: expense?.amount || 0,
      vat_rate: expense?.vat_rate || 0.21,
      is_deductible: expense?.is_deductible ?? true,
    },
  })

  // Load suppliers on component mount
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const response = await fetch('/api/clients?is_supplier=true&limit=1000')
        if (response.ok) {
          const data = await response.json()
          setSuppliers(data.data)
        }
      } catch (error) {
        console.error('Failed to load suppliers:', error)
      }
    }

    fetchSuppliers()
  }, [])

  // Calculate VAT amount when amount or rate changes
  const watchedAmount = form.watch('amount')
  const watchedVatRate = form.watch('vat_rate')
  
  const vatAmount = watchedAmount && watchedVatRate 
    ? Math.round(watchedAmount * watchedVatRate * 100) / 100
    : 0
  
  const totalAmount = watchedAmount ? watchedAmount + vatAmount : 0

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      alert('Alleen JPG, PNG, WebP en PDF bestanden zijn toegestaan')
      return
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      alert('Bestand is te groot. Maximum grootte is 10MB')
      return
    }

    setUploadedFile(file)
    
    // Process with OCR
    await processWithOCR(file)
  }

  const processWithOCR = async (file: File) => {
    setOcrProcessing(true)
    setOcrResult(null)

    try {
      // In a real implementation, you would upload the file first
      // For now, we'll simulate OCR processing with a mock URL
      const mockFileUrl = 'https://example.com/receipt.jpg'

      const response = await fetch('/api/expenses/ocr/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receipt_url: mockFileUrl,
          file_name: file.name,
          file_type: file.type,
          supplier_name_hint: form.getValues('supplier_id') ? 
            suppliers.find(s => s.id === form.getValues('supplier_id'))?.name : undefined,
          category_hint: form.getValues('category')
        })
      })

      if (response.ok) {
        const result = await response.json()
        setOcrResult(result.data)
        
        // Auto-fill form with OCR results if confidence is high
        const expense = result.data.expense
        const ocrResults = result.data.ocr_results
        
        if (ocrResults.confidence > 0.8) {
          // Auto-fill form fields
          form.setValue('description', expense.description)
          form.setValue('amount', parseFloat(expense.amount))
          form.setValue('expense_date', expense.expense_date)
          form.setValue('category', expense.category)
          form.setValue('vat_rate', parseFloat(expense.vat_rate))
          
          // Try to match supplier
          if (expense.supplier && ocrResults.supplier_matched) {
            form.setValue('supplier_id', expense.supplier.id)
          }
        }
      }
    } catch (error) {
      console.error('OCR processing error:', error)
      alert('Fout bij verwerken van de bon. Probeer opnieuw.')
    } finally {
      setOcrProcessing(false)
    }
  }

  const onSubmit = async (data: z.infer<typeof CreateExpenseSchema>) => {
    setIsSubmitting(true)

    try {
      const expenseData = {
        ...data,
        vat_amount: vatAmount,
        total_amount: totalAmount,
        // In a real implementation, you would upload the file and include the URL
        receipt_url: uploadedFile ? 'https://example.com/receipt.jpg' : undefined
      }

      const url = expense ? `/api/expenses/${expense.id}` : '/api/expenses'
      const method = expense ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || `Failed to ${expense ? 'update' : 'create'} expense`)
      }

      const result = await response.json()
      onSuccess?.(result.data)

      // Reset form if creating new expense
      if (!expense) {
        form.reset()
        setUploadedFile(null)
        setOcrResult(null)
      }
    } catch (error) {
      console.error('Expense form error:', error)
      alert(error instanceof Error ? error.message : 'Er is een fout opgetreden')
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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* OCR Upload Card */}
      <Card className="border-dashed border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Bon uploaden (Optioneel)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted/80 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {ocrProcessing ? (
                    <>
                      <Loader2 className="w-8 h-8 mb-3 text-muted-foreground animate-spin" />
                      <p className="text-sm text-muted-foreground">
                        Bon wordt verwerkt...
                      </p>
                    </>
                  ) : uploadedFile ? (
                    <>
                      <CheckCircle className="w-8 h-8 mb-3 text-green-600" />
                      <p className="text-sm text-muted-foreground">
                        {uploadedFile.name}
                      </p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 mb-3 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        <span className="font-semibold">Klik om te uploaden</span> of sleep hier
                      </p>
                      <p className="text-xs text-muted-foreground">
                        JPG, PNG, WebP of PDF (Max. 10MB)
                      </p>
                    </>
                  )}
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  disabled={ocrProcessing}
                />
              </label>
            </div>
            
            {ocrResult && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  {ocrResult.ocr_results.confidence > 0.8 ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                  )}
                  <span className="text-sm font-medium">
                    OCR Resultaat ({Math.round(ocrResult.ocr_results.confidence * 100)}% betrouwbaarheid)
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {ocrResult.ocr_results.requires_verification
                    ? 'Gegevens zijn automatisch ingevuld, controleer voor verzenden'
                    : 'Gegevens zijn met hoge betrouwbaarheid ingevuld'}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Expense Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Euro className="h-5 w-5" />
            {expense ? 'Uitgave bewerken' : 'Nieuwe uitgave'}
          </CardTitle>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Supplier and Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="supplier_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Leverancier
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecteer leverancier" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {suppliers.map((supplier) => (
                            <SelectItem key={supplier.id} value={supplier.id}>
                              {supplier.company_name || supplier.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Leverancier niet in lijst? Voeg toe bij klanten.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="expense_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Datum
                      </FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Description and Category */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Beschrijving</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Kantoorbenodigdheden voor Q1..."
                        className="resize-none"
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categorie</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecteer categorie" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {EXPENSE_CATEGORIES.map((category) => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Amount and VAT */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bedrag (excl. BTW)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="vat_rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>BTW Tarief</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseFloat(value))}
                        defaultValue={field.value.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {VAT_RATES.map((rate) => (
                            <SelectItem key={rate.value} value={rate.value.toString()}>
                              {rate.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Amount Summary */}
              {watchedAmount > 0 && (
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span>Bedrag excl. BTW:</span>
                      <span>{formatCurrency(watchedAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>BTW ({Math.round(watchedVatRate * 100)}%):</span>
                      <span>{formatCurrency(vatAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between font-semibold border-t pt-2 mt-2">
                      <span>Totaal incl. BTW:</span>
                      <span>{formatCurrency(totalAmount)}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Deductible Toggle */}
              <FormField
                control={form.control}
                name="is_deductible"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Aftrekbaar voor BTW</FormLabel>
                      <FormDescription>
                        Kan deze uitgave worden afgetrokken van de BTW?
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Form Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {expense ? 'Uitgave bijwerken' : 'Uitgave toevoegen'}
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
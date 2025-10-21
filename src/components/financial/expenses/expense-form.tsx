'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  Receipt, 
  Upload, 
  Camera, 
  Calculator, 
  Euro,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Building2,
  Calendar,
  Flag,
  AlertTriangle
} from 'lucide-react'
import { CreateExpenseSchema } from '@/lib/validations/financial'
import type { ExpenseWithSupplier, Client } from '@/lib/types/financial'
import { z } from 'zod'
import { SupplierValidationPanel } from '@/components/financial/expenses/supplier-validation-panel'
import { DueRecurringExpensesCarousel } from '@/components/financial/expenses/due-recurring-expenses-carousel'

interface ExpenseFormProps {
  expense?: ExpenseWithSupplier
  onSuccess?: (expense: ExpenseWithSupplier) => void
  onCancel?: () => void
  enableOCR?: boolean
}

// Removed SupplierOption interface - using vendor_name instead

// Official Belastingdienst expense categories
const EXPENSE_CATEGORIES = [
  { value: 'kantoorbenodigdheden', label: 'Kantoorbenodigdheden' },
  { value: 'reiskosten', label: 'Reiskosten' },
  { value: 'maaltijden_zakelijk', label: 'Maaltijden & Zakelijk Entertainment' },
  { value: 'marketing_reclame', label: 'Marketing & Reclame' },
  { value: 'software_ict', label: 'Software & ICT' },
  { value: 'afschrijvingen', label: 'Afschrijvingen Bedrijfsmiddelen' },
  { value: 'verzekeringen', label: 'Verzekeringen' },
  { value: 'professionele_diensten', label: 'Professionele Diensten' },
  { value: 'werkruimte_kantoor', label: 'Werkruimte & Kantoorkosten' },
  { value: 'voertuigkosten', label: 'Voertuigkosten' },
  { value: 'telefoon_communicatie', label: 'Telefoon & Communicatie' },
  { value: 'vakliteratuur', label: 'Vakliteratuur' },
  { value: 'werkkleding', label: 'Werkkleding' },
  { value: 'relatiegeschenken_representatie', label: 'Relatiegeschenken & Representatie' },
  { value: 'overige_zakelijk', label: 'Overige Zakelijke Kosten' }
]


// Common VAT rates in Netherlands
const VAT_RATES = [
  { value: 0.21, label: '21% (Standaard tarief)' },
  { value: 0.09, label: '9% (Verlaagd tarief)' },
  { value: 0.00, label: '0% (Vrijgesteld/EU)' },
  { value: -1, label: 'BTW Verlegd (Reverse Charge)' }
]

export function ExpenseForm({ expense, onSuccess, onCancel, enableOCR = false }: ExpenseFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  // Removed suppliers state - using vendor_name instead
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [ocrProcessing, setOcrProcessing] = useState(false)
  const [ocrResult, setOcrResult] = useState<any>(null)

  const form = useForm<z.infer<typeof CreateExpenseSchema>>({
    resolver: zodResolver(CreateExpenseSchema),
    defaultValues: {
      vendor_name: expense?.vendor_name || '',
      expense_date: expense?.expense_date || new Date().toISOString().split('T')[0],
      description: expense?.description || '',
      category: expense?.category || 'overige_zakelijk',
      amount: expense?.amount || 0,
      vat_amount: expense?.vat_amount || 0,
      vat_rate: expense?.vat_rate || 0.21,
      is_deductible: expense?.is_deductible ?? true,
    },
  })

  // Removed supplier fetching - using vendor_name input instead

  // Calculate VAT amount when amount or rate changes
  const watchedAmount = form.watch('amount')
  const watchedVatRate = form.watch('vat_rate')
  
  const vatAmount = watchedAmount && watchedVatRate && watchedVatRate > 0
    ? Math.round(watchedAmount * watchedVatRate * 100) / 100
    : 0 // For reverse charge (BTW Verlegd), VAT amount is 0
  
  // Debug logging for VAT rate
  console.log('Current VAT rate from form:', watchedVatRate)
  
  const totalAmount = watchedAmount ? watchedAmount + vatAmount : 0

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type - images and PDFs for PaddleOCR
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      alert('Alleen JPG, PNG, WebP afbeeldingen en PDF documenten zijn toegestaan voor OCR')
      return
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      alert('Bestand is te groot. Maximum grootte is 10MB')
      return
    }

    setUploadedFile(file)
    
    // Process with PaddleOCR
    await processWithOCR(file)
  }

  const processWithOCR = async (file: File) => {
    setOcrProcessing(true)
    setOcrResult(null)

    try {
      const formData = new FormData()
      formData.append('receipt', file)

      const response = await fetch('/api/expenses/ocr-process', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('OCR processing failed')
      }

      const result = await response.json()
      setOcrResult(result.data)
      
      // Auto-fill form with OCR results if confidence is high and data exists
      const extractedData = result.data?.extracted_data
      
      if (extractedData && result.data.confidence > 0.7) {
        console.log('OCR extracted data:', extractedData)
        // Auto-fill form fields
        if (extractedData.vendor_name) {
          form.setValue('vendor_name', extractedData.vendor_name, {
            shouldValidate: true, 
            shouldDirty: true 
          })
        }
        if (extractedData.expense_date) {
          form.setValue('expense_date', extractedData.expense_date, {
            shouldValidate: true, 
            shouldDirty: true 
          })
        }
        if (extractedData.amount) {
          form.setValue('amount', extractedData.amount, {
            shouldValidate: true, 
            shouldDirty: true 
          })
        }
        if (extractedData.description) {
          form.setValue('description', extractedData.description, { 
            shouldValidate: true, 
            shouldDirty: true 
          })
        }
        if (extractedData.expense_type) {
          
          // Map OCR expense types to official Belastingdienst categories
          const categoryMap: Record<string, string> = {
            'meals': 'maaltijden_zakelijk',
            'travel': 'reiskosten', 
            'equipment': 'afschrijvingen',
            'software': 'software_ict',
            'office_supplies': 'kantoorbenodigdheden',
            'telecommunications': 'telefoon_communicatie',
            'telefoon_communicatie': 'telefoon_communicatie', // Direct mapping for official category
            'utilities': 'werkruimte_kantoor',
            'financial': 'professionele_diensten',
            'medical': 'overige_zakelijk',
            'marketing': 'marketing_reclame',
            'insurance': 'verzekeringen',
            'other': 'overige_zakelijk',
            'overige_zakelijk': 'overige_zakelijk' // Direct mapping for official category
          }
          
          const mappedCategory = categoryMap[extractedData.expense_type] || 'overige_zakelijk'
          
          form.setValue('category', mappedCategory, { 
            shouldValidate: true, 
            shouldDirty: true 
          })
        }
        // Set VAT rate - prioritize reverse charge detection
        if (extractedData.requires_reverse_charge || extractedData.suggested_vat_type === 'reverse_charge') {
          form.setValue('vat_rate', -1, { // -1 represents 'BTW Verlegd'
            shouldValidate: true, 
            shouldDirty: true 
          })
        } else if (extractedData.vat_rate) {
          form.setValue('vat_rate', extractedData.vat_rate, {
            shouldValidate: true, 
            shouldDirty: true 
          })
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
    
    console.log('Form submission data:', data)
    console.log('VAT rate being submitted:', data.vat_rate)
    console.log('Calculated VAT amount:', vatAmount)

    try {
      // Convert date to YYYY-MM-DD string format for API
      const formattedDate = data.expense_date instanceof Date 
        ? data.expense_date.toISOString().split('T')[0]
        : data.expense_date.toString().split('T')[0]

      // Extract supplier country from OCR result if available
      const supplierCountry = ocrResult?.extracted_data?.validated_supplier?.country_code || data.supplier_country

      // Send only fields that match CreateExpenseSchema
      const expenseData = {
        vendor_name: data.vendor_name,
        expense_date: formattedDate,
        description: data.description,
        category: data.category,
        amount: data.amount,
        vat_amount: vatAmount,
        vat_rate: data.vat_rate,
        is_deductible: data.is_deductible,
        // Optional fields from schema
        supplier_id: data.supplier_id,
        receipt_url: data.receipt_url,
        supplier_country: supplierCountry
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
            Bon uploaden
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
                        JPG, PNG, WebP (Max. 10MB)
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
            
          </div>
        </CardContent>
      </Card>

      {/* Due Recurring Expenses Carousel */}
      <DueRecurringExpensesCarousel onExpenseCreated={() => {
        // Optionally refresh page or show notification
        console.log('Expenses created from recurring template')
      }} />

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
                  name="vendor_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Leverancier
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Bijv. Albert Heijn, Adobe, Microsoft..."
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Naam van de leverancier/winkel waar je de uitgave deed
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

              
              {/* Fallback Supplier Validation Panel for manual entries */}
              {!ocrResult && form.watch('vendor_name') && (
                <SupplierValidationPanel 
                  vendorName={form.watch('vendor_name')}
                />
              )}

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
                    <Select onValueChange={field.onChange} value={field.value}>
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
                        value={field.value.toString()}
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

              {/* VIES VAT Status Alert */}
              {ocrResult?.extracted_data?.vat_validation_status && ocrResult?.extracted_data?.vat_validation_message && (
                <Alert className={
                  ocrResult.extracted_data.vat_validation_status === 'valid_eu_vat' ? 'border-orange-200 bg-orange-50' :
                  ocrResult.extracted_data.vat_validation_status === 'valid_nl_vat' ? 'border-green-200 bg-green-50' :
                  'border-yellow-200 bg-yellow-50'
                }>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle className="text-sm font-medium">
                    {ocrResult.extracted_data.vat_validation_status === 'valid_eu_vat' && 'BTW Verlegd - EU Leverancier'}
                    {ocrResult.extracted_data.vat_validation_status === 'valid_nl_vat' && 'Nederlandse Leverancier'}
                    {ocrResult.extracted_data.vat_validation_status === 'invalid_vat' && 'Ongeldig BTW Nummer'}
                    {ocrResult.extracted_data.vat_validation_status === 'unknown_vat' && 'Geen BTW Nummer Gevonden'}
                  </AlertTitle>
                  <AlertDescription className="text-sm mt-1">
                    {ocrResult.extracted_data.vat_validation_message}
                  </AlertDescription>
                </Alert>
              )}

              {/* Amount Summary */}
              {watchedAmount > 0 && (
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span>Bedrag excl. BTW:</span>
                      <span>{formatCurrency(watchedAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>
                        {watchedVatRate === -1 
                          ? 'BTW (0, verlegd):' 
                          : `BTW (${Math.round(watchedVatRate * 100)}%):`
                        }
                      </span>
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
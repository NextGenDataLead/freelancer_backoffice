'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
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
import { Label } from '@/components/ui/label'
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
  AlertTriangle,
  Repeat,
  Bot,
  FileText
} from 'lucide-react'
import { CreateExpenseSchema, CreateExpenseWithRecurringSchema, RecurringExpenseConfigSchema } from '@/lib/validations/financial'
import type { ExpenseWithSupplier } from '@/lib/types/financial'
import { z } from 'zod'
import { SupplierValidationPanel } from '@/components/financial/expenses/supplier-validation-panel'
import { DueRecurringExpensesCarousel } from '@/components/financial/expenses/due-recurring-expenses-carousel'
import { cn } from '@/lib/utils'

interface ExpenseFormProps {
  expense?: ExpenseWithSupplier
  onSuccess?: (expense: ExpenseWithSupplier) => void
  onCancel?: () => void
  enableOCR?: boolean
  variant?: 'default' | 'glass'
  defaultRecurring?: boolean
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

export function ExpenseForm({ expense, onSuccess, onCancel, enableOCR = false, variant = 'default', defaultRecurring = false }: ExpenseFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  // Removed suppliers state - using vendor_name instead
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [ocrProcessing, setOcrProcessing] = useState(false)
  const [ocrResult, setOcrResult] = useState<any>(null)
  const [isRecurring, setIsRecurring] = useState(defaultRecurring)
  const [recurringConfig, setRecurringConfig] = useState({
    template_name: '',
    frequency: 'monthly' as 'weekly' | 'monthly' | 'quarterly' | 'yearly',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    day_of_month: undefined as number | undefined,
    amount_escalation_percentage: undefined as number | undefined
  })

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

  // Auto-populate template name from vendor and description when recurring is enabled
  const watchedDescription = form.watch('description')
  const watchedVendorName = form.watch('vendor_name')
  useEffect(() => {
    if (isRecurring && watchedVendorName && watchedDescription) {
      const autoTemplateName = `[${watchedVendorName}] - [${watchedDescription}]`.slice(0, 255)
      setRecurringConfig(prev => ({
        ...prev,
        template_name: autoTemplateName
      }))
    }
  }, [isRecurring, watchedDescription, watchedVendorName])

  // Sync start_date with expense_date
  const watchedExpenseDate = form.watch('expense_date')
  useEffect(() => {
    if (isRecurring && watchedExpenseDate) {
      const dateStr = watchedExpenseDate instanceof Date
        ? watchedExpenseDate.toISOString().split('T')[0]
        : watchedExpenseDate.toString().split('T')[0]
      setRecurringConfig(prev => ({ ...prev, start_date: dateStr }))
    }
  }, [isRecurring, watchedExpenseDate])

  // Calculate VAT amount when amount or rate changes
  const watchedAmount = form.watch('amount')
  const watchedVatRate = form.watch('vat_rate')
  const vatStatus = ocrResult?.extracted_data?.vat_validation_status
  const vatMessage = ocrResult?.extracted_data?.vat_validation_message
  const reverseChargeDetected = Boolean(
    ocrResult?.extracted_data?.reverse_charge_detected_in_text ||
    ocrResult?.extracted_data?.reverse_charge_detected_from_vat ||
    ocrResult?.extracted_data?.suggested_vat_type === 'reverse_charge' ||
    watchedVatRate === -1
  )
  
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
      toast.error('Invalid file type', {
        description: 'Only JPG, PNG, WebP images and PDF documents are allowed for OCR'
      })
      return
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large', {
        description: 'Maximum file size is 10MB'
      })
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
      toast.error('OCR processing failed', {
        description: 'Error processing the receipt. Please try again.'
      })
    } finally {
      setOcrProcessing(false)
    }
  }

  const onSubmit = async (data: z.infer<typeof CreateExpenseSchema>) => {
    setIsSubmitting(true)

    console.log('Form submission data:', data)
    console.log('VAT rate being submitted:', data.vat_rate)
    console.log('Calculated VAT amount:', vatAmount)
    console.log('Is recurring:', isRecurring)

    try {
      // Convert date to YYYY-MM-DD string format for API
      const formattedDate = data.expense_date instanceof Date
        ? data.expense_date.toISOString().split('T')[0]
        : data.expense_date.toString().split('T')[0]

      // Extract supplier country from OCR result if available
      const supplierCountry = ocrResult?.extracted_data?.validated_supplier?.country_code || data.supplier_country

      // Validate recurring config if recurring is enabled (only for new expenses)
      if (!expense && isRecurring) {
        console.log('Recurring config before submission:', recurringConfig)

        // Ensure required fields are present
        if (!recurringConfig.template_name || !recurringConfig.start_date) {
          toast.error('Validation error', {
            description: 'Recurring expense requires a template name and start date'
          })
          return
        }
      }

      // Build expense data based on whether we're creating or updating
      let expenseData: any

      if (expense) {
        // UPDATE: Only send fields that match UpdateExpenseSchema
        expenseData = {
          vendor_name: data.vendor_name,
          expense_date: formattedDate,
          description: data.description,
          category: data.category,
          amount: data.amount,
          vat_amount: vatAmount,
          vat_rate: data.vat_rate,
          is_deductible: data.is_deductible,
          // Optional fields from update schema
          supplier_id: data.supplier_id,
          receipt_url: data.receipt_url
        }
      } else {
        // CREATE: Send full CreateExpenseSchema including recurring config
        expenseData = {
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
          supplier_country: supplierCountry,
          // Recurring configuration
          is_recurring: isRecurring,
          recurring_config: isRecurring ? recurringConfig : undefined
        }
      }

      console.log('Final expense data being sent:', expenseData)

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

      // Show success message for recurring expense creation
      if (isRecurring && result.data?.template_id) {
        console.log('Created expense and recurring template:', {
          expenseId: result.data.id,
          templateId: result.data.template_id
        })
        toast.success('Expense and template created!', {
          description: `Successfully created expense and recurring template (ID: ${result.data.template_id})`
        })
      } else if (isRecurring && !result.data?.template_id) {
        console.warn('Expense created but recurring template was NOT created')
        toast.warning('Partial success', {
          description: 'Expense created, but recurring template could not be created. Check console for details.'
        })
      }

      onSuccess?.(result.data)

      // Reset form if creating new expense
      if (!expense) {
        form.reset()
        setUploadedFile(null)
        setOcrResult(null)
        setIsRecurring(false)
        setRecurringConfig({
          template_name: '',
          frequency: 'monthly',
          start_date: new Date().toISOString().split('T')[0],
          end_date: '',
          day_of_month: undefined,
          amount_escalation_percentage: undefined
        })
      }
    } catch (error) {
      console.error('Expense form error:', error)
      toast.error('Failed to save expense', {
        description: error instanceof Error ? error.message : 'An error occurred'
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

  const isGlass = variant === 'glass'
  const glassCardClass = 'bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-950/80 border-white/10 shadow-[0_30px_80px_rgba(15,23,42,0.45)] backdrop-blur-xl'
  const glassInputClass = 'bg-white/10 border-white/20 text-slate-100 placeholder:text-slate-300 focus-visible:ring-sky-400/60 focus-visible:border-sky-400/60'
  const glassSelectTriggerClass = 'bg-white/10 border-white/20 text-slate-100 hover:bg-white/15'

  return (
    <div
      className={cn(
        'max-w-2xl mx-auto space-y-6',
        isGlass && 'text-slate-100'
      )}
    >
      {/* OCR Upload Card */}
      <Card className={cn('border-dashed border-2', isGlass && `${glassCardClass} border-white/20` )}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Bon uploaden
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-center w-full">
              <label
                className={cn(
                  'flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors',
                  isGlass
                    ? 'border-white/25 bg-white/5 hover:bg-white/10'
                    : 'bg-muted/50 hover:bg-muted/80'
                )}
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {ocrProcessing ? (
                    <>
                      <Loader2 className={cn('w-8 h-8 mb-3 animate-spin', isGlass ? 'text-sky-300' : 'text-muted-foreground')} />
                      <p className={cn('text-sm', isGlass ? 'text-slate-200' : 'text-muted-foreground')}>
                        Bon wordt verwerkt...
                      </p>
                    </>
                  ) : uploadedFile ? (
                    <>
                      <CheckCircle className="w-8 h-8 mb-3 text-green-600" />
                      <p className="text-sm text-muted-foreground">
                        {uploadedFile.name}
                      </p>
                      {ocrResult?.ocr_metadata?.processing_engine && (
                        <div className="mt-2">
                          {ocrResult.ocr_metadata.processing_engine.includes('Phi-3.5-mini') ? (
                            <Badge variant="default" className="bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 gap-1">
                              <Bot className="h-3 w-3" />
                              AI-Enhanced
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              <FileText className="h-3 w-3" />
                              Rule-Based
                            </Badge>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <Upload className={cn('w-8 h-8 mb-3', isGlass ? 'text-sky-300' : 'text-muted-foreground')} />
                      <p className={cn('text-sm', isGlass ? 'text-slate-200' : 'text-muted-foreground')}>
                        <span className="font-semibold">Klik om te uploaden</span> of sleep hier
                      </p>
                      <p className={cn('text-xs', isGlass ? 'text-slate-300/80' : 'text-muted-foreground')}>
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
      <DueRecurringExpensesCarousel
        variant={variant}
        onExpenseCreated={() => {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('expense:created', {
              detail: {
                source: 'recurring_template_form'
              }
            }))
          }
        }}
      />

      {/* Expense Form */}
      <Card className={cn(isGlass && glassCardClass)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Euro className="h-5 w-5" />
            {expense ? 'Uitgave bewerken' : 'Nieuwe uitgave'}
          </CardTitle>
          {ocrResult && (
            <CardDescription className="mt-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs">OCR Verwerking:</span>
                {ocrResult.ocr_metadata?.processing_engine?.includes('Phi-3.5-mini') ? (
                  <Badge variant="default" className="bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 gap-1 text-xs">
                    <Bot className="h-3 w-3" />
                    AI-Enhanced (Paddle LLM)
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <FileText className="h-3 w-3" />
                    Rule-Based (Fallback)
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs">
                  Confidence: {Math.round((ocrResult.confidence || 0) * 100)}%
                </Badge>
              </div>
            </CardDescription>
          )}
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
                          className={cn(isGlass && glassInputClass)}
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
                        <Input type="date" className={cn(isGlass && glassInputClass)} {...field} />
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
                        className={cn('resize-none', isGlass && `${glassInputClass} placeholder:text-slate-300`)}
                        placeholder="Kantoorbenodigdheden voor Q1..."
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
                        <SelectTrigger className={cn(isGlass && glassSelectTriggerClass)}>
                          <SelectValue placeholder="Selecteer categorie" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className={cn(isGlass && 'bg-slate-900/95 text-slate-100 border border-white/10 backdrop-blur-lg')}>
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
                          className={cn(isGlass && glassInputClass)}
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          value={field.value === 0 ? '' : field.value}
                          onChange={(e) => {
                            const value = e.target.value === '' ? 0 : parseFloat(e.target.value)
                            field.onChange(value)
                          }}
                          onFocus={(e) => {
                            // Select all text on focus for easy replacement
                            e.target.select()
                          }}
                          onWheel={(e) => {
                            // Prevent scroll from changing the number
                            e.currentTarget.blur()
                          }}
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
                          <SelectTrigger className={cn(isGlass && glassSelectTriggerClass)}>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className={cn(isGlass && 'bg-slate-900/95 text-slate-100 border border-white/10 backdrop-blur-lg')}>
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
              {(reverseChargeDetected || (vatStatus && vatMessage)) && (
                <Alert className={
                  reverseChargeDetected
                    ? 'border-sky-200 bg-sky-50 text-sky-900'
                    : vatStatus === 'valid_eu_vat'
                    ? 'border-orange-200 bg-orange-50 text-orange-900'
                    : vatStatus === 'valid_nl_vat'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                      : 'border-amber-200 bg-amber-50 text-amber-900'
                }>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle className="text-sm font-medium">
                    {reverseChargeDetected && 'BTW Verlegd - Controleer Leverancier'}
                    {!reverseChargeDetected && vatStatus === 'valid_eu_vat' && 'BTW Verlegd - EU Leverancier'}
                    {!reverseChargeDetected && vatStatus === 'valid_nl_vat' && 'Nederlandse Leverancier'}
                    {!reverseChargeDetected && vatStatus === 'invalid_vat' && 'Ongeldig BTW Nummer'}
                    {!reverseChargeDetected && vatStatus === 'unknown_vat' && 'Geen BTW Nummer Gevonden'}
                  </AlertTitle>
                  <AlertDescription className="text-sm mt-1">
                    {reverseChargeDetected
                      ? 'Factuur vermeldt BTW-verlegging. Controleer of reverse charge van toepassing is en voer geen Nederlandse BTW in.'
                      : vatMessage}
                  </AlertDescription>
                </Alert>
              )}

              {/* Amount Summary */}
              {watchedAmount > 0 && (
                <Card className={cn(isGlass ? 'bg-white/5 border-white/10 backdrop-blur-xl text-slate-100' : 'bg-muted/50')}>
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

              {/* Recurring Expense Toggle - Only show when creating new expense */}
              {!expense && (
                <div className={cn("flex flex-row items-center justify-between rounded-lg border p-4", isGlass && "border-white/20")}>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Repeat className="h-4 w-4" />
                      <span className="text-base font-medium">Maak dit een terugkerende uitgave</span>
                    </div>
                    <p className={cn("text-sm", isGlass ? "text-slate-300" : "text-muted-foreground")}>
                      Automatisch toekomstige uitgaven genereren op basis van dit bedrag
                    </p>
                  </div>
                  <Checkbox
                    checked={isRecurring}
                    onCheckedChange={setIsRecurring}
                  />
                </div>
              )}

              {/* Recurring Configuration Fields */}
              {isRecurring && (
                <Card className={cn("border-dashed", isGlass && `${glassCardClass} border-white/20`)}>
                  <CardHeader>
                    <CardTitle className="text-base">Terugkerende Uitgave Configuratie</CardTitle>
                    <CardDescription className={isGlass ? "text-slate-300" : ""}>
                      {ocrResult ? 'OCR gegevens worden automatisch toegepast op het template' : 'Configureer hoe vaak deze uitgave zich herhaalt'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Template Name */}
                    <div>
                      <Label htmlFor="template_name">Template Naam *</Label>
                      <Input
                        id="template_name"
                        className={cn(isGlass && glassInputClass)}
                        value={recurringConfig.template_name}
                        onChange={(e) => setRecurringConfig(prev => ({ ...prev, template_name: e.target.value }))}
                        placeholder="bijv. Kantoorhuur, Adobe CC"
                      />
                      <p className={cn("text-xs mt-1", isGlass ? "text-slate-300/80" : "text-muted-foreground")}>
                        Wordt automatisch ingevuld vanuit beschrijving
                      </p>
                    </div>

                    {/* Frequency */}
                    <div>
                      <Label htmlFor="frequency">Frequentie *</Label>
                      <Select
                        value={recurringConfig.frequency}
                        onValueChange={(value: any) => setRecurringConfig(prev => ({ ...prev, frequency: value }))}
                      >
                        <SelectTrigger className={cn(isGlass && glassSelectTriggerClass)}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className={cn(isGlass && 'bg-slate-900/95 text-slate-100 border border-white/10 backdrop-blur-lg')}>
                          <SelectItem value="weekly">Wekelijks</SelectItem>
                          <SelectItem value="monthly">Maandelijks</SelectItem>
                          <SelectItem value="quarterly">Kwartaal</SelectItem>
                          <SelectItem value="yearly">Jaarlijks</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* End Date */}
                    <div>
                      <Label htmlFor="end_date">Einddatum (optioneel)</Label>
                      <Input
                        id="end_date"
                        type="date"
                        className={cn(isGlass && glassInputClass)}
                        value={recurringConfig.end_date}
                        onChange={(e) => setRecurringConfig(prev => ({ ...prev, end_date: e.target.value }))}
                      />
                      <p className={cn("text-xs mt-1", isGlass ? "text-slate-300/80" : "text-muted-foreground")}>
                        Laat leeg voor onbepaalde tijd
                      </p>
                    </div>

                    {/* Day of Month (only for monthly) */}
                    {recurringConfig.frequency === 'monthly' && (
                      <div>
                        <Label htmlFor="day_of_month">Dag van de maand (optioneel)</Label>
                        <Input
                          id="day_of_month"
                          type="number"
                          min="1"
                          max="31"
                          className={cn(isGlass && glassInputClass)}
                          value={recurringConfig.day_of_month ?? ''}
                          onChange={(e) => setRecurringConfig(prev => ({
                            ...prev,
                            day_of_month: e.target.value ? parseInt(e.target.value) : undefined
                          }))}
                          placeholder="bijv. 1 voor eerste dag"
                        />
                        <p className={cn("text-xs mt-1", isGlass ? "text-slate-300/80" : "text-muted-foreground")}>
                          Bijvoorbeeld: 1 = eerste dag, 15 = 15e dag
                        </p>
                      </div>
                    )}

                    {/* Annual Escalation */}
                    <div>
                      <Label htmlFor="escalation">Jaarlijkse verhoging % (optioneel)</Label>
                      <Input
                        id="escalation"
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        className={cn(isGlass && glassInputClass)}
                        value={recurringConfig.amount_escalation_percentage ?? ''}
                        onChange={(e) => setRecurringConfig(prev => ({
                          ...prev,
                          amount_escalation_percentage: e.target.value ? parseFloat(e.target.value) : undefined
                        }))}
                        placeholder="bijv. 2.5 voor 2.5% per jaar"
                      />
                      <p className={cn("text-xs mt-1", isGlass ? "text-slate-300/80" : "text-muted-foreground")}>
                        Voor inflatie-aanpassingen of contractuele verhogingen
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

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

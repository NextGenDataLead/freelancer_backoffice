'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { format } from 'date-fns'
import { CalendarIcon, Upload, X, AlertCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { 
  ExpenseType, 
  PaymentMethod, 
  CurrencyCode,
  CreateExpenseRequest,
  ExpenseCategory,
  EXPENSE_TYPE_LABELS,
  PAYMENT_METHOD_LABELS
} from '@/lib/types/expenses'

// Form validation schema with VAT support
const expenseFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().optional(),
  expense_date: z.date({
    required_error: 'Expense date is required',
  }),
  amount: z.number().positive('Amount must be positive').max(999999.99, 'Amount too large'),
  currency: z.enum(['EUR', 'USD', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'SEK', 'NOK', 'DKK']).optional(),
  category_id: z.string().uuid().optional(),
  expense_type: z.enum(['travel', 'meals', 'office_supplies', 'software', 'marketing', 'professional', 'utilities', 'other']),
  payment_method: z.enum(['corporate_card', 'personal_card', 'cash', 'bank_transfer', 'other']),
  
  // VAT/BTW fields
  vat_rate: z.number().min(0).max(1).default(0.21),
  vat_amount: z.number().min(0).default(0),
  vat_type: z.enum(['standard', 'reduced', 'zero', 'exempt', 'reverse_charge']).default('standard'),
  is_vat_deductible: z.boolean().default(true),
  business_percentage: z.number().min(0).max(100).default(100),
  supplier_country_code: z.string().length(2).default('NL'),
  supplier_vat_number: z.string().optional(),
  is_reverse_charge: z.boolean().default(false),
  
  project_code: z.string().max(50).optional(),
  cost_center: z.string().max(50).optional(),
  vendor_name: z.string().max(200).optional(),
  reference_number: z.string().max(100).optional(),
  requires_reimbursement: z.boolean().default(false),
  is_billable: z.boolean().default(false),
  client_id: z.string().uuid().optional(),
  tags: z.array(z.string()).default([]),
})

type ExpenseFormData = z.infer<typeof expenseFormSchema>

interface ExpenseFormProps {
  initialData?: Partial<ExpenseFormData>
  expenseId?: string
  onSuccess?: (expense: any) => void
  onCancel?: () => void
}

export function ExpenseForm({ initialData, expenseId, onSuccess, onCancel }: ExpenseFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [receipts, setReceipts] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      currency: 'EUR',
      expense_date: new Date(),
      requires_reimbursement: false,
      is_billable: false,
      tags: [],
      ...initialData,
    },
  })

  // Fetch expense categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/expense-management/categories')
        if (response.ok) {
          const data = await response.json()
          setCategories(data.categories || [])
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error)
      }
    }

    fetchCategories()
  }, [])

  // Auto-set reimbursement based on payment method
  const paymentMethod = form.watch('payment_method')
  useEffect(() => {
    if (paymentMethod) {
      const requiresReimbursement = paymentMethod !== 'corporate_card'
      form.setValue('requires_reimbursement', requiresReimbursement)
    }
  }, [paymentMethod, form])

  const onSubmit = async (data: ExpenseFormData) => {
    try {
      setIsLoading(true)
      setError(null)

      const expenseData: CreateExpenseRequest = {
        ...data,
        expense_date: format(data.expense_date, 'yyyy-MM-dd'),
      }

      const url = expenseId 
        ? `/api/expense-management/expenses/${expenseId}`
        : '/api/expense-management/expenses'
      
      const method = expenseId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(expenseData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save expense')
      }

      // Upload receipts if any
      if (receipts.length > 0 && result.expense?.id) {
        await uploadReceipts(result.expense.id)
      }

      if (onSuccess) {
        onSuccess(result.expense)
      } else {
        router.push('/dashboard/expense-management')
      }
    } catch (error) {
      console.error('Error saving expense:', error)
      setError(error instanceof Error ? error.message : 'Failed to save expense')
    } finally {
      setIsLoading(false)
    }
  }

  const uploadReceipts = async (expenseId: string) => {
    for (const file of receipts) {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('expense_id', expenseId)

      try {
        const response = await fetch('/api/expense-management/receipts/upload', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          console.error('Failed to upload receipt:', file.name)
        }
      } catch (error) {
        console.error('Error uploading receipt:', error)
      }
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    const validFiles = files.filter(file => {
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf']
      const maxSize = 10 * 1024 * 1024 // 10MB
      return validTypes.includes(file.type) && file.size <= maxSize
    })

    setReceipts(prev => [...prev, ...validFiles])
  }

  const removeReceipt = (index: number) => {
    setReceipts(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>
          {expenseId ? 'Edit Expense' : 'New Expense'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Expense title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expense_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Expense Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the expense..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Amount and Currency */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
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
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                        <SelectItem value="CAD">CAD (C$)</SelectItem>
                        <SelectItem value="AUD">AUD (A$)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="payment_method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Category and Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="expense_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expense Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(EXPENSE_TYPE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
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
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Additional Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="vendor_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor/Merchant</FormLabel>
                    <FormControl>
                      <Input placeholder="Where was this expense made?" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reference_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Receipt/Invoice number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="project_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Code</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional project code" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cost_center"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost Center</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional cost center" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* VAT/BTW Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">BTW/VAT Gegevens</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Business Percentage */}
                <FormField
                  control={form.control}
                  name="business_percentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Zakelijk percentage (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          placeholder="100"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 100)}
                        />
                      </FormControl>
                      <FormDescription>
                        Percentage dat zakelijk gebruikt wordt (100% = volledig zakelijk)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* VAT Type and Rate */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="vat_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>BTW Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecteer BTW type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="standard">Standaard BTW (21%)</SelectItem>
                            <SelectItem value="reduced">Verlaagd BTW (9%)</SelectItem>
                            <SelectItem value="zero">Nul tarief BTW (0%)</SelectItem>
                            <SelectItem value="exempt">BTW-vrijgesteld</SelectItem>
                            <SelectItem value="reverse_charge">BTW verlegd (EU)</SelectItem>
                          </SelectContent>
                        </Select>
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
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="1"
                            placeholder="0.21"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0.21)}
                          />
                        </FormControl>
                        <FormDescription>
                          BTW percentage als decimaal (0.21 = 21%)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Supplier Information for EU Reverse Charge */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="supplier_country_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Leverancier Land</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecteer land" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="NL">Nederland</SelectItem>
                            <SelectItem value="DE">Duitsland</SelectItem>
                            <SelectItem value="BE">België</SelectItem>
                            <SelectItem value="FR">Frankrijk</SelectItem>
                            <SelectItem value="GB">Verenigd Koninkrijk</SelectItem>
                            <SelectItem value="US">Verenigde Staten</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="supplier_vat_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>BTW-nummer Leverancier</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="NL123456789B01"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Vereist voor BTW verlegd (reverse charge)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="is_vat_deductible"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          BTW is aftrekbaar
                        </FormLabel>
                        <FormDescription>
                          Vink aan als de BTW op deze uitgave aftrekbaar is
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Checkboxes */}
            <div className="flex flex-col space-y-4">
              <FormField
                control={form.control}
                name="requires_reimbursement"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Requires Reimbursement
                      </FormLabel>
                      <FormDescription>
                        Check if you paid with personal funds and need reimbursement
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_billable"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Billable to Client
                      </FormLabel>
                      <FormDescription>
                        Check if this expense should be billed to a client
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {/* Receipt Upload */}
            <div className="space-y-4">
              <Label>Receipts</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-2">
                    <label htmlFor="receipt-upload" className="cursor-pointer">
                      <span className="mt-2 block text-sm font-medium text-gray-900">
                        Upload receipts
                      </span>
                      <span className="mt-1 block text-sm text-gray-500">
                        PNG, JPG, GIF up to 10MB
                      </span>
                    </label>
                    <input
                      id="receipt-upload"
                      type="file"
                      multiple
                      accept="image/*,application/pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              {receipts.length > 0 && (
                <div className="space-y-2">
                  {receipts.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm truncate">{file.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeReceipt(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-4">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : expenseId ? 'Update Expense' : 'Create Expense'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
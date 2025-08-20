'use client'

import React, { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  Clock, 
  Calculator,
  User, 
  Calendar, 
  Euro,
  Loader2,
  Building2,
  PlayCircle,
} from 'lucide-react'
import { CreateTimeEntrySchema } from '@/lib/validations/financial'
import type { TimeEntryWithClient, Client } from '@/lib/types/financial'
import { z } from 'zod'

interface UnifiedTimeEntryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  timeEntry?: TimeEntryWithClient
  onSuccess?: (timeEntry: TimeEntryWithClient) => void
  onStartTimer?: (timerData: {
    clientId: string
    clientName: string
    project: string
    description: string
    billable: boolean
    invoiced: boolean
    hourlyRate: number
  }) => void
}

interface ClientOption {
  id: string
  name: string
  company_name?: string
  is_business: boolean
  country_code: string
}

type EntryMode = 'manual' | 'timer'

export function UnifiedTimeEntryDialog({ 
  open, 
  onOpenChange, 
  timeEntry, 
  onSuccess,
  onStartTimer 
}: UnifiedTimeEntryDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [clients, setClients] = useState<ClientOption[]>([])
  const [clientsLoading, setClientsLoading] = useState(true)
  const [entryMode, setEntryMode] = useState<EntryMode>('manual')

  const form = useForm<z.infer<typeof CreateTimeEntrySchema>>({
    resolver: zodResolver(CreateTimeEntrySchema),
    defaultValues: {
      client_id: timeEntry?.client_id || '',
      entry_date: timeEntry?.entry_date || new Date().toISOString().split('T')[0],
      description: timeEntry?.description || '',
      hours: timeEntry?.hours || 0,
      hourly_rate: timeEntry?.hourly_rate || undefined,
      project_name: timeEntry?.project_name || '',
      billable: timeEntry?.billable ?? true,
      invoiced: timeEntry?.invoiced ?? false,
    },
  })

  // Load clients on component mount
  useEffect(() => {
    const fetchClients = async () => {
      try {
        setClientsLoading(true)
        const response = await fetch('/api/clients?limit=100')
        if (response.ok) {
          const data = await response.json()
          setClients(data.data || [])
        } else {
          console.error('Failed to fetch clients:', response.status)
        }
      } catch (error) {
        console.error('Failed to load clients:', error)
      } finally {
        setClientsLoading(false)
      }
    }

    if (open) {
      fetchClients()
    }
  }, [open])

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      if (timeEntry) {
        // Editing existing entry - force manual mode
        setEntryMode('manual')
        form.reset({
          client_id: timeEntry.client_id,
          entry_date: timeEntry.entry_date,
          description: timeEntry.description,
          hours: timeEntry.hours,
          hourly_rate: timeEntry.hourly_rate,
          project_name: timeEntry.project_name,
          billable: timeEntry.billable,
          invoiced: timeEntry.invoiced,
        })
      } else {
        // New entry - allow both modes
        form.reset({
          client_id: '',
          entry_date: new Date().toISOString().split('T')[0],
          description: '',
          hours: undefined, // Don't set to 0, leave undefined to avoid validation
          hourly_rate: undefined,
          project_name: '',
          billable: true,
          invoiced: false,
        })
        setEntryMode('manual')
      }
    }
  }, [open, timeEntry, form])

  const watchedClientId = form.watch('client_id')
  const watchedProjectName = form.watch('project_name')
  const watchedHours = form.watch('hours')
  const watchedHourlyRate = form.watch('hourly_rate')
  const watchedBillable = form.watch('billable')
  const watchedInvoiced = form.watch('invoiced')

  // Calculate total value
  const totalValue = watchedHours && watchedHourlyRate 
    ? Math.round(watchedHours * watchedHourlyRate * 100) / 100
    : 0

  // Separate validation for each mode
  const isManualValid = watchedClientId && 
    watchedHours && watchedHours > 0 && 
    watchedHourlyRate && watchedHourlyRate > 0
    
  const isTimerValid = watchedClientId && 
    watchedHourlyRate && watchedHourlyRate > 0 // Client and hourly rate required for timer
    
  // Check if form is valid for current mode
  const isFormValid = entryMode === 'manual' ? isManualValid : isTimerValid

  const onError = (errors: any) => {
    console.log('=== FORM VALIDATION ERRORS ===')
    console.log('Validation errors:', errors)
    console.log('Form state:', {
      isValid: form.formState.isValid,
      errors: form.formState.errors,
      touchedFields: form.formState.touchedFields,
      dirtyFields: form.formState.dirtyFields
    })
    console.log('Current form values:', form.getValues())
  }

  const onSubmit = async (data: z.infer<typeof CreateTimeEntrySchema>) => {
    console.log('=== FORM SUBMISSION START ===')
    console.log('Mode:', entryMode)
    console.log('Raw form data:', data)
    console.log('Form state:', {
      isValid: form.formState.isValid,
      errors: form.formState.errors,
      isSubmitting: form.formState.isSubmitting
    })
    console.log('Available clients:', clients.length)
    
    // Prevent double submissions using local state instead of form.formState.isSubmitting
    if (isSubmitting) {
      console.log('Local submission already in progress, ignoring...')
      return
    }

    // Custom validation for manual mode - hours and hourly rate are required
    if (entryMode === 'manual') {
      if (!data.hours || data.hours <= 0) {
        form.setError('hours', { 
          type: 'required', 
          message: 'Aantal uren moet groter zijn dan 0 voor handmatige invoer' 
        })
        return
      }
      
      if (!data.hourly_rate || data.hourly_rate <= 0) {
        form.setError('hourly_rate', { 
          type: 'required', 
          message: 'Uurtarief moet groter zijn dan 0 voor handmatige invoer' 
        })
        return
      }
    }
    
    if (entryMode === 'timer') {
      console.log('=== TIMER MODE ===')
      
      // Validate client selection
      if (!data.client_id?.trim()) {
        console.error('ERROR: No client_id in form data!')
        alert('Selecteer eerst een klant voordat je de timer start')
        return
      }
      
      // Validate hourly rate for timer mode
      if (!data.hourly_rate || data.hourly_rate <= 0) {
        form.setError('hourly_rate', { 
          type: 'required', 
          message: 'Uurtarief is verplicht voor de timer' 
        })
        return
      }

      const selectedClient = clients.find(c => c.id === data.client_id)
      console.log('Selected client lookup result:', selectedClient)
      
      if (!selectedClient) {
        console.error('ERROR: Client not found in clients list!')
        console.log('Looking for client ID:', data.client_id)
        console.log('Available client IDs:', clients.map(c => c.id))
        alert('Geselecteerde klant niet gevonden')
        return
      }

      const clientName = selectedClient.company_name || selectedClient.name || ''
      console.log('Resolved client name:', clientName)

      const timerData = {
        clientId: data.client_id,
        clientName,
        project: data.project_name || '',
        description: data.description || '',
        billable: data.billable,
        invoiced: data.invoiced,
        hourlyRate: data.hourly_rate
      }

      console.log('=== STARTING TIMER ===')
      console.log('Timer data:', timerData)

      if (onStartTimer) {
        onStartTimer(timerData)
        console.log('Timer callback executed')
      } else {
        console.error('ERROR: onStartTimer callback is missing!')
      }

      console.log('Closing dialog...')
      onOpenChange(false)
      return
    }

    // Manual mode - save immediately
    setIsSubmitting(true)
    try {
      const url = timeEntry ? `/api/time-entries/${timeEntry.id}` : '/api/time-entries'
      const method = timeEntry ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || `Failed to ${timeEntry ? 'update' : 'create'} time entry`)
      }

      const result = await response.json()
      onSuccess?.(result.data)
      onOpenChange(false)

    } catch (error) {
      console.error('Time entry form error:', error)
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {timeEntry ? 'Tijdregistratie bewerken' : 'Nieuwe tijdregistratie'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Entry Mode Selection - Only for new entries */}
          {!timeEntry && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Hoe wil je tijd registreren?</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup 
                  value={entryMode} 
                  onValueChange={(value: EntryMode) => {
                    console.log('=== MODE SWITCH ===')
                    console.log('Switching from', entryMode, 'to', value)
                    console.log('Form state before reset:', {
                      isValid: form.formState.isValid,
                      isSubmitting: form.formState.isSubmitting,
                      errors: Object.keys(form.formState.errors || {})
                    })
                    
                    // Get current form values to preserve them
                    const currentValues = form.getValues()
                    
                    // Reset form completely to clear isSubmitting state
                    form.reset(currentValues, {
                      keepDefaultValues: true,
                      keepErrors: false,
                      keepDirty: false,
                      keepIsSubmitted: false,
                      keepTouched: false,
                      keepIsValid: false,
                      keepSubmitCount: false
                    })
                    
                    setEntryMode(value)
                    console.log('Mode switched to:', value)
                    
                    // Verify state after reset
                    setTimeout(() => {
                      console.log('Form state after mode switch:', {
                        isValid: form.formState.isValid,
                        isSubmitting: form.formState.isSubmitting,
                        errors: Object.keys(form.formState.errors || {})
                      })
                    }, 100)
                  }}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="manual" id="manual" />
                    <Label htmlFor="manual" className="flex items-center gap-2 cursor-pointer">
                      <Calculator className="h-4 w-4" />
                      Handmatig invoeren
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="timer" id="timer" />
                    <Label htmlFor="timer" className="flex items-center gap-2 cursor-pointer">
                      <Clock className="h-4 w-4" />
                      Met timer
                    </Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>
          )}

          {/* Time Entry Form */}
          <Card>
            <CardContent className="p-6">
              <Form {...form}>
                <form 
                  onSubmit={form.handleSubmit(onSubmit, onError)}
                  className="space-y-6"
                  onSubmitCapture={(e) => {
                    console.log('=== FORM SUBMIT CAPTURED ===')
                    console.log('Event target:', e.target)
                    console.log('Form data check:', Object.fromEntries(new FormData(e.target as HTMLFormElement)))
                  }}
                >
                  {/* Client and Date */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="client_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            Klant <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecteer klant" />
                              </SelectTrigger>
                              <SelectContent>
                                {clientsLoading ? (
                                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                    Laden van klanten...
                                  </div>
                                ) : clients.length === 0 ? (
                                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                    Geen klanten gevonden
                                  </div>
                                ) : (
                                  clients.map((client) => (
                                    <SelectItem key={client.id} value={client.id}>
                                      {client.company_name || client.name}
                                      {client.company_name && client.name && (
                                        <span className="text-muted-foreground ml-2">({client.name})</span>
                                      )}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="entry_date"
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

                  {/* Project Name */}
                  <FormField
                    control={form.control}
                    name="project_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project naam (optioneel)</FormLabel>
                        <FormControl>
                          <Input placeholder="Website ontwikkeling..." {...field} />
                        </FormControl>
                        <FormDescription>
                          Voor betere organisatie van je tijdregistraties
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Description */}
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Beschrijving (optioneel)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Wat heb je gedaan tijdens deze tijd?"
                            className="resize-none"
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Hours and Rate Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Hours Field - Manual mode or with overlay for timer mode */}
                    <div className="relative">
                      <FormField
                        control={form.control}
                        name="hours"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Aantal uren 
                              {entryMode === 'manual' && <span className="text-red-500">*</span>}
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                step="0.25"
                                placeholder="0.00"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                disabled={entryMode === 'timer'}
                              />
                            </FormControl>
                            <FormDescription>
                              {entryMode === 'timer' 
                                ? 'Uren worden automatisch berekend door de timer'
                                : 'Voer het aantal gewerkte uren in'
                              }
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {/* Timer mode overlay - only covers hours field */}
                      {entryMode === 'timer' && (
                        <div className="absolute inset-0 bg-blue-50/80 dark:bg-blue-900/40 rounded-md flex items-center justify-center backdrop-blur-sm">
                          <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200 bg-white/90 dark:bg-slate-800/90 px-3 py-1.5 rounded-md text-sm font-medium">
                            <Clock className="h-4 w-4" />
                            Timer mode actief
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Rate Field - Always shown */}
                    <FormField
                      control={form.control}
                      name="hourly_rate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1">
                            <Euro className="h-3 w-3" />
                            Uurtarief
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                            />
                          </FormControl>
                          <FormDescription>
                            Laat leeg om standaard tarief te gebruiken
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Timer Mode Info */}
                  {entryMode === 'timer' && (
                    <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                          <Clock className="h-4 w-4" />
                          <span className="text-sm font-medium">
                            De timer wordt gestart zodra je op "Start Timer" klikt
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Total Value Display - Only for manual mode */}
                  {entryMode === 'manual' && totalValue > 0 && (
                    <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Calculator className="h-4 w-4 text-green-600 dark:text-green-400" />
                            <span className="text-sm font-medium text-green-800 dark:text-green-200">
                              Totale waarde:
                            </span>
                          </div>
                          <span className="text-lg font-bold text-green-600 dark:text-green-400">
                            {formatCurrency(totalValue)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Billable and Invoiced Options */}
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="billable"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Factureerbaar</FormLabel>
                            <FormDescription>
                              Kan deze tijd gefactureerd worden aan de klant?
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

                    {watchedBillable && (
                      <FormField
                        control={form.control}
                        name="invoiced"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Al gefactureerd</FormLabel>
                              <FormDescription>
                                Is deze tijd al opgenomen in een factuur?
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
                    )}
                  </div>

                  {/* Form Actions */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      type="submit"
                      disabled={isSubmitting || !isFormValid}
                      className="flex-1"
                    >
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {entryMode === 'timer' ? (
                        <>
                          <PlayCircle className="h-4 w-4 mr-2" />
                          Start Timer
                        </>
                      ) : (
                        timeEntry ? 'Tijd bijwerken' : 'Tijd registreren'
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onOpenChange(false)}
                      disabled={isSubmitting}
                    >
                      Annuleren
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
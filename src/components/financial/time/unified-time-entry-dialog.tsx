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
  Calculator,
  User,
  Calendar,
  Euro,
  Loader2,
  Building2,
  FolderOpen,
  Lock
} from 'lucide-react'
import { CreateTimeEntrySchema } from '@/lib/validations/financial'
import type { TimeEntryWithClient, Client } from '@/lib/types/financial'
import { z } from 'zod'
import { format } from 'date-fns'

interface UnifiedTimeEntryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  timeEntry?: TimeEntryWithClient
  selectedDate?: Date
  calendarMode?: boolean
  onSuccess?: (timeEntry: TimeEntryWithClient) => void
  onStartTimer?: (timerData: {
    clientId: string
    clientName: string
    projectId: string
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
  hourly_rate?: number
}

interface ProjectOption {
  id: string
  name: string
  description?: string
  client_id: string
  hourly_rate?: number
  active: boolean
}


export function UnifiedTimeEntryDialog({
  open,
  onOpenChange,
  timeEntry,
  selectedDate,
  calendarMode = false,
  onSuccess,
  onStartTimer
}: UnifiedTimeEntryDialogProps) {

  // Check if this is an invoiced time entry that should not be editable
  const isInvoicedEntry = timeEntry && (timeEntry.invoiced || timeEntry.invoice_id)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [clients, setClients] = useState<ClientOption[]>([])
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [filteredProjects, setFilteredProjects] = useState<ProjectOption[]>([])
  const [clientsLoading, setClientsLoading] = useState(true)

  const form = useForm<z.infer<typeof CreateTimeEntrySchema>>({
    resolver: zodResolver(CreateTimeEntrySchema),
    defaultValues: {
      client_id: timeEntry?.client_id || '',
      project_id: timeEntry?.project_id || '',
      entry_date: timeEntry?.entry_date || 
                  (selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')),
      description: timeEntry?.description || '',
      hours: timeEntry?.hours || 0,
      hourly_rate: timeEntry?.hourly_rate || undefined,
      project_name: timeEntry?.project_name || '',
      billable: timeEntry?.billable ?? true,
      invoiced: timeEntry?.invoiced ?? false,
    },
  })

  // Load clients and projects on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setClientsLoading(true)
        
        // Fetch clients
        const clientsResponse = await fetch('/api/clients?limit=100&active=true')
        if (clientsResponse.ok) {
          const clientsData = await clientsResponse.json()
          setClients(clientsData.data || [])
        } else {
          console.error('Failed to fetch clients:', clientsResponse.status)
        }

        // Fetch projects
        console.log('Fetching projects from:', '/api/projects?limit=100&active=true')
        const projectsResponse = await fetch('/api/projects?limit=100&active=true')
        console.log('Projects response status:', projectsResponse.status, projectsResponse.statusText)
        console.log('Projects response headers:', Object.fromEntries(projectsResponse.headers.entries()))

        if (projectsResponse.ok) {
          const projectsText = await projectsResponse.text()
          console.log('Projects response length:', projectsText.length)
          console.log('Projects response preview:', projectsText.substring(0, 200))

          try {
            const projectsData = JSON.parse(projectsText)
            console.log('Successfully parsed projects data:', projectsData)
            setProjects(projectsData.data || [])
          } catch (jsonError) {
            console.error('Failed to parse projects JSON:', jsonError)
            console.error('Full response text:', projectsText)
          }
        } else {
          const errorText = await projectsResponse.text()
          console.error('Failed to fetch projects:', projectsResponse.status, projectsResponse.statusText)
          console.error('Error response:', errorText)
        }
      } catch (error) {
        console.error('Failed to load data:', error)
      } finally {
        setClientsLoading(false)
      }
    }

    if (open) {
      fetchData()
    }
  }, [open])

  // Reset form when dialog opens/closes - wait for data to load
  useEffect(() => {
    if (open && !clientsLoading && projects.length > 0) {
      if (timeEntry) {
        // Editing existing entry
        console.log('Setting up edit form for timeEntry:', timeEntry)
        console.log('Available projects:', projects)
        console.log('Client ID from timeEntry:', timeEntry.client_id)
        console.log('Project ID from timeEntry:', timeEntry.project_id)

        const formData = {
          client_id: timeEntry.client_id,
          project_id: timeEntry.project_id || '',
          entry_date: timeEntry.entry_date,
          description: timeEntry.description,
          hours: timeEntry.hours,
          hourly_rate: timeEntry.hourly_rate,
          project_name: timeEntry.project_name,
          billable: timeEntry.billable,
          invoiced: timeEntry.invoiced,
        }
        console.log('Form data being set:', formData)
        form.reset(formData)
      } else {
        // New entry
        const defaultDate = selectedDate
          ? format(selectedDate, 'yyyy-MM-dd')
          : format(new Date(), 'yyyy-MM-dd')

        form.reset({
          client_id: '',
          project_id: '',
          entry_date: defaultDate,
          description: '',
          hours: undefined, // Don't set to 0, leave undefined to avoid validation
          hourly_rate: undefined,
          project_name: '',
          billable: true,
          invoiced: false,
        })
      }
    }
  }, [open, timeEntry, form, clientsLoading, projects.length])

  const watchedClientId = form.watch('client_id')
  const watchedProjectId = form.watch('project_id')
  const watchedProjectName = form.watch('project_name')
  const watchedHours = form.watch('hours')
  const watchedHourlyRate = form.watch('hourly_rate')
  const watchedBillable = form.watch('billable')
  const watchedInvoiced = form.watch('invoiced')

  // Update filtered projects when client changes
  useEffect(() => {
    console.log('Projects filtering effect triggered')
    console.log('watchedClientId:', watchedClientId)
    console.log('watchedProjectId:', watchedProjectId)
    console.log('all projects:', projects)

    if (watchedClientId) {
      const clientProjects = projects.filter(p => p.client_id === watchedClientId)
      console.log('Filtered projects for client:', clientProjects)
      setFilteredProjects(clientProjects)

      // Clear project selection if current project doesn't belong to selected client
      if (watchedProjectId) {
        const selectedProject = projects.find(p => p.id === watchedProjectId)
        console.log('Found selected project:', selectedProject)
        if (!selectedProject || selectedProject.client_id !== watchedClientId) {
          console.log('Clearing project selection - project not found or wrong client')
          form.setValue('project_id', '')
        } else {
          console.log('Project selection is valid, keeping it')
        }
      }
    } else {
      console.log('No client selected, clearing projects')
      setFilteredProjects([])
      form.setValue('project_id', '')
    }
  }, [watchedClientId, watchedProjectId, projects, form])

  // Calculate effective hourly rate (project-first, then client)
  const getEffectiveHourlyRate = () => {
    if (watchedProjectId) {
      const project = projects.find(p => p.id === watchedProjectId)
      if (project?.hourly_rate) return project.hourly_rate
    }
    
    if (watchedClientId) {
      const client = clients.find(c => c.id === watchedClientId)
      if (client?.hourly_rate) return client.hourly_rate
    }
    
    return null
  }

  // Calculate total value using effective hourly rate
  const effectiveHourlyRate = getEffectiveHourlyRate()
  const totalValue = watchedHours && effectiveHourlyRate 
    ? Math.round(watchedHours * effectiveHourlyRate * 100) / 100
    : 0

  // Form validation - requires client, project, hours, and hourly rate
  const isFormValid = watchedClientId &&
    watchedProjectId &&
    watchedHours && watchedHours > 0 &&
    effectiveHourlyRate && effectiveHourlyRate > 0

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

    // Validate client and project selection
    if (!data.client_id?.trim()) {
      console.error('ERROR: No client_id in form data!')
      alert('Selecteer eerst een klant')
      return
    }

    if (!data.project_id?.trim()) {
      console.error('ERROR: No project_id in form data!')
      alert('Selecteer eerst een project')
      return
    }

    // Get effective hourly rate and set it in the data
    const effectiveRate = getEffectiveHourlyRate()
    if (!effectiveRate || effectiveRate <= 0) {
      alert('Geen geldig uurtarief gevonden voor het geselecteerde project of klant')
      return
    }

    // Validate hours are required
    if (!data.hours || data.hours <= 0) {
      form.setError('hours', {
        type: 'required',
        message: 'Aantal uren moet groter zijn dan 0'
      })
      return
    }

    // Save time entry
    setIsSubmitting(true)
    try {
      // Set the effective hourly rate from the selected project/client
      const submissionData = {
        ...data,
        hourly_rate: effectiveRate
      }

      const url = timeEntry ? `/api/time-entries/${timeEntry.id}` : '/api/time-entries'
      const method = timeEntry ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData)
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
            {calendarMode ? <Calendar className="h-5 w-5" /> : <User className="h-5 w-5" />}
            {timeEntry ? 'Tijdregistratie bewerken' : calendarMode ? 'Nieuwe tijdregistratie voor kalender' : 'Nieuwe tijdregistratie'}
          </DialogTitle>
          {calendarMode && selectedDate && (
            <p className="text-sm text-muted-foreground">
              Datum: {selectedDate.toLocaleDateString('nl-NL', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          )}
        </DialogHeader>

        {/* Show error message for invoiced entries */}
        {isInvoicedEntry && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
              <Lock className="h-5 w-5" />
              <span className="font-medium">Tijdregistratie kan niet worden bewerkt</span>
            </div>
            <p className="text-sm text-red-700 dark:text-red-300 mt-2">
              Deze tijdregistratie is reeds gefactureerd en kan daarom niet meer worden gewijzigd.
              {timeEntry?.invoice_id && ` (Factuur: ${timeEntry.invoice_id})`}
            </p>
            <div className="mt-4">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="w-full"
              >
                Sluiten
              </Button>
            </div>
          </div>
        )}

        {/* Only show the form if this is not an invoiced entry */}
        {!isInvoicedEntry && (
          <div className="space-y-6">

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
                            Datum {calendarMode && <span className="text-xs text-muted-foreground">(vooringevuld)</span>}
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="date" 
                              {...field} 
                              disabled={calendarMode}
                              className={calendarMode ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800" : ""}
                            />
                          </FormControl>
                          <FormDescription>
                            {calendarMode 
                              ? 'Datum is automatisch ingesteld vanuit de kalender' 
                              : 'Selecteer de datum waarop de tijd is gewerkt'
                            }
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Project Selection */}
                  <FormField
                    control={form.control}
                    name="project_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <FolderOpen className="h-4 w-4" />
                          Project <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value}
                            disabled={!watchedClientId || filteredProjects.length === 0}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={
                                !watchedClientId 
                                  ? "Selecteer eerst een klant" 
                                  : filteredProjects.length === 0
                                    ? "Geen projecten beschikbaar"
                                    : "Selecteer project"
                              } />
                            </SelectTrigger>
                            <SelectContent>
                              {filteredProjects.map((project) => (
                                <SelectItem key={project.id} value={project.id}>
                                  <div className="flex flex-col">
                                    <span>{project.name}</span>
                                    {project.description && (
                                      <span className="text-xs text-muted-foreground">
                                        {project.description}
                                      </span>
                                    )}
                                    {project.hourly_rate && (
                                      <span className="text-xs text-green-600">
                                        €{project.hourly_rate.toFixed(2)}/uur
                                      </span>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormDescription>
                          Kies een project voor deze tijdregistratie. Het uurtarief wordt automatisch bepaald door het project.
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
                    <FormField
                      control={form.control}
                      name="hours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Aantal uren <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="0.25"
                              placeholder="0.00"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormDescription>
                            Voer het aantal gewerkte uren in
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Rate Field - Read-only, derived from project */}
                    <FormItem>
                      <FormLabel className="flex items-center gap-1">
                        <Euro className="h-3 w-3" />
                        Uurtarief
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          value={(() => {
                            const effectiveRate = getEffectiveHourlyRate()
                            return effectiveRate ? `€${effectiveRate.toFixed(2)}` : 'Geen tarief ingesteld'
                          })()}
                          disabled
                          className="bg-muted"
                        />
                      </FormControl>
                      <FormDescription>
                        Automatisch bepaald door het geselecteerde project
                      </FormDescription>
                    </FormItem>
                  </div>

                  {/* Total Value Display */}
                  {totalValue > 0 && (
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
                      {timeEntry ? 'Tijd bijwerken' : 'Tijd registreren'}
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
        )}
      </DialogContent>
    </Dialog>
  )
}
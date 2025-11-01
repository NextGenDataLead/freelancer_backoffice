'use client'

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
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
  Clock, 
  User, 
  Calendar, 
  Euro,
  Loader2,
  Calculator,
  Building2,
  PlayCircle,
  PauseCircle,
  FolderOpen,
  Info
} from 'lucide-react'
import { CreateTimeEntrySchema } from '@/lib/validations/financial'
import type { TimeEntryWithClient, Client } from '@/lib/types/financial'
import { z } from 'zod'
import { getCurrentDate } from '../../../../lib/current-date'

interface TimeEntryFormProps {
  timeEntry?: TimeEntryWithClient
  onSuccess?: (timeEntry: TimeEntryWithClient) => void
  onCancel?: () => void
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

export function TimeEntryForm({ timeEntry, onSuccess, onCancel }: TimeEntryFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [clients, setClients] = useState<ClientOption[]>([])
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [filteredProjects, setFilteredProjects] = useState<ProjectOption[]>([])
  const [isTracking, setIsTracking] = useState(false)
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [entryMode, setEntryMode] = useState<'timer' | 'manual'>('manual')

  const form = useForm<z.infer<typeof CreateTimeEntrySchema>>({
    resolver: zodResolver(CreateTimeEntrySchema),
    defaultValues: {
      client_id: timeEntry?.client_id || '',
      project_id: timeEntry?.project_id || '',
      entry_date: timeEntry?.entry_date || getCurrentDate().toISOString().split('T')[0],
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
        // Fetch clients
        const clientsResponse = await fetch('/api/clients?limit=100&active=true')
        if (clientsResponse.ok) {
          const clientsData = await clientsResponse.json()
          setClients(clientsData.data || [])
        }

        // Fetch projects
        const projectsResponse = await fetch('/api/projects?limit=100&active=true')
        if (projectsResponse.ok) {
          const projectsData = await projectsResponse.json()
          setProjects(projectsData.data || [])
        }
      } catch (error) {
        console.error('Failed to load data:', error)
      }
    }

    fetchData()
  }, [])

  // Timer functionality
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isTracking && startTime && entryMode === 'timer') {
      interval = setInterval(() => {
        const now = getCurrentDate()
        const elapsedSeconds = (now.getTime() - startTime.getTime()) / 1000
        const elapsedHours = elapsedSeconds / 3600 // Convert to hours
        setElapsedTime(elapsedHours)
        form.setValue('hours', Math.round(elapsedHours * 100) / 100) // Round to 2 decimal places
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isTracking, startTime, entryMode, form])

  // Update filtered projects when client changes
  const watchedClientId = form.watch('client_id')
  const watchedProjectId = form.watch('project_id')
  
  useEffect(() => {
    if (watchedClientId) {
      const clientProjects = projects.filter(p => p.client_id === watchedClientId)
      setFilteredProjects(clientProjects)
      
      // Clear project selection if current project doesn't belong to selected client
      if (watchedProjectId) {
        const selectedProject = projects.find(p => p.id === watchedProjectId)
        if (!selectedProject || selectedProject.client_id !== watchedClientId) {
          form.setValue('project_id', '')
        }
      }
    } else {
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

  const startTimer = () => {
    // Validate required fields before starting timer
    const currentClientId = form.getValues('client_id')
    const currentProjectId = form.getValues('project_id')

    if (!currentClientId) {
      toast.error('Validation error', {
        description: 'Please select a client before starting the timer'
      })
      return
    }

    if (!currentProjectId) {
      toast.error('Validation error', {
        description: 'Please select a project before starting the timer'
      })
      return
    }
    
    const currentDescription = form.getValues('description')
    if (!currentDescription || currentDescription.trim() === '') {
      toast.error('Validation error', {
        description: 'Please enter a description before starting the timer'
      })
      return
    }
    
    setStartTime(getCurrentDate())
    setIsTracking(true)
    setElapsedTime(0)
  }

  const pauseTimer = () => {
    setIsTracking(false)
    // Keep the startTime and elapsedTime for potential resume
    if (startTime) {
      const now = getCurrentDate()
      const totalHours = (now.getTime() - startTime.getTime()) / 1000 / 3600
      const finalHours = Math.round(totalHours * 100) / 100
      setElapsedTime(finalHours)
      form.setValue('hours', finalHours)
    }
  }

  const resumeTimer = () => {
    // Resume from where we left off
    const now = getCurrentDate()
    const currentHours = form.getValues('hours') || 0
    // Set start time accounting for already elapsed time
    setStartTime(new Date(now.getTime() - (currentHours * 3600 * 1000)))
    setIsTracking(true)
  }

  const formatTime = (hours: number) => {
    const h = Math.floor(hours)
    const m = Math.floor((hours - h) * 60)
    const s = Math.floor(((hours - h) * 60 - m) * 60)
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  // Calculate total value using effective hourly rate
  const watchedHours = form.watch('hours')
  const effectiveHourlyRate = getEffectiveHourlyRate()
  
  const totalValue = watchedHours && effectiveHourlyRate 
    ? Math.round(watchedHours * effectiveHourlyRate * 100) / 100
    : 0

  // Check if timer can be started
  const canStartTimer = watchedClientId && watchedProjectId && form.watch('description')?.trim()

  const onSubmit = async (data: z.infer<typeof CreateTimeEntrySchema>) => {
    setIsSubmitting(true)

    try {
      // Set the effective hourly rate from the selected project/client
      const effectiveRate = getEffectiveHourlyRate()
      const submissionData = {
        ...data,
        hourly_rate: effectiveRate || undefined
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

      // Reset form if creating new time entry
      if (!timeEntry) {
        form.reset()
        setIsTracking(false)
        setStartTime(null)
        setElapsedTime(0)
      }
    } catch (error) {
      console.error('Time entry form error:', error)
      toast.error('Failed to save time entry', {
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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Entry Mode Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Hoe wil je tijd registreren?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button
              type="button"
              variant={entryMode === 'timer' ? 'default' : 'outline'}
              onClick={() => setEntryMode('timer')}
              className="flex-1"
            >
              <Clock className="h-4 w-4 mr-2" />
              Met Timer
            </Button>
            <Button
              type="button"
              variant={entryMode === 'manual' ? 'default' : 'outline'}
              onClick={() => {
                setEntryMode('manual')
                if (isTracking) {
                  pauseTimer()
                }
              }}
              className="flex-1"
            >
              <Calculator className="h-4 w-4 mr-2" />
              Handmatig Invoeren
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Timer Card - Only show in timer mode */}
      {entryMode === 'timer' && (
        <Card className="border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
              <Clock className="h-5 w-5" />
              Tijdregistratie Timer
            </CardTitle>
          </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-mono font-bold">
                {formatTime(isTracking ? elapsedTime : watchedHours || 0)}
              </div>
              <p className="text-sm text-muted-foreground">
                {isTracking 
                  ? 'Actief bezig...' 
                  : elapsedTime > 0 
                    ? 'Gepauzeerd - klik Hervatten om door te gaan'
                    : canStartTimer 
                      ? 'Klaar om te starten' 
                      : 'Selecteer klant, project en voeg beschrijving toe om te starten'
                }
              </p>
            </div>
            
            <div className="flex gap-2">
              {!isTracking ? (
                <>
                  <Button 
                    type="button"
                    onClick={startTimer}
                    disabled={!canStartTimer || (elapsedTime > 0)}
                    className={canStartTimer && elapsedTime === 0 ? "bg-green-600 hover:bg-green-700" : ""}
                  >
                    <PlayCircle className="h-4 w-4 mr-2" />
                    Start
                  </Button>
                  {elapsedTime > 0 && (
                    <Button 
                      type="button"
                      onClick={resumeTimer}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <PlayCircle className="h-4 w-4 mr-2" />
                      Hervatten
                    </Button>
                  )}
                </>
              ) : (
                <Button 
                  type="button"
                  onClick={pauseTimer}
                  variant="outline"
                  className="border-orange-500 text-orange-600 hover:bg-orange-50"
                >
                  <PauseCircle className="h-4 w-4 mr-2" />
                  Pauzeer
                </Button>
              )}
            </div>
          </div>
        </CardContent>
        </Card>
      )}

      {/* Time Entry Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {timeEntry ? 'Tijdregistratie bewerken' : 'Nieuwe tijdregistratie'}
          </CardTitle>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecteer klant" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clients.length === 0 ? (
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
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      disabled={!watchedClientId || filteredProjects.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={
                            !watchedClientId 
                              ? "Selecteer eerst een klant" 
                              : filteredProjects.length === 0
                                ? "Geen projecten beschikbaar"
                                : "Selecteer project"
                          } />
                        </SelectTrigger>
                      </FormControl>
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
                    <FormLabel>Beschrijving</FormLabel>
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

              {/* Effective Hourly Rate Display */}
              {(watchedClientId || watchedProjectId) && (
                <div className="rounded-lg border p-4 bg-muted/50">
                  <div className="flex items-center gap-2 text-sm font-medium mb-2">
                    <Info className="h-4 w-4 text-muted-foreground" />
                    <span>Effectief Uurtarief</span>
                  </div>
                  <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                    {(() => {
                      const effectiveRate = getEffectiveHourlyRate()
                      if (!effectiveRate) {
                        return (
                          <span className="text-orange-600 dark:text-orange-400">
                            Geen tarief ingesteld
                          </span>
                        )
                      }
                      return (
                        <div className="flex items-center gap-2">
                          <span>€{effectiveRate.toFixed(2)}</span>
                          <span className="text-xs text-muted-foreground font-normal">
                            ({form.watch('hourly_rate') ? 'handmatig' : 
                              watchedProjectId && projects.find(p => p.id === watchedProjectId)?.hourly_rate ? 'project' : 'klant'})
                          </span>
                        </div>
                      )
                    })()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Dit tarief wordt gebruikt voor berekeningen tenzij je handmatig een tarief invoert
                  </div>
                </div>
              )}

              {/* Hours and Rate */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="hours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Aantal uren</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.25"
                          placeholder="0.00"
                          disabled={entryMode === 'timer'}
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        {entryMode === 'timer' ? (isTracking ? 'Timer is actief' : 'Gebruik de timer om tijd te registreren') : 'Handmatig invoeren mogelijk'}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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

                {form.watch('billable') && (
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
                  disabled={isSubmitting || (entryMode === 'timer' && isTracking)}
                  className="flex-1"
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {timeEntry ? 'Tijd bijwerken' : 'Tijd registreren'}
                </Button>

                {onCancel && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={isSubmitting || isTracking}
                  >
                    Annuleren
                  </Button>
                )}
              </div>

              {(entryMode === 'timer' && isTracking) && (
                <div className="text-center">
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Pauzeer de timer eerst voordat je het formulier kunt versturen
                  </p>
                </div>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
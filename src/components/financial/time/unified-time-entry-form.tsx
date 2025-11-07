'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Play, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { getCurrentDate } from '@/lib/current-date'
import { toast } from 'sonner'
import type { TimeEntryWithClient } from '@/lib/types/financial'

interface Client {
  id: string
  name: string
  company_name?: string
  hourly_rate?: number
}

interface Project {
  id: string
  name: string
  client_id: string
  hourly_rate?: number
}

interface TimerData {
  clientId: string
  clientName: string
  projectId: string
  project: string
  description: string
  hourlyRate: number
  selectedDate?: Date
}

interface UnifiedTimeEntryFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'timer' | 'quick' | 'calendar' | 'new' | 'edit'
  selectedDate?: Date
  timeEntry?: TimeEntryWithClient | null
  onSuccess?: (timeEntry: any) => void
  onStartTimer?: (timerData: TimerData) => void
  clients?: Client[] // Optional: pass clients from parent to avoid refetching
}

export function UnifiedTimeEntryForm({
  open,
  onOpenChange,
  mode,
  selectedDate,
  timeEntry,
  onSuccess,
  onStartTimer,
  clients: propClients
}: UnifiedTimeEntryFormProps) {
  // State
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedClientId, setSelectedClientId] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [description, setDescription] = useState('')
  const [hours, setHours] = useState<number>(1.0)
  const [hourlyRate, setHourlyRate] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [clientsLoading, setClientsLoading] = useState(true)
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [entryDate, setEntryDate] = useState<string>(format(getCurrentDate(), 'yyyy-MM-dd'))

  const isEditMode = mode === 'edit' && !!timeEntry

  // Determine if hours field should be visible
  const showHoursField = mode !== 'timer'

  // Determine button text
  const buttonText = mode === 'timer'
    ? 'Start Timer'
    : isEditMode
      ? 'Save Changes'
      : 'Register Time'

  // Determine dialog title
  const getDialogTitle = () => {
    if (isEditMode) return 'Edit Time Entry'
    if (mode === 'timer') return 'Start Timer'
    if (mode === 'calendar' && selectedDate) {
      return `Register time for ${selectedDate.toLocaleDateString('en-US')}`
    }
    if (mode === 'quick') return 'Quick Registration'
    return 'New Time Registration'
  }

  // Load clients when dialog opens
  useEffect(() => {
    const fetchClients = async () => {
      if (!open) return

      // If clients were passed as props, use them instead of fetching
      if (propClients && propClients.length > 0) {
        setClients(propClients)
        setClientsLoading(false)
        return
      }

      // Otherwise fetch from API
      try {
        setClientsLoading(true)
        const clientsResponse = await fetch('/api/clients?limit=100&active=true')

        if (clientsResponse.ok) {
          const clientsData = await clientsResponse.json()
          setClients(clientsData.data || [])
        } else {
          console.error('Failed to fetch clients:', clientsResponse.status)
        }
      } catch (error) {
        console.error('Failed to fetch clients:', error)
      } finally {
        setClientsLoading(false)
      }
    }

    fetchClients()
  }, [open, propClients])

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setSelectedClientId('')
      setSelectedProjectId('')
      setDescription('')
      setHours(1.0)
      setHourlyRate(0)
      setProjects([])
      setEntryDate(format(getCurrentDate(), 'yyyy-MM-dd'))
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    if (mode === 'calendar' && selectedDate) {
      setEntryDate(format(selectedDate, 'yyyy-MM-dd'))
      return
    }

    if (isEditMode && timeEntry?.entry_date) {
      const dateValue =
        typeof timeEntry.entry_date === 'string'
          ? timeEntry.entry_date
          : format(timeEntry.entry_date, 'yyyy-MM-dd')
      setEntryDate(dateValue)
      return
    }

    setEntryDate(format(getCurrentDate(), 'yyyy-MM-dd'))
  }, [open, mode, selectedDate, isEditMode, timeEntry])

  useEffect(() => {
    if (!open || !isEditMode || !timeEntry) return

    const clientId = timeEntry.client_id ?? ''
    setSelectedClientId(clientId)
    setSelectedProjectId(timeEntry.project_id ?? '')
    setDescription(timeEntry.description || '')

    const parsedHours =
      typeof timeEntry.hours === 'number'
        ? timeEntry.hours
        : parseFloat(String(timeEntry.hours ?? '0')) || 0
    setHours(parsedHours)

    const rateSource =
      typeof timeEntry.hourly_rate === 'number'
        ? timeEntry.hourly_rate
        : (timeEntry.hourly_rate
            ? parseFloat(String(timeEntry.hourly_rate))
            : undefined)

    const effectiveRate =
      rateSource ??
      (typeof timeEntry.effective_hourly_rate === 'number'
        ? timeEntry.effective_hourly_rate
        : (timeEntry.effective_hourly_rate
            ? parseFloat(String(timeEntry.effective_hourly_rate))
            : undefined)) ??
      0

    setHourlyRate(
      typeof effectiveRate === 'number' && !Number.isNaN(effectiveRate)
        ? effectiveRate
        : 0
    )

    const loadProjects = async () => {
      if (clientId) {
        await fetchProjects(clientId)
        if (timeEntry.project_id) {
          setSelectedProjectId(timeEntry.project_id)
        }
      } else {
        setProjects([])
      }
    }

    void loadProjects()
  }, [open, isEditMode, timeEntry])

  const fetchProjects = async (clientId: string) => {
    try {
      setProjectsLoading(true)
      const response = await fetch(`/api/projects?client_id=${clientId}&active=true`)
      if (response.ok) {
        const data = await response.json()
        setProjects(data.data || [])
      } else {
        console.error('Failed to fetch projects:', response.statusText)
        setProjects([])
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error)
      setProjects([])
    } finally {
      setProjectsLoading(false)
    }
  }

  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId)
    setSelectedProjectId('')
    const client = clients.find(c => c.id === clientId)
    if (client?.hourly_rate) {
      setHourlyRate(client.hourly_rate)
    }
    fetchProjects(clientId)
  }

  const handleProjectSelect = (projectId: string) => {
    setSelectedProjectId(projectId)
    const project = projects.find(p => p.id === projectId)
    if (project?.hourly_rate) {
      setHourlyRate(project.hourly_rate)
    } else {
      // Fall back to client hourly rate if project doesn't have one
      const client = clients.find(c => c.id === selectedClientId)
      if (client?.hourly_rate) {
        setHourlyRate(client.hourly_rate)
      }
    }
  }

  // Auto-calculate hourly rate
  useEffect(() => {
    const project = projects.find(p => p.id === selectedProjectId)
    const client = clients.find(c => c.id === selectedClientId)

    if (project?.hourly_rate) {
      setHourlyRate(project.hourly_rate)
    } else if (client?.hourly_rate) {
      setHourlyRate(client.hourly_rate)
    } else {
      setHourlyRate(0)
    }
  }, [selectedProjectId, selectedClientId, projects, clients])

  // Handle submit
  const handleSubmit = async () => {
    // Validation
    if (!selectedClientId) {
      toast.error('Validation error', {
        description: 'Please select a client'
      })
      return
    }

    if (!selectedProjectId) {
      toast.error('Validation error', {
        description: 'Please select a project. Project is mandatory for time entries.'
      })
      return
    }

    if (mode !== 'timer' && (!hours || hours <= 0)) {
      toast.error('Validation error', {
        description: 'Please enter a valid number of hours'
      })
      return
    }

    if (isEditMode && timeEntry) {
      const project = projects.find(p => p.id === selectedProjectId)
      const payload: Record<string, unknown> = {
        description,
        entry_date: entryDate,
        hours,
        hourly_rate: hourlyRate,
        billable: true,
        invoiced: false
      }

      if (project) {
        payload.project_id = project.id
        payload.project_name = project.name
      } else if (timeEntry.project_id) {
        payload.project_id = timeEntry.project_id
        payload.project_name = timeEntry.project_name || ''
      }

      if (selectedClientId && selectedClientId !== timeEntry.client_id) {
        payload.client_id = selectedClientId
      }

      setIsSubmitting(true)
      try {
        console.log('Submitting time entry update payload:', payload)
        const response = await fetch(`/api/time-entries/${timeEntry.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })

        const responseText = await response.text()
        console.log('Update response status', response.status, response.ok)
        if (response.ok) {
          let data: any = null
          try {
            data = responseText ? JSON.parse(responseText) : null
          } catch (parseError) {
            console.error('Failed to parse update response JSON:', parseError)
          }

          onOpenChange(false)

          toast.success('Time entry updated!', {
            description: 'Changes saved successfully'
          })

          if (data?.data) {
            onSuccess?.(data.data)
          } else {
            onSuccess?.(data)
          }

          setTimeout(() => {
            setSelectedClientId('')
            setSelectedProjectId('')
            setDescription('')
            setHours(1.0)
            setHourlyRate(0)
          }, 300)
        } else {
          let errorMessage = 'Unknown error'
          try {
            const errorData = responseText ? JSON.parse(responseText) : null
            errorMessage = errorData?.error || errorMessage
            console.error('Failed to update time entry:', response.status, errorData)
          } catch {
            console.error('Failed to update time entry:', response.status, responseText)
            errorMessage = responseText || errorMessage
          }
          toast.error('Failed to update time entry', {
            description: errorMessage
          })
        }
      } catch (error) {
        console.error('Error updating time entry:', error)
        toast.error('Something went wrong', {
          description: error instanceof Error ? error.message : 'Unknown error'
        })
      } finally {
        setIsSubmitting(false)
      }
      return
    }

    if (mode === 'timer') {
      // Start timer
      const client = clients.find(c => c.id === selectedClientId)
      const project = projects.find(p => p.id === selectedProjectId)

      if (!client) {
        toast.error('Error', {
          description: 'Selected client not found'
        })
        return
      }

      // Close dialog first
      onOpenChange(false)

      // Start timer
      onStartTimer?.({
        clientId: selectedClientId,
        clientName: client.company_name || client.name,
        projectId: selectedProjectId,
        project: project?.name || 'General',
        description,
        hourlyRate
      })

      // Reset form state after dialog closes
      setTimeout(() => {
        setSelectedClientId('')
        setSelectedProjectId('')
        setDescription('')
        setHours(1.0)
        setHourlyRate(0)
      }, 300)
    } else {
      // Create time entry
      const project = projects.find(p => p.id === selectedProjectId)

      const timeEntryData = {
        client_id: selectedClientId,
        project_id: selectedProjectId || undefined,
        project_name: project?.name || '',
        description,
        entry_date: entryDate,
        hours,
        hourly_rate: hourlyRate,
        billable: true,  // Hardcoded
        invoiced: false  // Hardcoded
      }

      // API call
      setIsSubmitting(true)
      try {
        const response = await fetch('/api/time-entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(timeEntryData)
        })

        if (response.ok) {
          const data = await response.json()

          // Capture values before closing
          const createdHours = hours

          // Close dialog first
          onOpenChange(false)

          // Show success toast
          toast.success('Time entry created!', {
            description: `${createdHours} hours registered successfully`
          })

          // Notify parent
          onSuccess?.(data.data)

          // Reset form state after dialog closes
          setTimeout(() => {
            setSelectedClientId('')
            setSelectedProjectId('')
            setDescription('')
            setHours(1.0)
            setHourlyRate(0)
          }, 300)
        } else {
          const error = await response.json()
          toast.error('Failed to create time entry', {
            description: error.message || 'Unknown error'
          })
        }
      } catch (error) {
        console.error('Error creating time entry:', error)
        toast.error('Something went wrong', {
          description: error instanceof Error ? error.message : 'Unknown error'
        })
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" style={{ zIndex: 9999 }}>
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Client Select */}
          <div className="space-y-2">
            <Label>Client *</Label>
            <Select value={selectedClientId} onValueChange={handleClientSelect}>
              <SelectTrigger>
                <SelectValue placeholder={clientsLoading ? "Loading clients..." : "Select a client"} />
              </SelectTrigger>
              <SelectContent style={{ zIndex: 10000 }}>
                {clientsLoading ? (
                  <div className="p-2 text-sm text-muted-foreground">Loading clients...</div>
                ) : clients.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">No clients found</div>
                ) : (
                  clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.company_name || client.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Project Select */}
          {selectedClientId && (
            <div className="space-y-2">
              <Label>Project *</Label>
              <Select value={selectedProjectId} onValueChange={handleProjectSelect}>
                <SelectTrigger>
                  <SelectValue placeholder={projectsLoading ? "Loading projects..." : "Select a project (required)"} />
                </SelectTrigger>
                <SelectContent style={{ zIndex: 10000 }}>
                  {projectsLoading ? (
                    <div className="p-2 text-sm text-muted-foreground">Loading projects...</div>
                  ) : projects.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">No projects found for this client</div>
                  ) : (
                    projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                        {project.hourly_rate && (
                          <span className="text-xs text-green-600 ml-2">
                            €{project.hourly_rate.toFixed(2)}/hr
                          </span>
                        )}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {selectedClientId && projects.length === 0 && !projectsLoading && (
                <p className="text-sm text-amber-600 dark:text-amber-500">
                  ⚠️ This client has no projects. Please create a project before registering time.
                </p>
              )}
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={mode === 'timer' ? 'What will you work on?' : 'What did you work on?'}
            />
          </div>

          {/* Hours (conditional) */}
          {showHoursField && (
            <div className="space-y-2">
              <Label>Number of hours *</Label>
              <Input
                name="hours"
                type="number"
                min="0"
                step="0.25"
                value={hours}
                onChange={(e) => setHours(parseFloat(e.target.value) || 0)}
              />
            </div>
          )}

          {/* Hourly Rate (display only) */}
          <div className="space-y-2">
            <Label>Hourly Rate</Label>
            <div className="text-sm text-muted-foreground">
              €{hourlyRate.toFixed(2)}/hr
            </div>
          </div>

          {/* Date (display only) */}
          <div className="space-y-2">
            <Label>Date</Label>
            <div className="text-sm text-muted-foreground">
              {new Date(entryDate).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || !selectedClientId || !selectedProjectId}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {mode === 'timer' && <Play className="h-4 w-4 mr-2" />}
                  {buttonText}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Clock, Calendar, Save, Loader2 } from 'lucide-react'
import { format } from 'date-fns'

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

interface QuickRegistrationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedDate?: Date
  onSuccess?: () => void
}

export function QuickRegistrationDialog({
  open,
  onOpenChange,
  selectedDate,
  onSuccess
}: QuickRegistrationDialogProps) {
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedClientId, setSelectedClientId] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [description, setDescription] = useState('')
  const [hours, setHours] = useState<number>(1)
  const [entryDate, setEntryDate] = useState('')
  const [hourlyRate, setHourlyRate] = useState(0)
  const [clientsLoading, setClientsLoading] = useState(true)
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Set default date when dialog opens
  useEffect(() => {
    if (open) {
      const dateToUse = selectedDate || new Date()
      setEntryDate(format(dateToUse, 'yyyy-MM-dd'))
    }
  }, [open, selectedDate])

  // Load clients when dialog opens
  useEffect(() => {
    const fetchClients = async () => {
      if (!open) return

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
  }, [open])

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setSelectedClientId('')
      setSelectedProjectId('')
      setDescription('')
      setHours(1)
      setHourlyRate(0)
      setProjects([])
    }
  }, [open])

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

  const handleSubmit = async () => {
    if (!selectedClientId) {
      alert('Selecteer eerst een klant')
      return
    }

    if (!selectedProjectId) {
      alert('Selecteer eerst een project')
      return
    }

    if (!hours || hours <= 0) {
      alert('Voer een geldig aantal uren in')
      return
    }

    if (!entryDate) {
      alert('Selecteer een datum')
      return
    }

    const client = clients.find(c => c.id === selectedClientId)
    const project = projects.find(p => p.id === selectedProjectId)

    if (!client) {
      alert('Geselecteerde klant niet gevonden')
      return
    }

    setIsSubmitting(true)
    try {
      const timeEntryData = {
        client_id: selectedClientId,
        project_id: selectedProjectId,
        project_name: project?.name || 'General',
        description: description || '',
        entry_date: entryDate,
        hours: hours,
        hourly_rate: hourlyRate || client.hourly_rate || 0,
        billable: true,
        invoiced: false
      }

      const response = await fetch('/api/time-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(timeEntryData)
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Time entry created successfully:', result)
        alert(`Tijdregistratie succesvol aangemaakt voor ${new Date(entryDate).toLocaleDateString('nl-NL')}!`)
        onSuccess?.()
        onOpenChange(false)
      } else {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create time entry')
      }
    } catch (error) {
      console.error('Error creating time entry:', error)
      alert(`Er ging iets mis: ${error instanceof Error ? error.message : 'Onbekende fout'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const totalValue = hours && hourlyRate ? Math.round(hours * hourlyRate * 100) / 100 : 0
  const isFormValid = selectedClientId && selectedProjectId && hours > 0 && entryDate && hourlyRate > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" style={{ zIndex: 9999 }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Snelle Registratie
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="date">Datum *</Label>
            <Input
              id="date"
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              className={selectedDate ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800" : ""}
            />
            {selectedDate && (
              <p className="text-xs text-muted-foreground">
                Datum vooringevuld vanuit kalender
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Klant *</Label>
            <Select value={selectedClientId} onValueChange={handleClientSelect}>
              <SelectTrigger>
                <SelectValue placeholder={clientsLoading ? "Laden van klanten..." : "Selecteer een klant"} />
              </SelectTrigger>
              <SelectContent style={{ zIndex: 10000 }}>
                {clientsLoading ? (
                  <div className="p-2 text-sm text-muted-foreground">Laden van klanten...</div>
                ) : clients.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">Geen klanten gevonden</div>
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
          </div>

          {selectedClientId && (
            <div className="space-y-2">
              <Label>Project *</Label>
              <Select value={selectedProjectId} onValueChange={handleProjectSelect}>
                <SelectTrigger>
                  <SelectValue placeholder={projectsLoading ? "Laden van projecten..." : "Selecteer een project"} />
                </SelectTrigger>
                <SelectContent style={{ zIndex: 10000 }}>
                  {projectsLoading ? (
                    <div className="p-2 text-sm text-muted-foreground">Laden van projecten...</div>
                  ) : projects.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">Geen projecten gevonden voor deze klant</div>
                  ) : (
                    projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                        {project.hourly_rate && (
                          <span className="text-xs text-green-600 ml-2">
                            €{project.hourly_rate.toFixed(2)}/uur
                          </span>
                        )}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="hours">Aantal uren *</Label>
            <Input
              id="hours"
              type="number"
              min="0"
              step="0.25"
              value={hours}
              onChange={(e) => setHours(parseFloat(e.target.value) || 0)}
              placeholder="1.0"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Beschrijving</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Waaraan heb je gewerkt?"
            />
          </div>

          <div className="space-y-2">
            <Label>Uurtarief (€)</Label>
            <Input
              id="rate"
              type="number"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(Number(e.target.value))}
              placeholder="0"
              step="0.01"
              className="bg-muted"
              disabled
            />
            <p className="text-xs text-muted-foreground">
              Automatisch bepaald door het geselecteerde project
            </p>
          </div>

          {totalValue > 0 && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-green-800 dark:text-green-200">
                  Totale waarde:
                </span>
                <span className="text-lg font-bold text-green-600 dark:text-green-400">
                  €{totalValue.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Annuleren
            </Button>
            <Button onClick={handleSubmit} disabled={!isFormValid || isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Save className="h-4 w-4 mr-2" />
              Registreer Tijd
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
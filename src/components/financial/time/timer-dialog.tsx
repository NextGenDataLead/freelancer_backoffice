'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Play, Calendar } from 'lucide-react'
import { format } from 'date-fns'

interface Client {
  id: string
  name: string
  hourly_rate?: number
}

interface Project {
  id: string
  name: string
  client_id: string
  hourly_rate?: number
}

interface TimerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedDate?: Date
  onStartTimer: (timerData: {
    clientId: string
    clientName: string
    projectId: string
    project: string
    description: string
    billable: boolean
    invoiced: boolean
    hourlyRate: number
    selectedDate?: Date
  }) => void
}

export function TimerDialog({
  open,
  onOpenChange,
  selectedDate,
  onStartTimer
}: TimerDialogProps) {
  console.log('=== TIMER DIALOG RENDER ===')
  console.log('Open:', open)
  console.log('Selected date:', selectedDate)
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedClientId, setSelectedClientId] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [description, setDescription] = useState('')
  const [hourlyRate, setHourlyRate] = useState(0)
  const [hours, setHours] = useState<number>(1)
  const [clientsLoading, setClientsLoading] = useState(true)
  const [projectsLoading, setProjectsLoading] = useState(false)

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
      setHourlyRate(0)
      setHours(1)
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

  const handleStartTimer = () => {
    if (!selectedClientId) {
      alert('Selecteer eerst een klant')
      return
    }

    if (!isTimerMode && (!hours || hours <= 0)) {
      alert('Voer een geldig aantal uren in')
      return
    }

    const client = clients.find(c => c.id === selectedClientId)
    const project = projects.find(p => p.id === selectedProjectId)

    if (!client) {
      alert('Geselecteerde klant niet gevonden')
      return
    }

    const timerData = {
      clientId: selectedClientId,
      clientName: client.name,
      projectId: selectedProjectId,
      project: project?.name || 'General',
      description: description,
      billable: true,
      invoiced: false,
      hourlyRate: hourlyRate || client.hourly_rate || 0,
      selectedDate: selectedDate,
      hours: isTimerMode ? undefined : hours
    }

    onStartTimer(timerData)
    onOpenChange(false)
  }

  // Determine if this is for timer mode (no selectedDate) or calendar mode (has selectedDate)
  const isTimerMode = !selectedDate

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" style={{ zIndex: 9999 }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            {isTimerMode ? 'Start Timer' : 'Nieuwe Tijdregistratie'}
            {selectedDate && (
              <span className="text-sm font-normal text-muted-foreground">
                - {format(selectedDate, 'dd MMM yyyy')}
              </span>
            )}
          </DialogTitle>
          {isTimerMode ? (
            <p className="text-sm text-muted-foreground">
              Timer wordt gestart voor vandaag
            </p>
          ) : selectedDate && (
            <p className="text-sm text-muted-foreground">
              Tijdregistratie voor {selectedDate.toLocaleDateString('nl-NL', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          )}
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client">Klant *</Label>
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
                      {client.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedClientId && (
            <div className="space-y-2">
              <Label htmlFor="project">Project</Label>
              <Select value={selectedProjectId} onValueChange={handleProjectSelect}>
                <SelectTrigger>
                  <SelectValue placeholder={projectsLoading ? "Laden van projecten..." : "Selecteer een project (optioneel)"} />
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
            <Label htmlFor="description">Beschrijving</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isTimerMode ? "Waaraan ga je werken?" : "Waaraan heb je gewerkt?"}
            />
          </div>

          {!isTimerMode && (
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
          )}

          <div className="space-y-2">
            <Label htmlFor="rate">Uurtarief (€)</Label>
            <Input
              id="rate"
              type="number"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(Number(e.target.value))}
              placeholder="0"
              step="0.01"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuleren
            </Button>
            <Button onClick={handleStartTimer} disabled={!selectedClientId}>
              <Play className="h-4 w-4 mr-2" />
              {isTimerMode ? 'Start Timer' : 'Registreer Tijd'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
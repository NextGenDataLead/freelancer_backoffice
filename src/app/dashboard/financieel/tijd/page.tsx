'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TimeEntryForm } from '@/components/financial/time/time-entry-form'
import { UnifiedTimeEntryDialog } from '@/components/financial/time/unified-time-entry-dialog'
import { TimeEntryList } from '@/components/financial/time/time-entry-list'
import { UnbilledTimeEntriesSelector } from '@/components/financial/time/unbilled-time-entries-selector'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Clock, Plus, ArrowLeft, Play, Pause, Square, Euro, Users, Keyboard } from 'lucide-react'
import Link from 'next/link'

export default function TimeTrackingPage() {
  const [editingTimeEntry, setEditingTimeEntry] = useState<any>(null)
  const [timerRunning, setTimerRunning] = useState(false)
  const [currentTime, setCurrentTime] = useState('00:00:00')
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [selectedClient, setSelectedClient] = useState<string>('')
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [selectedDescription, setSelectedDescription] = useState<string>('')
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [showUnifiedDialog, setShowUnifiedDialog] = useState(false)
  const [timerPaused, setTimerPaused] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false)
  const [unbilledEntries, setUnbilledEntries] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [clientsLoading, setClientsLoading] = useState(true)
  const [pausedTime, setPausedTime] = useState(0) // Accumulated time during pauses
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchClients = async () => {
    try {
      setClientsLoading(true)
      const response = await fetch('/api/clients?limit=100')
      if (response.ok) {
        const data = await response.json()
        setClients(data.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error)
    } finally {
      setClientsLoading(false)
    }
  }

  // Load clients and restore timer state on page mount
  useEffect(() => {
    fetchClients()
    
    // Restore timer session from localStorage
    const timerSession = localStorage.getItem('activeTimerSession')
    if (timerSession) {
      try {
        const sessionData = JSON.parse(timerSession)
        const sessionStartTime = new Date(sessionData.startTime)
        const now = new Date()
        
        // Only restore if session is less than 24 hours old
        const hoursSinceStart = (now.getTime() - sessionStartTime.getTime()) / (1000 * 60 * 60)
        if (hoursSinceStart < 24) {
          setSelectedClientId(sessionData.clientId)
          setSelectedClient(sessionData.clientName)
          setSelectedProject(sessionData.project)
          setSelectedDescription(sessionData.description)
          setPausedTime(sessionData.pausedTime || 0)
          
          if (sessionData.isPaused) {
            // If was paused, restore paused state and display accumulated time
            setTimerPaused(true)
            setTimerRunning(false)
            setStartTime(null)
            
            // Display accumulated time
            const totalSeconds = sessionData.pausedTime || 0
            const hours = Math.floor(totalSeconds / 3600)
            const minutes = Math.floor((totalSeconds % 3600) / 60)
            const seconds = totalSeconds % 60
            setCurrentTime(
              `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
            )
          } else {
            // If was running, continue from session start time
            setStartTime(sessionStartTime)
            setTimerRunning(true)
            setTimerPaused(false)
          }
          
          console.log('Restored timer session:', sessionData)
        } else {
          // Clear expired session
          localStorage.removeItem('activeTimerSession')
        }
      } catch (e) {
        console.error('Error restoring timer session:', e)
        localStorage.removeItem('activeTimerSession')
      }
    }
  }, [])

  const handleTimeEntryCreated = (timeEntry: any) => {
    setShowUnifiedDialog(false)
    setRefreshKey(prev => prev + 1)
    // Refresh clients list in case a new client was created
    fetchClients()
  }

  const handleTimeEntryUpdated = (timeEntry: any) => {
    setEditingTimeEntry(null)
    setRefreshKey(prev => prev + 1)
  }

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
  }

  const handleEditTimeEntry = (timeEntry: any) => {
    setEditingTimeEntry(timeEntry)
  }

  // Timer effect to update display every second
  useEffect(() => {
    if (timerRunning && startTime) {
      intervalRef.current = setInterval(() => {
        const now = new Date()
        // Calculate elapsed time from current session + accumulated paused time
        const currentSessionElapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000)
        const totalElapsed = currentSessionElapsed + pausedTime
        
        const hours = Math.floor(totalElapsed / 3600)
        const minutes = Math.floor((totalElapsed % 3600) / 60)
        const seconds = totalElapsed % 60
        
        setCurrentTime(
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        )
      }, 1000)
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [timerRunning, startTime, pausedTime])

  const toggleTimer = () => {
    if (timerRunning) {
      pauseTimer()
    } else if (timerPaused) {
      resumeTimer() 
    } else {
      startTimer()
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Only handle shortcuts when not typing in input fields
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return
      }

      if (event.ctrlKey || event.metaKey) {
        switch (event.key.toLowerCase()) {
          case 'n': // Ctrl+N - New time entry
            event.preventDefault()
            setShowUnifiedDialog(true)
            break
          case 'k': // Ctrl+K - Quick timer toggle
            event.preventDefault()
            toggleTimer()
            break
          case 'r': // Ctrl+R - Refresh (override default)
            event.preventDefault()
            handleRefresh()
            break
        }
      } else {
        switch (event.key.toLowerCase()) {
          case ' ': // Spacebar - Quick timer toggle
            if (event.target === document.body) {
              event.preventDefault()
              toggleTimer()
            }
            break
          case 'escape': // Esc - Close dialogs
            setShowUnifiedDialog(false)
            setEditingTimeEntry(null)
            break
        }
      }
    }

    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [])

  const startTimer = () => {
    setShowUnifiedDialog(true)
  }

  const handleStartTimer = (timerData: {
    clientId: string
    clientName: string
    project: string
    description: string
    billable: boolean
    invoiced: boolean
    hourlyRate: number
  }) => {
    console.log('=== HANDLE START TIMER CALLED ===')
    console.log('Timer data received:', timerData)
    
    // Set timer data
    setSelectedClientId(timerData.clientId)
    setSelectedClient(timerData.clientName)
    setSelectedProject(timerData.project)
    setSelectedDescription(timerData.description)
    
    // Store timer data in localStorage for persistence
    const timerSession = {
      ...timerData,
      startTime: new Date().toISOString(),
      pausedTime: 0,
      isPaused: false
    }
    localStorage.setItem('activeTimerSession', JSON.stringify(timerSession))
    
    // Start the timer
    setStartTime(new Date())
    setTimerRunning(true)
    setTimerPaused(false)
    setPausedTime(0) // Reset accumulated paused time
    setCurrentTime('00:00:01')
  }

  const pauseTimer = () => {
    if (!startTime) return
    
    // Calculate and accumulate the time elapsed in this session
    const now = new Date()
    const currentSessionElapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000)
    setPausedTime(prev => prev + currentSessionElapsed)
    
    // Update localStorage with paused time
    const timerSession = localStorage.getItem('activeTimerSession')
    if (timerSession) {
      try {
        const sessionData = JSON.parse(timerSession)
        sessionData.pausedTime = pausedTime + currentSessionElapsed
        sessionData.isPaused = true
        localStorage.setItem('activeTimerSession', JSON.stringify(sessionData))
      } catch (e) {
        console.error('Error updating timer session:', e)
      }
    }
    
    setTimerPaused(true)
    setTimerRunning(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  const resumeTimer = () => {
    // Start a new timing session from now
    setStartTime(new Date())
    setTimerPaused(false)
    setTimerRunning(true)
    
    // Update localStorage
    const timerSession = localStorage.getItem('activeTimerSession')
    if (timerSession) {
      try {
        const sessionData = JSON.parse(timerSession)
        sessionData.startTime = new Date().toISOString()
        sessionData.isPaused = false
        localStorage.setItem('activeTimerSession', JSON.stringify(sessionData))
      } catch (e) {
        console.error('Error updating timer session:', e)
      }
    }
  }

  const stopAndSaveTimer = async () => {
    if (!startTime) return
    
    // Calculate total elapsed time including paused time
    const currentSessionElapsed = Math.floor((new Date().getTime() - startTime.getTime()) / 1000)
    const totalElapsedSeconds = currentSessionElapsed + pausedTime
    const elapsed = totalElapsedSeconds / 3600 // Convert to hours
    
    // Stop the timer first
    setTimerRunning(false)
    setTimerPaused(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    
    // Get timer session data
    const timerSession = localStorage.getItem('activeTimerSession')
    let sessionData = null
    try {
      sessionData = timerSession ? JSON.parse(timerSession) : null
    } catch (e) {
      console.error('Error parsing timer session:', e)
    }
    
    // Only proceed if meaningful time was tracked
    if (elapsed > 0.0001 && selectedClientId) { // More precise minimum threshold
      const hours = Math.round(elapsed * 100) / 100 // Round to 2 decimal places
      
      try {
        const timeEntryData = {
          client_id: selectedClientId,
          project_name: selectedProject || '',
          description: selectedDescription || '',
          entry_date: new Date().toISOString().split('T')[0],
          hours: hours,
          hourly_rate: sessionData?.hourlyRate || 0,
          billable: sessionData?.billable ?? true,
          invoiced: sessionData?.invoiced ?? false
        }
        
        console.log('Auto-registering time entry:', timeEntryData)
        
        // Auto-register the time entry without confirmation
        const response = await fetch('/api/time-entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(timeEntryData)
        })
        
        if (response.ok) {
          const result = await response.json()
          console.log('Time entry registered successfully:', result)
          alert(`Tijd succesvol geregistreerd! ${hours} uur voor "${selectedClient}"`)
          // Small delay to ensure database transaction is committed
          setTimeout(() => {
            handleRefresh() // Refresh the time entries list
          }, 100)
        } else {
          const error = await response.json()
          console.error('API Error:', error)
          throw new Error(error.message || 'Failed to register time')
        }
      } catch (error) {
        console.error('Error registering time:', error)
        alert(`Er ging iets mis bij het registreren: ${error instanceof Error ? error.message : 'Onbekende fout'}`)
      }
    }
    
    // Clear timer session from localStorage
    localStorage.removeItem('activeTimerSession')
    
    // Reset timer state
    setStartTime(null)
    setCurrentTime('00:00:00')
    setPausedTime(0) // Reset accumulated paused time
    setSelectedClient('')
    setSelectedProject('')
    setSelectedDescription('')
    setSelectedClientId('')
  }


  const fetchUnbilledEntries = async () => {
    try {
      const response = await fetch('/api/time-entries?billable=true&invoiced=false&limit=100')
      if (response.ok) {
        const data = await response.json()
        setUnbilledEntries(data.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch unbilled entries:', error)
    }
  }

  const handleCreateInvoiceFromTime = async (selectedEntries: string[]) => {
    alert('Invoice creation functionality will be implemented soon!')
    setShowInvoiceDialog(false)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/financieel">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Terug naar Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Tijdregistratie</h1>
            <p className="text-muted-foreground mt-1">
              Registreer gewerkte uren met ingebouwde timer en projectkoppeling
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" title="Sneltoetsen: Ctrl+N (Nieuw), Ctrl+K (Timer), Spatie (Timer), Esc (Sluiten)">
            <Keyboard className="h-4 w-4" />
          </Button>
          
            <Button onClick={() => setShowUnifiedDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nieuwe Tijdregistratie
          </Button>
        </div>
      </div>

      {/* Active Timer Card */}
      <Card className="border-2 border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Actieve Timer
            </span>
            <div className="text-3xl font-mono font-bold text-primary">
              {currentTime}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {(timerRunning || timerPaused) && selectedClient && selectedProject 
                  ? `${selectedProject} - ${selectedClient}` 
                  : (timerRunning || timerPaused) && selectedClient
                    ? selectedClient
                    : 'Geen actieve sessie'}
              </p>
              <p className="text-xs text-muted-foreground">
                {(timerRunning || timerPaused) && selectedDescription 
                  ? selectedDescription
                  : timerRunning && startTime 
                    ? `Gestart om ${startTime.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}` 
                    : timerPaused
                      ? 'Gepauzeerd - klik hervatten om door te gaan'
                      : 'Selecteer project, klant en beschrijving om te starten'}
              </p>
            </div>
            <div className="flex space-x-2">
              {(timerRunning || timerPaused) ? (
                <>
                  <Button
                    onClick={toggleTimer}
                    variant="outline"
                    size="lg"
                  >
                    {timerRunning ? (
                      <>
                        <Pause className="h-4 w-4 mr-2" />
                        Pauzeer
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Hervatten
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={stopAndSaveTimer}
                    variant="destructive"
                    size="lg"
                  >
                    <Square className="h-4 w-4 mr-2" />
                    Stop & Opslaan
                  </Button>
                </>
              ) : (
                <Button
                  onClick={startTimer}
                  variant="default"
                  size="lg"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start Timer
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deze Week</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">32,5h</div>
            <p className="text-xs text-muted-foreground">
              +2,5h t.o.v. vorige week
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deze Maand</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">142h</div>
            <p className="text-xs text-muted-foreground">
              €10.650,00 aan uren
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nog Niet Gefactureerd</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24,5h</div>
            <p className="text-xs text-muted-foreground">
              €1.837,50 open staand
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actieve Projecten</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-muted-foreground">
              Voor 3 verschillende klanten
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
          <CardContent className="flex items-center p-4">
            <Play className="h-6 w-6 text-green-600 mr-3" />
            <div>
              <h3 className="font-semibold">Vorig Project</h3>
              <p className="text-sm text-muted-foreground">Website Ontwikkeling</p>
            </div>
          </CardContent>
        </Card>
        
        <Card 
          className="hover:bg-accent/50 transition-colors cursor-pointer"
          onClick={() => {
            fetchUnbilledEntries()
            setShowInvoiceDialog(true)
          }}
        >
          <CardContent className="flex items-center p-4">
            <Euro className="h-6 w-6 text-blue-600 mr-3" />
            <div>
              <h3 className="font-semibold">Maak Factuur</h3>
              <p className="text-sm text-muted-foreground">Van uren naar factuur</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
          <CardContent className="flex items-center p-4">
            <Clock className="h-6 w-6 text-purple-600 mr-3" />
            <div>
              <h3 className="font-semibold">Uren Rapport</h3>
              <p className="text-sm text-muted-foreground">Bekijk gedetailleerd overzicht</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Time Entries List */}
      <TimeEntryList 
        key={refreshKey}
        onEdit={handleEditTimeEntry} 
        onRefresh={handleRefresh}
        limit={50} // Show more entries on the main time tracking page
      />

      {/* Invoice Creation Dialog */}
      <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Factuur Maken van Uren</DialogTitle>
          </DialogHeader>
          {unbilledEntries.length === 0 ? (
            <div className="text-center py-8">
              <Euro className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Geen ongefactureerde uren</h3>
              <p className="text-muted-foreground">
                Alle factureerbare uren zijn al gefactureerd of er zijn geen uren geregistreerd.
              </p>
            </div>
          ) : (
            <UnbilledTimeEntriesSelector 
              entries={unbilledEntries}
              onCreateInvoice={handleCreateInvoiceFromTime}
              onCancel={() => setShowInvoiceDialog(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Unified Time Entry Dialog */}
      <UnifiedTimeEntryDialog
        open={showUnifiedDialog}
        onOpenChange={setShowUnifiedDialog}
        onSuccess={handleTimeEntryCreated}
        onStartTimer={handleStartTimer}
      />

      {/* Edit Time Entry Dialog */}
      {editingTimeEntry && (
        <UnifiedTimeEntryDialog
          open={!!editingTimeEntry}
          onOpenChange={() => setEditingTimeEntry(null)}
          timeEntry={editingTimeEntry}
          onSuccess={handleTimeEntryUpdated}
        />
      )}
    </div>
  )
}
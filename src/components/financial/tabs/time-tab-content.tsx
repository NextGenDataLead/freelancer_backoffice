'use client'

// This component extracts the main content from the tijd page
// without the navigation header to be used in the tab

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TimeEntryForm } from '@/components/financial/time/time-entry-form'
import { UnifiedTimeEntryDialog } from '@/components/financial/time/unified-time-entry-dialog'
import { TimerDialog } from '@/components/financial/time/timer-dialog'
import { QuickRegistrationDialog } from '@/components/financial/time/quick-registration-dialog'
import { CalendarTimeEntryView } from '@/components/financial/time/calendar-time-entry-view'
import { TimeEntryList } from '@/components/financial/time/time-entry-list'
import { ComprehensiveInvoicingWizard } from '@/components/financial/invoices/comprehensive-invoicing-wizard'
import { HoursReportModal } from '@/components/financial/reports/hours-report-modal'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Clock, Plus, Play, Pause, Square, Euro, Users, Keyboard, List, Calendar as CalendarIcon } from 'lucide-react'
import { getCurrentDate } from '@/lib/current-date'

export function TimeTabContent() {
  const searchParams = useSearchParams()
  const [editingTimeEntry, setEditingTimeEntry] = useState<any>(null)
  const [timerRunning, setTimerRunning] = useState(false)
  const [currentTime, setCurrentTime] = useState('00:00:00')
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [selectedClient, setSelectedClient] = useState<string>('')
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [selectedDescription, setSelectedDescription] = useState<string>('')
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [showUnifiedDialog, setShowUnifiedDialog] = useState(false)
  const [showStartTimerDialog, setShowStartTimerDialog] = useState(false)
  const [startTimerClientId, setStartTimerClientId] = useState('')
  const [startTimerProjectId, setStartTimerProjectId] = useState('')
  const [startTimerDescription, setStartTimerDescription] = useState('')
  const [startTimerHourlyRate, setStartTimerHourlyRate] = useState(0)
  const [projects, setProjects] = useState<any[]>([])
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [timerPaused, setTimerPaused] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [showComprehensiveWizard, setShowComprehensiveWizard] = useState(false)
  const [showHoursReport, setShowHoursReport] = useState(false)
  const [clients, setClients] = useState<any[]>([])
  const [clientsLoading, setClientsLoading] = useState(true)
  const [pausedTime, setPausedTime] = useState(0) // Accumulated time during pauses
  const [timeStats, setTimeStats] = useState<any>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [activeView, setActiveView] = useState<'list' | 'calendar'>('list')
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | undefined>(undefined)
  const [selectedMonth, setSelectedMonth] = useState<Date>(getCurrentDate())
  const [calendarMode, setCalendarMode] = useState(false)
  const [calendarRefreshTrigger, setCalendarRefreshTrigger] = useState(0)
  const [showTimerDialog, setShowTimerDialog] = useState(false)
  const [timerDialogDate, setTimerDialogDate] = useState<Date | undefined>(undefined)
  const [showQuickRegistrationDialog, setShowQuickRegistrationDialog] = useState(false)
  const [quickRegistrationDate, setQuickRegistrationDate] = useState<Date | undefined>(undefined)
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

  const fetchProjects = async (clientId: string) => {
    if (!clientId) {
      setProjects([])
      return
    }

    try {
      setProjectsLoading(true)
      const response = await fetch(`/api/projects?client_id=${clientId}&limit=100`)
      if (response.ok) {
        const data = await response.json()
        setProjects(data.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error)
      setProjects([])
    } finally {
      setProjectsLoading(false)
    }
  }

  const fetchTimeStats = async () => {
    try {
      setStatsLoading(true)
      const response = await fetch('/api/time-entries/stats')
      if (response.ok) {
        const data = await response.json()
        setTimeStats(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch time statistics:', error)
    } finally {
      setStatsLoading(false)
    }
  }

  // Load clients, stats and restore timer state on page mount
  useEffect(() => {
    fetchClients()
    fetchTimeStats()

    // Restore timer session from localStorage
    const timerSession = localStorage.getItem('activeTimerSession')
    if (timerSession) {
      try {
        const sessionData = JSON.parse(timerSession)
        const sessionStartTime = new Date(sessionData.startTime)
        const now = getCurrentDate()

        // Only restore if session is less than 24 hours old
        const hoursSinceStart = (now.getTime() - sessionStartTime.getTime()) / (1000 * 60 * 60)
        if (hoursSinceStart < 24) {
          setSelectedClientId(sessionData.clientId)
          setSelectedClient(sessionData.clientName)
          setSelectedProjectId(sessionData.projectId || '')
          setSelectedProject(sessionData.project)
          setSelectedDescription(sessionData.description)
          setPausedTime(sessionData.pausedTime || 0)

          if (sessionData.isPaused) {
            setTimerPaused(true)
            setTimerRunning(false)
            setStartTime(null)

            const totalSeconds = sessionData.pausedTime || 0
            const hours = Math.floor(totalSeconds / 3600)
            const minutes = Math.floor((totalSeconds % 3600) / 60)
            const seconds = totalSeconds % 60
            setCurrentTime(
              `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
            )
          } else {
            setStartTime(sessionStartTime)
            setTimerRunning(true)
            setTimerPaused(false)
          }

          console.log('Restored timer session:', sessionData)
        } else {
          localStorage.removeItem('activeTimerSession')
        }
      } catch (e) {
        console.error('Error restoring timer session:', e)
        localStorage.removeItem('activeTimerSession')
      }
    }
  }, [])

  // Handle action parameter from URL (e.g., when navigating from dashboard start timer button)
  useEffect(() => {
    const action = searchParams.get('action')
    if (action === 'start_timer') {
      setShowStartTimerDialog(true)
    }
  }, [searchParams])

  const handleTimeEntryCreated = (timeEntry: any) => {
    setShowUnifiedDialog(false)
    setRefreshKey(prev => prev + 1)
    fetchClients()
    fetchTimeStats()
  }

  const handleTimeEntryUpdated = (timeEntry: any) => {
    setEditingTimeEntry(null)
    setRefreshKey(prev => prev + 1)
    fetchTimeStats()
  }

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
    fetchTimeStats()
  }

  const handleEditTimeEntry = (timeEntry: any) => {
    setEditingTimeEntry(timeEntry)
  }

  // Timer effect to update display every second
  useEffect(() => {
    if (timerRunning && startTime) {
      intervalRef.current = setInterval(() => {
        const now = getCurrentDate()
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

  const startTimer = () => {
    setTimerDialogDate(undefined) // No specific date, use current date
    setShowTimerDialog(true)
  }

  const handleStartTimerClientSelect = (clientId: string) => {
    setStartTimerClientId(clientId)
    setStartTimerProjectId('')
    const client = clients.find(c => c.id === clientId)
    if (client?.hourly_rate) {
      setStartTimerHourlyRate(client.hourly_rate)
    }
    fetchProjects(clientId)
  }

  const handleStartTimerSubmit = () => {
    if (!startTimerClientId) {
      alert('Selecteer eerst een klant')
      return
    }

    const client = clients.find(c => c.id === startTimerClientId)
    const project = projects.find(p => p.id === startTimerProjectId)

    if (!client) {
      alert('Geselecteerde klant niet gevonden')
      return
    }

    const timerData = {
      clientId: startTimerClientId,
      clientName: client.name,
      projectId: startTimerProjectId,
      project: project?.name || 'General',
      description: startTimerDescription,
      billable: true,
      invoiced: false,
      hourlyRate: startTimerHourlyRate || client.hourly_rate || 0
    }

    handleStartTimer(timerData)
    setShowStartTimerDialog(false)
    setStartTimerClientId('')
    setStartTimerProjectId('')
    setStartTimerDescription('')
    setStartTimerHourlyRate(0)
  }

  const handleStartTimer = (timerData: {
    clientId: string
    clientName: string
    projectId: string
    project: string
    description: string
    billable: boolean
    invoiced: boolean
    hourlyRate: number
    selectedDate?: Date
  }) => {
    console.log('=== TIME TAB: HANDLE START TIMER CALLED ===')
    console.log('Timer data received:', timerData)

    const targetDate = timerData.selectedDate || timerDialogDate
    console.log('Target date:', targetDate)

    // Check if we should start a timer (for today) or save a time entry (for other dates)
    const today = getCurrentDate()
    const isToday = !targetDate ||
      (targetDate.toDateString() === today.toDateString())

    if (!isToday && targetDate) {
      // For past/future dates, save a time entry directly instead of starting timer
      const saveTimeEntry = async () => {
        try {
          const timeEntryData = {
            client_id: timerData.clientId,
            project_id: timerData.projectId,
            project_name: timerData.project || '',
            description: timerData.description || '',
            entry_date: targetDate.toISOString().split('T')[0],
            hours: 1, // Default to 1 hour - user can edit if needed
            hourly_rate: timerData.hourlyRate || 0,
            billable: timerData.billable ?? true,
            invoiced: timerData.invoiced ?? false
          }

          const response = await fetch('/api/time-entries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(timeEntryData)
          })

          if (response.ok) {
            const result = await response.json()
            console.log('Time entry created successfully:', result)
            alert(`Tijdregistratie aangemaakt voor ${targetDate.toLocaleDateString('nl-NL')}!`)
            handleRefresh() // Refresh the time entries list and stats
            setCalendarRefreshTrigger(prev => prev + 1) // Refresh calendar
          } else {
            const error = await response.json()
            throw new Error(error.message || 'Failed to create time entry')
          }
        } catch (error) {
          console.error('Error creating time entry:', error)
          alert(`Er ging iets mis: ${error instanceof Error ? error.message : 'Onbekende fout'}`)
        }
      }

      saveTimeEntry()
      setTimerDialogDate(undefined)
      return
    }

    // For today's date: start the actual timer
    setSelectedClientId(timerData.clientId)
    setSelectedClient(timerData.clientName)
    setSelectedProjectId(timerData.projectId)
    setSelectedProject(timerData.project)
    setSelectedDescription(timerData.description)

    const timerSession = {
      ...timerData,
      startTime: getCurrentDate().toISOString(),
      pausedTime: 0,
      isPaused: false
    }
    localStorage.setItem('activeTimerSession', JSON.stringify(timerSession))

    setStartTime(getCurrentDate())
    setTimerRunning(true)
    setTimerPaused(false)
    setPausedTime(0)
    setCurrentTime('00:00:01')

    // Clear timer dialog date
    setTimerDialogDate(undefined)
  }

  const pauseTimer = () => {
    if (!startTime) return

    const now = getCurrentDate()
    const currentSessionElapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000)
    setPausedTime(prev => prev + currentSessionElapsed)

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
    setStartTime(getCurrentDate())
    setTimerPaused(false)
    setTimerRunning(true)

    const timerSession = localStorage.getItem('activeTimerSession')
    if (timerSession) {
      try {
        const sessionData = JSON.parse(timerSession)
        sessionData.startTime = getCurrentDate().toISOString()
        sessionData.isPaused = false
        localStorage.setItem('activeTimerSession', JSON.stringify(sessionData))
      } catch (e) {
        console.error('Error updating timer session:', e)
      }
    }
  }

  const stopAndSaveTimer = async () => {
    if (!startTime) return

    const currentSessionElapsed = Math.floor((getCurrentDate().getTime() - startTime.getTime()) / 1000)
    const totalElapsedSeconds = currentSessionElapsed + pausedTime
    const elapsed = totalElapsedSeconds / 3600

    setTimerRunning(false)
    setTimerPaused(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    const timerSession = localStorage.getItem('activeTimerSession')
    let sessionData = null
    try {
      sessionData = timerSession ? JSON.parse(timerSession) : null
    } catch (e) {
      console.error('Error parsing timer session:', e)
    }

    if (elapsed > 0.0001 && selectedClientId) {
      const hours = Math.round(elapsed * 100) / 100

      try {
        const timeEntryData = {
          client_id: selectedClientId,
          project_id: selectedProjectId,
          project_name: selectedProject || '',
          description: selectedDescription || '',
          entry_date: getCurrentDate().toISOString().split('T')[0],
          hours: hours,
          hourly_rate: sessionData?.hourlyRate || 0,
          billable: sessionData?.billable ?? true,
          invoiced: sessionData?.invoiced ?? false
        }

        const response = await fetch('/api/time-entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(timeEntryData)
        })

        if (response.ok) {
          alert(`Tijd succesvol geregistreerd! ${hours} uur voor "${selectedClient}"`)
          setTimeout(() => {
            handleRefresh()
          }, 100)
        } else {
          const error = await response.json()
          throw new Error(error.message || 'Failed to register time')
        }
      } catch (error) {
        console.error('Error registering time:', error)
        alert(`Er ging iets mis bij het registreren: ${error instanceof Error ? error.message : 'Onbekende fout'}`)
      }
    }

    localStorage.removeItem('activeTimerSession')

    setStartTime(null)
    setCurrentTime('00:00:00')
    setPausedTime(0)
    setSelectedClient('')
    setSelectedProject('')
    setSelectedDescription('')
    setSelectedClientId('')
    setSelectedProjectId('')
  }


  const handleComprehensiveWizardSuccess = (invoices: any[]) => {
    setShowComprehensiveWizard(false)
    // Show success message and refresh data
    console.log('Generated invoices:', invoices)
    alert(`Succesvol ${invoices.length} factuur(facturen) aangemaakt!`)
    // Refresh the time entries list and stats
    handleRefresh()
  }

  const handleDateSelect = (date: Date) => {
    setSelectedCalendarDate(date)
  }

  const handleMonthChange = (date: Date) => {
    setSelectedMonth(date)
  }

  const handleCreateTimeEntryForDate = (date: Date) => {
    console.log('=== TIME TAB: HANDLE CREATE TIME ENTRY FOR DATE ===')
    console.log('Date clicked:', date)
    setQuickRegistrationDate(date)
    setShowQuickRegistrationDialog(true)
  }

  const handleCalendarTimeEntrySuccess = (timeEntry: any) => {
    setShowUnifiedDialog(false)
    setCalendarMode(false)
    setSelectedCalendarDate(undefined)
    setCalendarRefreshTrigger(prev => prev + 1)
    handleTimeEntryCreated(timeEntry)
  }

  const handleQuickRegistrationSuccess = () => {
    setShowQuickRegistrationDialog(false)
    setQuickRegistrationDate(undefined)
    // Trigger calendar refresh
    setCalendarRefreshTrigger(prev => prev + 1)
    // Also refresh the regular time entry list and stats
    handleRefresh()
    fetchTimeStats()
  }

  return (
    <div className="space-y-6">
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

      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Tijdregistratie</h3>
          <p className="text-muted-foreground text-sm">
            Registreer gewerkte uren met ingebouwde timer en projectkoppeling
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" title="Sneltoetsen: Ctrl+N (Nieuw), Ctrl+K (Timer), Spatie (Timer), Esc (Sluiten)">
            <Keyboard className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              setQuickRegistrationDate(undefined) // No specific date, user can choose
              setShowQuickRegistrationDialog(true)
            }}
          >
            <Clock className="h-4 w-4 mr-2" />
            Snelle registratie
          </Button>

          <Button onClick={() => setShowUnifiedDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nieuwe Tijdregistratie
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deze Week</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : `${timeStats?.thisWeek?.hours || 0}h`}
            </div>
            <p className="text-xs text-muted-foreground">
              {statsLoading ? '...' : (
                timeStats?.thisWeek?.difference >= 0
                  ? `+${timeStats.thisWeek.difference}h t.o.v. vorige week`
                  : `${timeStats.thisWeek.difference}h t.o.v. vorige week`
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deze Maand</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : `${timeStats?.thisMonth?.hours || 0}h`}
            </div>
            <p className="text-xs text-muted-foreground">
              {statsLoading ? '...' : `€${(timeStats?.thisMonth?.revenue || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} aan uren`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nog Niet Gefactureerd</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : `${timeStats?.unbilled?.hours || 0}h`}
            </div>
            <p className="text-xs text-muted-foreground">
              {statsLoading ? '...' : `€${(timeStats?.unbilled?.revenue || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} open staand`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actieve Projecten</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : timeStats?.projects?.count || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {statsLoading ? '...' : `Voor ${timeStats?.projects?.clients || 0} verschillende klanten`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card
          className="hover:bg-accent/50 transition-colors cursor-pointer"
          onClick={() => setShowComprehensiveWizard(true)}
        >
          <CardContent className="flex items-center p-4">
            <Euro className="h-6 w-6 text-blue-600 mr-3" />
            <div>
              <h3 className="font-semibold">Maak Factuur</h3>
              <p className="text-sm text-muted-foreground">Van uren naar factuur</p>
            </div>
          </CardContent>
        </Card>

        <Card
          className="hover:bg-accent/50 transition-colors cursor-pointer"
          onClick={() => setShowHoursReport(true)}
        >
          <CardContent className="flex items-center p-4">
            <Clock className="h-6 w-6 text-purple-600 mr-3" />
            <div>
              <h3 className="font-semibold">Uren Rapport</h3>
              <p className="text-sm text-muted-foreground">Bekijk gedetailleerd overzicht</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Time Entry Views - Tabs */}
      <Tabs value={activeView} onValueChange={(value) => setActiveView(value as 'list' | 'calendar')} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            Lijstweergave
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Kalenderweergave
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <TimeEntryList
            key={refreshKey}
            onEdit={handleEditTimeEntry}
            onRefresh={handleRefresh}
            limit={50}
          />
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <CalendarTimeEntryView
            selectedMonth={selectedMonth}
            onMonthChange={handleMonthChange}
            onDateSelect={handleDateSelect}
            onCreateTimeEntry={handleCreateTimeEntryForDate}
            refreshTrigger={calendarRefreshTrigger}
          />
        </TabsContent>
      </Tabs>

      {/* Comprehensive Invoicing Wizard */}
      <ComprehensiveInvoicingWizard
        isOpen={showComprehensiveWizard}
        onClose={() => setShowComprehensiveWizard(false)}
        onSuccess={handleComprehensiveWizardSuccess}
      />

      {/* Hours Report Modal */}
      <HoursReportModal
        isOpen={showHoursReport}
        onClose={() => setShowHoursReport(false)}
      />

      {/* Unified Time Entry Dialog */}
      <UnifiedTimeEntryDialog
        open={showUnifiedDialog}
        onOpenChange={(open) => {
          setShowUnifiedDialog(open)
          if (!open) {
            setCalendarMode(false)
            setSelectedCalendarDate(undefined)
          }
        }}
        selectedDate={selectedCalendarDate}
        calendarMode={calendarMode}
        onSuccess={calendarMode ? handleCalendarTimeEntrySuccess : handleTimeEntryCreated}
        onStartTimer={handleStartTimer}
      />

      {/* Start Timer Dialog */}
      <Dialog open={showStartTimerDialog} onOpenChange={setShowStartTimerDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Start Timer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="client">Client *</Label>
              <Select value={startTimerClientId} onValueChange={handleStartTimerClientSelect}>
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
                        {client.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {startTimerClientId && (
              <div className="space-y-2">
                <Label htmlFor="project">Project</Label>
                <Select value={startTimerProjectId} onValueChange={setStartTimerProjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder={projectsLoading ? "Loading projects..." : "Select a project (optional)"} />
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
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={startTimerDescription}
                onChange={(e) => setStartTimerDescription(e.target.value)}
                placeholder="What are you working on?"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rate">Hourly Rate (€)</Label>
              <Input
                id="rate"
                type="number"
                value={startTimerHourlyRate}
                onChange={(e) => setStartTimerHourlyRate(Number(e.target.value))}
                placeholder="0"
                step="0.01"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowStartTimerDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleStartTimerSubmit} disabled={!startTimerClientId}>
                <Play className="h-4 w-4 mr-2" />
                Start Timer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Time Entry Dialog */}
      {editingTimeEntry && (
        <UnifiedTimeEntryDialog
          open={!!editingTimeEntry}
          onOpenChange={() => setEditingTimeEntry(null)}
          timeEntry={editingTimeEntry}
          onSuccess={handleTimeEntryUpdated}
        />
      )}

      {/* Timer Dialog */}
      <TimerDialog
        open={showTimerDialog}
        onOpenChange={setShowTimerDialog}
        selectedDate={timerDialogDate}
        onStartTimer={handleStartTimer}
      />

      {/* Quick Registration Dialog */}
      <QuickRegistrationDialog
        open={showQuickRegistrationDialog}
        onOpenChange={setShowQuickRegistrationDialog}
        selectedDate={quickRegistrationDate}
        onSuccess={handleQuickRegistrationSuccess}
      />
    </div>
  )
}
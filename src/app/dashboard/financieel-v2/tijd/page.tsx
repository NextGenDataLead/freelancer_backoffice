'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { GlassmorphicMetricCard } from '@/components/dashboard/glassmorphic-metric-card'
import { Card, CardContent } from '@/components/ui/card'
import { TimeEntryForm } from '@/components/financial/time/time-entry-form'
import { UnifiedTimeEntryForm } from '@/components/financial/time/unified-time-entry-form'
import { CalendarTimeEntryView } from '@/components/financial/time/calendar-time-entry-view'
import { TimeEntryList } from '@/components/financial/time/time-entry-list'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Clock, Plus, Play, Pause, Square, Euro, Users, Keyboard, List, Calendar as CalendarIcon, TrendingUp } from 'lucide-react'
import { getCurrentDate } from '@/lib/current-date'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export default function TijdPage() {
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
  const [timerPaused, setTimerPaused] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [clients, setClients] = useState<any[]>([])
  const [clientsLoading, setClientsLoading] = useState(true)
  const [pausedTime, setPausedTime] = useState(0)
  const [timeStats, setTimeStats] = useState<any>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | undefined>(undefined)
  const [selectedMonth, setSelectedMonth] = useState<Date>(getCurrentDate())
  const [calendarRefreshTrigger, setCalendarRefreshTrigger] = useState(0)
  const [selectedFilterDate, setSelectedFilterDate] = useState<Date | undefined>(undefined)

  // Unified form state
  const [showTimeEntryDialog, setShowTimeEntryDialog] = useState(false)
  const [timeEntryMode, setTimeEntryMode] = useState<'timer' | 'quick' | 'calendar' | 'new' | 'edit'>('new')
  const [selectedFormDate, setSelectedFormDate] = useState<Date | undefined>()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchClients = async () => {
    try {
      setClientsLoading(true)
      const response = await fetch('/api/clients?all=true')
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
        } else {
          localStorage.removeItem('activeTimerSession')
        }
      } catch (e) {
        console.error('Error restoring timer session:', e)
        localStorage.removeItem('activeTimerSession')
      }
    }
  }, [])

  // Handle action parameter from URL
  useEffect(() => {
    const action = searchParams?.get('action')
    if (action === 'start_timer') {
      startTimer()
    }
  }, [searchParams])

  const handleTimeEntryCreated = (timeEntry: any) => {
    setShowTimeEntryDialog(false)
    setEditingTimeEntry(null)
    setTimeEntryMode('new')
    setRefreshKey(prev => prev + 1)
    setSelectedFilterDate(undefined)
    fetchClients()
    fetchTimeStats()
  }

  const handleTimeEntryUpdated = (timeEntry: any) => {
    setShowTimeEntryDialog(false)
    setEditingTimeEntry(null)
    setTimeEntryMode('new')
    setRefreshKey(prev => prev + 1)
    setSelectedFilterDate(undefined)
    fetchClients()
    fetchTimeStats()
  }

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
    fetchTimeStats()
  }

  const handleEditTimeEntry = (timeEntry: any) => {
    console.log('Opening edit dialog for time entry:', timeEntry)
    setEditingTimeEntry(timeEntry)
    setTimeEntryMode('edit')
    if (timeEntry?.entry_date) {
      const parsedDate = new Date(timeEntry.entry_date)
      if (!Number.isNaN(parsedDate.getTime())) {
        setSelectedFormDate(parsedDate)
      }
    } else {
      setSelectedFormDate(undefined)
    }
    setSelectedCalendarDate(undefined)
    setShowTimeEntryDialog(true)
  }

  // Timer effect to update display every second
  useEffect(() => {
    if (timerRunning && startTime) {
      intervalRef.current = setInterval(() => {
        const now = new Date()
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
    setTimeEntryMode('timer')
    setSelectedFormDate(undefined)
    setShowTimeEntryDialog(true)
  }

  const handleStartTimer = (timerData: {
    clientId: string
    clientName: string
    projectId: string
    project: string
    description: string
    hourlyRate: number
    selectedDate?: Date
  }) => {
    // For timer mode, we always start the actual timer (not saving a time entry)
    const now = new Date()

    setSelectedClientId(timerData.clientId)
    setSelectedClient(timerData.clientName)
    setSelectedProjectId(timerData.projectId)
    setSelectedProject(timerData.project)
    setSelectedDescription(timerData.description)

    const timerSession = {
      ...timerData,
      billable: true,
      invoiced: false,
      startTime: now.toISOString(),
      pausedTime: 0,
      isPaused: false
    }
    localStorage.setItem('activeTimerSession', JSON.stringify(timerSession))

    setPausedTime(0)
    setTimerPaused(false)
    setStartTime(now)
    setTimerRunning(true)
    setCurrentTime('00:00:00')
  }

  const pauseTimer = () => {
    if (!startTime) return

    const now = new Date()
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
    const now = new Date()
    setStartTime(now)
    setTimerPaused(false)
    setTimerRunning(true)

    const timerSession = localStorage.getItem('activeTimerSession')
    if (timerSession) {
      try {
        const sessionData = JSON.parse(timerSession)
        sessionData.startTime = now.toISOString()
        sessionData.isPaused = false
        localStorage.setItem('activeTimerSession', JSON.stringify(sessionData))
      } catch (e) {
        console.error('Error updating timer session:', e)
      }
    }
  }

  const stopAndSaveTimer = async () => {
    if (!startTime) return

    const now = new Date()
    const currentSessionElapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000)
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
          toast.success('Time registered successfully!', {
            description: `${hours} hours for "${selectedClient}"`
          })
          handleRefresh()

          window.dispatchEvent(new CustomEvent('time-entry-created', {
            detail: { clientName: selectedClient, hours }
          }))
        } else {
          const error = await response.json()
          throw new Error(error.message || 'Failed to register time')
        }
      } catch (error) {
        console.error('Error registering time:', error)
        toast.error('Failed to register time', {
          description: error instanceof Error ? error.message : 'Unknown error'
        })
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

  // Calendar-specific handlers
  const handleDateSelect = (date: Date) => {
    setSelectedCalendarDate(date)
    setSelectedFilterDate(date)
    setTimeEntryMode('calendar')
    setSelectedFormDate(date)
    setShowTimeEntryDialog(true)
  }

  const handleMonthChange = (date: Date) => {
    setSelectedMonth(date)
  }

  const handleCreateTimeEntryForDate = (date: Date) => {
    setTimeEntryMode('calendar')
    setSelectedFormDate(date)
    setShowTimeEntryDialog(true)
  }

  return (
    <section className="main-grid" aria-label="Time tracking content">
      {/* Metric Cards Section */}
      <article className="glass-card" style={{ gridColumn: 'span 12', gridRow: 'span 1' }}>
        <div className="card-header">
          <div className="flex gap-3 ml-auto">
            <button
              type="button"
              className="action-chip"
              style={{ background: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.3)' }}
              onClick={() => {
                setTimeEntryMode('quick')
                setSelectedFormDate(undefined)
                setShowTimeEntryDialog(true)
              }}
            >
              <Clock className="h-4 w-4 mr-2" />
              New Time Entry
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '1.5rem' }}>
          {/* Card 1: This Week */}
          <div style={{ gridColumn: 'span 3' }}>
            <GlassmorphicMetricCard
              icon={Clock}
              iconColor="rgba(59, 130, 246, 0.7)"
              title="This Week"
              value={statsLoading ? '...' : `${timeStats?.thisWeek?.billableHours || 0}h`}
              subtitle={statsLoading ? '...' : (
                timeStats?.thisWeek?.difference >= 0
                  ? `+${timeStats.thisWeek.difference}h vs last week`
                  : `${timeStats.thisWeek.difference}h vs last week`
              )}
              badge={{
                label: 'Week',
                color: 'rgba(59, 130, 246, 0.25)',
              }}
              gradient="linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(37, 99, 235, 0.08))"
            />
          </div>

          {/* Card 2: This Month */}
          <div style={{ gridColumn: 'span 3' }}>
            <GlassmorphicMetricCard
              icon={Clock}
              iconColor="rgba(16, 185, 129, 0.7)"
              title="This Month"
              value={statsLoading ? '...' : `${timeStats?.thisMonth?.billableHours || 0}h`}
              subtitle={statsLoading ? '...' : `€${(timeStats?.thisMonth?.billableRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} in hours`}
              badge={{
                label: 'MTD',
                color: 'rgba(16, 185, 129, 0.25)',
              }}
              gradient="linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(5, 150, 105, 0.08))"
            />
          </div>

          {/* Card 3: Factureerbaar */}
          <div style={{ gridColumn: 'span 3' }}>
            <GlassmorphicMetricCard
              icon={Euro}
              iconColor="rgba(251, 146, 60, 0.7)"
              title="Ready to Invoice"
              value={statsLoading ? '...' : `${timeStats?.factureerbaar?.hours || 0}h`}
              subtitle={statsLoading ? '...' : `€${(timeStats?.factureerbaar?.revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} pending invoice`}
              badge={{
                label: 'Ready',
                color: 'rgba(251, 146, 60, 0.25)',
              }}
              gradient="linear-gradient(135deg, rgba(251, 146, 60, 0.12), rgba(249, 115, 22, 0.08))"
            />
          </div>

          {/* Card 4: Active Projects */}
          <div style={{ gridColumn: 'span 3' }}>
            <GlassmorphicMetricCard
              icon={Users}
              iconColor="rgba(139, 92, 246, 0.7)"
              title="Active Projects"
              value={statsLoading ? '...' : timeStats?.projects?.count || 0}
              subtitle={statsLoading ? '...' : `For ${timeStats?.projects?.clients || 0} different clients`}
              badge={{
                label: 'Projects',
                color: 'rgba(139, 92, 246, 0.25)',
              }}
              gradient="linear-gradient(135deg, rgba(139, 92, 246, 0.12), rgba(124, 58, 237, 0.08))"
            />
          </div>
        </div>
      </article>

      {/* Active Timer Card */}
      <article className="glass-card" style={{ gridColumn: 'span 12', gridRow: 'span 1', border: '2px solid rgba(59, 130, 246, 0.3)', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(37, 99, 235, 0.05))' }}>
        <div className="card-header">
          <h2 className="card-header__title flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Active Timer
          </h2>
          <div className="text-3xl font-mono font-bold" style={{ color: 'rgba(59, 130, 246, 1)' }}>
            {currentTime}
          </div>
        </div>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-100">
                {(timerRunning || timerPaused) && selectedClient && selectedProject
                  ? `${selectedProject} - ${selectedClient}`
                  : (timerRunning || timerPaused) && selectedClient
                    ? selectedClient
                    : 'No active session'}
              </p>
              <p className="text-xs text-slate-400">
                {(timerRunning || timerPaused) && selectedDescription
                  ? selectedDescription
                  : timerRunning && startTime
                    ? `Started at ${startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
                    : timerPaused
                      ? 'Paused - click resume to continue'
                      : 'Click "Start Timer" to begin'}
              </p>
            </div>
            <div className="flex space-x-2">
              {(timerRunning || timerPaused) ? (
                <>
                  <button
                    type="button"
                    className="action-chip"
                    onClick={toggleTimer}
                  >
                    {timerRunning ? (
                      <>
                        <Pause className="h-4 w-4 mr-2" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Resume
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className="action-chip"
                    style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                    onClick={stopAndSaveTimer}
                  >
                    <Square className="h-4 w-4 mr-2" />
                    Stop & Save
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="action-chip"
                  onClick={startTimer}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start Timer
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </article>

      {/* Calendar View */}
      <article className="glass-card" style={{ gridColumn: 'span 12', gridRow: 'span 1' }} aria-labelledby="calendar-title">
        <div className="card-header">
          <h2 className="card-header__title flex items-center" id="calendar-title">
            <CalendarIcon className="h-5 w-5 mr-2" />
            Calendar View
          </h2>
        </div>
        <CardContent className="pt-6">
          <CalendarTimeEntryView
            selectedMonth={selectedMonth}
            onMonthChange={handleMonthChange}
            onDateSelect={handleDateSelect}
            onCreateTimeEntry={handleCreateTimeEntryForDate}
            refreshTrigger={calendarRefreshTrigger}
          />
        </CardContent>
      </article>

      {/* Recent Time Entries */}
      <article className="glass-card" style={{ gridColumn: 'span 12', gridRow: 'span 1' }} aria-labelledby="recent-entries-title">
        <div className="card-header">
          <h2 className="card-header__title flex items-center" id="recent-entries-title">
            <List className="h-5 w-5 mr-2" />
            Recent Timesheet
          </h2>
          {selectedFilterDate && (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <CalendarIcon className="h-4 w-4" />
              <span>Filtered by: {selectedFilterDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</span>
              <button
                type="button"
                className="action-chip"
                style={{ height: '24px', fontSize: '0.75rem', padding: '0 0.5rem' }}
                onClick={() => setSelectedFilterDate(undefined)}
              >
                ✕ Clear filter
              </button>
            </div>
          )}
        </div>
        <CardContent className="pt-6">
          <TimeEntryList
            key={refreshKey}
            onEdit={handleEditTimeEntry}
            onRefresh={handleRefresh}
            showPagination={true}
            dateFilter={selectedFilterDate}
          />
        </CardContent>
      </article>

      {/* Unified Time Entry Form */}
      <UnifiedTimeEntryForm
        open={showTimeEntryDialog}
        onOpenChange={(open) => {
          setShowTimeEntryDialog(open)
          if (!open) {
            setSelectedCalendarDate(undefined)
            setSelectedFormDate(undefined)
            setEditingTimeEntry(null)
            setTimeEntryMode('new')
            setCalendarRefreshTrigger(prev => prev + 1)
          }
        }}
        mode={timeEntryMode}
        selectedDate={selectedFormDate}
        timeEntry={editingTimeEntry}
        onSuccess={(timeEntry) => {
          if (timeEntryMode === 'edit') {
            handleTimeEntryUpdated(timeEntry)
          } else {
            handleTimeEntryCreated(timeEntry)
          }
          setCalendarRefreshTrigger(prev => prev + 1)
        }}
        onStartTimer={handleStartTimer}
        clients={clients}
      />
    </section>
  )
}

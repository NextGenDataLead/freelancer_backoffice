'use client'

import { useState, useEffect, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TimerDialog } from '@/components/financial/time/timer-dialog'
import { useNotificationsStore } from '@/store/notifications-store'
import { getCurrentDate } from '@/lib/current-date'
import {
  Play,
  Pause,
  Square,
  Clock,
  Calendar,
  User,
  Timer,
  Activity,
  Plus,
  ChevronRight
} from 'lucide-react'

// Types for timer functionality
interface ActiveTimer {
  id?: string
  clientId: string
  clientName: string
  projectId: string
  project: string
  description?: string
  startTime: string
  pausedTime: number // Accumulated paused time in seconds
  isRunning: boolean
  isPaused: boolean
  billable: boolean
  hourlyRate: number
}

interface RecentTimeEntry {
  id: string
  client_name: string
  project_name: string
  description: string
  hours: number
  entry_date: string
}

interface TodayStats {
  totalHours: number
  billableHours: number
  entries: number
  revenue: number
}


// Format time helpers
const formatTimer = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
}

const formatCurrency = (amount: number) => `€${amount.toLocaleString()}`

interface ActiveTimerWidgetProps {
  className?: string
  onNavigateToTimer?: () => void
}

export function ActiveTimerWidget({ className, onNavigateToTimer }: ActiveTimerWidgetProps) {
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null)
  const [recentEntries, setRecentEntries] = useState<RecentTimeEntry[]>([])
  const [todayStats, setTodayStats] = useState<TodayStats>({
    totalHours: 0,
    billableHours: 0,
    entries: 0,
    revenue: 0
  })
  const [loading, setLoading] = useState(true)
  const [showStartDialog, setShowStartDialog] = useState(false)
  const [currentTime, setCurrentTime] = useState('00:00:00')
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Get notifications store for success messages
  const { addNotification } = useNotificationsStore()

  // Function to refresh widget data
  const refreshWidgetData = async () => {
    try {
      // Fetch today's stats and recent entries from API
      const response = await fetch('/api/time-entries/today')
      if (response.ok) {
        const result = await response.json()
        const data = result.data

        // Use the calculated stats from the API
        setTodayStats({
          totalHours: data.today.totalHours || 0,
          billableHours: data.today.billableHours || 0,
          entries: data.today.entriesCount || 0,
          revenue: data.today.revenue || 0
        })

        // Set recent entries (use recent entries from API)
        const formattedEntries = (data.recentEntries || []).slice(0, 3).map((entry: any) => ({
          id: entry.id,
          client_name: entry.client || 'Unknown Client',
          project_name: entry.project || 'General',
          description: entry.description || '',
          hours: entry.hours || 0,
          entry_date: entry.date || getCurrentDate().toISOString().split('T')[0]
        }))

        setRecentEntries(formattedEntries)
      }
    } catch (error) {
      console.error('Failed to refresh widget data:', error)
    }
  }

  // Fetch real timer data from API
  useEffect(() => {
    const fetchTimerData = async () => {
      try {
        setLoading(true)

        // Load active timer from localStorage (for timer persistence)
        const timerData = localStorage.getItem('activeTimerSession')
        if (timerData) {
          const timer = JSON.parse(timerData)
          const now = getCurrentDate()
          const sessionStartTime = new Date(timer.startTime)

          // Only restore if session is less than 24 hours old
          const hoursSinceStart = (now.getTime() - sessionStartTime.getTime()) / (1000 * 60 * 60)
          if (hoursSinceStart < 24) {
            setActiveTimer({
              clientId: timer.clientId,
              clientName: timer.clientName,
              projectId: timer.projectId || '',
              project: timer.project,
              description: timer.description || '',
              startTime: timer.startTime,
              pausedTime: timer.pausedTime || 0,
              isRunning: !timer.isPaused,
              isPaused: timer.isPaused || false,
              billable: timer.billable ?? true,
              hourlyRate: timer.hourlyRate || 0
            })
          } else {
            localStorage.removeItem('activeTimerSession')
          }
        }

        // Load initial data
        await refreshWidgetData()

      } catch (error) {
        console.error('Failed to fetch timer data:', error)
        // Fallback to empty state on error
        setTodayStats({
          totalHours: 0,
          billableHours: 0,
          entries: 0,
          revenue: 0
        })
      } finally {
        setLoading(false)
      }
    }

    fetchTimerData()
  }, [])


  // Timer update effect
  useEffect(() => {
    if (activeTimer?.isRunning) {
      intervalRef.current = setInterval(() => {
        const now = getCurrentDate()
        const sessionStartTime = new Date(activeTimer.startTime)
        const currentSessionElapsed = Math.floor((now.getTime() - sessionStartTime.getTime()) / 1000)
        const totalElapsed = currentSessionElapsed + (activeTimer.pausedTime || 0)

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
  }, [activeTimer?.isRunning, activeTimer?.startTime, activeTimer?.pausedTime])

  // Update display time for paused timer
  useEffect(() => {
    if (activeTimer?.isPaused) {
      const totalSeconds = activeTimer.pausedTime || 0
      const hours = Math.floor(totalSeconds / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      const seconds = totalSeconds % 60
      setCurrentTime(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      )
    }
  }, [activeTimer?.isPaused, activeTimer?.pausedTime])

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
    const timerSession = {
      ...timerData,
      startTime: getCurrentDate().toISOString(),
      pausedTime: 0,
      isPaused: false
    }

    localStorage.setItem('activeTimerSession', JSON.stringify(timerSession))

    setActiveTimer({
      ...timerSession,
      isRunning: true
    })

    setShowStartDialog(false)
  }

  const handlePauseTimer = () => {
    if (!activeTimer) return

    const now = getCurrentDate()
    const sessionStartTime = new Date(activeTimer.startTime)
    const currentSessionElapsed = Math.floor((now.getTime() - sessionStartTime.getTime()) / 1000)
    const newPausedTime = (activeTimer.pausedTime || 0) + currentSessionElapsed

    const updatedTimer = {
      ...activeTimer,
      isRunning: false,
      isPaused: true,
      pausedTime: newPausedTime
    }

    setActiveTimer(updatedTimer)

    // Update localStorage
    const timerSession = localStorage.getItem('activeTimerSession')
    if (timerSession) {
      try {
        const sessionData = JSON.parse(timerSession)
        sessionData.pausedTime = newPausedTime
        sessionData.isPaused = true
        localStorage.setItem('activeTimerSession', JSON.stringify(sessionData))
      } catch (e) {
        console.error('Error updating timer session:', e)
      }
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  const handleResumeTimer = () => {
    if (!activeTimer) return

    const updatedTimer = {
      ...activeTimer,
      startTime: getCurrentDate().toISOString(),
      isRunning: true,
      isPaused: false
    }

    setActiveTimer(updatedTimer)

    // Update localStorage
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

  const handleStopTimer = async () => {
    if (!activeTimer) return

    const now = getCurrentDate()
    const sessionStartTime = new Date(activeTimer.startTime)
    const currentSessionElapsed = activeTimer.isRunning
      ? Math.floor((now.getTime() - sessionStartTime.getTime()) / 1000)
      : 0
    const totalElapsedSeconds = currentSessionElapsed + (activeTimer.pausedTime || 0)
    const elapsed = totalElapsedSeconds / 3600

    if (elapsed > 0.0001) {
      const hours = Math.round(elapsed * 100) / 100

      try {
        const timeEntryData = {
          client_id: activeTimer.clientId,
          project_id: activeTimer.projectId,
          project_name: activeTimer.project || '',
          description: activeTimer.description || '',
          entry_date: getCurrentDate().toISOString().split('T')[0],
          hours: hours,
          hourly_rate: activeTimer.hourlyRate || 0,
          billable: activeTimer.billable ?? true,
          invoiced: false
        }

        const response = await fetch('/api/time-entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(timeEntryData)
        })

        if (response.ok) {
          // Show beautiful success notification
          addNotification({
            type: 'success',
            title: 'Timer Gestopt!',
            message: `${hours} uur succesvol geregistreerd voor "${activeTimer.clientName}"`,
            duration: 5000 // Auto-dismiss after 5 seconds
          })

          // Refresh the widget data without full page reload
          setTimeout(async () => {
            await refreshWidgetData()

            // Trigger a custom event to notify the financial dashboard to refresh
            window.dispatchEvent(new CustomEvent('time-entry-created', {
              detail: { clientName: activeTimer.clientName, hours }
            }))
          }, 500)
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
    setActiveTimer(null)
    setCurrentTime('00:00:00')

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  if (loading) {
    return (
      <Card className={`mobile-card-glass ${className}`}>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-muted rounded-lg animate-pulse"></div>
              <div>
                <div className="h-4 w-24 bg-muted animate-pulse rounded mb-2"></div>
                <div className="h-3 w-32 bg-muted animate-pulse rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className={`mobile-card-glass ${className}`}>
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/20 rounded-lg">
              <Timer className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-base font-semibold">Active Timer</h3>
          </div>
          <button
            onClick={onNavigateToTimer}
            className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1"
          >
            View All
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Active Timer Display */}
        {activeTimer ? (
          <div className="space-y-3">
            {/* Timer Info */}
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-medium text-sm">{activeTimer.clientName}</p>
                  <p className="text-xs text-muted-foreground">{activeTimer.project}</p>
                  {activeTimer.description && (
                    <p className="text-xs text-muted-foreground">{activeTimer.description}</p>
                  )}
                </div>
                <Badge className={`${
                  activeTimer.isRunning ? 'bg-green-100 text-green-700 border-green-200' : 'bg-orange-100 text-orange-700 border-orange-200'
                }`}>
                  {activeTimer.isRunning ? 'Running' : 'Paused'}
                </Badge>
              </div>

              {/* Timer Display */}
              <div className="flex items-center justify-between">
                <div className={`text-2xl font-mono font-bold ${
                  activeTimer.isRunning ? 'text-green-600' : 'text-orange-600'
                }`}>
                  {currentTime}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={activeTimer.isRunning ? handlePauseTimer : handleResumeTimer}
                  >
                    {activeTimer.isRunning ? (
                      <>
                        <Pause className="h-3 w-3 mr-1" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="h-3 w-3 mr-1" />
                        Resume
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleStopTimer}
                  >
                    <Square className="h-3 w-3 mr-1" />
                    Stop
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 space-y-3">
            <div className="w-12 h-12 bg-muted/50 rounded-full flex items-center justify-center mx-auto">
              <Timer className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">No active timer</p>
              <p className="text-xs text-muted-foreground">Start tracking your time</p>
            </div>
            <Button size="sm" onClick={() => setShowStartDialog(true)}>
              <Play className="h-3 w-3 mr-1" />
              Start Timer
            </Button>
          </div>
        )}

        {/* Today's Stats */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t">
          <div className="text-center">
            <div className="text-lg font-bold text-primary">{todayStats.totalHours}h</div>
            <div className="text-xs text-muted-foreground">Today</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-green-600">{formatCurrency(todayStats.revenue)}</div>
            <div className="text-xs text-muted-foreground">Revenue</div>
          </div>
        </div>

        {/* Recent Entries */}
        {recentEntries.length > 0 && (
          <div className="space-y-2 pt-3 border-t">
            <h4 className="text-sm font-medium text-muted-foreground">Recent Entries</h4>
            {recentEntries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between p-2 rounded bg-muted/30">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{entry.client_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{entry.project_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{new Date(entry.entry_date).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-xs font-medium text-primary">{entry.hours}h</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Start Timer Dialog */}
      <TimerDialog
        open={showStartDialog}
        onOpenChange={setShowStartDialog}
        onStartTimer={handleStartTimer}
      />
    </Card>
  )
}
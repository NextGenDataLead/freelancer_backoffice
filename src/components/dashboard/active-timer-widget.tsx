'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
  client: string
  project: string
  description?: string
  startTime: string
  elapsedTime: number // in seconds
  isRunning: boolean
}

interface RecentTimeEntry {
  id: string
  client: string
  project: string
  description: string
  duration: number // in minutes
  date: string
  billable: boolean
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
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60

  if (hours > 0) {
    return `${hours}h ${mins}m`
  }
  return `${mins}m`
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

  // Fetch real timer data from API
  useEffect(() => {
    const fetchTimerData = async () => {
      try {
        setLoading(true)

        // Load active timer from localStorage (for timer persistence)
        const timerData = localStorage.getItem('activeTimer')
        if (timerData) {
          const timer = JSON.parse(timerData)
          setActiveTimer({
            ...timer,
            elapsedTime: Math.floor((Date.now() - new Date(timer.startTime).getTime()) / 1000)
          })
        }

        // Fetch today's stats and recent entries from API
        const response = await fetch('/api/time-entries/today')
        if (!response.ok) {
          throw new Error(`Failed to fetch today's data: ${response.status}`)
        }

        const result = await response.json()

        if (result.success && result.data) {
          const { today, recentEntries: apiRecentEntries } = result.data

          // Update today's stats
          setTodayStats({
            totalHours: today.totalHours || 0,
            billableHours: today.billableHours || 0,
            entries: today.entriesCount || 0,
            revenue: today.revenue || 0
          })

          // Format recent entries for display
          const formattedEntries: RecentTimeEntry[] = apiRecentEntries.map((entry: any) => ({
            id: entry.id,
            client: entry.client,
            project: entry.project,
            description: entry.description || '',
            duration: Math.round(entry.hours * 60), // Convert hours to minutes
            date: entry.date,
            billable: true // Assume billable for now, could be added to API response
          }))

          setRecentEntries(formattedEntries)
        }

      } catch (error) {
        console.error('Failed to fetch timer data:', error)
        // Fallback to empty state on error
        setTodayStats({
          totalHours: 0,
          billableHours: 0,
          entries: 0,
          revenue: 0
        })
        setRecentEntries([])
      } finally {
        setLoading(false)
      }
    }

    fetchTimerData()

    // Update timer every second if running
    const interval = setInterval(() => {
      if (activeTimer?.isRunning) {
        setActiveTimer(prev => prev ? {
          ...prev,
          elapsedTime: Math.floor((Date.now() - new Date(prev.startTime).getTime()) / 1000)
        } : null)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [activeTimer?.isRunning])

  const handleStartTimer = () => {
    // TODO: Implement start timer logic
    const newTimer: ActiveTimer = {
      client: 'Quick Entry',
      project: 'General',
      startTime: new Date().toISOString(),
      elapsedTime: 0,
      isRunning: true
    }
    setActiveTimer(newTimer)
    localStorage.setItem('activeTimer', JSON.stringify(newTimer))
  }

  const handlePauseTimer = () => {
    if (activeTimer) {
      const updatedTimer = { ...activeTimer, isRunning: false }
      setActiveTimer(updatedTimer)
      localStorage.setItem('activeTimer', JSON.stringify(updatedTimer))
    }
  }

  const handleStopTimer = () => {
    if (activeTimer) {
      // TODO: Save time entry to database
      setActiveTimer(null)
      localStorage.removeItem('activeTimer')
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
                  <p className="font-medium text-sm">{activeTimer.client}</p>
                  <p className="text-xs text-muted-foreground">{activeTimer.project}</p>
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
                  {formatTimer(activeTimer.elapsedTime)}
                </div>

                {/* Timer Controls */}
                <div className="flex items-center gap-2">
                  {activeTimer.isRunning ? (
                    <button
                      onClick={handlePauseTimer}
                      className="p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
                    >
                      <Pause className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => setActiveTimer(prev => prev ? { ...prev, isRunning: true } : null)}
                      className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                    >
                      <Play className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={handleStopTimer}
                    className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                  >
                    <Square className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* No Active Timer - Quick Start */
          <div className="text-center py-4">
            <div className="p-3 bg-muted/50 rounded-lg mb-3">
              <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-3">No timer running</p>
              <button
                onClick={handleStartTimer}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Play className="h-4 w-4" />
                Quick Start
              </button>
            </div>
          </div>
        )}

        {/* Today's Stats */}
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Today's Summary
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-2 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-lg font-bold text-blue-600">{todayStats.totalHours}h</p>
              <p className="text-xs text-blue-600">Total</p>
            </div>
            <div className="text-center p-2 bg-green-50 rounded-lg border border-green-200">
              <p className="text-lg font-bold text-green-600">{formatCurrency(todayStats.revenue)}</p>
              <p className="text-xs text-green-600">Revenue</p>
            </div>
          </div>
        </div>

        {/* Recent Entries */}
        {recentEntries.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Recent Entries
            </h4>
            <div className="space-y-2">
              {recentEntries.slice(0, 2).map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{entry.client}</p>
                    <p className="text-xs text-muted-foreground truncate">{entry.project}</p>
                  </div>
                  <div className="text-right ml-2">
                    <p className="text-sm font-medium">{formatDuration(entry.duration)}</p>
                    <Badge className={`text-xs ${
                      entry.billable ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {entry.billable ? 'Billable' : 'Non-bill'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Action */}
        <div className="pt-2 border-t border-border/20">
          <button
            onClick={onNavigateToTimer}
            className="w-full flex items-center justify-center gap-2 p-2 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Time Entry
          </button>
        </div>
      </div>
    </Card>
  )
}
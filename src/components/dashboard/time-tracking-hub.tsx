'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { KPICard, QuickActionCard, SectionHeader } from './dashboard-cards'
import { 
  Play, 
  Pause, 
  Square, 
  Clock, 
  Timer, 
  Calendar, 
  Users, 
  Target,
  Activity,
  BarChart3,
  PlusCircle,
  Edit3,
  TrendingUp
} from 'lucide-react'

// Mock data for active time tracking
interface ActiveTimer {
  id: string
  projectName: string
  clientName: string
  taskDescription: string
  startTime: Date
  elapsedSeconds: number
}

// Mock data
const mockTimeData = {
  todayHours: 6.5,
  weekHours: 32,
  monthHours: 128,
  billableHours: 120,
  activeProjects: 8,
  recentEntries: [
    { 
      project: 'Website Redesign', 
      client: 'TechCorp', 
      hours: 2.5, 
      status: 'billable' as const,
      date: 'Today'
    },
    { 
      project: 'Mobile App', 
      client: 'StartupCo', 
      hours: 4.0, 
      status: 'billable' as const,
      date: 'Yesterday'
    },
    { 
      project: 'Admin Tasks', 
      client: 'Internal', 
      hours: 1.5, 
      status: 'non-billable' as const,
      date: 'Today'
    }
  ]
}

export function TimeTrackingHub() {
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)

  // Mock timer functionality
  const startTimer = (projectName: string, clientName: string, taskDescription: string) => {
    const timer: ActiveTimer = {
      id: Math.random().toString(36),
      projectName,
      clientName,
      taskDescription,
      startTime: new Date(),
      elapsedSeconds: 0
    }
    setActiveTimer(timer)
    setElapsedTime(0)
    
    // In real implementation, this would start an actual timer
    console.log('Timer started for:', projectName)
  }

  const pauseTimer = () => {
    if (activeTimer) {
      console.log('Timer paused')
      // In real implementation, pause the timer
    }
  }

  const stopTimer = () => {
    if (activeTimer) {
      console.log('Timer stopped, saving entry...')
      setActiveTimer(null)
      setElapsedTime(0)
    }
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const formatHours = (hours: number) => `${hours}h`

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Time Tracking Hub</h2>
          <p className="text-muted-foreground mt-1">Track your time and manage your productivity</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="status-indicator status-active">
            <span>Live Tracking</span>
          </div>
        </div>
      </div>

      {/* Enhanced Active Timer Section */}
      {activeTimer ? (
        <div className="dashboard-card-glass border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary/20 rounded-xl">
                  <Activity className="h-6 w-6 text-primary chart-glow-blue" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">Active Timer</h3>
                  <p className="text-sm text-muted-foreground">Currently tracking</p>
                </div>
              </div>
              <div className="status-indicator status-active">
                <span>Recording</span>
              </div>
            </div>
            
            <div className="text-center space-y-6">
              <div className="timer-display">
                {formatTime(elapsedTime)}
              </div>
              
              <div className="space-y-2">
                <h4 className="text-xl font-semibold text-foreground">{activeTimer.projectName}</h4>
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <span className="text-sm font-medium">{activeTimer.clientName}</span>
                  <div className="w-1 h-1 bg-muted-foreground rounded-full"></div>
                  <span className="text-sm">{activeTimer.taskDescription}</span>
                </div>
              </div>
              
              <div className="flex justify-center space-x-4">
                <Button variant="outline" size="lg" onClick={pauseTimer} className="kpi-card">
                  <Pause className="h-5 w-5 mr-2" />
                  Pause
                </Button>
                <Button variant="destructive" size="lg" onClick={stopTimer} className="btn-primary-glow bg-red-500 hover:bg-red-600">
                  <Square className="h-5 w-5 mr-2" />
                  Stop & Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="dashboard-card-glass border-dashed border-2 border-muted-foreground/30">
          <div className="p-8 text-center space-y-6">
            <div className="p-4 bg-muted/20 rounded-2xl w-fit mx-auto">
              <Timer className="h-16 w-16 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">No Active Timer</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Start tracking time for your projects and tasks to monitor productivity and bill clients accurately
              </p>
            </div>
            <Button 
              onClick={() => startTimer('New Project', 'Client Name', 'Task description')} 
              className="btn-primary-glow" 
              size="lg"
            >
              <Play className="h-5 w-5 mr-2" />
              Start Timer
            </Button>
          </div>
        </div>
      )}

      {/* Enhanced Time Overview KPIs */}
      <div className="dashboard-grid">
        <div className="kpi-card dashboard-card-glass p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Today's Hours</p>
              <p className="text-3xl font-bold metric-number text-primary">
                {formatHours(mockTimeData.todayHours)}
              </p>
            </div>
            <div className="p-3 bg-primary/20 rounded-xl">
              <Clock className="h-6 w-6 text-primary chart-glow-blue" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Current day total</p>
            <div className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary">
              Active
            </div>
          </div>
        </div>

        <div className="kpi-card dashboard-card-glass p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">This Week</p>
              <p className="text-3xl font-bold metric-number text-green-400">
                {formatHours(mockTimeData.weekHours)}
              </p>
            </div>
            <div className="p-3 bg-success/20 rounded-xl">
              <Calendar className="h-6 w-6 text-green-400 chart-glow-green" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Weekly progress</p>
            <div className="flex items-center gap-1 text-green-400 text-sm font-medium">
              <TrendingUp className="h-4 w-4" />
              +8 vs last week
            </div>
          </div>
        </div>

        <div className="kpi-card dashboard-card-glass p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Billable Hours</p>
              <p className="text-3xl font-bold metric-number text-accent">
                {formatHours(mockTimeData.billableHours)}
              </p>
            </div>
            <div className="p-3 bg-accent/20 rounded-xl">
              <Target className="h-6 w-6 text-accent chart-glow-orange" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {((mockTimeData.billableHours / mockTimeData.monthHours) * 100).toFixed(1)}% of total
            </p>
            <div className="text-xs text-accent font-medium">
              Excellent ratio
            </div>
          </div>
        </div>

        <div className="kpi-card dashboard-card-glass p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Active Projects</p>
              <p className="text-3xl font-bold metric-number text-purple-400">
                {mockTimeData.activeProjects}
              </p>
            </div>
            <div className="p-3 bg-purple-500/20 rounded-xl">
              <Users className="h-6 w-6 text-purple-400" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Currently tracking</p>
            <div className="text-xs text-purple-400 font-medium">
              View all →
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="kpi-card dashboard-card-glass p-6 space-y-4 border-primary/30 bg-gradient-to-br from-primary/10 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-xl">
                <Play className="h-5 w-5 text-primary chart-glow-blue" />
              </div>
              <div>
                <h3 className="font-semibold">Start New Timer</h3>
                <p className="text-sm text-muted-foreground">Begin tracking time</p>
              </div>
            </div>
            <div className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary font-medium">
              Ctrl+T
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Quickly start tracking time for any project or client task
          </p>
        </div>

        <div className="kpi-card dashboard-card-glass p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/20 rounded-xl">
                <PlusCircle className="h-5 w-5 text-accent chart-glow-orange" />
              </div>
              <div>
                <h3 className="font-semibold">Add Manual Entry</h3>
                <p className="text-sm text-muted-foreground">Log previous work</p>
              </div>
            </div>
            <div className="text-xs px-2 py-1 rounded-full bg-accent/20 text-accent font-medium">
              Ctrl+M
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Add time entries for work completed without tracking
          </p>
        </div>

        <div className="kpi-card dashboard-card-glass p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-xl">
                <BarChart3 className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold">View Reports</h3>
                <p className="text-sm text-muted-foreground">Analyze time data</p>
              </div>
            </div>
            <div className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-400 font-medium">
              Ctrl+R
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Generate insights and reports from your time tracking
          </p>
        </div>
      </div>

      {/* Enhanced Recent Time Entries */}
      <div className="dashboard-card-glass p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/20 rounded-xl">
              <Clock className="h-6 w-6 text-primary chart-glow-blue" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">Recent Time Entries</h3>
              <p className="text-sm text-muted-foreground">Latest tracked sessions</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="kpi-card" asChild>
            <a href="/dashboard/financieel/tijd">
              View All
            </a>
          </Button>
        </div>

        <div className="space-y-4">
          {mockTimeData.recentEntries.map((entry, index) => (
            <div key={index} className="kpi-card dashboard-card-glass p-4 border border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="font-semibold text-base">{entry.project}</h4>
                    <Badge 
                      variant={entry.status === 'billable' ? 'default' : 'secondary'}
                      className={`text-xs ${
                        entry.status === 'billable' 
                          ? 'bg-success/20 text-green-400 border-success/30' 
                          : 'bg-muted/20 text-muted-foreground'
                      }`}
                    >
                      {entry.status}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <span className="font-medium">{entry.client}</span>
                    <div className="w-1 h-1 bg-muted-foreground rounded-full"></div>
                    <span>{entry.date}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="font-mono font-bold text-xl metric-number">
                      {formatHours(entry.hours)}
                    </p>
                    <p className="text-xs text-muted-foreground">logged</p>
                  </div>
                  <Button variant="ghost" size="sm" className="kpi-card p-2">
                    <Edit3 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Enhanced Productivity Insights */}
      <div className="dashboard-card-glass bg-gradient-to-br from-primary/10 via-accent/5 to-purple-500/10 border-primary/20">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/20 rounded-xl">
                <BarChart3 className="h-6 w-6 text-primary chart-glow-blue" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">Productivity Insights</h3>
                <p className="text-sm text-muted-foreground">Performance analytics</p>
              </div>
            </div>
            <div className="status-indicator status-active">
              <span>AI Powered</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center space-y-2">
              <div className="p-4 bg-primary/10 rounded-2xl">
                <div className="text-3xl font-bold metric-number text-primary mb-1">94%</div>
                <div className="w-full bg-muted/30 rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full progress-fill" style={{ width: '94%' }}></div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground font-medium">Time tracking accuracy</p>
            </div>
            
            <div className="text-center space-y-2">
              <div className="p-4 bg-accent/10 rounded-2xl">
                <div className="text-3xl font-bold metric-number text-accent mb-1">6.2h</div>
                <div className="w-full bg-muted/30 rounded-full h-2">
                  <div className="bg-accent h-2 rounded-full progress-fill" style={{ width: '77%' }}></div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground font-medium">Average daily focus time</p>
            </div>
            
            <div className="text-center space-y-2">
              <div className="p-4 bg-success/10 rounded-2xl">
                <div className="text-3xl font-bold metric-number text-green-400 mb-1">85%</div>
                <div className="w-full bg-muted/30 rounded-full h-2">
                  <div className="bg-green-400 h-2 rounded-full progress-fill" style={{ width: '85%' }}></div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground font-medium">Billable time ratio</p>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-border/50">
            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>Productivity trending upward</span>
              </div>
              <div className="h-3 w-px bg-border"></div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-400" />
                <span>+8% vs last week</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
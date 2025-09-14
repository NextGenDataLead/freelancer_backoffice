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
  Edit3
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
    <div className="space-y-6">
      <SectionHeader 
        title="Time Tracking Hub" 
        description="Track your time and manage your productivity"
        action={{
          label: "Full Time Dashboard",
          href: "/dashboard/financieel/tijd"
        }}
      />

      {/* Active Timer Section */}
      {activeTimer ? (
        <Card className="border-2 border-primary bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-primary" />
                <span>Active Timer</span>
              </div>
              <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                <div className="w-2 h-2 bg-green-600 rounded-full mr-2 animate-pulse"></div>
                Recording
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-4xl font-mono font-bold text-primary mb-2">
                  {formatTime(elapsedTime)}
                </div>
                <div className="space-y-1">
                  <p className="font-medium">{activeTimer.projectName}</p>
                  <p className="text-sm text-muted-foreground">
                    {activeTimer.clientName} • {activeTimer.taskDescription}
                  </p>
                </div>
              </div>
              <div className="flex justify-center space-x-2">
                <Button variant="outline" size="sm" onClick={pauseTimer}>
                  <Pause className="h-4 w-4 mr-1" />
                  Pause
                </Button>
                <Button variant="destructive" size="sm" onClick={stopTimer}>
                  <Square className="h-4 w-4 mr-1" />
                  Stop & Save
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed border-2">
          <CardContent className="p-6 text-center">
            <Timer className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">No Active Timer</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Start tracking time for your projects and tasks
            </p>
            <Button onClick={() => startTimer('New Project', 'Client Name', 'Task description')}>
              <Play className="h-4 w-4 mr-1" />
              Start Timer
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Time Overview KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard
          title="Today's Hours"
          value={formatHours(mockTimeData.todayHours)}
          subtitle="Current day total"
          icon={<Clock className="h-4 w-4" />}
          status="positive"
        />

        <KPICard
          title="This Week"
          value={formatHours(mockTimeData.weekHours)}
          subtitle="Weekly progress"
          trend={{
            value: 8,
            direction: 'up',
            label: 'vs last week'
          }}
          icon={<Calendar className="h-4 w-4" />}
          status="positive"
        />

        <KPICard
          title="Billable Hours"
          value={formatHours(mockTimeData.billableHours)}
          subtitle={`${((mockTimeData.billableHours / mockTimeData.monthHours) * 100).toFixed(1)}% of total`}
          icon={<Target className="h-4 w-4" />}
          status="positive"
        />

        <KPICard
          title="Active Projects"
          value={mockTimeData.activeProjects.toString()}
          subtitle="Currently tracking"
          icon={<Users className="h-4 w-4" />}
          status="neutral"
          action={{
            label: "Manage Projects",
            href: "/dashboard/financieel/klanten"
          }}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickActionCard
          title="Start New Timer"
          description="Begin tracking time for a project"
          icon={<Play className="h-4 w-4" />}
          href="/dashboard/financieel/tijd"
          shortcut="Ctrl+T"
          variant="featured"
        />

        <QuickActionCard
          title="Add Manual Entry"
          description="Log time worked previously"
          icon={<PlusCircle className="h-4 w-4" />}
          href="/dashboard/financieel/tijd"
          shortcut="Ctrl+M"
        />

        <QuickActionCard
          title="View Reports"
          description="Analyze your time tracking data"
          icon={<BarChart3 className="h-4 w-4" />}
          href="/dashboard/analytics"
          shortcut="Ctrl+R"
        />
      </div>

      {/* Recent Time Entries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Recent Time Entries</span>
            </div>
            <Button variant="outline" size="sm" asChild>
              <a href="/dashboard/financieel/tijd">
                View All
              </a>
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockTimeData.recentEntries.map((entry, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium text-sm">{entry.project}</h4>
                    <Badge 
                      variant={entry.status === 'billable' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {entry.status}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
                    <span>{entry.client}</span>
                    <span>•</span>
                    <span>{entry.date}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="font-mono font-medium text-sm">
                    {formatHours(entry.hours)}
                  </span>
                  <Button variant="ghost" size="sm">
                    <Edit3 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Productivity Insights */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <span>Productivity Insights</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 mb-1">94%</div>
              <p className="text-muted-foreground">Time tracking accuracy</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 mb-1">6.2h</div>
              <p className="text-muted-foreground">Average daily focus time</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 mb-1">85%</div>
              <p className="text-muted-foreground">Billable time ratio</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
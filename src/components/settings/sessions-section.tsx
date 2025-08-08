'use client'

import * as React from 'react'
import { useUser } from '@clerk/nextjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useNotificationActions } from '@/store/notifications-store'
import { 
  Monitor, 
  Smartphone, 
  Tablet,
  MapPin,
  Clock,
  Shield,
  LogOut,
  AlertTriangle
} from 'lucide-react'

interface SessionData {
  id: string
  device: string
  browser: string
  location: string
  lastActive: string
  isCurrent: boolean
  deviceType: 'desktop' | 'mobile' | 'tablet'
}

// Sample session data - in a real app this would come from your backend
const sampleSessions: SessionData[] = [
  {
    id: '1',
    device: 'MacBook Pro',
    browser: 'Chrome 120.0',
    location: 'San Francisco, CA',
    lastActive: '2 minutes ago',
    isCurrent: true,
    deviceType: 'desktop'
  },
  {
    id: '2',
    device: 'iPhone 15',
    browser: 'Safari 17.1',
    location: 'San Francisco, CA',
    lastActive: '1 hour ago',
    isCurrent: false,
    deviceType: 'mobile'
  },
  {
    id: '3',
    device: 'iPad Pro',
    browser: 'Safari 17.1',
    location: 'Oakland, CA',
    lastActive: '2 days ago',
    isCurrent: false,
    deviceType: 'tablet'
  },
  {
    id: '4',
    device: 'Windows PC',
    browser: 'Edge 120.0',
    location: 'Los Angeles, CA',
    lastActive: '1 week ago',
    isCurrent: false,
    deviceType: 'desktop'
  }
]

const getDeviceIcon = (deviceType: string) => {
  switch (deviceType) {
    case 'mobile':
      return <Smartphone className="h-4 w-4" />
    case 'tablet':
      return <Tablet className="h-4 w-4" />
    default:
      return <Monitor className="h-4 w-4" />
  }
}

export function SessionsSection() {
  const { user } = useUser()
  const { showSuccess, showWarning } = useNotificationActions()
  const [sessions, setSessions] = React.useState(sampleSessions)

  const handleRevokeSession = (sessionId: string) => {
    setSessions(sessions.filter(session => session.id !== sessionId))
    showSuccess('Session Revoked', 'The session has been successfully terminated.')
  }

  const handleRevokeAllSessions = () => {
    setSessions(sessions.filter(session => session.isCurrent))
    showWarning(
      'All Sessions Revoked', 
      'All other sessions have been terminated. You may need to sign in again on other devices.'
    )
  }

  const activeSessions = sessions.filter(session => !session.isCurrent)
  const currentSession = sessions.find(session => session.isCurrent)

  return (
    <div className="space-y-6">
      {/* Current Session */}
      {currentSession && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="mr-2 h-5 w-5 text-green-600" />
              Current Session
            </CardTitle>
            <p className="text-sm text-slate-600">
              This is the device you're currently using.
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex items-start space-x-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-green-600">
                {getDeviceIcon(currentSession.deviceType)}
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h4 className="font-medium text-slate-900">{currentSession.device}</h4>
                  <Badge variant="secondary" className="text-green-700 bg-green-100">
                    Current
                  </Badge>
                </div>
                <div className="space-y-1 text-sm text-slate-600">
                  <div className="flex items-center space-x-4">
                    <span>{currentSession.browser}</span>
                    <div className="flex items-center space-x-1">
                      <MapPin className="h-3 w-3" />
                      <span>{currentSession.location}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>Active {currentSession.lastActive}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Monitor className="mr-2 h-5 w-5" />
                Active Sessions ({activeSessions.length})
              </CardTitle>
              <p className="text-sm text-slate-600 mt-1">
                Manage devices that have access to your account.
              </p>
            </div>
            {activeSessions.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRevokeAllSessions}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Revoke All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {activeSessions.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="mx-auto h-12 w-12 text-slate-400" />
              <h3 className="mt-4 text-sm font-medium text-slate-900">No other active sessions</h3>
              <p className="mt-2 text-sm text-slate-500">
                You're only signed in on this device.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeSessions.map((session, index) => (
                <div key={session.id}>
                  <div className="flex items-start space-x-4 p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="text-slate-400">
                      {getDeviceIcon(session.deviceType)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-slate-900">{session.device}</h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRevokeSession(session.id)}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <LogOut className="mr-1 h-3 w-3" />
                          Revoke
                        </Button>
                      </div>
                      <div className="mt-2 space-y-1 text-sm text-slate-600">
                        <div className="flex items-center space-x-4">
                          <span>{session.browser}</span>
                          <div className="flex items-center space-x-1">
                            <MapPin className="h-3 w-3" />
                            <span>{session.location}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>Last active {session.lastActive}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {index < activeSessions.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="mr-2 h-5 w-5 text-amber-500" />
            Security Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start space-x-2">
              <div className="h-1.5 w-1.5 rounded-full bg-slate-400 mt-2"></div>
              <p className="text-slate-600">
                <strong>Sign out of unfamiliar devices:</strong> If you see a session you don't recognize, 
                revoke it immediately and change your password.
              </p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="h-1.5 w-1.5 rounded-full bg-slate-400 mt-2"></div>
              <p className="text-slate-600">
                <strong>Use secure networks:</strong> Avoid signing in on public or untrusted Wi-Fi networks 
                whenever possible.
              </p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="h-1.5 w-1.5 rounded-full bg-slate-400 mt-2"></div>
              <p className="text-slate-600">
                <strong>Regular cleanup:</strong> Periodically review and revoke sessions from devices 
                you no longer use.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
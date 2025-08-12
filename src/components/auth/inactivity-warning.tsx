/**
 * Inactivity Warning Component
 * Shows a warning dialog when user is about to be logged out due to inactivity
 */

'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuthContext } from '@/components/providers/auth-provider'

export function InactivityWarning() {
  const { inactivityWarning, dismissInactivityWarning, forceLogout } = useAuthContext()
  const [countdown, setCountdown] = useState(5 * 60) // 5 minutes countdown

  useEffect(() => {
    if (!inactivityWarning) {
      setCountdown(5 * 60)
      return
    }

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          forceLogout('Session expired due to inactivity')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [inactivityWarning, forceLogout])

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const handleStayActive = () => {
    dismissInactivityWarning()
    setCountdown(5 * 60)
  }

  const handleLogoutNow = () => {
    forceLogout('User initiated logout from inactivity warning')
  }

  if (!inactivityWarning) return null

  return (
    <Dialog open={inactivityWarning} onOpenChange={() => {}}>
      <DialogContent className="max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            Session About to Expire
          </DialogTitle>
          <DialogDescription>
            You've been inactive for a while. Your session will expire automatically for security reasons.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <Alert className="border-amber-200 bg-amber-50">
            <Clock className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <div className="flex items-center justify-between">
                <span>Time remaining:</span>
                <span className="text-2xl font-mono font-bold text-amber-900">
                  {formatTime(countdown)}
                </span>
              </div>
            </AlertDescription>
          </Alert>

          <div className="text-sm text-slate-600 space-y-2">
            <p>For your security, we automatically log out inactive sessions.</p>
            <p>Click "Stay Active" to continue your session, or "Logout" to sign out now.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={handleStayActive}
            className="flex-1"
            size="lg"
          >
            <Clock className="h-4 w-4 mr-2" />
            Stay Active
          </Button>
          <Button
            onClick={handleLogoutNow}
            variant="outline"
            className="flex-1"
            size="lg"
          >
            Logout Now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
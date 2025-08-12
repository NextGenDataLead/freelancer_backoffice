'use client'

import * as React from 'react'
import { useUser } from '@clerk/nextjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { useNotificationActions } from '@/store/notifications-store'
import { useGracePeriodGuard } from '@/hooks/use-grace-period'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Shield, 
  Smartphone, 
  Key, 
  Activity, 
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin
} from 'lucide-react'

export function SecuritySection() {
  const { user } = useUser()
  const { showSuccess, showInfo } = useNotificationActions()
  const { isInGracePeriod, preventAction } = useGracePeriodGuard()
  const [twoFactorEnabled, setTwoFactorEnabled] = React.useState(false)
  const [emailNotifications, setEmailNotifications] = React.useState(true)
  const [loginAlerts, setLoginAlerts] = React.useState(true)

  const handleTwoFactorToggle = (enabled: boolean) => {
    if (preventAction('2FA settings changes')) return
    setTwoFactorEnabled(enabled)
    if (enabled) {
      showInfo('2FA Setup Required', 'Please complete the setup process to enable two-factor authentication.')
    } else {
      showSuccess('2FA Disabled', 'Two-factor authentication has been disabled for your account.')
    }
  }

  const handleEmailNotificationsToggle = (enabled: boolean) => {
    if (preventAction('security notification changes')) return
    setEmailNotifications(enabled)
    showSuccess(
      enabled ? 'Email Notifications Enabled' : 'Email Notifications Disabled',
      `Security email notifications have been ${enabled ? 'enabled' : 'disabled'}.`
    )
  }

  const handleLoginAlertsToggle = (enabled: boolean) => {
    if (preventAction('login alert changes')) return
    setLoginAlerts(enabled)
    showSuccess(
      enabled ? 'Login Alerts Enabled' : 'Login Alerts Disabled',
      `Login alert notifications have been ${enabled ? 'enabled' : 'disabled'}.`
    )
  }

  return (
    <div className="space-y-6">
      {/* Two-Factor Authentication */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Smartphone className="mr-2 h-5 w-5" />
            Two-Factor Authentication
          </CardTitle>
          <p className="text-sm text-slate-600">
            Add an extra layer of security to your account with 2FA.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-slate-400" />
                <span className="font-medium">Two-Factor Authentication</span>
              </div>
              <Badge variant={twoFactorEnabled ? "default" : "secondary"}>
                {twoFactorEnabled ? "Enabled" : "Disabled"}
              </Badge>
            </div>
            <Switch
              checked={twoFactorEnabled}
              onCheckedChange={handleTwoFactorToggle}
            />
          </div>
          
          {twoFactorEnabled && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">2FA is active</span>
              </div>
              <p className="text-sm text-green-700 mt-1">
                Your account is protected with two-factor authentication.
              </p>
            </div>
          )}

          {!twoFactorEnabled && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-800">Recommended</span>
              </div>
              <p className="text-sm text-amber-700 mt-1">
                Enable 2FA to significantly improve your account security.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="mr-2 h-5 w-5" />
            Security Notifications
          </CardTitle>
          <p className="text-sm text-slate-600">
            Configure how you receive security-related notifications.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-slate-900">Email Security Alerts</h4>
              <p className="text-sm text-slate-600">
                Receive email notifications for security events
              </p>
            </div>
            <Switch
              checked={emailNotifications}
              onCheckedChange={handleEmailNotificationsToggle}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-slate-900">Login Alerts</h4>
              <p className="text-sm text-slate-600">
                Get notified when your account is accessed from a new device
              </p>
            </div>
            <Switch
              checked={loginAlerts}
              onCheckedChange={handleLoginAlertsToggle}
            />
          </div>
        </CardContent>
      </Card>

      {/* Password Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Key className="mr-2 h-5 w-5" />
            Password Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-slate-900">Password</h4>
              <div className="flex items-center space-x-2 mt-1">
                <Clock className="h-3 w-3 text-slate-400" />
                <span className="text-sm text-slate-600">Last changed 3 months ago</span>
              </div>
            </div>
            <Button variant="outline" size="sm">
              Change Password
            </Button>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="text-sm font-medium text-slate-900">Password Strength</h4>
            <div className="flex items-center space-x-3">
              <div className="flex-1 bg-slate-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{width: '75%'}}></div>
              </div>
              <Badge variant="secondary" className="text-green-700 bg-green-100">
                Strong
              </Badge>
            </div>
            <p className="text-xs text-slate-500">
              Your password meets our security requirements.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="mr-2 h-5 w-5" />
            Recent Security Activity
          </CardTitle>
          <p className="text-sm text-slate-600">
            Monitor recent security events on your account.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Sample security events */}
            <div className="flex items-start space-x-3 p-3 border border-slate-200 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">Successful login</p>
                <div className="flex items-center space-x-4 mt-1">
                  <div className="flex items-center space-x-1">
                    <MapPin className="h-3 w-3 text-slate-400" />
                    <span className="text-xs text-slate-600">San Francisco, CA</span>
                  </div>
                  <span className="text-xs text-slate-500">2 hours ago</span>
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 border border-slate-200 rounded-lg">
              <Key className="h-4 w-4 text-blue-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">Password changed</p>
                <div className="flex items-center space-x-4 mt-1">
                  <span className="text-xs text-slate-500">3 months ago</span>
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 border border-slate-200 rounded-lg">
              <Smartphone className="h-4 w-4 text-blue-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">New device added</p>
                <div className="flex items-center space-x-4 mt-1">
                  <span className="text-xs text-slate-600">MacBook Pro - Chrome</span>
                  <span className="text-xs text-slate-500">1 week ago</span>
                </div>
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          <Button variant="outline" size="sm" className="w-full">
            View All Security Activity
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
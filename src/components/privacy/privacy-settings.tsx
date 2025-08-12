/**
 * Privacy Settings Component
 * Comprehensive privacy controls and data management
 */

'use client'

import { useState, useEffect } from 'react'
import { Settings, Shield, Eye, Mail, Bell, Cookie, Database, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useCookieConsent } from '@/hooks/use-cookie-consent'
import { useNotificationActions } from '@/store/notifications-store'
import { useGracePeriodGuard } from '@/hooks/use-grace-period'

interface PrivacyPreferences {
  analytics: boolean
  marketing: boolean
  notifications: boolean
  profileVisibility: boolean
  dataProcessing: boolean
  thirdPartySharing: boolean
}

export function PrivacySettings() {
  const { preferences, updatePreferences, hasConsent, getConsentRecord } = useCookieConsent()
  const { isInGracePeriod, preventAction } = useGracePeriodGuard()
  const [privacyPrefs, setPrivacyPrefs] = useState<PrivacyPreferences>({
    analytics: preferences.analytics,
    marketing: preferences.marketing,
    notifications: true,
    profileVisibility: false,
    dataProcessing: true,
    thirdPartySharing: false,
  })
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const { showSuccess, showError } = useNotificationActions()

  // Update local preferences when cookie preferences change
  useEffect(() => {
    setPrivacyPrefs(prev => ({
      ...prev,
      analytics: preferences.analytics,
      marketing: preferences.marketing,
    }))
  }, [preferences])

  const handleToggle = (key: keyof PrivacyPreferences, value: boolean) => {
    if (preventAction('privacy settings changes')) return

    const newPrefs = { ...privacyPrefs, [key]: value }
    setPrivacyPrefs(newPrefs)

    // Update cookie preferences if they changed
    if (key === 'analytics' || key === 'marketing') {
      const newCookiePrefs = {
        essential: true,
        analytics: key === 'analytics' ? value : preferences.analytics,
        marketing: key === 'marketing' ? value : preferences.marketing,
      }
      updatePreferences(newCookiePrefs)
    }
  }

  const handleSaveSettings = async () => {
    if (preventAction('saving privacy settings')) return

    setIsSaving(true)

    try {
      // TODO: Save privacy preferences to backend
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call
      
      setLastSaved(new Date())
      showSuccess('Settings Saved', 'Your privacy preferences have been updated successfully.')
    } catch (error) {
      showError('Save Failed', 'Failed to save privacy settings. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const getConsentAuditRecord = () => {
    const record = getConsentRecord()
    navigator.clipboard.writeText(record)
    showSuccess('Audit Record Copied', 'Your consent audit record has been copied to clipboard.')
  }

  return (
    <div className="space-y-6">
      {/* Grace Period Warning */}
      {isInGracePeriod && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            Privacy settings changes are disabled during the account deletion grace period. 
            You can cancel the deletion request in the Account Deletion section below to restore full access.
          </AlertDescription>
        </Alert>
      )}

      {/* Cookie Preferences */}
      <Card className="border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cookie className="h-5 w-5 text-blue-600" />
            Cookie Preferences
          </CardTitle>
          <CardDescription>
            Manage how we use cookies and tracking technologies
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Essential Cookies</Label>
              <p className="text-xs text-slate-500">Required for website functionality</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Always Active
              </Badge>
              <Switch checked={true} disabled />
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Analytics Cookies</Label>
              <p className="text-xs text-slate-500">Help us understand how you use our site</p>
            </div>
            <Switch
              checked={privacyPrefs.analytics}
              onCheckedChange={(checked) => handleToggle('analytics', checked)}
              disabled={isInGracePeriod}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Marketing Cookies</Label>
              <p className="text-xs text-slate-500">Used to show you relevant advertisements</p>
            </div>
            <Switch
              checked={privacyPrefs.marketing}
              onCheckedChange={(checked) => handleToggle('marketing', checked)}
              disabled={isInGracePeriod}
            />
          </div>

          {hasConsent && (
            <Alert className="bg-blue-50 border-blue-200">
              <CheckCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                Your cookie preferences are active and being enforced across the site.
                <Button
                  variant="link"
                  size="sm"
                  onClick={getConsentAuditRecord}
                  className="h-auto p-0 ml-2 text-blue-700 hover:text-blue-900"
                >
                  View audit record
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Data Processing */}
      <Card className="border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-purple-600" />
            Data Processing
          </CardTitle>
          <CardDescription>
            Control how your personal data is processed and used
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Profile Analysis</Label>
              <p className="text-xs text-slate-500">Process your data to improve your experience</p>
            </div>
            <Switch
              checked={privacyPrefs.dataProcessing}
              onCheckedChange={(checked) => handleToggle('dataProcessing', checked)}
              disabled={isInGracePeriod}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Third-Party Sharing</Label>
              <p className="text-xs text-slate-500">Share anonymized data with trusted partners</p>
            </div>
            <Switch
              checked={privacyPrefs.thirdPartySharing}
              onCheckedChange={(checked) => handleToggle('thirdPartySharing', checked)}
              disabled={isInGracePeriod}
            />
          </div>
        </CardContent>
      </Card>

      {/* Communication Preferences */}
      <Card className="border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-green-600" />
            Communication Preferences
          </CardTitle>
          <CardDescription>
            Choose what communications you receive from us
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Email Notifications</Label>
              <p className="text-xs text-slate-500">Product updates, security alerts, and account notifications</p>
            </div>
            <Switch
              checked={privacyPrefs.notifications}
              onCheckedChange={(checked) => handleToggle('notifications', checked)}
              disabled={isInGracePeriod}
            />
          </div>
        </CardContent>
      </Card>

      {/* Privacy Visibility */}
      <Card className="border-orange-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-orange-600" />
            Profile Visibility
          </CardTitle>
          <CardDescription>
            Control who can see your profile and activity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Public Profile</Label>
              <p className="text-xs text-slate-500">Make your profile visible to other users</p>
            </div>
            <Switch
              checked={privacyPrefs.profileVisibility}
              onCheckedChange={(checked) => handleToggle('profileVisibility', checked)}
              disabled={isInGracePeriod}
            />
          </div>
        </CardContent>
      </Card>

      {/* Data Rights Information */}
      <Card className="bg-slate-50 border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-900">
            <Shield className="h-5 w-5" />
            Your Privacy Rights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-600">
            <div>
              <h4 className="font-medium text-slate-900 mb-2">GDPR Rights:</h4>
              <ul className="space-y-1">
                <li>• Right to access your data</li>
                <li>• Right to correct inaccurate data</li>
                <li>• Right to delete your data</li>
                <li>• Right to restrict processing</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-slate-900 mb-2">Data Protection:</h4>
              <ul className="space-y-1">
                <li>• Encrypted data storage (AES-256)</li>
                <li>• Secure data transmission (TLS 1.3)</li>
                <li>• Regular security audits</li>
                <li>• GDPR compliance monitoring</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Settings */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="space-y-1">
          {lastSaved && (
            <p className="text-xs text-slate-500">
              Last saved: {lastSaved.toLocaleString()}
            </p>
          )}
        </div>
        
        <Button
          onClick={handleSaveSettings}
          disabled={isSaving || isInGracePeriod}
          size="lg"
          className="min-w-[120px]"
        >
          {isSaving ? (
            <>
              <AlertCircle className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Settings className="h-4 w-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
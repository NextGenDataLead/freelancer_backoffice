'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/store/auth-store'
import { useAppStore } from '@/store/app-store'
import { useNotificationActions } from '@/store/notifications-store'
import { useThemeManager } from '@/hooks/use-app-state'
import { useGracePeriodGuard } from '@/hooks/use-grace-period'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Settings, 
  Moon, 
  Sun, 
  Monitor,
  Bell,
  Mail,
  MessageSquare,
  Shield,
  Eye,
  EyeOff,
  Save,
  Palette,
  AlertTriangle
} from 'lucide-react'

export function PreferencesSection() {
  const { preferences, updatePreferences } = useAuthStore()
  const { theme } = useAppStore()
  const { setTheme, effectiveTheme } = useThemeManager()
  const { showSuccess } = useNotificationActions()
  const { isInGracePeriod, preventAction } = useGracePeriodGuard()

  const [localPreferences, setLocalPreferences] = React.useState({
    theme: theme,
    emailNotifications: preferences.emailNotifications ?? true,
    pushNotifications: preferences.pushNotifications ?? true,
    marketingEmails: preferences.marketingEmails ?? false,
    weeklyReports: preferences.weeklyReports ?? true,
    activityDigest: preferences.activityDigest ?? true,
    dataCollection: preferences.dataCollection ?? true,
    profileVisibility: preferences.profileVisibility ?? 'team',
  })

  const [hasChanges, setHasChanges] = React.useState(false)

  // Track changes
  React.useEffect(() => {
    const hasChanged = 
      localPreferences.theme !== theme ||
      localPreferences.emailNotifications !== (preferences.emailNotifications ?? true) ||
      localPreferences.pushNotifications !== (preferences.pushNotifications ?? true) ||
      localPreferences.marketingEmails !== (preferences.marketingEmails ?? false) ||
      localPreferences.weeklyReports !== (preferences.weeklyReports ?? true) ||
      localPreferences.activityDigest !== (preferences.activityDigest ?? true) ||
      localPreferences.dataCollection !== (preferences.dataCollection ?? true) ||
      localPreferences.profileVisibility !== (preferences.profileVisibility ?? 'team')
    
    setHasChanges(hasChanged)
  }, [localPreferences, theme, preferences])

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    if (preventAction('theme changes')) return
    setLocalPreferences(prev => ({ ...prev, theme: newTheme }))
  }

  const handleTogglePreference = (key: keyof typeof localPreferences) => {
    if (preventAction('preference changes')) return
    setLocalPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const handleProfileVisibilityChange = (visibility: 'public' | 'team' | 'private') => {
    if (preventAction('privacy settings changes')) return
    setLocalPreferences(prev => ({ ...prev, profileVisibility: visibility }))
  }

  const handleSavePreferences = () => {
    if (preventAction('saving preferences')) return
    
    // Update theme
    if (localPreferences.theme !== theme) {
      setTheme(localPreferences.theme)
    }

    // Update other preferences
    updatePreferences({
      emailNotifications: localPreferences.emailNotifications,
      pushNotifications: localPreferences.pushNotifications,
      marketingEmails: localPreferences.marketingEmails,
      weeklyReports: localPreferences.weeklyReports,
      activityDigest: localPreferences.activityDigest,
      dataCollection: localPreferences.dataCollection,
      profileVisibility: localPreferences.profileVisibility,
    })

    showSuccess('Preferences saved', 'Your preferences have been updated successfully.')
    setHasChanges(false)
  }

  const getThemeIcon = (themeOption: string) => {
    switch (themeOption) {
      case 'light': return <Sun className="h-4 w-4" />
      case 'dark': return <Moon className="h-4 w-4" />
      case 'system': return <Monitor className="h-4 w-4" />
      default: return <Palette className="h-4 w-4" />
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Settings className="mr-2 h-5 w-5" />
          Preferences
        </CardTitle>
        <p className="text-sm text-slate-600">
          Customize your experience and notification settings.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Grace Period Warning */}
        {isInGracePeriod && (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              Preference changes are disabled during the account deletion grace period. 
              You can cancel the deletion request in Privacy Settings to restore full access.
            </AlertDescription>
          </Alert>
        )}

        {/* Theme Settings */}
        <div>
          <h4 className="text-sm font-medium text-slate-900 mb-3 flex items-center">
            <Palette className="mr-2 h-4 w-4" />
            Theme Preference
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(['light', 'dark', 'system'] as const).map((themeOption) => (
              <button
                key={themeOption}
                onClick={() => handleThemeChange(themeOption)}
                disabled={isInGracePeriod}
                className={`relative p-3 rounded-lg border-2 transition-colors text-left ${
                  isInGracePeriod
                    ? 'border-slate-200 bg-slate-50 cursor-not-allowed opacity-50'
                    : localPreferences.theme === themeOption
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-2">
                  {getThemeIcon(themeOption)}
                  <span className="text-sm font-medium text-slate-900 capitalize">
                    {themeOption}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {themeOption === 'light' && 'Light mode'}
                  {themeOption === 'dark' && 'Dark mode'}
                  {themeOption === 'system' && 'Follow system setting'}
                </p>
                {localPreferences.theme === themeOption && (
                  <div className="absolute top-2 right-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Notification Settings */}
        <div>
          <h4 className="text-sm font-medium text-slate-900 mb-3 flex items-center">
            <Bell className="mr-2 h-4 w-4" />
            Notifications
          </h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <div>
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-900">Email Notifications</span>
                </div>
                <p className="text-xs text-slate-500 ml-6">Receive important updates via email</p>
              </div>
              <button
                onClick={() => handleTogglePreference('emailNotifications')}
                disabled={isInGracePeriod}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  isInGracePeriod
                    ? 'bg-slate-200 cursor-not-allowed opacity-50'
                    : localPreferences.emailNotifications ? 'bg-blue-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    localPreferences.emailNotifications ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <div className="flex items-center space-x-2">
                  <MessageSquare className="h-4 w-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-900">Push Notifications</span>
                </div>
                <p className="text-xs text-slate-500 ml-6">Get notified in your browser</p>
              </div>
              <button
                onClick={() => handleTogglePreference('pushNotifications')}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  localPreferences.pushNotifications ? 'bg-blue-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    localPreferences.pushNotifications ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <div className="flex items-center space-x-2">
                  <Bell className="h-4 w-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-900">Weekly Reports</span>
                </div>
                <p className="text-xs text-slate-500 ml-6">Receive weekly activity summaries</p>
              </div>
              <button
                onClick={() => handleTogglePreference('weeklyReports')}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  localPreferences.weeklyReports ? 'bg-blue-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    localPreferences.weeklyReports ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-900">Marketing Emails</span>
                </div>
                <p className="text-xs text-slate-500 ml-6">Product updates and promotional content</p>
              </div>
              <button
                onClick={() => handleTogglePreference('marketingEmails')}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  localPreferences.marketingEmails ? 'bg-blue-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    localPreferences.marketingEmails ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Privacy Settings */}
        <div>
          <h4 className="text-sm font-medium text-slate-900 mb-3 flex items-center">
            <Shield className="mr-2 h-4 w-4" />
            Privacy
          </h4>
          <div className="space-y-3">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Eye className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-900">Profile Visibility</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 ml-6">
                {(['public', 'team', 'private'] as const).map((visibility) => (
                  <button
                    key={visibility}
                    onClick={() => handleProfileVisibilityChange(visibility)}
                    className={`p-2 rounded-md border text-left transition-colors ${
                      localPreferences.profileVisibility === visibility
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      {visibility === 'public' && <Eye className="h-3 w-3" />}
                      {visibility === 'team' && <Shield className="h-3 w-3" />}
                      {visibility === 'private' && <EyeOff className="h-3 w-3" />}
                      <span className="text-xs font-medium capitalize">{visibility}</span>
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500 ml-6 mt-1">
                Control who can see your profile information
              </p>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-900">Data Collection</span>
                </div>
                <p className="text-xs text-slate-500 ml-6">Help improve our service with usage analytics</p>
              </div>
              <button
                onClick={() => handleTogglePreference('dataCollection')}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  localPreferences.dataCollection ? 'bg-blue-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    localPreferences.dataCollection ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Save Button */}
        {hasChanges && (
          <div className="pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">
                You have unsaved changes
              </p>
              <Button 
                onClick={handleSavePreferences}
                disabled={isInGracePeriod}
              >
                <Save className="mr-2 h-4 w-4" />
                Save Preferences
              </Button>
            </div>
          </div>
        )}

        {/* Current Status */}
        <div className="pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Current theme:</span>
            <div className="flex items-center space-x-2">
              {getThemeIcon(effectiveTheme)}
              <Badge variant="outline" className="capitalize">
                {effectiveTheme}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
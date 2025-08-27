'use client'

import * as React from 'react'
import { UserButton, useUser } from '@clerk/nextjs'
import { AuthGuard } from '@/components/auth/auth-guard'
import { 
  User, 
  Settings, 
  Bell, 
  Shield, 
  Monitor,
  Key,
  Trash2,
  Building,
  AlertTriangle
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProfileForm } from '@/components/profile/profile-form'
import { BusinessForm } from '@/components/business/business-form'
import { PasswordSection } from '@/components/settings/password-section'
import { SecuritySection } from '@/components/settings/security-section'
import { SessionsSection } from '@/components/settings/sessions-section'
import { PreferencesSection } from '@/components/profile/preferences-section'
import { useGracePeriodGuard } from '@/hooks/use-grace-period'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function SettingsPage() {
  const { user } = useUser()
  const { isInGracePeriod, preventAction } = useGracePeriodGuard()

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
            <p className="text-slate-600 mt-1">Manage your account and preferences</p>
          </div>
          <UserButton 
            appearance={{
              elements: {
                avatarBox: 'w-8 h-8',
              },
            }}
          />
        </div>
      </div>

      {/* Settings Content */}
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Grace Period Warning */}
        {isInGracePeriod && (
          <Alert className="border-orange-200 bg-orange-50 mb-6">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              Settings changes are restricted during the account deletion grace period. 
              You can cancel the deletion request in Privacy Settings to restore full access.
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="profile" className="space-y-8">
          {/* Tab Navigation */}
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-7 h-auto p-1">
            <TabsTrigger value="profile" className="flex items-center space-x-2 py-3">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="business" className="flex items-center space-x-2 py-3">
              <Building className="h-4 w-4" />
              <span className="hidden sm:inline">Business</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center space-x-2 py-3">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
            <TabsTrigger value="password" className="flex items-center space-x-2 py-3">
              <Key className="h-4 w-4" />
              <span className="hidden sm:inline">Password</span>
            </TabsTrigger>
            <TabsTrigger value="sessions" className="flex items-center space-x-2 py-3">
              <Monitor className="h-4 w-4" />
              <span className="hidden sm:inline">Sessions</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center space-x-2 py-3">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="danger" className="flex items-center space-x-2 py-3">
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Danger Zone</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="mr-2 h-5 w-5" />
                    Profile Information
                  </CardTitle>
                  <p className="text-sm text-slate-600">
                    Update your personal information and profile settings.
                  </p>
                </CardHeader>
                <CardContent>
                  <ProfileForm />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Business Tab */}
          <TabsContent value="business" className="space-y-6">
            <BusinessForm />
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <SecuritySection />
          </TabsContent>

          {/* Password Tab */}
          <TabsContent value="password" className="space-y-6">
            <PasswordSection />
          </TabsContent>

          {/* Sessions Tab */}
          <TabsContent value="sessions" className="space-y-6">
            <SessionsSection />
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <PreferencesSection />
          </TabsContent>

          {/* Danger Zone Tab */}
          <TabsContent value="danger" className="space-y-6">
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="flex items-center text-red-600">
                  <Trash2 className="mr-2 h-5 w-5" />
                  Danger Zone
                </CardTitle>
                <p className="text-sm text-red-600">
                  These actions are irreversible. Please proceed with caution.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-red-900">Delete Account</h4>
                      <p className="text-sm text-red-700 mt-1">
                        Permanently delete your account and all associated data. This action cannot be undone.
                      </p>
                    </div>
                    <div className="ml-4">
                      <button 
                        className={`px-4 py-2 text-white text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${
                          isInGracePeriod 
                            ? 'bg-red-300 cursor-not-allowed' 
                            : 'bg-red-600 hover:bg-red-700'
                        }`}
                        disabled={isInGracePeriod}
                        onClick={() => {
                          if (preventAction('account deletion')) return
                          // In a real app, this would trigger a confirmation modal
                          alert('This would open a confirmation dialog in a real application.')
                        }}
                      >
                        Delete Account
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-amber-900">Export Data</h4>
                      <p className="text-sm text-amber-700 mt-1">
                        Download a copy of all your data before deleting your account.
                      </p>
                    </div>
                    <div className="ml-4">
                      <button 
                        className={`px-4 py-2 text-white text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${
                          isInGracePeriod 
                            ? 'bg-amber-300 cursor-not-allowed' 
                            : 'bg-amber-600 hover:bg-amber-700'
                        }`}
                        disabled={isInGracePeriod}
                        onClick={() => {
                          if (preventAction('data export')) return
                          // In a real app, this would trigger data export
                          alert('This would start the data export process in a real application.')
                        }}
                      >
                        Export Data
                      </button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
    </AuthGuard>
  )
}
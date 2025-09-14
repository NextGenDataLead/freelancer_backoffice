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
import { FinancialHeader, headerMetrics, headerPageActions } from '@/components/dashboard/financial-header'

export default function SettingsPage() {
  const { user } = useUser()
  const { isInGracePeriod, preventAction } = useGracePeriodGuard()

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background mobile-safe-area">
      {/* Financial Header with settings-specific configuration */}
      <FinancialHeader 
        metric={{
          value: user?.firstName || 'User',
          label: 'Account',
          icon: User,
        }}
        pageAction={{
          label: 'Save All',
          icon: Settings,
          onClick: () => {
            // Save all settings logic
            console.log('Saving all settings...')
            alert('Settings would be saved in a real application.')
          },
          variant: 'default',
          color: 'bg-primary hover:bg-primary/90 text-primary-foreground'
        }}
        firstName={user?.firstName}
      />

      {/* Settings Content */}
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-6 lg:space-y-8 mobile-scroll-smooth">
        {/* Grace Period Warning */}
        {isInGracePeriod && (
          <div className="mobile-card-glass">
            <Alert className="border-orange-500/30 bg-gradient-to-r from-orange-500/5 to-amber-500/5 border">
              <AlertTriangle className="h-4 w-4 text-orange-400" />
              <AlertDescription className="text-foreground">
                Settings changes are restricted during the account deletion grace period. 
                You can cancel the deletion request in Privacy Settings to restore full access.
              </AlertDescription>
            </Alert>
          </div>
        )}

        <div className="mobile-card-glass">
          <Tabs defaultValue="profile" className="space-y-6">
            {/* Tab Navigation */}
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-7 h-auto p-1 mobile-card-glass border border-border/50">
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
          <TabsContent value="profile" className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:gap-6">
              <div className="mobile-card-glass">
                <Card className="border-0 shadow-none bg-transparent">
                  <CardHeader>
                    <CardTitle className="flex items-center text-base sm:text-lg">
                      <User className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                      Profile Information
                    </CardTitle>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Update your personal information and profile settings.
                    </p>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <ProfileForm />
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Business Tab */}
          <TabsContent value="business" className="space-y-4 sm:space-y-6">
            <div className="mobile-card-glass">
              <BusinessForm />
            </div>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-4 sm:space-y-6">
            <div className="mobile-card-glass">
              <SecuritySection />
            </div>
          </TabsContent>

          {/* Password Tab */}
          <TabsContent value="password" className="space-y-4 sm:space-y-6">
            <div className="mobile-card-glass">
              <PasswordSection />
            </div>
          </TabsContent>

          {/* Sessions Tab */}
          <TabsContent value="sessions" className="space-y-4 sm:space-y-6">
            <div className="mobile-card-glass">
              <SessionsSection />
            </div>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-4 sm:space-y-6">
            <div className="mobile-card-glass">
              <PreferencesSection />
            </div>
          </TabsContent>

          {/* Danger Zone Tab */}
          <TabsContent value="danger" className="space-y-4 sm:space-y-6">
            <div className="mobile-card-glass">
              <Card className="border-red-500/30 bg-gradient-to-r from-red-500/5 to-red-600/5 border shadow-none bg-transparent">
                <CardHeader>
                  <CardTitle className="flex items-center text-red-400 text-base sm:text-lg">
                    <Trash2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                    Danger Zone
                  </CardTitle>
                  <p className="text-xs sm:text-sm text-red-400/80">
                    These actions are irreversible. Please proceed with caution.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <div className="p-3 sm:p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-red-400 text-sm sm:text-base">Delete Account</h4>
                        <p className="text-xs sm:text-sm text-red-400/80 mt-1">
                          Permanently delete your account and all associated data. This action cannot be undone.
                        </p>
                      </div>
                      <div className="ml-4">
                        <button 
                          className={`px-3 sm:px-4 py-2 text-white text-xs sm:text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${
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

                  <div className="p-3 sm:p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-amber-400 text-sm sm:text-base">Export Data</h4>
                        <p className="text-xs sm:text-sm text-amber-400/80 mt-1">
                          Download a copy of all your data before deleting your account.
                        </p>
                      </div>
                      <div className="ml-4">
                        <button 
                          className={`px-3 sm:px-4 py-2 text-white text-xs sm:text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${
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
            </div>
          </TabsContent>
          </Tabs>
        </div>

        {/* Mobile-optimized footer with enhanced styling - matching financieel dashboard */}
        <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-border/50">
          <div className="text-xs text-muted-foreground text-center space-y-2">
            <div className="flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="hidden sm:inline">Settings synchronized</span>
                <span className="sm:hidden">Synced</span>
              </div>
              <div className="h-3 w-px bg-border hidden sm:block"></div>
              <span className="text-xs">Account Settings</span>
            </div>
            <p className="font-medium text-xs sm:text-sm">
              <span className="hidden sm:inline">Version 2.0 - Award-winning Settings Dashboard</span>
              <span className="sm:hidden">v2.0 - Settings</span>
            </p>
          </div>
        </div>
      </div>
    </div>
    </AuthGuard>
  )
}
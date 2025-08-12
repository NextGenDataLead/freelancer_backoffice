/**
 * Privacy Controls Page
 * Comprehensive GDPR-compliant privacy management interface
 */

import { Suspense } from 'react'
import { auth } from '@clerk/nextjs/server'
import { Shield, Download, Trash2, Settings, FileText, Clock } from 'lucide-react'
import { DataExport } from '@/components/privacy/data-export'
import { AccountDeletion } from '@/components/privacy/account-deletion'
import { PrivacySettings } from '@/components/privacy/privacy-settings'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'

export default async function PrivacyPage() {
  // CRITICAL: Protect this page - requires authentication
  await auth.protect();
  return (
    <div className="container max-w-6xl mx-auto py-8 space-y-8">
      {/* Page Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Privacy & Data Control</h1>
            <p className="text-slate-600 mt-1">
              Manage your privacy settings, export your data, and control your account
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <Shield className="h-3 w-3 mr-1" />
            GDPR Compliant
          </Badge>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Settings className="h-3 w-3 mr-1" />
            Enterprise Security
          </Badge>
        </div>
      </div>

      {/* Privacy Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <Download className="h-5 w-5" />
              Data Export
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-blue-700">
              Download all your personal data in a structured format
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-green-900">
              <Settings className="h-5 w-5" />
              Privacy Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-green-700">
              Control how your data is used and shared
            </p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-red-900">
              <Trash2 className="h-5 w-5" />
              Account Deletion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-700">
              Permanently delete your account with 30-day grace period
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Privacy Controls */}
      <Card className="border-0 shadow-lg">
        <Tabs defaultValue="export" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="export" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Data Export
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Privacy Settings
            </TabsTrigger>
            <TabsTrigger value="deletion" className="flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              Account Deletion
            </TabsTrigger>
          </TabsList>

          <TabsContent value="export" className="mt-6">
            <div className="space-y-6">
              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="text-lg font-semibold text-slate-900">Export Your Data</h3>
                <p className="text-slate-600 mt-1">
                  Download a complete copy of your personal data as guaranteed by GDPR Article 20 
                  (Right to Data Portability). This includes your profile, preferences, activity history, and more.
                </p>
              </div>
              
              <Suspense fallback={<div className="animate-pulse bg-slate-100 h-48 rounded-lg" />}>
                <DataExport />
              </Suspense>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <div className="space-y-6">
              <div className="border-l-4 border-green-500 pl-4">
                <h3 className="text-lg font-semibold text-slate-900">Privacy Settings</h3>
                <p className="text-slate-600 mt-1">
                  Control how your data is collected, processed, and used. These settings affect 
                  analytics tracking, marketing communications, and data sharing.
                </p>
              </div>
              
              <Suspense fallback={<div className="animate-pulse bg-slate-100 h-48 rounded-lg" />}>
                <PrivacySettings />
              </Suspense>
            </div>
          </TabsContent>

          <TabsContent value="deletion" className="mt-6">
            <div className="space-y-6">
              <div className="border-l-4 border-red-500 pl-4">
                <h3 className="text-lg font-semibold text-slate-900">Account Deletion</h3>
                <p className="text-slate-600 mt-1">
                  Permanently delete your account and all associated data. This action includes a 
                  30-day grace period during which you can cancel the deletion request.
                </p>
              </div>
              
              <Suspense fallback={<div className="animate-pulse bg-slate-100 h-48 rounded-lg" />}>
                <AccountDeletion />
              </Suspense>
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Privacy Information Footer */}
      <Card className="bg-slate-50 border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-900">
            <FileText className="h-5 w-5" />
            Privacy Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-slate-900 mb-2">Your Rights</h4>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• Right to access your personal data</li>
                <li>• Right to rectification of inaccurate data</li>
                <li>• Right to erasure (right to be forgotten)</li>
                <li>• Right to data portability</li>
                <li>• Right to object to processing</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-slate-900 mb-2">Data Retention</h4>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• Profile data: Retained while account is active</li>
                <li>• Analytics data: 24 months maximum</li>
                <li>• Audit logs: 7 years for legal compliance</li>
                <li>• Deleted data: 30-day recovery period</li>
                <li>• Backups: Purged within 90 days of deletion</li>
              </ul>
            </div>
          </div>
          
          <div className="pt-4 border-t border-slate-200">
            <p className="text-sm text-slate-500">
              Last updated: {new Date().toLocaleDateString()}. For questions about privacy or data handling, 
              contact our Data Protection Officer at privacy@example.com.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
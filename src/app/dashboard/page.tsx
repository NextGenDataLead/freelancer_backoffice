'use client'

import { useUser } from '@clerk/nextjs'
import { DashboardContent } from '@/components/dashboard/dashboard-content'
import { SupabaseUserTest } from '@/components/debug/supabase-user-test'

export default function DashboardPage() {
  const { user, isLoaded } = useUser()

  // Show loading while user/auth is loading
  if (!isLoaded || !user) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-slate-600">Loading...</p>
      </div>
    </div>
  }

  return (
    <div className="space-y-6">
      <SupabaseUserTest />
      <DashboardContent />
    </div>
  )
}
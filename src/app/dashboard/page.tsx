'use client'

import { useUser } from '@clerk/nextjs'
import { DashboardContent } from '@/components/dashboard/dashboard-content'

export default function DashboardPage() {
  const { user, isLoaded } = useUser()

  // Show loading while user/auth is loading
  if (!isLoaded || !user) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2 text-muted-foreground">Loading...</p>
      </div>
    </div>
  }

  return (
    <DashboardContent />
  )
}
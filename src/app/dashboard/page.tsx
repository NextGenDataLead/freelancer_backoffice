import { auth } from '@clerk/nextjs/server'
import { DashboardContent } from '@/components/dashboard/dashboard-content'
import { SupabaseUserTest } from '@/components/debug/supabase-user-test'

export default async function DashboardPage() {
  await auth.protect();

  return (
    <div className="space-y-6">
      <SupabaseUserTest />
      <DashboardContent />
    </div>
  )
}
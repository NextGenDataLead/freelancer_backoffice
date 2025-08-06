import { auth } from '@clerk/nextjs/server'
import { DashboardContent } from '@/components/dashboard/dashboard-content'

export default async function DashboardPage() {
  await auth.protect();

  return <DashboardContent />
}
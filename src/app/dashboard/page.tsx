import { auth } from '@clerk/nextjs/server'
import Link from 'next/link'
import LogoutButton from '@/components/auth/logout-button'

export default async function DashboardPage() {
  await auth.protect();

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <div className="flex items-center space-x-4">
          <Link 
            href="/sign-in" 
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Go to Sign In (test redirect)
          </Link>
          <span className="text-slate-400">|</span>
          <span className="text-green-600 font-medium">✅ Authenticated</span>
          <span className="text-slate-400">|</span>
          <LogoutButton />
        </div>
      </div>
      <p className="text-slate-600 mt-2">Welcome to your authenticated dashboard!</p>
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="font-medium text-yellow-800">Testing Authentication Flow:</h3>
        <ul className="mt-2 text-sm text-yellow-700">
          <li>• You are currently logged in</li>
          <li>• Click "Go to Sign In" to test if Clerk redirects you back here</li>
          <li>• Click "Sign Out" to test the logout functionality</li>
          <li>• This confirms the authentication is working properly</li>
        </ul>
      </div>
    </div>
  )
}
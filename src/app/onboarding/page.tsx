import { AuthGuard } from '@/components/auth/auth-guard'

export default function OnboardingPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">Welcome!</h1>
            <p className="mt-4 text-lg text-gray-600">
              Your account has been created successfully.
            </p>
            <div className="mt-8 space-y-4">
              <a
                href="/dashboard"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Continue to Dashboard
              </a>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}
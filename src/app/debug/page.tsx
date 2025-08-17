'use client'

import { useUser } from '@clerk/nextjs'
import { useAuth } from '@clerk/nextjs'

export default function DebugPage() {
  const { user, isLoaded } = useUser()
  const { getToken } = useAuth()

  const handleGetToken = async () => {
    try {
      const token = await getToken({ template: 'supabase' })
      console.log('JWT Token:', token)
      
      // Decode and log the token payload
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]))
        console.log('Token Payload:', payload)
      }
    } catch (error) {
      console.error('Error getting token:', error)
    }
  }

  if (!isLoaded) {
    return <div>Loading...</div>
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">User Debug Information</h1>
      
      <div className="space-y-6">
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">User Object</h2>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(user, null, 2)}
          </pre>
        </div>

        <div className="bg-gray-100 p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Public Metadata</h2>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(user?.publicMetadata, null, 2)}
          </pre>
        </div>

        <div className="bg-gray-100 p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Onboarding Complete Status</h2>
          <p className="text-lg">
            <strong>onboardingComplete:</strong> {
              user?.publicMetadata?.onboardingComplete ? 
              <span className="text-green-600">true</span> : 
              <span className="text-red-600">false</span>
            }
          </p>
        </div>

        <button 
          onClick={handleGetToken}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Log JWT Token to Console
        </button>
      </div>
    </div>
  )
}
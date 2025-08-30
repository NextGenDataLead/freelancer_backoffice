'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Database, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

interface SeedStatus {
  is_seeded: boolean
  counts: {
    categories: number
    workflows: number
    policies: number
  }
  tenant_id: string
}

export function SeedDataButton() {
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)
  const [status, setStatus] = useState<SeedStatus | null>(null)
  const [message, setMessage] = useState<string>('')
  const [error, setError] = useState<string>('')

  const checkSeedStatus = async () => {
    try {
      setChecking(true)
      setError('')

      const response = await fetch('/api/expense-management/seed', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      setStatus(data)

    } catch (err) {
      console.error('Error checking seed status:', err)
      setError(err instanceof Error ? err.message : 'Failed to check seed status')
    } finally {
      setChecking(false)
    }
  }

  const seedData = async () => {
    try {
      setLoading(true)
      setError('')
      setMessage('')

      const response = await fetch('/api/expense-management/seed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      setMessage(data.message)
      
      // Refresh status after seeding
      await checkSeedStatus()

    } catch (err) {
      console.error('Error seeding data:', err)
      setError(err instanceof Error ? err.message : 'Failed to seed data')
    } finally {
      setLoading(false)
    }
  }

  // Check status on component mount
  useState(() => {
    checkSeedStatus()
  })

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Expense Management Setup
        </CardTitle>
        <CardDescription>
          Initialize your expense management system with default categories, policies, and workflows
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {message && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        {status && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">System Status:</span>
              <div className="flex items-center gap-2">
                {status.is_seeded ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-600">Ready</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <span className="text-sm text-orange-600">Needs Setup</span>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="font-semibold text-lg">{status.counts.categories}</div>
                <div className="text-gray-600">Categories</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="font-semibold text-lg">{status.counts.workflows}</div>
                <div className="text-gray-600">Workflows</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="font-semibold text-lg">{status.counts.policies}</div>
                <div className="text-gray-600">Policies</div>
              </div>
            </div>

            <div className="text-xs text-gray-500">
              Tenant ID: {status.tenant_id}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={checkSeedStatus}
            variant="outline"
            disabled={checking}
          >
            {checking && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Check Status
          </Button>

          <Button
            onClick={seedData}
            disabled={loading || (status?.is_seeded)}
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {status?.is_seeded ? 'Already Set Up' : 'Initialize System'}
          </Button>
        </div>

        {status?.is_seeded && (
          <div className="text-sm text-green-600 bg-green-50 p-3 rounded-lg">
            ✓ Your expense management system is ready! You can now create expenses, set up approval workflows, and track spending.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
import * as React from 'react'
import { useEffect, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Building, Settings } from 'lucide-react'
import Link from 'next/link'

interface BusinessProfileData {
  business_name?: string
  kvk_number?: string
  btw_number?: string
  address?: string
  city?: string
  phone?: string
  email?: string
}

interface BusinessProfileWarningProps {
  className?: string
  showInvoiceSpecific?: boolean
}

export function BusinessProfileWarning({ 
  className = '', 
  showInvoiceSpecific = true 
}: BusinessProfileWarningProps) {
  const [businessProfile, setBusinessProfile] = useState<BusinessProfileData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [missingFields, setMissingFields] = useState<string[]>([])

  useEffect(() => {
    fetchBusinessProfile()
  }, [])

  const fetchBusinessProfile = async () => {
    try {
      const response = await fetch('/api/user/business')
      if (response.ok) {
        const data = await response.json()
        setBusinessProfile(data.data || {})
        
        // Check for missing essential fields
        const missing = []
        const profile = data.data || {}
        
        if (!profile.business_name) missing.push('Bedrijfsnaam')
        if (!profile.address) missing.push('Adres')
        if (!profile.city) missing.push('Stad')
        if (!profile.phone && !profile.email) missing.push('Contactgegevens (telefoon of email)')
        
        // Invoice-specific requirements
        if (showInvoiceSpecific) {
          if (!profile.kvk_number) missing.push('KvK nummer')
          if (!profile.btw_number) missing.push('BTW nummer')
        }
        
        setMissingFields(missing)
      }
    } catch (error) {
      console.error('Failed to fetch business profile:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Don't show if loading or no missing fields
  if (isLoading || missingFields.length === 0) {
    return null
  }

  const isInvoiceContext = showInvoiceSpecific && (
    missingFields.includes('KvK nummer') || 
    missingFields.includes('BTW nummer')
  )

  return (
    <Alert className={`border-amber-200 bg-amber-50 ${className}`}>
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertDescription className="text-amber-800">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="font-medium mb-2">
              {isInvoiceContext 
                ? 'Bedrijfsinformatie voor professionele facturen ontbreekt'
                : 'Bedrijfsprofiel is onvolledig'
              }
            </p>
            <div className="text-sm space-y-1">
              <p>De volgende gegevens ontbreken:</p>
              <ul className="list-disc list-inside ml-2 space-y-0.5">
                {missingFields.map((field) => (
                  <li key={field}>{field}</li>
                ))}
              </ul>
              {isInvoiceContext && (
                <p className="mt-2 text-amber-700">
                  <strong>Belangrijk:</strong> KvK en BTW nummers zijn verplicht voor Nederlandse bedrijfsfacturen.
                </p>
              )}
            </div>
          </div>
          <div className="ml-4 flex-shrink-0">
            <Link href="/dashboard/settings/business">
              <Button size="sm" variant="outline" className="bg-white border-amber-300 hover:bg-amber-50">
                <Building className="h-4 w-4 mr-1" />
                Aanvullen
              </Button>
            </Link>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  )
}
'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useNotificationActions } from '@/store/notifications-store'
import { useGracePeriodGuard } from '@/hooks/use-grace-period'
import { businessProfileSchema, type BusinessProfileData } from '@/lib/validations/business'
import { BusinessIdentitySection } from './business-identity'
import { BusinessAddressSection } from './business-address'
import { FinancialSettingsSection } from './financial-settings'
import { InvoiceDefaultsSection } from './invoice-defaults'
import { 
  Save,
  Loader2,
  AlertTriangle,
  Building
} from 'lucide-react'

export function BusinessForm() {
  const { showSuccess, showError } = useNotificationActions()
  const { isInGracePeriod, preventAction } = useGracePeriodGuard()
  
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
    control
  } = useForm<BusinessProfileData>({
    resolver: zodResolver(businessProfileSchema),
    defaultValues: {
      country_code: 'NL',
      default_payment_terms: 30,
      late_payment_interest: 2.0,
      kor_enabled: false
    }
  })

  // Load business profile data
  React.useEffect(() => {
    const loadBusinessProfile = async () => {
      try {
        const response = await fetch('/api/user/business')
        
        if (response.ok) {
          const { data } = await response.json()
          
          // Update form with business data
          Object.entries(data || {}).forEach(([key, value]) => {
            if (value !== undefined) {
              setValue(key as keyof BusinessProfileData, value)
            }
          })
        } else {
          console.log('Business profile not found, using defaults')
        }
      } catch (error) {
        console.error('Error loading business profile:', error)
        showError('Laad Fout', 'Kon bedrijfsprofiel niet laden. Probeer de pagina te vernieuwen.')
      } finally {
        setIsLoading(false)
      }
    }

    loadBusinessProfile()
  }, [setValue, showError])

  const onSubmit = async (data: BusinessProfileData) => {
    // Check grace period before submitting
    if (preventAction('business profile updates')) {
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/user/business', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (response.ok) {
        showSuccess('Bedrijfsprofiel Bijgewerkt', result.message || 'Uw bedrijfsinformatie is succesvol opgeslagen.')
      } else {
        throw new Error(result.error || 'Failed to update business profile')
      }
    } catch (error) {
      console.error('Business profile update error:', error)
      showError('Update Mislukt', error instanceof Error ? error.message : 'Er ging iets mis bij het opslaan van uw bedrijfsprofiel.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-slate-600">Bedrijfsprofiel laden...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Grace Period Warning */}
      {isInGracePeriod && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            Bedrijfsprofiel wijzigingen zijn uitgeschakeld tijdens de account verwijdering wachtperiode.
            U kunt het verwijderingsverzoek annuleren in Privacy Instellingen om volledige toegang te herstellen.
          </AlertDescription>
        </Alert>
      )}

      {/* Business Profile Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building className="mr-2 h-5 w-5" />
            Bedrijfsprofiel
          </CardTitle>
          <p className="text-sm text-slate-600">
            Configureer uw bedrijfsinformatie voor professionele facturen en compliance.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Business Identity Section */}
            <BusinessIdentitySection 
              register={register}
              errors={errors}
              watch={watch}
              disabled={isInGracePeriod}
            />

            {/* Business Address Section */}
            <BusinessAddressSection 
              register={register}
              errors={errors}
              watch={watch}
              disabled={isInGracePeriod}
            />

            {/* Financial Settings Section */}
            <FinancialSettingsSection 
              register={register}
              errors={errors}
              control={control}
              watch={watch}
              disabled={isInGracePeriod}
            />

            {/* Invoice Defaults Section */}
            <InvoiceDefaultsSection 
              register={register}
              errors={errors}
              control={control}
              watch={watch}
              disabled={isInGracePeriod}
            />

            {/* Submit Button */}
            <div className="flex justify-end pt-4 border-t">
              <Button 
                type="submit" 
                disabled={!isDirty || isSubmitting || isInGracePeriod}
                className="min-w-32"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Opslaan...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Opslaan
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
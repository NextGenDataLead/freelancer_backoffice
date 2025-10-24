'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle, AlertTriangle, Flag, Globe, Building2 } from 'lucide-react'
import { useSupplierValidation } from '@/hooks/use-supplier-validation'

interface SupplierValidationPanelProps {
  vendorName: string
  vatNumber?: string
  countryCode?: string
  onValidationChange?: (validation: {
    requiresReverseCharge: boolean
    suggestedVATType: 'standard' | 'reverse_charge' | 'exempt'
    warnings: string[]
  }) => void
}

export function SupplierValidationPanel({
  vendorName,
  vatNumber,
  countryCode,
  onValidationChange
}: SupplierValidationPanelProps) {
  const { 
    validation, 
    isValidating, 
    error, 
    hasWarnings, 
    requiresReverseCharge, 
    suggestedVATType 
  } = useSupplierValidation({ vendorName, vatNumber, countryCode })

  // Notify parent of validation changes
  React.useEffect(() => {
    if (validation && onValidationChange) {
      onValidationChange({
        requiresReverseCharge: validation.requiresReverseCharge,
        suggestedVATType: validation.suggestedVATType,
        warnings: validation.foreignSupplierWarnings
      })
    }
  }, [validation, onValidationChange])

  if (!vendorName || vendorName.length < 2) {
    return null
  }

  return (
    <Card className="border-l-4 border-l-sky-400/50 bg-white/5 border-white/10 backdrop-blur-xl text-slate-100">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Building2 className="h-4 w-4 text-sky-300" />
            <CardTitle className="text-sm text-slate-100">Leverancier Validatie</CardTitle>
          </div>
          {isValidating && <Loader2 className="h-4 w-4 animate-spin text-sky-300" />}
        </div>
        <CardDescription className="text-xs text-slate-300">
          Automatische controle voor BTW verlegd en buitenlandse leveranciers
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {error && (
          <Alert className="bg-red-500/10 border-red-400/20 text-red-200">
            <AlertTriangle className="h-4 w-4 text-red-300" />
            <AlertDescription className="text-sm text-red-200">
              Validatie mislukt: {error}
            </AlertDescription>
          </Alert>
        )}

        {validation && (
          <>
            {/* Status Badges */}
            <div className="flex flex-wrap gap-2">
              {validation.isEUSupplier && (
                <Badge variant="secondary" className="text-xs">
                  <Globe className="h-3 w-3 mr-1" />
                  EU Leverancier
                </Badge>
              )}
              
              {validation.requiresReverseCharge && (
                <Badge variant="destructive" className="text-xs">
                  <Flag className="h-3 w-3 mr-1" />
                  BTW Verlegd
                </Badge>
              )}
              
              {validation.vatValidation?.valid && (
                <Badge variant="default" className="text-xs">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  BTW Geldig
                </Badge>
              )}
            </div>

            {/* VAT Validation Result */}
            {vatNumber && validation.vatValidation && (
              <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="text-sm font-medium mb-1 text-slate-100">BTW Nummer Validatie</div>
                <div className="text-xs text-slate-300 space-y-1">
                  <div>BTW: {validation.vatValidation.vat_number}</div>
                  <div>Land: {validation.vatValidation.country_code}</div>
                  {validation.vatValidation.company_name && (
                    <div>Bedrijf: {validation.vatValidation.company_name}</div>
                  )}
                  <div className="flex items-center space-x-2">
                    <span>Status:</span>
                    {validation.vatValidation.valid ? (
                      <Badge variant="default" className="text-xs">Geldig</Badge>
                    ) : (
                      <Badge variant="destructive" className="text-xs">Ongeldig</Badge>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Warnings */}
            {hasWarnings && (
              <Alert className="bg-yellow-500/10 border-yellow-400/20 text-yellow-200">
                <AlertTriangle className="h-4 w-4 text-yellow-300" />
                <AlertDescription>
                  <div className="space-y-1">
                    <div className="font-medium text-sm text-yellow-200">Waarschuwingen:</div>
                    <ul className="list-disc list-inside text-xs space-y-0.5 text-yellow-100">
                      {validation.foreignSupplierWarnings.map((warning, index) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Reverse Charge Alert */}
            {requiresReverseCharge && (
              <Alert className="bg-orange-500/10 border-orange-400/20 text-orange-200">
                <Flag className="h-4 w-4 text-orange-300" />
                <AlertDescription>
                  <div className="space-y-1">
                    <div className="font-medium text-sm text-orange-200">BTW Verlegd van Toepassing</div>
                    <div className="text-xs text-orange-100">
                      Voor deze leverancier geldt het BTW verlegd mechanisme.
                      U betaalt geen BTW aan de leverancier maar voldoet deze
                      direct aan de Belastingdienst via uw BTW aangifte.
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Suggested VAT Type */}
            <div className="p-2 bg-white/5 rounded-lg border border-white/10">
              <div className="text-sm font-medium text-slate-100 mb-1">
                Aanbevolen BTW Type:
              </div>
              <Badge variant={suggestedVATType === 'reverse_charge' ? 'destructive' : 'default'}>
                {suggestedVATType === 'reverse_charge' ? 'BTW Verlegd' :
                 suggestedVATType === 'exempt' ? 'Vrijgesteld' : 'Standaard'}
              </Badge>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
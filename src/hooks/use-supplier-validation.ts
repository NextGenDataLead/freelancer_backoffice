'use client'

import { useState, useEffect } from 'react'
import { validateSupplierForExpense, type SupplierValidationResult } from '@/lib/utils/supplier-validation'

interface UseSupplierValidationProps {
  vendorName: string
  vatNumber?: string
  countryCode?: string
}

export function useSupplierValidation({ vendorName, vatNumber, countryCode }: UseSupplierValidationProps) {
  const [validation, setValidation] = useState<SupplierValidationResult | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!vendorName || vendorName.length < 2) {
      setValidation(null)
      return
    }

    const validateSupplier = async () => {
      setIsValidating(true)
      setError(null)

      try {
        const result = await validateSupplierForExpense(vendorName, vatNumber, countryCode)
        setValidation(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Validation failed')
        setValidation(null)
      } finally {
        setIsValidating(false)
      }
    }

    // Debounce validation
    const timer = setTimeout(validateSupplier, 500)
    return () => clearTimeout(timer)
  }, [vendorName, vatNumber, countryCode])

  return {
    validation,
    isValidating,
    error,
    hasWarnings: validation?.foreignSupplierWarnings.length > 0,
    requiresReverseCharge: validation?.requiresReverseCharge || false,
    suggestedVATType: validation?.suggestedVATType || 'standard'
  }
}
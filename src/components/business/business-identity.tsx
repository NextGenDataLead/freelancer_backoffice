import * as React from 'react'
import { UseFormRegister, FieldErrors, UseFormWatch } from 'react-hook-form'
import { BusinessProfileData, businessTypes } from '@/lib/validations/business'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Building2, Hash, FileText, Users } from 'lucide-react'

interface BusinessIdentitySectionProps {
  register: UseFormRegister<BusinessProfileData>
  errors: FieldErrors<BusinessProfileData>
  watch: UseFormWatch<BusinessProfileData>
  disabled?: boolean
}

export function BusinessIdentitySection({ 
  register, 
  errors, 
  watch,
  disabled = false 
}: BusinessIdentitySectionProps) {
  const businessType = watch('business_type')

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h3 className="text-lg font-medium text-slate-900 flex items-center">
          <Building2 className="mr-2 h-5 w-5" />
          Bedrijfsidentiteit
        </h3>
        <p className="text-sm text-slate-600 mt-1">
          Basis bedrijfsinformatie voor uw facturen en administratie.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Business Name */}
        <div className="md:col-span-2">
          <label htmlFor="business_name" className="block text-sm font-medium text-slate-700 mb-1">
            Bedrijfsnaam <span className="text-red-500">*</span>
          </label>
          <input
            id="business_name"
            type="text"
            {...register('business_name')}
            disabled={disabled}
            className={`w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm transition-colors ${
              disabled 
                ? 'bg-slate-50 text-slate-500 cursor-not-allowed' 
                : 'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
            } ${errors.business_name ? 'border-red-300' : ''}`}
            placeholder="Bijv. Jouw Bedrijf BV"
          />
          {errors.business_name && (
            <p className="mt-1 text-sm text-red-600">{errors.business_name.message}</p>
          )}
        </div>

        {/* KvK Number */}
        <div>
          <label htmlFor="kvk_number" className="block text-sm font-medium text-slate-700 mb-1">
            <Hash className="inline h-4 w-4 mr-1" />
            KvK Nummer
          </label>
          <input
            id="kvk_number"
            type="text"
            {...register('kvk_number')}
            disabled={disabled}
            className={`w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm transition-colors ${
              disabled 
                ? 'bg-slate-50 text-slate-500 cursor-not-allowed' 
                : 'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
            } ${errors.kvk_number ? 'border-red-300' : ''}`}
            placeholder="12345678"
            maxLength={8}
          />
          {errors.kvk_number && (
            <p className="mt-1 text-sm text-red-600">{errors.kvk_number.message}</p>
          )}
          <p className="mt-1 text-xs text-slate-500">
            8 cijfers, verkrijgbaar via de Kamer van Koophandel
          </p>
        </div>

        {/* BTW Number */}
        <div>
          <label htmlFor="btw_number" className="block text-sm font-medium text-slate-700 mb-1">
            <FileText className="inline h-4 w-4 mr-1" />
            BTW Nummer
          </label>
          <input
            id="btw_number"
            type="text"
            {...register('btw_number')}
            disabled={disabled}
            className={`w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm transition-colors ${
              disabled 
                ? 'bg-slate-50 text-slate-500 cursor-not-allowed' 
                : 'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
            } ${errors.btw_number ? 'border-red-300' : ''}`}
            placeholder="NL123456789B12"
            maxLength={14}
          />
          {errors.btw_number && (
            <p className="mt-1 text-sm text-red-600">{errors.btw_number.message}</p>
          )}
          <p className="mt-1 text-xs text-slate-500">
            Format: NL123456789B12 (optioneel)
          </p>
        </div>

        {/* Business Type */}
        <div className="md:col-span-2">
          <label htmlFor="business_type" className="block text-sm font-medium text-slate-700 mb-1">
            <Users className="inline h-4 w-4 mr-1" />
            Bedrijfsvorm
          </label>
          <select
            id="business_type"
            {...register('business_type')}
            disabled={disabled}
            className={`w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm transition-colors ${
              disabled 
                ? 'bg-slate-50 text-slate-500 cursor-not-allowed' 
                : 'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
            } ${errors.business_type ? 'border-red-300' : ''}`}
          >
            <option value="">Selecteer bedrijfsvorm</option>
            {businessTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          {errors.business_type && (
            <p className="mt-1 text-sm text-red-600">{errors.business_type.message}</p>
          )}
          
          {businessType && (
            <div className="mt-2">
              <Badge variant="secondary">
                {businessTypes.find(t => t.value === businessType)?.label}
              </Badge>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
import * as React from 'react'
import { UseFormRegister, FieldErrors, UseFormWatch } from 'react-hook-form'
import { BusinessProfileData } from '@/lib/validations/business'
import { MapPin, Phone, Globe } from 'lucide-react'

interface BusinessAddressSectionProps {
  register: UseFormRegister<BusinessProfileData>
  errors: FieldErrors<BusinessProfileData>
  watch: UseFormWatch<BusinessProfileData>
  disabled?: boolean
}

export function BusinessAddressSection({ 
  register, 
  errors, 
  watch,
  disabled = false 
}: BusinessAddressSectionProps) {
  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h3 className="text-lg font-medium text-slate-900 flex items-center">
          <MapPin className="mr-2 h-5 w-5" />
          Adresinformatie
        </h3>
        <p className="text-sm text-slate-600 mt-1">
          Contactgegevens die op uw facturen worden weergegeven.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Street Address */}
        <div className="md:col-span-2">
          <label htmlFor="address" className="block text-sm font-medium text-slate-700 mb-1">
            Straatadres
          </label>
          <input
            id="address"
            type="text"
            {...register('address')}
            disabled={disabled}
            className={`w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm transition-colors ${
              disabled 
                ? 'bg-slate-50 text-slate-500 cursor-not-allowed' 
                : 'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
            } ${errors.address ? 'border-red-300' : ''}`}
            placeholder="Hoofdstraat 123"
          />
          {errors.address && (
            <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
          )}
        </div>

        {/* Postal Code */}
        <div>
          <label htmlFor="postal_code" className="block text-sm font-medium text-slate-700 mb-1">
            Postcode
          </label>
          <input
            id="postal_code"
            type="text"
            {...register('postal_code')}
            disabled={disabled}
            className={`w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm transition-colors ${
              disabled 
                ? 'bg-slate-50 text-slate-500 cursor-not-allowed' 
                : 'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
            } ${errors.postal_code ? 'border-red-300' : ''}`}
            placeholder="1234 AB"
            maxLength={7}
          />
          {errors.postal_code && (
            <p className="mt-1 text-sm text-red-600">{errors.postal_code.message}</p>
          )}
        </div>

        {/* City */}
        <div>
          <label htmlFor="city" className="block text-sm font-medium text-slate-700 mb-1">
            Stad
          </label>
          <input
            id="city"
            type="text"
            {...register('city')}
            disabled={disabled}
            className={`w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm transition-colors ${
              disabled 
                ? 'bg-slate-50 text-slate-500 cursor-not-allowed' 
                : 'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
            } ${errors.city ? 'border-red-300' : ''}`}
            placeholder="Amsterdam"
          />
          {errors.city && (
            <p className="mt-1 text-sm text-red-600">{errors.city.message}</p>
          )}
        </div>

        {/* Country */}
        <div>
          <label htmlFor="country_code" className="block text-sm font-medium text-slate-700 mb-1">
            Land
          </label>
          <select
            id="country_code"
            {...register('country_code')}
            disabled={disabled}
            className={`w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm transition-colors ${
              disabled 
                ? 'bg-slate-50 text-slate-500 cursor-not-allowed' 
                : 'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
            } ${errors.country_code ? 'border-red-300' : ''}`}
          >
            <option value="NL">Nederland</option>
            <option value="BE">België</option>
            <option value="DE">Duitsland</option>
            <option value="FR">Frankrijk</option>
            <option value="GB">Verenigd Koninkrijk</option>
            <option value="US">Verenigde Staten</option>
            <option value="OTHER">Overig</option>
          </select>
          {errors.country_code && (
            <p className="mt-1 text-sm text-red-600">{errors.country_code.message}</p>
          )}
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1">
            <Phone className="inline h-4 w-4 mr-1" />
            Telefoonnummer
          </label>
          <input
            id="phone"
            type="tel"
            {...register('phone')}
            disabled={disabled}
            className={`w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm transition-colors ${
              disabled 
                ? 'bg-slate-50 text-slate-500 cursor-not-allowed' 
                : 'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
            } ${errors.phone ? 'border-red-300' : ''}`}
            placeholder="+31 6 12345678"
          />
          {errors.phone && (
            <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
          )}
        </div>

        {/* Website */}
        <div>
          <label htmlFor="website" className="block text-sm font-medium text-slate-700 mb-1">
            <Globe className="inline h-4 w-4 mr-1" />
            Website
          </label>
          <input
            id="website"
            type="url"
            {...register('website')}
            disabled={disabled}
            className={`w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm transition-colors ${
              disabled 
                ? 'bg-slate-50 text-slate-500 cursor-not-allowed' 
                : 'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
            } ${errors.website ? 'border-red-300' : ''}`}
            placeholder="https://www.uwbedrijf.nl"
          />
          {errors.website && (
            <p className="mt-1 text-sm text-red-600">{errors.website.message}</p>
          )}
        </div>
      </div>
    </div>
  )
}
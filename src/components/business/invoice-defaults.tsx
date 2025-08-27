import * as React from 'react'
import { UseFormRegister, FieldErrors, Control, UseFormWatch } from 'react-hook-form'
import { Controller } from 'react-hook-form'
import { BusinessProfileData, paymentTermsOptions } from '@/lib/validations/business'
import { Badge } from '@/components/ui/badge'
import { FileText, Clock, Percent, MessageSquare, ScrollText } from 'lucide-react'

interface InvoiceDefaultsSectionProps {
  register: UseFormRegister<BusinessProfileData>
  errors: FieldErrors<BusinessProfileData>
  control: Control<BusinessProfileData>
  watch: UseFormWatch<BusinessProfileData>
  disabled?: boolean
}

export function InvoiceDefaultsSection({ 
  register, 
  errors, 
  control,
  watch,
  disabled = false 
}: InvoiceDefaultsSectionProps) {
  const paymentTerms = watch('default_payment_terms')
  const customFooterText = watch('custom_footer_text')
  
  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h3 className="text-lg font-medium text-slate-900 flex items-center">
          <FileText className="mr-2 h-5 w-5" />
          Factuur Standaarden
        </h3>
        <p className="text-sm text-slate-600 mt-1">
          Configureer standaardwaarden voor nieuwe facturen.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Default Payment Terms */}
        <div>
          <label htmlFor="default_payment_terms" className="block text-sm font-medium text-slate-700 mb-1">
            <Clock className="inline h-4 w-4 mr-1" />
            Standaard Betalingstermijn
          </label>
          <select
            id="default_payment_terms"
            {...register('default_payment_terms', { valueAsNumber: true })}
            disabled={disabled}
            className={`w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm transition-colors ${
              disabled 
                ? 'bg-slate-50 text-slate-500 cursor-not-allowed' 
                : 'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
            } ${errors.default_payment_terms ? 'border-red-300' : ''}`}
          >
            {paymentTermsOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.default_payment_terms && (
            <p className="mt-1 text-sm text-red-600">{errors.default_payment_terms.message}</p>
          )}
          {paymentTerms && (
            <div className="mt-2">
              <Badge variant="outline">
                {paymentTerms} dagen betalingstermijn
              </Badge>
            </div>
          )}
        </div>

        {/* Late Payment Interest */}
        <div>
          <label htmlFor="late_payment_interest" className="block text-sm font-medium text-slate-700 mb-1">
            <Percent className="inline h-4 w-4 mr-1" />
            Rente bij Laattijdige Betaling
          </label>
          <div className="relative">
            <input
              id="late_payment_interest"
              type="number"
              step="0.1"
              min="0"
              max="50"
              {...register('late_payment_interest', { valueAsNumber: true })}
              disabled={disabled}
              className={`w-full pr-8 pl-3 py-2 border border-slate-300 rounded-md shadow-sm transition-colors ${
                disabled 
                  ? 'bg-slate-50 text-slate-500 cursor-not-allowed' 
                  : 'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
              } ${errors.late_payment_interest ? 'border-red-300' : ''}`}
              placeholder="2.0"
            />
            <span className="absolute right-2.5 top-2.5 text-slate-400">%</span>
          </div>
          {errors.late_payment_interest && (
            <p className="mt-1 text-sm text-red-600">{errors.late_payment_interest.message}</p>
          )}
          <p className="mt-1 text-xs text-slate-500">
            Wettelijk toegestaan rentepercentage per maand
          </p>
        </div>

        {/* Default Invoice Description */}
        <div className="md:col-span-2">
          <label htmlFor="default_invoice_description" className="block text-sm font-medium text-slate-700 mb-1">
            <MessageSquare className="inline h-4 w-4 mr-1" />
            Standaard Factuur Omschrijving
          </label>
          <input
            id="default_invoice_description"
            type="text"
            {...register('default_invoice_description')}
            disabled={disabled}
            className={`w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm transition-colors ${
              disabled 
                ? 'bg-slate-50 text-slate-500 cursor-not-allowed' 
                : 'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
            } ${errors.default_invoice_description ? 'border-red-300' : ''}`}
            placeholder="Geleverde diensten conform opdracht"
            maxLength={500}
          />
          {errors.default_invoice_description && (
            <p className="mt-1 text-sm text-red-600">{errors.default_invoice_description.message}</p>
          )}
          <p className="mt-1 text-xs text-slate-500">
            Wordt automatisch toegevoegd aan nieuwe facturen
          </p>
        </div>

        {/* Custom Footer Text */}
        <div className="md:col-span-2">
          <label htmlFor="custom_footer_text" className="block text-sm font-medium text-slate-700 mb-1">
            <ScrollText className="inline h-4 w-4 mr-1" />
            Aangepaste Footer Tekst
          </label>
          <textarea
            id="custom_footer_text"
            rows={3}
            {...register('custom_footer_text')}
            disabled={disabled}
            className={`w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm transition-colors resize-none ${
              disabled 
                ? 'bg-slate-50 text-slate-500 cursor-not-allowed' 
                : 'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
            } ${errors.custom_footer_text ? 'border-red-300' : ''}`}
            placeholder="Bedankt voor uw vertrouwen in onze dienstverlening."
            maxLength={500}
          />
          {errors.custom_footer_text && (
            <p className="mt-1 text-sm text-red-600">{errors.custom_footer_text.message}</p>
          )}
          <div className="flex justify-between mt-1">
            <p className="text-xs text-slate-500">
              Verschijnt onderaan elke factuur
            </p>
            <p className="text-xs text-slate-400">
              {customFooterText?.length || 0}/500
            </p>
          </div>
        </div>

        {/* Terms and Conditions */}
        <div className="md:col-span-2">
          <label htmlFor="terms_conditions" className="block text-sm font-medium text-slate-700 mb-1">
            <ScrollText className="inline h-4 w-4 mr-1" />
            Algemene Voorwaarden
          </label>
          <textarea
            id="terms_conditions"
            rows={4}
            {...register('terms_conditions')}
            disabled={disabled}
            className={`w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm transition-colors resize-none ${
              disabled 
                ? 'bg-slate-50 text-slate-500 cursor-not-allowed' 
                : 'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
            } ${errors.terms_conditions ? 'border-red-300' : ''}`}
            placeholder="Bijvoorbeeld: Betaling binnen 30 dagen na factuurdatum. Bij laattijdige betaling worden incassokosten in rekening gebracht..."
            maxLength={5000}
          />
          {errors.terms_conditions && (
            <p className="mt-1 text-sm text-red-600">{errors.terms_conditions.message}</p>
          )}
          <div className="flex justify-between mt-1">
            <p className="text-xs text-slate-500">
              Optioneel: kan worden toegevoegd aan facturen
            </p>
            <p className="text-xs text-slate-400">
              {watch('terms_conditions')?.length || 0}/5000
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
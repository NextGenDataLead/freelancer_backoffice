import * as React from 'react'
import { UseFormRegister, FieldErrors, Control, UseFormWatch } from 'react-hook-form'
import { Controller } from 'react-hook-form'
import { BusinessProfileData } from '@/lib/validations/business'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Euro, Calendar, TrendingUp } from 'lucide-react'

interface FinancialSettingsSectionProps {
  register: UseFormRegister<BusinessProfileData>
  errors: FieldErrors<BusinessProfileData>
  control: Control<BusinessProfileData>
  watch: UseFormWatch<BusinessProfileData>
  disabled?: boolean
}

export function FinancialSettingsSection({ 
  register, 
  errors, 
  control,
  watch,
  disabled = false 
}: FinancialSettingsSectionProps) {
  const korEnabled = watch('kor_enabled')
  
  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h3 className="text-lg font-medium text-slate-900 flex items-center">
          <Euro className="mr-2 h-5 w-5" />
          Financiële Instellingen
        </h3>
        <p className="text-sm text-slate-600 mt-1">
          Configureer uw standaard tarieven en fiscale instellingen.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Hourly Rate */}
        <div>
          <label htmlFor="hourly_rate" className="block text-sm font-medium text-slate-700 mb-1">
            <TrendingUp className="inline h-4 w-4 mr-1" />
            Standaard Uurtarief
          </label>
          <div className="relative">
            <input
              id="hourly_rate"
              type="number"
              step="0.01"
              min="0"
              max="1000"
              {...register('hourly_rate', { valueAsNumber: true })}
              disabled={disabled}
              className={`w-full pl-8 pr-3 py-2 border border-slate-300 rounded-md shadow-sm transition-colors ${
                disabled 
                  ? 'bg-slate-50 text-slate-500 cursor-not-allowed' 
                  : 'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
              } ${errors.hourly_rate ? 'border-red-300' : ''}`}
              placeholder="75.00"
            />
            <Euro className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          </div>
          {errors.hourly_rate && (
            <p className="mt-1 text-sm text-red-600">{errors.hourly_rate.message}</p>
          )}
          <p className="mt-1 text-xs text-slate-500">
            Gebruikt als standaard voor tijdregistratie
          </p>
        </div>

        {/* Financial Year Start */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            <Calendar className="inline h-4 w-4 mr-1" />
            Boekjaar Start
          </label>
          <Controller
            control={control}
            name="financial_year_start"
            render={({ field }) => {
              const [month, day] = (field.value || '01-01').split('-')
              
              const handleMonthChange = (newMonth: string) => {
                const currentDay = day || '01'
                field.onChange(`${newMonth.padStart(2, '0')}-${currentDay.padStart(2, '0')}`)
              }
              
              const handleDayChange = (newDay: string) => {
                const currentMonth = month || '01'
                field.onChange(`${currentMonth.padStart(2, '0')}-${newDay.padStart(2, '0')}`)
              }
              
              return (
                <div className="flex space-x-2">
                  <div className="flex-1">
                    <Select value={month} onValueChange={handleMonthChange} disabled={disabled}>
                      <SelectTrigger className={errors.financial_year_start ? 'border-red-300' : ''}>
                        <SelectValue placeholder="Maand" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="01">Januari</SelectItem>
                        <SelectItem value="02">Februari</SelectItem>
                        <SelectItem value="03">Maart</SelectItem>
                        <SelectItem value="04">April</SelectItem>
                        <SelectItem value="05">Mei</SelectItem>
                        <SelectItem value="06">Juni</SelectItem>
                        <SelectItem value="07">Juli</SelectItem>
                        <SelectItem value="08">Augustus</SelectItem>
                        <SelectItem value="09">September</SelectItem>
                        <SelectItem value="10">Oktober</SelectItem>
                        <SelectItem value="11">November</SelectItem>
                        <SelectItem value="12">December</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Select value={day} onValueChange={handleDayChange} disabled={disabled}>
                      <SelectTrigger className={errors.financial_year_start ? 'border-red-300' : ''}>
                        <SelectValue placeholder="Dag" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 31 }, (_, i) => (
                          <SelectItem key={i + 1} value={String(i + 1).padStart(2, '0')}>
                            {i + 1}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )
            }}
          />
          {errors.financial_year_start && (
            <p className="mt-1 text-sm text-red-600">{errors.financial_year_start.message}</p>
          )}
          <p className="mt-1 text-xs text-slate-500">
            Selecteer de maand en dag waarop uw boekjaar begint
          </p>
        </div>

        {/* KOR Regulation */}
        <div className="md:col-span-2">
          <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
            <div className="flex-1">
              <label htmlFor="kor_enabled" className="block text-sm font-medium text-slate-700">
                KOR Regeling (Kleine Ondernemersregeling)
              </label>
              <p className="text-sm text-slate-500 mt-1">
                Voor bedrijven met jaaromzet onder €20.000 die geen BTW hoeven te berekenen
              </p>
              {korEnabled && (
                <div className="mt-2">
                  <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
                    KOR Actief
                  </Badge>
                </div>
              )}
            </div>
            <div className="ml-4">
              <Controller
                name="kor_enabled"
                control={control}
                render={({ field }) => (
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={disabled}
                    id="kor_enabled"
                  />
                )}
              />
            </div>
          </div>
          {errors.kor_enabled && (
            <p className="mt-1 text-sm text-red-600">{errors.kor_enabled.message}</p>
          )}
        </div>
      </div>

      {korEnabled && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <TrendingUp className="h-5 w-5 text-green-400" />
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-green-800">
                KOR Regeling Actief
              </h4>
              <div className="mt-2 text-sm text-green-700">
                <p>
                  • Geen BTW berekening op facturen<br/>
                  • Geschikt voor kleine ondernemers<br/>
                  • Let op: jaaromzet limiet van €20.000
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
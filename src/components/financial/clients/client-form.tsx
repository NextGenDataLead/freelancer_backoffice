'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Building2, User, Globe, Phone, Mail, MapPin, Calendar, Clock, Euro } from 'lucide-react'
import { CreateClientSchema, UpdateClientSchema } from '@/lib/validations/financial'
import type { Client } from '@/lib/types/financial'
import { z } from 'zod'

interface ClientFormProps {
  client?: Client
  onSuccess?: (client: Client) => void
  onCancel?: () => void
}

// EU Countries for dropdown
const EU_COUNTRIES = [
  { code: 'NL', name: 'Nederland' },
  { code: 'BE', name: 'België' },
  { code: 'DE', name: 'Duitsland' },
  { code: 'FR', name: 'Frankrijk' },
  { code: 'AT', name: 'Oostenrijk' },
  { code: 'IT', name: 'Italië' },
  { code: 'ES', name: 'Spanje' },
  { code: 'PT', name: 'Portugal' },
  { code: 'LU', name: 'Luxemburg' },
  { code: 'DK', name: 'Denemarken' },
  { code: 'SE', name: 'Zweden' },
  { code: 'FI', name: 'Finland' },
  { code: 'IE', name: 'Ierland' },
  { code: 'PL', name: 'Polen' },
  { code: 'CZ', name: 'Tsjechië' },
  { code: 'SK', name: 'Slowakije' },
  { code: 'HU', name: 'Hongarije' },
  { code: 'SI', name: 'Slovenië' },
  { code: 'HR', name: 'Kroatië' },
  { code: 'BG', name: 'Bulgarije' },
  { code: 'RO', name: 'Roemenië' },
  { code: 'EE', name: 'Estland' },
  { code: 'LV', name: 'Letland' },
  { code: 'LT', name: 'Litouwen' },
  { code: 'MT', name: 'Malta' },
  { code: 'CY', name: 'Cyprus' },
  { code: 'GR', name: 'Griekenland' },
]

export function ClientForm({ client, onSuccess, onCancel }: ClientFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [vatValidation, setVatValidation] = useState<{
    isValidating: boolean
    isValid: boolean | null
    message: string
  }>({ isValidating: false, isValid: null, message: '' })

  const schema = client ? UpdateClientSchema : CreateClientSchema
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      ...(client ? { id: client.id } : {}), // Include id for updates
      name: client?.name || '',
      company_name: client?.company_name || '',
      email: client?.email || '',
      phone: client?.phone || '',
      address: client?.address || '',
      postal_code: client?.postal_code || '',
      city: client?.city || '',
      country_code: client?.country_code || 'NL',
      vat_number: client?.vat_number || '',
      is_business: client?.is_business || false,
      is_supplier: client?.is_supplier || false,
      default_payment_terms: client?.default_payment_terms || 30,
      notes: client?.notes || '',
      hourly_rate: client?.hourly_rate || undefined,
      // Invoicing frequency fields
      invoicing_frequency: client?.invoicing_frequency || 'on_demand',
      auto_invoice_enabled: client?.auto_invoice_enabled || false,
    },
  })

  const watchedIsBusiness = form.watch('is_business')
  const watchedVatNumber = form.watch('vat_number')
  const watchedCountry = form.watch('country_code')

  // Validate VAT number when it changes
  const validateVATNumber = async (vatNumber: string, countryCode: string) => {
    if (!vatNumber || vatNumber.length < 8) {
      setVatValidation({ isValidating: false, isValid: null, message: '' })
      return
    }

    setVatValidation({ isValidating: true, isValid: null, message: 'BTW-nummer valideren...' })

    try {
      const response = await fetch('/api/clients/validate-vat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vat_number: vatNumber,
          country_code: countryCode
        })
      })

      const result = await response.json()

      if (response.ok && result.data?.valid) {
        setVatValidation({
          isValidating: false,
          isValid: true,
          message: result.data.company_name 
            ? `Geldig - ${result.data.company_name}`
            : 'BTW-nummer is geldig'
        })
      } else {
        setVatValidation({
          isValidating: false,
          isValid: false,
          message: result.message || 'BTW-nummer is niet geldig'
        })
      }
    } catch (error) {
      setVatValidation({
        isValidating: false,
        isValid: false,
        message: 'Fout bij valideren BTW-nummer'
      })
    }
  }

  // Trigger VAT validation when VAT number or country changes
  React.useEffect(() => {
    if (watchedIsBusiness && watchedVatNumber && watchedCountry) {
      const timer = setTimeout(() => {
        validateVATNumber(watchedVatNumber, watchedCountry)
      }, 500) // Debounce for 500ms

      return () => clearTimeout(timer)
    }
  }, [watchedVatNumber, watchedCountry, watchedIsBusiness])

  const onSubmit = async (data: any) => {
    console.log('Form submitted with data:', data)
    console.log('Client exists:', !!client)
    console.log('Schema being used:', client ? 'UpdateClientSchema' : 'CreateClientSchema')
    
    setIsSubmitting(true)

    try {
      const url = client ? `/api/clients/${client.id}` : '/api/clients'
      const method = client ? 'PUT' : 'POST'

      // For updates, include the client ID
      const requestData = client ? { ...data, id: client.id } : data

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('API Error:', error)
        throw new Error(error.error || error.message || `Failed to ${client ? 'update' : 'create'} client`)
      }

      const result = await response.json()
      onSuccess?.(result.data)

      // Reset form if creating new client
      if (!client) {
        form.reset()
      }
    } catch (error) {
      console.error('Client form error:', error)
      // TODO: Show toast notification
      alert(error instanceof Error ? error.message : 'Er is een fout opgetreden')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {watchedIsBusiness ? (
            <Building2 className="h-5 w-5" />
          ) : (
            <User className="h-5 w-5" />
          )}
          {client ? 'Klant bewerken' : 'Nieuwe klant'}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
            console.log('Form validation errors:', errors)
            console.log('Form state:', form.formState)
          })} className="space-y-6">
            {/* Business Type Toggle */}
            <FormField
              control={form.control}
              name="is_business"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Zakelijke klant</FormLabel>
                    <FormDescription>
                      Is dit een bedrijf of een particuliere klant?
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name Fields */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {watchedIsBusiness ? 'Contactpersoon' : 'Naam'}
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={watchedIsBusiness ? 'Jan de Vries' : 'Jan de Vries'}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchedIsBusiness && (
                <FormField
                  control={form.control}
                  name="company_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bedrijfsnaam</FormLabel>
                      <FormControl>
                        <Input placeholder="Acme BV" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      E-mailadres
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="jan@example.com" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Telefoonnummer
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="+31 6 12345678" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Address Information */}
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Adres
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Hoofdstraat 123" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="postal_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Postcode</FormLabel>
                    <FormControl>
                      <Input placeholder="1234 AB" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plaats</FormLabel>
                    <FormControl>
                      <Input placeholder="Amsterdam" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="country_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Land
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecteer land" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {EU_COUNTRIES.map((country) => (
                          <SelectItem key={country.code} value={country.code}>
                            {country.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* VAT Number for Business Clients */}
            {watchedIsBusiness && (
              <FormField
                control={form.control}
                name="vat_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      BTW-nummer
                      {vatValidation.isValidating && (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      )}
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="NL123456789B01" {...field} />
                    </FormControl>
                    {vatValidation.message && (
                      <FormDescription className={
                        vatValidation.isValid === true 
                          ? 'text-green-600 dark:text-green-400'
                          : vatValidation.isValid === false
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-muted-foreground'
                      }>
                        {vatValidation.message}
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Additional Options */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="is_supplier"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Ook leverancier</FormLabel>
                      <FormDescription>
                        Gebruik deze klant ook als leverancier voor uitgaven
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="default_payment_terms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Standaard betalingstermijn (dagen)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1" 
                          max="365"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 30)}
                        />
                      </FormControl>
                      <FormDescription>
                        Aantal dagen na factuurdatum voor betaling
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hourly_rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Euro className="h-4 w-4" />
                        Uurtarief
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          min="0"
                          max="9999.99"
                          placeholder="€0,00"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => {
                            const value = e.target.value
                            field.onChange(value === '' ? undefined : parseFloat(value))
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Standaard uurtarief voor deze klant
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notities</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Extra informatie over deze klant..."
                        className="resize-none"
                        rows={3}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Invoicing Configuration */}
            <div className="space-y-4 border-t pt-4">
              <div>
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Facturering configuratie
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Stel in hoe vaak deze klant gefactureerd moet worden
                </p>
              </div>

              <FormField
                control={form.control}
                name="invoicing_frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Facturerings frequentie</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecteer frequentie" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="on_demand">Op aanvraag</SelectItem>
                        <SelectItem value="weekly">Wekelijks</SelectItem>
                        <SelectItem value="monthly">Maandelijks</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Op aanvraag = handmatige facturering, wekelijks/maandelijks = automatische herinnering
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="auto_invoice_enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Automatisch factureren</FormLabel>
                      <FormDescription>
                        Automatisch facturen aanmaken op basis van onfactureert tijd (toekomst functionaliteit)
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Form Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {client ? 'Klant bijwerken' : 'Klant toevoegen'}
              </Button>
              
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isSubmitting}
                >
                  Annuleren
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  Clock, 
  Euro, 
  FileText,
  Calendar,
  User,
  Timer,
  AlertCircle,
  Loader2,
  CheckCircle,
  Plus
} from 'lucide-react'
import type { ClientInvoicingSummary, TimeEntryWithClient } from '@/lib/types/financial'
import { TimeEntryInvoiceForm } from './time-entry-invoice-form'

interface ClientInvoiceWizardProps {
  client: ClientInvoicingSummary | null
  isOpen: boolean
  onClose: () => void
  onSuccess?: (invoice: any) => void
}

type WizardStep = 'client-summary' | 'time-selection' | 'manual-items' | 'review' | 'complete'

interface TimeEntriesData {
  time_entries: TimeEntryWithClient[]
  entries_by_date: { [date: string]: TimeEntryWithClient[] }
  summary: {
    total_entries: number
    total_hours: number
    total_amount: number
    average_hourly_rate: number
  }
}

interface SelectedTimeEntry extends TimeEntryWithClient {
  selected: boolean
}

export function ClientInvoiceWizard({
  client,
  isOpen,
  onClose,
  onSuccess
}: ClientInvoiceWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('client-summary')
  const [timeEntries, setTimeEntries] = useState<TimeEntriesData | null>(null)
  const [selectedEntries, setSelectedEntries] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [manualItems, setManualItems] = useState<Array<{
    description: string
    quantity: number
    unit_price: number
  }>>([])

  // Reset wizard when client changes
  useEffect(() => {
    if (client && isOpen) {
      setCurrentStep('client-summary')
      setSelectedEntries([])
      setManualItems([])
      setError(null)
    }
  }, [client, isOpen])

  const fetchTimeEntries = async () => {
    if (!client) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/time-entries/unbilled?client_id=${client.id}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch time entries')
      }

      const result = await response.json()
      setTimeEntries(result.data)
      
      // Auto-select all entries by default
      const allEntryIds = result.data.time_entries?.map((entry: any) => entry.id) || []
      setSelectedEntries(allEntryIds)

    } catch (err) {
      console.error('Error fetching time entries:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handleNext = () => {
    switch (currentStep) {
      case 'client-summary':
        fetchTimeEntries()
        setCurrentStep('time-selection')
        break
      case 'time-selection':
        setCurrentStep('manual-items')
        break
      case 'manual-items':
        setCurrentStep('review')
        break
    }
  }

  const handleBack = () => {
    switch (currentStep) {
      case 'time-selection':
        setCurrentStep('client-summary')
        break
      case 'manual-items':
        setCurrentStep('time-selection')
        break
      case 'review':
        setCurrentStep('manual-items')
        break
    }
  }

  const handleTimeEntryToggle = (entryId: string) => {
    setSelectedEntries(prev => 
      prev.includes(entryId)
        ? prev.filter(id => id !== entryId)
        : [...prev, entryId]
    )
  }

  const handleSelectAll = () => {
    if (!timeEntries) return
    
    const allIds = timeEntries.time_entries.map(entry => entry.id)
    setSelectedEntries(allIds)
  }

  const handleSelectNone = () => {
    setSelectedEntries([])
  }

  const handleSelectThisWeek = () => {
    if (!timeEntries) return
    
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    
    const thisWeekIds = timeEntries.time_entries
      .filter(entry => new Date(entry.entry_date) >= oneWeekAgo)
      .map(entry => entry.id)
    
    setSelectedEntries(thisWeekIds)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('nl-NL', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit'
    })
  }

  const formatHours = (hours: number) => {
    return `${hours.toFixed(1)}u`
  }

  const getSelectedSummary = () => {
    if (!timeEntries) return { hours: 0, amount: 0, count: 0 }

    const selected = timeEntries.time_entries.filter(entry => 
      selectedEntries.includes(entry.id)
    )

    return {
      count: selected.length,
      hours: selected.reduce((sum, entry) => sum + (entry.hours || 0), 0),
      amount: selected.reduce((sum, entry) => 
        sum + ((entry.hours || 0) * (entry.hourly_rate || 0)), 0
      )
    }
  }

  const handleInvoiceSuccess = (invoice: any) => {
    setCurrentStep('complete')
    onSuccess?.(invoice)
  }

  if (!client) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto w-[95vw] min-w-[900px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <FileText className="h-6 w-6" />
            Nieuwe factuur voor {client.company_name || client.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Steps */}
          <div className="flex items-center space-x-4 mb-6">
            {[
              { key: 'client-summary', label: 'Overzicht', icon: User },
              { key: 'time-selection', label: 'Tijd selectie', icon: Timer },
              { key: 'manual-items', label: 'Handmatige items', icon: Plus },
              { key: 'review', label: 'Factuur maken', icon: FileText },
              { key: 'complete', label: 'Voltooid', icon: CheckCircle }
            ].map((step, index) => {
              const Icon = step.icon
              const isActive = currentStep === step.key
              const isCompleted = ['client-summary', 'time-selection', 'manual-items', 'review'].indexOf(currentStep) >
                                ['client-summary', 'time-selection', 'manual-items', 'review'].indexOf(step.key)
              
              return (
                <div key={step.key} className="flex items-center">
                  <div className={`
                    flex items-center justify-center w-8 h-8 rounded-full border-2
                    ${isActive ? 'border-blue-500 bg-blue-500 text-white' : 
                      isCompleted ? 'border-green-500 bg-green-500 text-white' : 
                      'border-gray-300 bg-white text-gray-400'}
                  `}>
                    {isCompleted ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <span className={`ml-2 text-sm font-medium ${
                    isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                  }`}>
                    {step.label}
                  </span>
                  {index < 4 && (
                    <ArrowRight className="h-4 w-4 text-gray-300 mx-2" />
                  )}
                </div>
              )
            })}
          </div>

          {/* Step Content */}
          {currentStep === 'client-summary' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Klantoverzicht
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-2">Klantgegevens</h4>
                    <div className="space-y-1 text-sm">
                      <p><strong>Naam:</strong> {client.company_name || client.name}</p>
                      {client.email && <p><strong>Email:</strong> {client.email}</p>}
                      <p><strong>Land:</strong> {client.country_code}</p>
                      <p><strong>Betalingstermijn:</strong> {client.default_payment_terms} dagen</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Factureringsstatus</h4>
                    <div className="space-y-1 text-sm">
                      <p><strong>Schema:</strong> {client.invoicing_frequency}</p>
                      <p><strong>Onfactureert:</strong> {formatHours(client.unbilled_hours)} / {formatCurrency(client.unbilled_amount)}</p>
                      <p><strong>Laatste factuur:</strong> {client.days_since_last_invoice ? `${client.days_since_last_invoice} dagen geleden` : 'Nog niet gefactureerd'}</p>
                      {client.overdue_for_invoicing && (
                        <Badge className="bg-red-100 text-red-800">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Achterstallig
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 'time-selection' && (
            <div className="space-y-4">
              {loading ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      Tijd registraties laden...
                    </div>
                  </CardContent>
                </Card>
              ) : error ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center text-red-600 dark:text-red-400">
                      {error}
                    </div>
                    <Button onClick={fetchTimeEntries} className="mt-4">
                      Opnieuw proberen
                    </Button>
                  </CardContent>
                </Card>
              ) : timeEntries ? (
                <>
                  {/* Selection Summary */}
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Geselecteerd:</p>
                          <p className="text-lg font-semibold">
                            {getSelectedSummary().count} registraties • {formatHours(getSelectedSummary().hours)} • {formatCurrency(getSelectedSummary().amount)}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={handleSelectAll}>
                            Alles selecteren
                          </Button>
                          <Button variant="outline" size="sm" onClick={handleSelectThisWeek}>
                            Deze week
                          </Button>
                          <Button variant="outline" size="sm" onClick={handleSelectNone}>
                            Niets
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Time Entries Table */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Onfactureert tijd ({timeEntries.time_entries.length} registraties)</CardTitle>
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                      <div className="min-w-full overflow-x-auto">
                        <Table className="w-full">
                          <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">
                              <Checkbox
                                checked={selectedEntries.length === timeEntries.time_entries.length}
                                onCheckedChange={(checked) => {
                                  if (checked) handleSelectAll()
                                  else handleSelectNone()
                                }}
                              />
                            </TableHead>
                            <TableHead className="min-w-[100px]">Datum</TableHead>
                            <TableHead className="min-w-[200px]">Beschrijving</TableHead>
                            <TableHead className="min-w-[120px]">Project</TableHead>
                            <TableHead className="text-right min-w-[80px]">Uren</TableHead>
                            <TableHead className="text-right min-w-[100px]">Tarief</TableHead>
                            <TableHead className="text-right min-w-[100px]">Bedrag</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {timeEntries.time_entries.map((entry) => {
                            const isSelected = selectedEntries.includes(entry.id)
                            const amount = (entry.hours || 0) * (entry.hourly_rate || 0)
                            
                            return (
                              <TableRow 
                                key={entry.id}
                                className={isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                              >
                                <TableCell>
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={() => handleTimeEntryToggle(entry.id)}
                                  />
                                </TableCell>
                                <TableCell className="font-mono text-sm">
                                  {formatDate(entry.entry_date)}
                                </TableCell>
                                <TableCell className="max-w-xs">
                                  <p className="truncate">{entry.description}</p>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {entry.project_name || '-'}
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                  {formatHours(entry.hours || 0)}
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(entry.hourly_rate || 0)}
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  {formatCurrency(amount)}
                                </TableCell>
                              </TableRow>
                            )
                          })}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : null}
            </div>
          )}

          {currentStep === 'manual-items' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Handmatige factuurregels
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Optioneel: Voeg extra regels toe aan de factuur die niet uit tijd registraties komen.
                </p>
                <div className="text-center py-8 text-muted-foreground">
                  <Plus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Handmatige regels functionaliteit komt binnenkort...</p>
                  <p className="text-xs">Voor nu kun je deze stap overslaan</p>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 'review' && selectedEntries.length > 0 && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Factuur maken</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Controleer de gegevens en maak de factuur aan
                  </p>
                </CardHeader>
              </Card>

              {/* Create invoice with pre-selected time entries */}
              <TimeEntryInvoiceForm
                client={client}
                selectedTimeEntries={timeEntries?.time_entries.filter(entry => 
                  selectedEntries.includes(entry.id)
                ) || []}
                onSuccess={handleInvoiceSuccess}
                onCancel={() => setCurrentStep('time-selection')}
              />
            </div>
          )}

          {currentStep === 'complete' && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Factuur succesvol aangemaakt!</h3>
                  <p className="text-muted-foreground mb-6">
                    De factuur is aangemaakt en de tijd registraties zijn gemarkeerd als gefactureerd.
                  </p>
                  <Button onClick={onClose}>
                    Sluiten
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation Buttons */}
          {!['complete'].includes(currentStep) && (
            <div className="flex justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 'client-summary'}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Vorige
              </Button>

              {currentStep !== 'review' ? (
                <Button
                  onClick={handleNext}
                  disabled={loading || (currentStep === 'time-selection' && selectedEntries.length === 0)}
                >
                  Volgende
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : null}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { 
  CheckCircle, 
  Clock, 
  FileText, 
  User, 
  Euro, 
  AlertTriangle, 
  Loader2,
  Download,
  Eye
} from 'lucide-react'
import { WizardState } from '../comprehensive-invoicing-wizard'
import type { InvoiceItem } from '@/lib/types/financial'

interface ReviewAndGenerateStepProps {
  wizardState: WizardState
  updateWizardState: (updates: Partial<WizardState>) => void
  onSuccess: (invoices: any[]) => void
}

interface GenerationProgress {
  currentInvoice: number
  totalInvoices: number
  currentStep: string
  generating: boolean
  completed: boolean
  results: any[]
  errors: string[]
}

export function ReviewAndGenerateStep({
  wizardState,
  updateWizardState,
  onSuccess
}: ReviewAndGenerateStepProps) {
  
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress>({
    currentInvoice: 0,
    totalInvoices: 0,
    currentStep: '',
    generating: false,
    completed: false,
    results: [],
    errors: []
  })

  const selectedClientIds = Object.keys(wizardState.selectedTimeEntries)
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const getClientById = (clientId: string) => {
    return wizardState.clients.find(c => c.id === clientId)
  }

  const getTimeBasedInvoiceTotal = (clientId: string) => {
    const timeTotal = wizardState.clientTimeEntryTotals[clientId] || 0
    const manualTotal = (wizardState.manualAdditions[clientId] || [])
      .reduce((sum, item) => sum + item.line_total, 0)
    return timeTotal + manualTotal
  }

  const getManualInvoiceTotal = (items: InvoiceItem[]) => {
    return items.reduce((sum, item) => sum + item.line_total, 0)
  }

  const getTotalAmount = () => {
    const timeBasedTotal = selectedClientIds.reduce((sum, clientId) => 
      sum + getTimeBasedInvoiceTotal(clientId), 0
    )
    const manualTotal = wizardState.manualInvoices.reduce((sum, invoice) => 
      sum + getManualInvoiceTotal(invoice.items), 0
    )
    return timeBasedTotal + manualTotal
  }

  const getTotalInvoiceCount = () => {
    return selectedClientIds.length + wizardState.manualInvoices.length
  }

  const generateAllInvoices = async () => {
    const totalInvoices = getTotalInvoiceCount()
    
    setGenerationProgress({
      currentInvoice: 0,
      totalInvoices,
      currentStep: 'Voorbereiden bulk factuur creatie...',
      generating: true,
      completed: false,
      results: [],
      errors: []
    })

    try {
      // Prepare bulk invoice payload
      const bulkInvoiceData = []
      
      // Add time-based invoices
      for (const clientId of selectedClientIds) {
        const timeEntries = wizardState.selectedTimeEntries[clientId] || []
        const manualItems = wizardState.manualAdditions[clientId] || []
        
        const invoiceData: any = {
          client_id: clientId,
          type: 'time_based' as const,
          time_entry_ids: timeEntries.map(entry => entry.id),
          notes: `Factuur gegenereerd via Factuur Wizard op ${new Date().toLocaleDateString('nl-NL')}`
        }

        // Only include manual_items if there are actually items
        if (manualItems.length > 0) {
          invoiceData.manual_items = manualItems.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            tax_percentage: item.tax_percentage || 21
          }))
        }

        bulkInvoiceData.push(invoiceData)
      }
      
      // Add manual invoices
      for (const manualInvoice of wizardState.manualInvoices) {
        const manualInvoiceData: any = {
          client_id: manualInvoice.clientId,
          type: 'manual' as const,
          notes: manualInvoice.notes || `Handmatige factuur gegenereerd via Factuur Wizard op ${new Date().toLocaleDateString('nl-NL')}`
        }

        // Only include manual_items if there are actually items
        if (manualInvoice.items.length > 0) {
          manualInvoiceData.manual_items = manualInvoice.items.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            tax_percentage: item.tax_percentage || 21
          }))
        }

        bulkInvoiceData.push(manualInvoiceData)
      }

      setGenerationProgress(prev => ({
        ...prev,
        currentStep: 'Alle facturen worden aangemaakt...'
      }))

      // Call bulk creation API
      console.log('📤 Sending bulk invoice request:', { invoices: bulkInvoiceData })
      
      const response = await fetch('/api/invoices/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoices: bulkInvoiceData })
      })

      const result = await response.json()
      console.log('📥 API Response:', response.status, result)
      
      if (!response.ok) {
        console.error('❌ API Error Details:', result)
        if (result.debug) {
          console.error('🔍 Debug Information:', JSON.stringify(result.debug, null, 2))
        }
        throw new Error(result.message || 'Failed to create invoices')
      }

      // Process results
      const createdInvoices = result.data?.created_invoices || []
      const errors = result.data?.errors || []
      
      const results = createdInvoices.map((invoice: any) => {
        const client = getClientById(invoice.client_id)
        const isTimeBasedInvoice = selectedClientIds.includes(invoice.client_id)
        
        return {
          type: isTimeBasedInvoice ? 'time-based' : 'manual',
          client: client?.company_name || client?.name,
          invoice,
          success: true
        }
      })

      setGenerationProgress({
        currentInvoice: totalInvoices,
        totalInvoices,
        currentStep: 'Voltooid!',
        generating: false,
        completed: true,
        results,
        errors
      })

      // Call success callback after short delay
      setTimeout(() => {
        onSuccess(createdInvoices)
      }, 1500)

    } catch (error) {
      console.error('Error in bulk invoice generation:', error)
      setGenerationProgress(prev => ({
        ...prev,
        generating: false,
        currentStep: 'Fout opgetreden',
        errors: [...prev.errors, error instanceof Error ? error.message : 'Unknown error in bulk generation']
      }))
    }
  }

  const canGenerate = () => {
    return getTotalInvoiceCount() > 0 && !generationProgress.generating
  }

  const hasTimeBasedInvoices = selectedClientIds.length > 0
  const hasManualInvoices = wizardState.manualInvoices.length > 0

  // Debug logging to understand why invoices are being lost
  console.log('🔍 ReviewAndGenerateStep Debug:', {
    selectedClientIds,
    selectedTimeEntries: wizardState.selectedTimeEntries,
    clientTimeEntryTotals: wizardState.clientTimeEntryTotals,
    manualInvoices: wizardState.manualInvoices,
    totalInvoiceCount: getTotalInvoiceCount(),
    hasTimeBasedInvoices,
    hasManualInvoices
  })

  return (
    <div className="space-y-6">
      {/* Overall Summary */}
      <Card className="bg-gradient-to-r from-blue-50 to-green-50 border-green-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-green-800 mb-2">
                Klaar om {getTotalInvoiceCount()} facturen te genereren
              </h3>
              <div className="flex items-center gap-4 text-sm text-green-700">
                {hasTimeBasedInvoices && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{selectedClientIds.length} tijd-gebaseerd</span>
                  </div>
                )}
                {hasManualInvoices && (
                  <div className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    <span>{wizardState.manualInvoices.length} handmatig</span>
                  </div>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-green-600">
                {formatCurrency(getTotalAmount())}
              </div>
              <div className="text-sm text-green-700">Totaal factuurwaarde</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Time-based Invoices Review */}
      {hasTimeBasedInvoices && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Tijd-gebaseerde Facturen ({selectedClientIds.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {selectedClientIds.map((clientId) => {
                const client = getClientById(clientId)
                const timeTotal = wizardState.clientTimeEntryTotals[clientId] || 0
                const manualItems = wizardState.manualAdditions[clientId] || []
                const manualTotal = manualItems.reduce((sum, item) => sum + item.line_total, 0)
                const total = timeTotal + manualTotal
                const timeEntries = wizardState.selectedTimeEntries[clientId] || []
                
                return (
                  <div key={clientId} className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <User className="h-5 w-5 text-blue-600" />
                      <div>
                        <div className="font-medium">{client?.company_name || client?.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {timeEntries.length} tijd entries
                          {manualItems.length > 0 && ` + ${manualItems.length} handmatige regels`}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">
                        {formatCurrency(total)}
                      </div>
                      {manualTotal > 0 && (
                        <div className="text-xs text-muted-foreground">
                          Tijd: {formatCurrency(timeTotal)} + Extra: {formatCurrency(manualTotal)}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual Invoices Review */}
      {hasManualInvoices && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-600" />
              Handmatige Facturen ({wizardState.manualInvoices.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {wizardState.manualInvoices.map((invoice, index) => {
                const client = getClientById(invoice.clientId)
                const total = getManualInvoiceTotal(invoice.items)
                
                return (
                  <div key={index} className="flex items-center justify-between p-4 bg-indigo-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <User className="h-5 w-5 text-indigo-600" />
                      <div>
                        <div className="font-medium">{client?.company_name || client?.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {invoice.items.length} handmatige regels
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">
                        {formatCurrency(total)}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generation Progress */}
      {generationProgress.generating && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Facturen worden gegenereerd...</h4>
                <div className="text-sm text-muted-foreground">
                  {generationProgress.currentInvoice} van {generationProgress.totalInvoices}
                </div>
              </div>
              
              <Progress 
                value={(generationProgress.currentInvoice / generationProgress.totalInvoices) * 100} 
                className="h-2"
              />
              
              <div className="flex items-center gap-2 text-sm text-blue-700">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{generationProgress.currentStep}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generation Results */}
      {generationProgress.completed && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-6 w-6 text-green-600" />
                <h4 className="font-medium text-green-800">
                  Facturen Succesvol Gegenereerd!
                </h4>
              </div>
              
              <div className="space-y-2">
                {generationProgress.results.map((result, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-white rounded">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">
                        {result.type === 'time-based' ? 'Tijd-gebaseerd' : 'Handmatig'} - {result.client}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        #{result.invoice?.invoice_number}
                      </Badge>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <Eye className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {generationProgress.errors.length > 0 && (
                <div className="pt-4 border-t border-red-200">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <span className="font-medium text-red-800">Fouten tijdens generatie:</span>
                  </div>
                  <div className="space-y-1">
                    {generationProgress.errors.map((error, index) => (
                      <div key={index} className="text-sm text-red-700 bg-red-100 p-2 rounded">
                        {error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generate Button */}
      {!generationProgress.completed && (
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium mb-1">Ready to Generate</h4>
                <p className="text-sm text-muted-foreground">
                  Alle facturen worden in één keer aangemaakt. Dit kan even duren.
                </p>
              </div>
              <Button
                onClick={generateAllInvoices}
                disabled={!canGenerate()}
                className="bg-green-600 hover:bg-green-700"
                size="lg"
              >
                {generationProgress.generating ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Genereren...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Genereer Alle Facturen ({getTotalInvoiceCount()})
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
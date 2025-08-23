'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, ArrowRight, CheckCircle, Clock, FileText, Plus } from 'lucide-react'
import { TimeEntryReviewStep } from './wizard-steps/time-entry-review-step'
import { ManualAdditionsStep } from './wizard-steps/manual-additions-step'  
import { ManualInvoicesStep } from './wizard-steps/manual-invoices-step'
import { ReviewAndGenerateStep } from './wizard-steps/review-and-generate-step'
import type { Client, TimeEntry, InvoiceItem } from '@/lib/types/financial'

interface ComprehensiveInvoicingWizardProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (invoices: any[]) => void
}

export interface WizardState {
  // Time-based invoices data
  selectedTimeEntries: Record<string, TimeEntry[]> // clientId -> timeEntries[]
  clientTimeEntryTotals: Record<string, number> // clientId -> total amount
  
  // Manual additions to time-based invoices  
  manualAdditions: Record<string, InvoiceItem[]> // clientId -> manual items[]
  
  // Pure manual invoices
  manualInvoices: Array<{
    clientId: string
    items: InvoiceItem[]
    notes?: string
  }>
  
  // Metadata
  clients: Client[]
  loading: boolean
  error: string | null
}

const STEPS = [
  {
    id: 'time-review',
    title: 'Tijd Registraties',
    description: 'Selecteer klanten en tijdsinvoer voor facturering',
    icon: Clock
  },
  {
    id: 'manual-additions', 
    title: 'Handmatige Items',
    description: 'Voeg extra regels toe aan tijd-gebaseerde facturen',
    icon: Plus
  },
  {
    id: 'manual-invoices',
    title: 'Handmatige Facturen', 
    description: 'Maak volledig handmatige facturen',
    icon: FileText
  },
  {
    id: 'review-generate',
    title: 'Controleren & Genereren',
    description: 'Controleer en genereer alle facturen',
    icon: CheckCircle
  }
]

export function ComprehensiveInvoicingWizard({ 
  isOpen, 
  onClose, 
  onSuccess 
}: ComprehensiveInvoicingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [wizardState, setWizardState] = useState<WizardState>({
    selectedTimeEntries: {},
    clientTimeEntryTotals: {},
    manualAdditions: {},
    manualInvoices: [],
    clients: [],
    loading: false,
    error: null
  })

  // Load initial data
  useEffect(() => {
    if (isOpen) {
      loadInitialData()
    }
  }, [isOpen])

  const loadInitialData = async () => {
    setWizardState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      // Load clients (using maximum allowed limit of 100)
      const clientsResponse = await fetch('/api/clients?limit=100')
      if (!clientsResponse.ok) throw new Error('Failed to fetch clients')
      const clientsData = await clientsResponse.json()
      
      setWizardState(prev => ({
        ...prev,
        clients: clientsData.data || [],
        loading: false
      }))
    } catch (error) {
      console.error('Error loading initial data:', error)
      setWizardState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load data',
        loading: false
      }))
    }
  }

  const updateWizardState = (updates: Partial<WizardState>) => {
    console.log('🔧 MAIN updateWizardState called with updates:', updates)
    console.log('🔧 MAIN current wizard state before update:', {
      selectedTimeEntries: Object.keys(wizardState.selectedTimeEntries),
      clientTimeEntryTotals: Object.keys(wizardState.clientTimeEntryTotals)
    })
    
    setWizardState(prev => {
      const newState = { ...prev, ...updates }
      console.log('🔧 MAIN new state after update:', {
        selectedTimeEntries: Object.keys(newState.selectedTimeEntries),
        clientTimeEntryTotals: Object.keys(newState.clientTimeEntryTotals)
      })
      return newState
    })
  }

  const canProceedToNext = () => {
    switch (currentStep) {
      case 0: // Time Review Step
        const hasSelectedTimeEntries = Object.values(wizardState.selectedTimeEntries).some(entries => entries.length > 0)
        const hasManualInvoices = wizardState.manualInvoices.length > 0
        console.log('canProceedToNext debug:', { hasSelectedTimeEntries, hasManualInvoices, selectedTimeEntries: wizardState.selectedTimeEntries })
        return hasSelectedTimeEntries || hasManualInvoices
      case 1: // Manual Additions Step
        return true // Optional step, can always proceed
      case 2: // Manual Invoices Step  
        return true // Optional step, can always proceed
      case 3: // Review Step
        return false // Final step
      default:
        return true
    }
  }

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      console.log(`🚀 Moving from step ${currentStep} to ${currentStep + 1}`)
      console.log('📊 Current wizard state:', {
        selectedTimeEntries: Object.keys(wizardState.selectedTimeEntries),
        clientTimeEntryTotals: Object.keys(wizardState.clientTimeEntryTotals),
        manualAdditions: Object.keys(wizardState.manualAdditions),
        manualInvoices: wizardState.manualInvoices.length
      })
      setCurrentStep(prev => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleClose = () => {
    // Reset state when closing
    setCurrentStep(0)
    setWizardState({
      selectedTimeEntries: {},
      clientTimeEntryTotals: {},
      manualAdditions: {},
      manualInvoices: [],
      clients: [],
      loading: false,
      error: null
    })
    onClose()
  }

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <TimeEntryReviewStep 
            wizardState={wizardState}
            updateWizardState={updateWizardState}
          />
        )
      case 1:
        return (
          <ManualAdditionsStep
            wizardState={wizardState}
            updateWizardState={updateWizardState}
          />
        )
      case 2:
        return (
          <ManualInvoicesStep
            wizardState={wizardState}
            updateWizardState={updateWizardState}
          />
        )
      case 3:
        return (
          <ReviewAndGenerateStep
            wizardState={wizardState}
            updateWizardState={updateWizardState}
            onSuccess={onSuccess}
          />
        )
      default:
        return <div>Unknown step</div>
    }
  }

  if (!isOpen) return null

  const currentStepData = STEPS[currentStep]
  const progress = ((currentStep + 1) / STEPS.length) * 100

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg max-w-6xl w-full h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Factuur Wizard</h2>
              <p className="text-muted-foreground mt-1">
                Maak al je facturen in één keer - tijd-gebaseerd en handmatig
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <Plus className="h-4 w-4 rotate-45" />
            </Button>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                Stap {currentStep + 1} van {STEPS.length}
              </span>
              <span className="text-sm text-muted-foreground">
                {Math.round(progress)}% voltooid
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Step Indicator */}
          <div className="flex items-center gap-4 mt-4 overflow-x-auto">
            {STEPS.map((step, index) => {
              const Icon = step.icon
              const isActive = index === currentStep
              const isCompleted = index < currentStep
              
              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : isCompleted
                      ? 'bg-green-50 border-green-200 text-green-700'
                      : 'bg-gray-50 border-gray-200 text-gray-500'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{step.title}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {wizardState.error ? (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="text-red-800">
                  <strong>Fout:</strong> {wizardState.error}
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="mb-6">
                <h3 className="text-lg font-semibold">{currentStepData.title}</h3>
                <p className="text-muted-foreground">{currentStepData.description}</p>
              </div>
              
              {renderCurrentStep()}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-6 flex items-center justify-between flex-shrink-0">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Vorige
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={handleClose}>
              Annuleren
            </Button>
            
            {currentStep < STEPS.length - 1 ? (
              <Button
                onClick={handleNext}
                disabled={!canProceedToNext()}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Volgende
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <span className="text-sm text-muted-foreground">
                Gebruik "Genereer Alle Facturen" hierboven
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
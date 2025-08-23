'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Euro, User, AlertCircle, Calculator } from 'lucide-react'
import { WizardState } from '../comprehensive-invoicing-wizard'
import type { InvoiceItem } from '@/lib/types/financial'

interface ManualAdditionsStepProps {
  wizardState: WizardState
  updateWizardState: (updates: Partial<WizardState>) => void
}

export function ManualAdditionsStep({
  wizardState,
  updateWizardState
}: ManualAdditionsStepProps) {
  
  const selectedClientIds = Object.keys(wizardState.selectedTimeEntries)
  
  const addManualItem = (clientId: string) => {
    const newItem: InvoiceItem = {
      id: `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      description: '',
      quantity: 1,
      unit_price: 0,
      line_total: 0,
      vat_rate: 21
    }
    
    const currentItems = wizardState.manualAdditions[clientId] || []
    const newManualAdditions = {
      ...wizardState.manualAdditions,
      [clientId]: [...currentItems, newItem]
    }
    
    updateWizardState({ manualAdditions: newManualAdditions })
  }

  const updateManualItem = (clientId: string, itemId: string, updates: Partial<InvoiceItem>) => {
    const currentItems = wizardState.manualAdditions[clientId] || []
    const updatedItems = currentItems.map(item => {
      if (item.id === itemId) {
        const updatedItem = { ...item, ...updates }
        // Recalculate line total
        updatedItem.line_total = updatedItem.quantity * updatedItem.unit_price
        return updatedItem
      }
      return item
    })
    
    const newManualAdditions = {
      ...wizardState.manualAdditions,
      [clientId]: updatedItems
    }
    
    updateWizardState({ manualAdditions: newManualAdditions })
  }

  const removeManualItem = (clientId: string, itemId: string) => {
    const currentItems = wizardState.manualAdditions[clientId] || []
    const filteredItems = currentItems.filter(item => item.id !== itemId)
    
    const newManualAdditions = {
      ...wizardState.manualAdditions,
      [clientId]: filteredItems.length > 0 ? filteredItems : undefined
    }
    
    // Remove empty arrays
    if (filteredItems.length === 0) {
      delete newManualAdditions[clientId]
    }
    
    updateWizardState({ manualAdditions: newManualAdditions })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const getClientById = (clientId: string) => {
    return wizardState.clients.find(c => c.id === clientId)
  }

  const getClientTotalWithManual = (clientId: string) => {
    const timeTotal = wizardState.clientTimeEntryTotals[clientId] || 0
    const manualTotal = (wizardState.manualAdditions[clientId] || [])
      .reduce((sum, item) => sum + item.line_total, 0)
    return timeTotal + manualTotal
  }

  // Sort clients to match Step 1 order (by total amount descending)
  const sortedClientIds = selectedClientIds.sort((aId, bId) => {
    const totalA = getClientTotalWithManual(aId)
    const totalB = getClientTotalWithManual(bId)
    // Sort by total amount descending to match Step 1
    return totalB - totalA
  })

  if (sortedClientIds.length === 0) {
    return (
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="p-6">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-orange-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-orange-800 mb-2">
              Geen Klanten Geselecteerd
            </h3>
            <p className="text-orange-700">
              Je hebt nog geen klanten geselecteerd voor tijd-gebaseerde facturen. 
              Ga terug naar stap 1 om klanten te selecteren, of ga verder naar stap 3 
              om volledig handmatige facturen te maken.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <Card className="bg-purple-50 border-purple-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-purple-600" />
              <span className="font-medium">
                Voeg handmatige regels toe aan tijd-gebaseerde facturen
              </span>
            </div>
            <Badge variant="secondary" className="bg-purple-100 text-purple-800">
              {sortedClientIds.length} klanten
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="bg-gray-50 border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium mb-1">Optionele Stap</h4>
              <p className="text-sm text-muted-foreground">
                Hier kun je extra regels toevoegen aan de tijd-gebaseerde facturen. 
                Bijvoorbeeld voor materiaalkosten, reiskosten, of andere diensten. 
                Deze stap is optioneel - je kunt ook direct doorgaan naar stap 3.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Client Cards */}
      <div className="space-y-6">
        {sortedClientIds.map(clientId => {
          const client = getClientById(clientId)
          const manualItems = wizardState.manualAdditions[clientId] || []
          const timeTotal = wizardState.clientTimeEntryTotals[clientId] || 0
          const manualTotal = manualItems.reduce((sum, item) => sum + item.line_total, 0)
          const totalWithManual = getClientTotalWithManual(clientId)
          
          if (!client) return null

          return (
            <Card key={clientId} className="border-2 border-gray-200">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-gray-600" />
                    <div>
                      <CardTitle className="text-lg">{client.company_name || client.name}</CardTitle>
                      {client.company_name && (
                        <p className="text-sm text-muted-foreground">Contact: {client.name}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600">
                      {formatCurrency(totalWithManual)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Tijd: {formatCurrency(timeTotal)}
                      {manualTotal > 0 && (
                        <span> + Handmatig: {formatCurrency(manualTotal)}</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                {/* Existing Manual Items */}
                {manualItems.length > 0 && (
                  <div className="space-y-3 mb-4">
                    {manualItems.map((item, index) => (
                      <div key={item.id} className="grid grid-cols-12 gap-2 items-center p-3 bg-gray-50 rounded-lg">
                        <div className="col-span-5">
                          <Input
                            placeholder="Beschrijving..."
                            value={item.description}
                            onChange={(e) => updateManualItem(clientId, item.id, { description: e.target.value })}
                            className="text-sm"
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            placeholder="Aantal"
                            value={item.quantity}
                            onChange={(e) => updateManualItem(clientId, item.id, { quantity: parseFloat(e.target.value) || 0 })}
                            className="text-sm text-center"
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            placeholder="Prijs"
                            value={item.unit_price}
                            onChange={(e) => updateManualItem(clientId, item.id, { unit_price: parseFloat(e.target.value) || 0 })}
                            className="text-sm text-right"
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div className="col-span-2 text-right font-medium">
                          {formatCurrency(item.line_total)}
                        </div>
                        <div className="col-span-1 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeManualItem(clientId, item.id)}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Item Button */}
                <Button
                  variant="outline"
                  onClick={() => addManualItem(clientId)}
                  className="w-full border-dashed border-purple-300 text-purple-600 hover:bg-purple-50"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Voeg Handmatige Regel Toe
                </Button>

                {/* Summary */}
                {manualItems.length > 0 && (
                  <div className="mt-4 pt-4 border-t bg-purple-50 -mx-6 -mb-6 px-6 pb-6 rounded-b-lg">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Tijd entries:</span>
                        <div className="font-medium">{formatCurrency(timeTotal)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Handmatige items:</span>
                        <div className="font-medium">{formatCurrency(manualTotal)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Factuur totaal:</span>
                        <div className="font-bold text-green-600">{formatCurrency(totalWithManual)}</div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Overall Summary */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-green-600" />
              <span className="font-medium">
                Totaal tijd-gebaseerde facturen (inclusief handmatige toevoegingen)
              </span>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-green-600">
                {formatCurrency(
                  sortedClientIds.reduce((sum, clientId) => sum + getClientTotalWithManual(clientId), 0)
                )}
              </div>
              <div className="text-sm text-green-700">
                {sortedClientIds.length} facturen worden aangemaakt
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
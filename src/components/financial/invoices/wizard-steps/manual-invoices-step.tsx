'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2, Euro, User, AlertCircle, FileText, X } from 'lucide-react'
import { WizardState } from '../comprehensive-invoicing-wizard'
import type { InvoiceItem, Client } from '@/lib/types/financial'

interface ManualInvoicesStepProps {
  wizardState: WizardState
  updateWizardState: (updates: Partial<WizardState>) => void
}

export function ManualInvoicesStep({
  wizardState,
  updateWizardState
}: ManualInvoicesStepProps) {
  
  const selectedClientIds = Object.keys(wizardState.selectedTimeEntries)
  
  // Get available clients (exclude those already selected for time-based invoices)
  const availableClients = wizardState.clients.filter(
    client => !selectedClientIds.includes(client.id)
  )

  const addManualInvoice = () => {
    const newInvoice = {
      clientId: '',
      items: [],
      notes: ''
    }
    
    updateWizardState({
      manualInvoices: [...wizardState.manualInvoices, newInvoice]
    })
  }

  const updateManualInvoice = (index: number, updates: Partial<typeof wizardState.manualInvoices[0]>) => {
    const updatedInvoices = wizardState.manualInvoices.map((invoice, i) => 
      i === index ? { ...invoice, ...updates } : invoice
    )
    updateWizardState({ manualInvoices: updatedInvoices })
  }

  const removeManualInvoice = (index: number) => {
    const filteredInvoices = wizardState.manualInvoices.filter((_, i) => i !== index)
    updateWizardState({ manualInvoices: filteredInvoices })
  }

  const addItemToManualInvoice = (invoiceIndex: number) => {
    const newItem: InvoiceItem = {
      id: `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      description: '',
      quantity: 1,
      unit_price: 0,
      line_total: 0,
      vat_rate: 21
    }
    
    const currentInvoice = wizardState.manualInvoices[invoiceIndex]
    updateManualInvoice(invoiceIndex, {
      items: [...currentInvoice.items, newItem]
    })
  }

  const updateManualInvoiceItem = (invoiceIndex: number, itemId: string, updates: Partial<InvoiceItem>) => {
    const currentInvoice = wizardState.manualInvoices[invoiceIndex]
    const updatedItems = currentInvoice.items.map(item => {
      if (item.id === itemId) {
        const updatedItem = { ...item, ...updates }
        // Recalculate line total
        updatedItem.line_total = updatedItem.quantity * updatedItem.unit_price
        return updatedItem
      }
      return item
    })
    
    updateManualInvoice(invoiceIndex, { items: updatedItems })
  }

  const removeItemFromManualInvoice = (invoiceIndex: number, itemId: string) => {
    const currentInvoice = wizardState.manualInvoices[invoiceIndex]
    const filteredItems = currentInvoice.items.filter(item => item.id !== itemId)
    updateManualInvoice(invoiceIndex, { items: filteredItems })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const getInvoiceTotal = (items: InvoiceItem[]) => {
    return items.reduce((sum, item) => sum + item.line_total, 0)
  }

  const getClientById = (clientId: string) => {
    return wizardState.clients.find(c => c.id === clientId)
  }

  const getTotalManualInvoicesAmount = () => {
    return wizardState.manualInvoices.reduce((sum, invoice) => 
      sum + getInvoiceTotal(invoice.items), 0
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <Card className="bg-indigo-50 border-indigo-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-600" />
              <span className="font-medium">
                Volledig handmatige facturen
              </span>
            </div>
            <div className="flex items-center gap-4">
              {wizardState.manualInvoices.length > 0 && (
                <Badge variant="secondary" className="bg-indigo-100 text-indigo-800">
                  {wizardState.manualInvoices.length} handmatige facturen
                </Badge>
              )}
              <Button
                onClick={addManualInvoice}
                className="bg-indigo-600 hover:bg-indigo-700"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nieuwe Handmatige Factuur
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="bg-gray-50 border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-indigo-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium mb-1">Handmatige Facturen</h4>
              <p className="text-sm text-muted-foreground">
                Hier kun je volledig handmatige facturen maken voor klanten zonder tijd registraties, 
                of voor speciale facturen met alleen vaste bedragen. Deze facturen zijn volledig 
                los van tijd registraties.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Manual Invoices */}
      {wizardState.manualInvoices.length === 0 ? (
        <Card className="border-dashed border-indigo-300">
          <CardContent className="p-8">
            <div className="text-center">
              <FileText className="h-12 w-12 text-indigo-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-indigo-600 mb-2">
                Geen Handmatige Facturen
              </h3>
              <p className="text-indigo-500 mb-4">
                Je hebt nog geen handmatige facturen toegevoegd. 
                Klik op de knop hierboven om een handmatige factuur toe te voegen.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {wizardState.manualInvoices.map((invoice, invoiceIndex) => {
            const client = getClientById(invoice.clientId)
            const invoiceTotal = getInvoiceTotal(invoice.items)
            
            return (
              <Card key={invoiceIndex} className="border-2 border-indigo-200">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-indigo-600" />
                      <CardTitle className="text-lg">
                        Handmatige Factuur #{invoiceIndex + 1}
                      </CardTitle>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {invoiceTotal > 0 && (
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-600">
                            {formatCurrency(invoiceTotal)}
                          </div>
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeManualInvoice(invoiceIndex)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Client Selection */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Klant *</label>
                    <Select 
                      value={invoice.clientId} 
                      onValueChange={(value) => updateManualInvoice(invoiceIndex, { clientId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecteer een klant..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableClients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              <div>
                                <div className="font-medium">{client.name}</div>
                                {client.company && (
                                  <div className="text-sm text-muted-foreground">{client.company}</div>
                                )}
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Invoice Items */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Factuur Regels</label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addItemToManualInvoice(invoiceIndex)}
                        disabled={!invoice.clientId}
                        className="border-dashed border-indigo-300 text-indigo-600 hover:bg-indigo-50"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Regel Toevoegen
                      </Button>
                    </div>
                    
                    {invoice.items.length === 0 ? (
                      <div className="p-4 border-dashed border-gray-300 rounded-lg text-center text-muted-foreground">
                        {invoice.clientId ? 'Geen regels toegevoegd' : 'Selecteer eerst een klant'}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {invoice.items.map((item) => (
                          <div key={item.id} className="grid grid-cols-12 gap-2 items-center p-3 bg-indigo-50 rounded-lg">
                            <div className="col-span-5">
                              <Input
                                placeholder="Beschrijving..."
                                value={item.description}
                                onChange={(e) => updateManualInvoiceItem(invoiceIndex, item.id, { description: e.target.value })}
                                className="text-sm"
                              />
                            </div>
                            <div className="col-span-2">
                              <Input
                                type="number"
                                placeholder="Aantal"
                                value={item.quantity}
                                onChange={(e) => updateManualInvoiceItem(invoiceIndex, item.id, { quantity: parseFloat(e.target.value) || 0 })}
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
                                onChange={(e) => updateManualInvoiceItem(invoiceIndex, item.id, { unit_price: parseFloat(e.target.value) || 0 })}
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
                                onClick={() => removeItemFromManualInvoice(invoiceIndex, item.id)}
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Notities (optioneel)</label>
                    <Textarea
                      placeholder="Extra notities voor deze factuur..."
                      value={invoice.notes || ''}
                      onChange={(e) => updateManualInvoice(invoiceIndex, { notes: e.target.value })}
                      rows={2}
                      className="text-sm"
                    />
                  </div>

                  {/* Invoice Summary */}
                  {invoice.items.length > 0 && (
                    <div className="pt-4 border-t bg-indigo-50 -mx-6 -mb-6 px-6 pb-6 rounded-b-lg">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Factuur Totaal:</span>
                        <span className="text-lg font-bold text-green-600">
                          {formatCurrency(invoiceTotal)}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Overall Summary */}
      {wizardState.manualInvoices.length > 0 && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-green-600" />
                <span className="font-medium">
                  Totaal handmatige facturen
                </span>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-green-600">
                  {formatCurrency(getTotalManualInvoicesAmount())}
                </div>
                <div className="text-sm text-green-700">
                  {wizardState.manualInvoices.length} handmatige facturen
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
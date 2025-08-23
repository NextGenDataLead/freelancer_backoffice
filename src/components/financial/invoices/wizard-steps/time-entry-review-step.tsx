'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Loader2, Clock, User, Calendar, Euro, AlertCircle, CheckCircle, Timer, Zap } from 'lucide-react'
import { WizardState } from '../comprehensive-invoicing-wizard'
import type { TimeEntry, Client } from '@/lib/types/financial'
import { getTimeEntryStatus, isReadyForInvoicing } from '@/lib/utils/time-entry-status'
import { TimeEntryStatusBadge } from '@/components/financial/time-entries/time-entry-status-badge'

interface TimeEntryReviewStepProps {
  wizardState: WizardState
  updateWizardState: (updates: Partial<WizardState>) => void
}

interface ClientWithTimeEntries {
  client: Client
  timeEntries: TimeEntry[]
  totalHours: number
  totalAmount: number
  selected: boolean
  readyForInvoicing: boolean // Based on client frequency rules
  frequencyStatus: 'ready' | 'not_due' | 'on_demand'
  selectedTimeEntryIds: string[] // Track which individual time entries are selected
}

export function TimeEntryReviewStep({ 
  wizardState, 
  updateWizardState 
}: TimeEntryReviewStepProps) {
  const [loading, setLoading] = useState(false)
  const [clientsWithTimeEntries, setClientsWithTimeEntries] = useState<ClientWithTimeEntries[]>([])
  
  useEffect(() => {
    // Only load time entries if we have clients loaded
    if (wizardState.clients.length > 0) {
      loadUnbilledTimeEntries()
    }
  }, [wizardState.clients])

  // Helper function to determine if client is ready for invoicing based on frequency
  const checkInvoicingReadiness = (client: Client, timeEntries: TimeEntry[]) => {
    const frequency = client.invoicing_frequency || 'on_demand'
    
    if (frequency === 'on_demand') {
      return { readyForInvoicing: true, frequencyStatus: 'on_demand' as const }
    }
    
    // Find the oldest unbilled entry to check readiness
    const oldestEntry = timeEntries.reduce((oldest, entry) => {
      const entryDate = new Date(entry.date || entry.entry_date)
      const oldestDate = new Date(oldest.date || oldest.entry_date)
      return entryDate < oldestDate ? entry : oldest
    })
    
    const oldestEntryDate = new Date(oldestEntry.date || oldestEntry.entry_date)
    const { ready } = isReadyForInvoicing(oldestEntryDate, client)
    
    return { 
      readyForInvoicing: ready, 
      frequencyStatus: ready ? 'ready' as const : 'not_due' as const 
    }
  }

  const loadUnbilledTimeEntries = async () => {
    setLoading(true)
    try {
      // Since the API requires client_id, we'll fetch for each client individually
      const clientSummaries: ClientWithTimeEntries[] = []
      
      console.log('Loading unbilled time entries for clients:', wizardState.clients)
      
      for (const client of wizardState.clients) {
        try {
          const response = await fetch(`/api/time-entries/unbilled?client_id=${client.id}`)
          if (!response.ok) {
            // If client has no unbilled entries, API might return 404, which is fine
            if (response.status === 404) continue
            throw new Error('Failed to fetch unbilled time entries')
          }
          
          const data = await response.json()
          const timeEntries = data.data?.time_entries || []
          
          console.log(`Client ${client.name} API response:`, data)
          console.log(`Time entries found:`, timeEntries.length)
          
          if (timeEntries.length > 0) {
            const totalHours = timeEntries.reduce((sum: number, entry: TimeEntry) => sum + (entry.hours || 0), 0)
            const totalAmount = timeEntries.reduce((sum: number, entry: TimeEntry) => {
              const hours = entry.hours || 0
              const rate = client.hourly_rate || entry.hourly_rate || 0
              return sum + (hours * rate)
            }, 0)

            // Check invoicing readiness
            const { readyForInvoicing, frequencyStatus } = checkInvoicingReadiness(client, timeEntries)

            clientSummaries.push({
              client,
              timeEntries,
              totalHours,
              totalAmount,
              selected: true, // Always start selected, will be managed by selectedTimeEntryIds
              readyForInvoicing,
              frequencyStatus,
              selectedTimeEntryIds: timeEntries.map(entry => entry.id) // Select all by default
            })
          }
        } catch (clientError) {
          console.warn(`Error fetching time entries for client ${client.name}:`, clientError)
          // Continue with other clients
        }
      }

      // Sort by readiness first, then by total amount
      clientSummaries.sort((a, b) => {
        // Ready for invoicing clients first
        if (a.readyForInvoicing && !b.readyForInvoicing) return -1
        if (!a.readyForInvoicing && b.readyForInvoicing) return 1
        // Then by total amount descending
        return b.totalAmount - a.totalAmount
      })
      setClientsWithTimeEntries(clientSummaries)

      // Initialize wizard state with all initially selected clients
      const initialSelectedTimeEntries: Record<string, TimeEntry[]> = {}
      const initialClientTotals: Record<string, number> = {}
      
      clientSummaries.forEach(summary => {
        if (summary.selected && summary.selectedTimeEntryIds.length > 0) {
          const selectedEntries = summary.timeEntries.filter(entry => 
            summary.selectedTimeEntryIds.includes(entry.id)
          )
          initialSelectedTimeEntries[summary.client.id] = selectedEntries
          initialClientTotals[summary.client.id] = summary.totalAmount
        }
      })
      
      console.log('🔧 TimeEntryReviewStep: Initializing wizard state with selected clients:', {
        selectedClients: Object.keys(initialSelectedTimeEntries),
        clientTotals: Object.keys(initialClientTotals)
      })

      // Update wizard state with initially selected clients
      updateWizardState({
        selectedTimeEntries: initialSelectedTimeEntries,
        clientTimeEntryTotals: initialClientTotals
      })
      
    } catch (error) {
      console.error('Error loading unbilled time entries:', error)
      updateWizardState({
        error: error instanceof Error ? error.message : 'Failed to load time entries'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClientSelection = (clientSummary: ClientWithTimeEntries, selected: boolean) => {
    const updatedSummaries = clientsWithTimeEntries.map(summary => 
      summary.client.id === clientSummary.client.id 
        ? { 
            ...summary, 
            selected,
            selectedTimeEntryIds: selected ? summary.timeEntries.map(entry => entry.id) : []
          }
        : summary
    )
    setClientsWithTimeEntries(updatedSummaries)

    // Update wizard state
    const newSelectedTimeEntries = { ...wizardState.selectedTimeEntries }
    const newClientTotals = { ...wizardState.clientTimeEntryTotals }
    
    if (selected) {
      newSelectedTimeEntries[clientSummary.client.id] = clientSummary.timeEntries
      const total = clientSummary.timeEntries.reduce((sum, entry) => {
        const hours = entry.hours || 0
        const rate = clientSummary.client.hourly_rate || entry.hourly_rate || 0
        return sum + (hours * rate)
      }, 0)
      newClientTotals[clientSummary.client.id] = total
    } else {
      delete newSelectedTimeEntries[clientSummary.client.id]
      delete newClientTotals[clientSummary.client.id]
    }

    console.log('🔧 TimeEntryReviewStep handleClientSelection: Updating wizard state with:', {
      clientId: clientSummary.client.id,
      selected,
      newSelectedTimeEntries: Object.keys(newSelectedTimeEntries),
      newClientTotals: Object.keys(newClientTotals)
    })

    updateWizardState({
      selectedTimeEntries: newSelectedTimeEntries,
      clientTimeEntryTotals: newClientTotals
    })
  }

  const handleTimeEntrySelection = (clientId: string, timeEntryId: string, selected: boolean) => {
    const updatedSummaries = clientsWithTimeEntries.map(summary => {
      if (summary.client.id === clientId) {
        let newSelectedIds = [...summary.selectedTimeEntryIds]
        
        if (selected && !newSelectedIds.includes(timeEntryId)) {
          newSelectedIds.push(timeEntryId)
        } else if (!selected) {
          newSelectedIds = newSelectedIds.filter(id => id !== timeEntryId)
        }
        
        const allSelected = newSelectedIds.length === summary.timeEntries.length
        const anySelected = newSelectedIds.length > 0
        
        return {
          ...summary,
          selectedTimeEntryIds: newSelectedIds,
          selected: newSelectedIds.length > 0 // Client stays selected as long as some entries are selected
        }
      }
      return summary
    })
    
    setClientsWithTimeEntries(updatedSummaries)
    
    // Update wizard state with only selected time entries
    const clientSummary = updatedSummaries.find(s => s.client.id === clientId)
    if (clientSummary) {
      const selectedEntries = clientSummary.timeEntries.filter(entry => 
        clientSummary.selectedTimeEntryIds.includes(entry.id)
      )
      
      const newSelectedTimeEntries = { ...wizardState.selectedTimeEntries }
      const newClientTotals = { ...wizardState.clientTimeEntryTotals }
      
      // Update the specific client's entries, preserving other clients
      if (selectedEntries.length > 0) {
        newSelectedTimeEntries[clientId] = selectedEntries
        const total = selectedEntries.reduce((sum, entry) => {
          const hours = entry.hours || 0
          const rate = clientSummary.client.hourly_rate || entry.hourly_rate || 0
          return sum + (hours * rate)
        }, 0)
        newClientTotals[clientId] = total
      } else {
        // Remove client from state if no entries are selected
        delete newSelectedTimeEntries[clientId]
        delete newClientTotals[clientId]
      }
      
      console.log('🔧 TimeEntryReviewStep handleTimeEntrySelection: Updating wizard state with:', {
        clientId,
        timeEntryId,
        selected,
        selectedEntriesCount: selectedEntries.length,
        newSelectedTimeEntries: Object.keys(newSelectedTimeEntries),
        newClientTotals: Object.keys(newClientTotals)
      })
      
      updateWizardState({
        selectedTimeEntries: newSelectedTimeEntries,
        clientTimeEntryTotals: newClientTotals
      })
    }
  }

  const handleSelectAll = () => {
    const allSelected = clientsWithTimeEntries.every(summary => 
      summary.selectedTimeEntryIds.length === summary.timeEntries.length
    )
    const newSelection = !allSelected

    const updatedSummaries = clientsWithTimeEntries.map(summary => ({
      ...summary,
      selected: newSelection,
      selectedTimeEntryIds: newSelection ? summary.timeEntries.map(entry => entry.id) : []
    }))
    setClientsWithTimeEntries(updatedSummaries)

    const newSelectedTimeEntries: Record<string, TimeEntry[]> = {}
    const newClientTotals: Record<string, number> = {}
    
    if (newSelection) {
      updatedSummaries.forEach(summary => {
        newSelectedTimeEntries[summary.client.id] = summary.timeEntries
        newClientTotals[summary.client.id] = summary.totalAmount
      })
    }

    console.log('🔧 TimeEntryReviewStep handleSelectAll: Updating wizard state with:', {
      newSelection,
      newSelectedTimeEntries: Object.keys(newSelectedTimeEntries),
      newClientTotals: Object.keys(newClientTotals)
    })

    updateWizardState({
      selectedTimeEntries: newSelectedTimeEntries,
      clientTimeEntryTotals: newClientTotals
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const formatHours = (hours: number) => {
    return `${hours.toFixed(2)}u`
  }

  const getFrequencyStatusBadge = (status: 'ready' | 'not_due' | 'on_demand', frequency?: string) => {
    switch (status) {
      case 'ready':
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Klaar voor Facturering
          </Badge>
        )
      case 'not_due':
        return (
          <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200">
            <Timer className="h-3 w-3 mr-1" />
            Nog niet verschuldigd ({frequency})
          </Badge>
        )
      case 'on_demand':
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
            <Zap className="h-3 w-3 mr-1" />
            Op verzoek
          </Badge>
        )
      default:
        return null
    }
  }

  const getFrequencyDescription = (frequency?: string) => {
    switch (frequency) {
      case 'weekly':
        return 'Wekelijks (klaar als > 7 dagen oud)'
      case 'monthly':  
        return 'Maandelijks (klaar als vorige maand voltooid)'
      case 'on_demand':
        return 'Op verzoek (altijd klaar)'
      default:
        return 'Op verzoek'
    }
  }

  const selectedCount = clientsWithTimeEntries.filter(s => s.selectedTimeEntryIds.length > 0).length
  const totalSelectedAmount = clientsWithTimeEntries
    .filter(s => s.selectedTimeEntryIds.length > 0)
    .reduce((sum, s) => {
      const selectedEntries = s.timeEntries.filter(entry => s.selectedTimeEntryIds.includes(entry.id))
      return sum + selectedEntries.reduce((entrySum, entry) => {
        const hours = entry.hours || 0
        const rate = s.client.hourly_rate || entry.hourly_rate || 0
        return entrySum + (hours * rate)
      }, 0)
    }, 0)
    
  const readyForInvoicingCount = clientsWithTimeEntries.filter(s => s.readyForInvoicing).length
  const notDueCount = clientsWithTimeEntries.filter(s => !s.readyForInvoicing).length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Unbilled time entries worden geladen...</p>
        </div>
      </div>
    )
  }

  if (clientsWithTimeEntries.length === 0) {
    return (
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="p-6">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-orange-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-orange-800 mb-2">
              Geen Unbilled Time Entries
            </h3>
            <p className="text-orange-700">
              Er zijn momenteel geen onfactureerde tijd registraties gevonden. 
              Je kunt nog steeds handmatige facturen maken in de volgende stappen.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Summary Header */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                <span className="font-medium">
                  {clientsWithTimeEntries.length} klanten met onfactureerde tijd
                </span>
              </div>
              <div className="flex items-center gap-2">
                {readyForInvoicingCount > 0 && (
                  <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {readyForInvoicingCount} klaar
                  </Badge>
                )}
                {notDueCount > 0 && (
                  <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200">
                    <Timer className="h-3 w-3 mr-1" />
                    {notDueCount} nog niet verschuldigd
                  </Badge>
                )}
                {selectedCount > 0 && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    {selectedCount} geselecteerd
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              {totalSelectedAmount > 0 && (
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-800">
                    {formatCurrency(totalSelectedAmount)}
                  </div>
                  <div className="text-sm text-blue-600">Total selected</div>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="border-blue-300"
              >
                {clientsWithTimeEntries.every(s => s.selectedTimeEntryIds.length === s.timeEntries.length) ? 'Deselecteer Alles' : 'Selecteer Alles'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Client List */}
      <div className="grid gap-4">
        {clientsWithTimeEntries.map((clientSummary) => (
          <Card 
            key={clientSummary.client.id}
            className={`border-2 transition-colors ${
              clientSummary.selectedTimeEntryIds.length > 0
                ? 'border-blue-400 bg-blue-50/50' 
                : clientSummary.readyForInvoicing
                ? 'border-green-200 bg-green-50/30'
                : 'border-orange-200 bg-orange-50/30'
            }`}
          >
            <CardHeader 
              className="pb-3 cursor-pointer"
              onClick={() => {
                const allSelected = clientSummary.selectedTimeEntryIds.length === clientSummary.timeEntries.length
                if (allSelected) {
                  handleClientSelection(clientSummary, false)
                } else {
                  handleClientSelection(clientSummary, true)
                }
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={clientSummary.selectedTimeEntryIds.length === clientSummary.timeEntries.length}
                    ref={(el) => {
                      if (el) {
                        el.indeterminate = clientSummary.selectedTimeEntryIds.length > 0 && 
                                          clientSummary.selectedTimeEntryIds.length < clientSummary.timeEntries.length
                      }
                    }}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        handleClientSelection(clientSummary, true)
                      } else {
                        handleClientSelection(clientSummary, false)
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-gray-600" />
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">
                          {clientSummary.client.company_name || clientSummary.client.name}
                        </CardTitle>
                        {getFrequencyStatusBadge(clientSummary.frequencyStatus, clientSummary.client.invoicing_frequency)}
                      </div>
                      {clientSummary.client.company_name && (
                        <p className="text-sm text-muted-foreground">
                          Contact: {clientSummary.client.name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-xl font-bold text-green-600">
                    {formatCurrency(
                      clientSummary.selectedTimeEntryIds.length > 0
                        ? clientSummary.timeEntries
                            .filter(entry => clientSummary.selectedTimeEntryIds.includes(entry.id))
                            .reduce((sum, entry) => {
                              const hours = entry.hours || 0
                              const rate = clientSummary.client.hourly_rate || entry.hourly_rate || 0
                              return sum + (hours * rate)
                            }, 0)
                        : clientSummary.totalAmount
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatHours(
                      clientSummary.selectedTimeEntryIds.length > 0
                        ? clientSummary.timeEntries
                            .filter(entry => clientSummary.selectedTimeEntryIds.includes(entry.id))
                            .reduce((sum, entry) => sum + (entry.hours || 0), 0)
                        : clientSummary.totalHours
                    )} 
                    {clientSummary.client.hourly_rate && (
                      <span> @ {formatCurrency(clientSummary.client.hourly_rate)}/uur</span>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Time Entries:</span>
                  <div className="font-medium">{clientSummary.timeEntries.length}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Uren:</span>
                  <div className="font-medium">{formatHours(clientSummary.totalHours)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Factuur Frequentie:</span>
                  <div className="font-medium">
                    {getFrequencyDescription(clientSummary.client.invoicing_frequency)}
                  </div>
                </div>
              </div>

              {/* Show individual time entries when any are selected */}
              {clientSummary.selectedTimeEntryIds.length > 0 && clientSummary.timeEntries.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm text-muted-foreground">
                      Selecteer individuele time entries ({clientSummary.selectedTimeEntryIds.length}/{clientSummary.timeEntries.length} geselecteerd):
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          clientSummary.timeEntries.forEach(entry => {
                            if (!clientSummary.selectedTimeEntryIds.includes(entry.id)) {
                              handleTimeEntrySelection(clientSummary.client.id, entry.id, true)
                            }
                          })
                        }}
                        disabled={clientSummary.selectedTimeEntryIds.length === clientSummary.timeEntries.length}
                        className="text-xs"
                      >
                        Alles
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          clientSummary.selectedTimeEntryIds.forEach(entryId => {
                            handleTimeEntrySelection(clientSummary.client.id, entryId, false)
                          })
                        }}
                        disabled={clientSummary.selectedTimeEntryIds.length === 0}
                        className="text-xs"
                      >
                        Geen
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm max-h-60 overflow-y-auto">
                    {clientSummary.timeEntries
                      .sort((a, b) => {
                        // Sort by date descending (newest first)
                        const dateA = new Date(a.entry_date || a.date)
                        const dateB = new Date(b.entry_date || b.date)
                        return dateB.getTime() - dateA.getTime()
                      })
                      .map((entry) => (
                      <div 
                        key={entry.id} 
                        className={`flex items-center gap-3 p-2 rounded border cursor-pointer transition-colors ${
                          clientSummary.selectedTimeEntryIds.includes(entry.id)
                            ? 'bg-blue-50 border-blue-200'
                            : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleTimeEntrySelection(
                            clientSummary.client.id, 
                            entry.id, 
                            !clientSummary.selectedTimeEntryIds.includes(entry.id)
                          )
                        }}
                      >
                        <Checkbox
                          checked={clientSummary.selectedTimeEntryIds.includes(entry.id)}
                          onCheckedChange={(checked) => {
                            handleTimeEntrySelection(
                              clientSummary.client.id, 
                              entry.id, 
                              checked as boolean
                            )
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1 grid grid-cols-4 gap-3 items-center">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3" />
                            <span className="text-xs">{new Date(entry.entry_date || entry.date).toLocaleDateString('nl-NL')}</span>
                          </div>
                          <div className="truncate">
                            <span className="text-sm">{entry.description}</span>
                          </div>
                          <div className="flex items-center justify-center">
                            <TimeEntryStatusBadge 
                              statusInfo={getTimeEntryStatus(entry, clientSummary.client)}
                              size="sm"
                            />
                          </div>
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-sm">{formatHours(entry.hours || 0)}</span>
                            <span className="text-muted-foreground">•</span>
                            <span className="font-medium text-sm">
                              {formatCurrency((entry.hours || 0) * (clientSummary.client.hourly_rate || entry.hourly_rate || 0))}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Instructions */}
      <Card className="bg-gray-50 border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium mb-1">Instructies</h4>
              <p className="text-sm text-muted-foreground">
                Selecteer de klanten waarvoor je tijd-gebaseerde facturen wilt maken. 
                In de volgende stap kun je handmatige regels toevoegen aan deze facturen, 
                en daarna volledig handmatige facturen maken voor andere klanten.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
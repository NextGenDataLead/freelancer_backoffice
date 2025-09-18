'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  Building2, 
  Calendar, 
  Clock, 
  Euro, 
  FileText, 
  Users,
  CheckCircle
} from 'lucide-react'
import type { TimeEntryWithClient } from '@/lib/types/financial'
import { getTimeEntryStatus } from '@/lib/utils/time-entry-status'
import { TimeEntryStatusBadge } from '@/components/financial/time-entries/time-entry-status-badge'

interface UnbilledTimeEntriesSelectorProps {
  entries: TimeEntryWithClient[]
  onCreateInvoice: (selectedEntries: string[]) => void
  onCancel: () => void
}

export function UnbilledTimeEntriesSelector({
  entries,
  onCreateInvoice,
  onCancel
}: UnbilledTimeEntriesSelectorProps) {
  const [selectedEntries, setSelectedEntries] = useState<string[]>([])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const formatTime = (hours: number) => {
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    return `${h}:${m.toString().padStart(2, '0')}`
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEntries(entries.map(entry => entry.id))
    } else {
      setSelectedEntries([])
    }
  }

  const handleSelectEntry = (entryId: string, checked: boolean) => {
    if (checked) {
      setSelectedEntries(prev => [...prev, entryId])
    } else {
      setSelectedEntries(prev => prev.filter(id => id !== entryId))
    }
  }

  const getSelectedStats = () => {
    const selected = entries.filter(entry => selectedEntries.includes(entry.id))
    const totalHours = selected.reduce((sum, entry) => sum + entry.hours, 0)
    const totalValue = selected.reduce((sum, entry) => 
      sum + (entry.hours * (entry.hourly_rate || 0)), 0)
    
    // Group by client
    const clientGroups = selected.reduce((acc, entry) => {
      const clientName = entry.client?.company_name || entry.client?.name || 'Onbekende klant'
      if (!acc[clientName]) {
        acc[clientName] = { count: 0, value: 0, hours: 0 }
      }
      acc[clientName].count += 1
      acc[clientName].hours += entry.hours
      acc[clientName].value += entry.hours * (entry.hourly_rate || 0)
      return acc
    }, {} as Record<string, { count: number; value: number; hours: number }>)

    return { totalHours, totalValue, clientGroups }
  }

  const stats = getSelectedStats()
  const isAllSelected = selectedEntries.length === entries.length
  const isPartialSelected = selectedEntries.length > 0 && selectedEntries.length < entries.length

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-blue-800 dark:text-blue-200 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Factuur Overzicht
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                {entries.length}
              </div>
              <div className="text-sm text-blue-600 dark:text-blue-400">
                Ongefactureerde uren
              </div>
            </div>
            
            <div>
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                {selectedEntries.length}
              </div>
              <div className="text-sm text-blue-600 dark:text-blue-400">
                Geselecteerd
              </div>
            </div>
            
            <div>
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                {formatTime(stats.totalHours)}
              </div>
              <div className="text-sm text-blue-600 dark:text-blue-400">
                Totaal uren
              </div>
            </div>
            
            <div>
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                {formatCurrency(stats.totalValue)}
              </div>
              <div className="text-sm text-blue-600 dark:text-blue-400">
                Totale waarde
              </div>
            </div>
          </div>

          {Object.keys(stats.clientGroups).length > 0 && (
            <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-700">
              <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                Facturen per klant:
              </h4>
              <div className="space-y-2">
                {Object.entries(stats.clientGroups).map(([client, data]) => (
                  <div key={client} className="flex items-center justify-between text-sm">
                    <span className="text-blue-700 dark:text-blue-300">
                      {client} ({data.count} registraties)
                    </span>
                    <span className="font-medium text-blue-800 dark:text-blue-200">
                      {formatTime(data.hours)} - {formatCurrency(data.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Time Entries Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Te Factureren Uren
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={isAllSelected}
                ref={(ref) => {
                  if (ref) ref.indeterminate = isPartialSelected
                }}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm text-muted-foreground">Alles selecteren</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead>Klant</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Beschrijving</TableHead>
                  <TableHead className="text-right">Uren</TableHead>
                  <TableHead className="text-right">Tarief</TableHead>
                  <TableHead className="text-right">Waarde</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id} className="hover:bg-muted/50">
                    <TableCell>
                      <Checkbox
                        checked={selectedEntries.includes(entry.id)}
                        onCheckedChange={(checked) => 
                          handleSelectEntry(entry.id, checked as boolean)
                        }
                      />
                    </TableCell>
                    
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {formatDate(entry.entry_date)}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">
                            {entry.client?.company_name || entry.client?.name || 'Geen klant'}
                          </div>
                          {entry.client?.company_name && entry.client?.name && (
                            <div className="text-xs text-muted-foreground">
                              {entry.client.name}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="font-medium">
                        {entry.project_name || '-'}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="max-w-xs truncate" title={entry.description}>
                        {entry.description}
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-right font-mono">
                      {formatTime(entry.hours)}
                    </TableCell>
                    
                    <TableCell className="text-right">
                      {entry.hourly_rate ? formatCurrency(entry.hourly_rate) : '-'}
                    </TableCell>
                    
                    <TableCell className="text-right font-medium">
                      {entry.hourly_rate ? (
                        <div className="flex items-center justify-end gap-1">
                          <Euro className="h-3 w-3" />
                          {formatCurrency(entry.hours * entry.hourly_rate)}
                        </div>
                      ) : '-'}
                    </TableCell>

                    <TableCell className="text-center">
                      <div className="flex items-center justify-center">
                        {entry.client ? (
                          <TimeEntryStatusBadge
                            statusInfo={getTimeEntryStatus(entry, entry.client)}
                            size="sm"
                            showTooltip={true}
                            showIcon={true}
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">Geen klant</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>
          Annuleren
        </Button>
        <Button 
          onClick={() => onCreateInvoice(selectedEntries)}
          disabled={selectedEntries.length === 0}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          {Object.keys(stats.clientGroups).length > 1 
            ? `${Object.keys(stats.clientGroups).length} Facturen Maken` 
            : 'Factuur Maken'}
          {selectedEntries.length > 0 && ` (${formatCurrency(stats.totalValue)})`}
        </Button>
      </div>
    </div>
  )
}
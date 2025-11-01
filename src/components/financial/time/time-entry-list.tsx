'use client'

import { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuPortal 
} from '@/components/ui/dropdown-menu'
import {
  Clock,
  MoreHorizontal,
  Edit2,
  Trash2,
  Building2,
  Calendar,
  Euro,
  FolderOpen,
  Info,
  Lock
} from 'lucide-react'
import type { TimeEntryWithClient, Client } from '@/lib/types/financial'
import { getTimeEntryStatus } from '@/lib/utils/time-entry-status'
import { TimeEntryStatusBadge } from '@/components/financial/time-entries/time-entry-status-badge'

interface TimeEntryListProps {
  onEdit?: (timeEntry: TimeEntryWithClient) => void
  onRefresh?: () => void
  limit?: number
  showPagination?: boolean
  dateFilter?: Date
}

// Helper function to check if a time entry is invoiced (Gefactureerd status)
const isTimeEntryInvoiced = (timeEntry: TimeEntryWithClient): boolean => {
  return timeEntry.invoiced || !!timeEntry.invoice_id
}

export function TimeEntryList({ onEdit, onRefresh, limit, showPagination, dateFilter }: TimeEntryListProps) {
  const [timeEntries, setTimeEntries] = useState<TimeEntryWithClient[]>([])
  const [clients, setClients] = useState<Map<string, Client>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  // Filter time entries by date if dateFilter is provided
  const filteredTimeEntries = useMemo(() => {
    if (!dateFilter) return timeEntries

    // Use local timezone to avoid off-by-one errors
    const filterDateStr = `${dateFilter.getFullYear()}-${String(dateFilter.getMonth() + 1).padStart(2, '0')}-${String(dateFilter.getDate()).padStart(2, '0')}`
    return timeEntries.filter(entry =>
      entry.entry_date === filterDateStr
    )
  }, [timeEntries, dateFilter])
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 0,
    total: 0
  })

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients?limit=100', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      })
      
      if (response.ok) {
        const data = await response.json()
        const clientMap = new Map<string, Client>()
        data.data?.forEach((client: Client) => {
          if (client.id) {
            clientMap.set(client.id, client)
          }
        })
        setClients(clientMap)
      }
    } catch (err) {
      console.error('Error fetching clients:', err)
    }
  }

  const fetchTimeEntries = async () => {
    try {
      setLoading(true)
      
      // Fetch both time entries and clients in parallel
      const [timeEntriesPromise, clientsPromise] = await Promise.all([
        fetch(`/api/time-entries?${new URLSearchParams({
          ...(limit && { limit: limit.toString() }),
          _t: Date.now().toString()
        }).toString()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        }),
        fetchClients()
      ])
      
      if (!timeEntriesPromise.ok) {
        throw new Error('Failed to fetch time entries')
      }
      
      const data = await timeEntriesPromise.json()
      console.log('Fetched time entries:', data.data?.length || 0, 'entries')
      setTimeEntries(data.data || [])
      setPagination({
        page: data.pagination?.page || 1,
        totalPages: data.pagination?.totalPages || 0,
        total: data.pagination?.total || 0
      })
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load time entries')
      console.error('Error fetching time entries:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTimeEntries()
  }, [limit]) // Component will remount due to key change, so this will run again

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this time entry?')) {
      return
    }

    try {
      const response = await fetch(`/api/time-entries/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete time entry')
      }

      await fetchTimeEntries()
      onRefresh?.()
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Failed to delete time entry', {
        description: 'An error occurred while deleting'
      })
    }
  }

  const handleToggleBillable = async (timeEntry: TimeEntryWithClient) => {
    try {
      const response = await fetch(`/api/time-entries/${timeEntry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billable: !timeEntry.billable })
      })

      if (!response.ok) {
        throw new Error('Failed to update time entry')
      }

      await fetchTimeEntries()
      onRefresh?.()
    } catch (error) {
      console.error('Update error:', error)
      toast.error('Failed to update time entry', {
        description: 'An error occurred while updating'
      })
    }
  }

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

  const getTotalStats = () => {
    const billableEntries = filteredTimeEntries.filter(entry => entry.billable && !entry.invoiced)
    const totalHours = filteredTimeEntries.reduce((sum, entry) => sum + entry.hours, 0)
    const billableHours = billableEntries.reduce((sum, entry) => sum + entry.hours, 0)
    const totalValue = filteredTimeEntries.reduce((sum, entry) =>
      sum + (entry.hours * (entry.effective_hourly_rate || entry.hourly_rate || 0)), 0)
    const unbilledValue = billableEntries.reduce((sum, entry) => 
      sum + (entry.hours * (entry.effective_hourly_rate || entry.hourly_rate || 0)), 0)

    return { totalHours, billableHours, totalValue, unbilledValue }
  }

  const stats = getTotalStats()

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Time Entries
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="h-4 bg-muted animate-pulse rounded w-16"></div>
                <div className="h-4 bg-muted animate-pulse rounded flex-1"></div>
                <div className="h-4 bg-muted animate-pulse rounded w-20"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Time Entries
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchTimeEntries} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Time Entries
          </div>
          <div className="text-sm text-muted-foreground">
            {filteredTimeEntries.length} of {timeEntries.length} entries
            {limit && ` (max ${limit})`}
          </div>
        </CardTitle>
        
        {/* Stats Summary */}
        {!limit && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
              <div className="text-lg font-bold text-blue-700 dark:text-blue-300">
                {formatTime(stats.totalHours)}
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400">
                Total Hours
              </div>
            </div>
            
            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
              <div className="text-lg font-bold text-green-700 dark:text-green-300">
                {formatTime(stats.billableHours)}
              </div>
              <div className="text-xs text-green-600 dark:text-green-400">
                Billable
              </div>
            </div>
            
            <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
              <div className="text-lg font-bold text-purple-700 dark:text-purple-300">
                {formatCurrency(stats.totalValue)}
              </div>
              <div className="text-xs text-purple-600 dark:text-purple-400">
                Total Value
              </div>
            </div>
            
            <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
              <div className="text-lg font-bold text-orange-700 dark:text-orange-300">
                {formatCurrency(stats.unbilledValue)}
              </div>
              <div className="text-xs text-orange-600 dark:text-orange-400">
                To Invoice
              </div>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {filteredTimeEntries.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No time entries yet</h3>
            <p className="text-muted-foreground mb-4">
              Start tracking your hours
            </p>
          </div>
        ) : (
          <div className="rounded-lg border overflow-visible">
            <Table className="overflow-visible">
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTimeEntries.map((entry) => (
                  <TableRow key={entry.id} className="hover:bg-muted/50">
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
                            {entry.client?.company_name || entry.client?.name || 'No client'}
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
                      <div className="flex items-center gap-2">
                        {entry.project ? (
                          <>
                            <FolderOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <div>
                              <div className="font-medium">
                                {entry.project.name}
                              </div>
                              {entry.project.description && (
                                <div className="text-xs text-muted-foreground">
                                  {entry.project.description}
                                </div>
                              )}
                              {entry.project.hourly_rate && (
                                <div className="text-xs text-green-600 dark:text-green-400">
                                  €{entry.project.hourly_rate.toFixed(2)}/uur
                                </div>
                              )}
                            </div>
                          </>
                        ) : entry.project_name ? (
                          <>
                            <FolderOpen className="h-4 w-4 text-muted-foreground" />
                            <div className="font-medium">
                              {entry.project_name}
                              <div className="text-xs text-muted-foreground">Vrije tekst</div>
                            </div>
                          </>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
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
                      <div className="text-sm">
                        {entry.effective_hourly_rate || entry.hourly_rate ? (
                          <div>
                            <div className="font-medium">
                              {formatCurrency(entry.effective_hourly_rate || entry.hourly_rate)}
                            </div>
                            {entry.effective_hourly_rate && entry.effective_hourly_rate !== entry.hourly_rate && (
                              <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <Info className="h-3 w-3" />
                                Effectief tarief
                              </div>
                            )}
                          </div>
                        ) : '-'}
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-right font-medium">
                      {entry.effective_hourly_rate || entry.hourly_rate ? (
                        <div className="flex items-center justify-end gap-1">
                          <Euro className="h-3 w-3" />
                          {formatCurrency(entry.hours * (entry.effective_hourly_rate || entry.hourly_rate))}
                        </div>
                      ) : '-'}
                    </TableCell>
                    
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center">
                        {(() => {
                          // Get the client for this time entry to determine status based on invoice frequency
                          const client = clients.get(entry.client_id || '')
                          
                          if (!client) {
                            // Fallback to simple logic if client data is not available
                            // Create a mock status info object to maintain consistency
                            if (entry.invoiced || entry.invoice_id) {
                              const statusInfo = {
                                status: 'gefactureerd' as const,
                                label: 'Invoiced',
                                color: 'purple' as const,
                                reason: entry.invoice_id
                                  ? `Invoiced on invoice ${entry.invoice_id}`
                                  : 'Already invoiced'
                              }
                              return (
                                <TimeEntryStatusBadge 
                                  statusInfo={statusInfo}
                                  size="sm"
                                  showTooltip={true}
                                  showIcon={true}
                                />
                              )
                            } else if (!entry.billable) {
                              const statusInfo = {
                                status: 'niet-factureerbaar' as const,
                                label: 'Non-billable',
                                color: 'red' as const,
                                reason: 'Marked as non-billable'
                              }
                              return (
                                <TimeEntryStatusBadge 
                                  statusInfo={statusInfo}
                                  size="sm"
                                  showTooltip={true}
                                  showIcon={true}
                                />
                              )
                            } else {
                              // Default to factureerbaar (green) when client data is missing
                              const statusInfo = {
                                status: 'factureerbaar' as const,
                                label: 'Billable',
                                color: 'green' as const,
                                reason: 'Client data not available - default billable'
                              }
                              return (
                                <TimeEntryStatusBadge 
                                  statusInfo={statusInfo}
                                  size="sm"
                                  showTooltip={true}
                                  showIcon={true}
                                />
                              )
                            }
                          }
                          
                          // Use the comprehensive status determination with full client data
                          const statusInfo = getTimeEntryStatus(entry, client)
                          return (
                            <TimeEntryStatusBadge 
                              statusInfo={statusInfo}
                              size="sm"
                              showTooltip={true}
                              showIcon={true}
                            />
                          )
                        })()}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="relative">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0"
                          onClick={() => setOpenDropdown(openDropdown === entry.id ? null : entry.id)}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                        
                        {openDropdown === entry.id && (
                          <div
                            className="absolute right-0 top-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg min-w-[160px] z-50"
                            onBlur={() => setOpenDropdown(null)}
                          >
                            {isTimeEntryInvoiced(entry) ? (
                              <div className="px-3 py-2 text-sm text-gray-500 flex items-center">
                                <Lock className="h-4 w-4 mr-2" />
                                Invoiced - editing not possible
                              </div>
                            ) : (
                              <>
                                <div
                                  className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer flex items-center"
                                  onClick={() => {
                                    onEdit?.(entry)
                                    setOpenDropdown(null)
                                  }}
                                >
                                  <Edit2 className="h-4 w-4 mr-2" />
                                  Edit
                                </div>
                                <div
                                  className="px-3 py-2 text-sm hover:bg-red-50 cursor-pointer flex items-center text-red-600"
                                  onClick={() => {
                                    handleDelete(entry.id)
                                    setOpenDropdown(null)
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
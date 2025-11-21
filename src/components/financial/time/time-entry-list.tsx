'use client'

import { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { DeleteConfirmationModal } from '@/components/ui/modal'
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
  Clock,
  MoreHorizontal,
  Edit2,
  Trash2,
  Building2,
  Calendar,
  Euro,
  FolderOpen,
  Info,
  Lock,
  ChevronLeft,
  ChevronRight,
  Filter
} from 'lucide-react'
import type { TimeEntryWithClient, Client } from '@/lib/types/financial'
import { getTimeEntryStatus } from '@/lib/utils/time-entry-status'
import { TimeEntryStatusBadge } from '@/components/financial/time-entries/time-entry-status-badge'
import { getCurrentDate } from '@/lib/current-date'

type StatusFilter = 'all' | 'ready_to_invoice' | 'billable_not_due' | 'not_billable' | 'invoiced'

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

export function TimeEntryList({ onEdit, onRefresh, limit, showPagination = true, dateFilter }: TimeEntryListProps) {
  const [allTimeEntries, setAllTimeEntries] = useState<TimeEntryWithClient[]>([]) // For filter counts
  const [clients, setClients] = useState<Map<string, Client>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{
    id: string
    description: string
  } | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [currentPage, setCurrentPage] = useState(1)

  // Filter time entries by date and status from the complete list
  const filteredEntries = useMemo(() => {
    console.log('🔍 Filtering all entries - statusFilter:', statusFilter, 'total entries:', allTimeEntries.length)
    let filtered = allTimeEntries

    // Apply date filter
    if (dateFilter) {
      const filterDateStr = `${dateFilter.getFullYear()}-${String(dateFilter.getMonth() + 1).padStart(2, '0')}-${String(dateFilter.getDate()).padStart(2, '0')}`
      filtered = filtered.filter(entry => entry.entry_date === filterDateStr)
      console.log('📅 After date filter:', filtered.length, 'entries')
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      console.log('🎯 Applying status filter:', statusFilter)
      const currentDate = getCurrentDate()
      filtered = filtered.filter(entry => {
        // Prefer computed status from database if available
        if (entry.computed_status && entry.computed_status_color) {
          switch (statusFilter) {
            case 'ready_to_invoice':
              return entry.computed_status === 'factureerbaar' && entry.computed_status_color === 'green'
            case 'billable_not_due':
              return entry.computed_status === 'factureerbaar' && entry.computed_status_color === 'orange'
            case 'not_billable':
              return entry.computed_status === 'niet-factureerbaar'
            case 'invoiced':
              return entry.computed_status === 'gefactureerd'
            default:
              return true
          }
        }

        // Fallback to client-side calculation if computed status is not available
        const client = clients.get(entry.client_id || '')
        if (!client) {
          // If client data is missing, include the entry (don't filter it out)
          // This prevents all entries from disappearing when clients haven't loaded
          console.warn(`⚠️ Client not found for entry ${entry.id}, keeping entry in results`)
          return true
        }

        const statusInfo = getTimeEntryStatus(entry, client, currentDate)

        switch (statusFilter) {
          case 'ready_to_invoice':
            return statusInfo.status === 'factureerbaar' && statusInfo.color === 'green'
          case 'billable_not_due':
            return statusInfo.status === 'factureerbaar' && statusInfo.color === 'orange'
          case 'not_billable':
            return statusInfo.status === 'niet-factureerbaar'
          case 'invoiced':
            return statusInfo.status === 'gefactureerd'
          default:
            return true
        }
      })
      console.log('✅ After status filter:', filtered.length, 'entries')
    }

    console.log('📊 Final filtered count:', filtered.length)
    return filtered
  }, [allTimeEntries, dateFilter, statusFilter, clients])

  // Paginate the filtered entries
  const paginatedEntries = useMemo(() => {
    const pageLimit = limit || 50;
    const start = (currentPage - 1) * pageLimit;
    const end = start + pageLimit;
    return filteredEntries.slice(start, end);
  }, [filteredEntries, currentPage, limit]);

  const totalPages = Math.ceil(filteredEntries.length / (limit || 50));

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients?all=true', {
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

  const loadAllTimeEntries = async () => {
    const combinedEntries: TimeEntryWithClient[] = []
    const limitPerRequest = 100
    let nextPage = 1
    let totalPages = 1
    const timestamp = Date.now().toString()

    while (nextPage <= totalPages) {
      const params = new URLSearchParams({
        page: nextPage.toString(),
        limit: limitPerRequest.toString(),
        _t: `${timestamp}-${nextPage}`
      })

      const response = await fetch(`/api/time-entries?${params.toString()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch time entries')
      }

      const data = await response.json()
      combinedEntries.push(...(data.data || []))
      totalPages = data.pagination?.totalPages || totalPages

      if ((data.data?.length || 0) < limitPerRequest) {
        break
      }

      nextPage += 1
    }

    return combinedEntries
  }

  const fetchTimeEntries = async () => {
    try {
      setLoading(true)
      const [allEntries] = await Promise.all([
        loadAllTimeEntries(),
        fetchClients()
      ])

      console.log('Fetched all entries for counts:', allEntries.length, 'total entries')

      setAllTimeEntries(allEntries)
      setCurrentPage(1)
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
  }, [limit])

  const performDelete = async (id: string) => {
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

  const requestDelete = (entry: TimeEntryWithClient) => {
    setConfirmDelete({
      id: entry.id,
      description: entry.description || formatDate(entry.entry_date)
    })
  }

  const closeConfirmation = () => setConfirmDelete(null)

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
    const billableEntries = filteredEntries.filter(entry => entry.billable && !entry.invoiced)
    const totalHours = filteredEntries.reduce((sum, entry) => sum + entry.hours, 0)
    const billableHours = billableEntries.reduce((sum, entry) => sum + entry.hours, 0)
    const totalValue = filteredEntries.reduce((sum, entry) =>
      sum + (entry.hours * (entry.effective_hourly_rate || entry.hourly_rate || 0)), 0)
    const unbilledValue = billableEntries.reduce((sum, entry) =>
      sum + (entry.hours * (entry.effective_hourly_rate || entry.hourly_rate || 0)), 0)

    return { totalHours, billableHours, totalValue, unbilledValue }
  }

  const stats = getTotalStats()

  const statusFilterOptions: { value: StatusFilter; label: string; count: number }[] = useMemo(() => {
    const currentDate = getCurrentDate()
    let readyCount = 0
    let billableNotDueCount = 0
    let notBillableCount = 0
    let invoicedCount = 0

    // Use allTimeEntries for accurate counts across all pages
    allTimeEntries.forEach(entry => {
      // Prefer computed status from database if available
      let status = entry.computed_status
      let color = entry.computed_status_color

      // Fallback to client-side calculation if computed status not available
      if (!status || !color) {
        const client = clients.get(entry.client_id || '')
        if (client) {
          const statusInfo = getTimeEntryStatus(entry, client, currentDate)
          status = statusInfo.status
          color = statusInfo.color
        } else {
          // If no client data and no computed status, assume billable (green) as default
          // This prevents counts from being wrong when client data hasn't loaded yet
          status = 'factureerbaar'
          color = 'green'
        }
      }

      // Count based on status
      if (status === 'factureerbaar' && color === 'green') {
        readyCount++
      } else if (status === 'factureerbaar' && color === 'orange') {
        billableNotDueCount++
      } else if (status === 'niet-factureerbaar') {
        notBillableCount++
      } else if (status === 'gefactureerd') {
        invoicedCount++
      }
    })

    return [
      { value: 'all' as const, label: 'All', count: allTimeEntries.length },
      { value: 'ready_to_invoice' as const, label: 'Billable', count: readyCount },
      { value: 'billable_not_due' as const, label: 'Not Yet Billable', count: billableNotDueCount },
      { value: 'not_billable' as const, label: 'Non-billable', count: notBillableCount },
      { value: 'invoiced' as const, label: 'Invoiced', count: invoicedCount }
    ]
  }, [allTimeEntries, clients])

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
    }
  }

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
    <>
      <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Time Entries
          </div>
          <div className="text-sm text-muted-foreground" data-testid="time-entry-count-summary">
            Showing {paginatedEntries.length} of {filteredEntries.length} entries
          </div>
        </CardTitle>

        {/* Status Filter Tabs */}
        <div className="flex gap-2 mt-4 flex-wrap" data-testid="time-entry-status-filters">
          {statusFilterOptions.map(option => (
            <button
              key={option.value}
              type="button"
              data-testid={`status-filter-${option.value}`}
              onClick={() => {
                console.log('🖱️ Filter button clicked:', option.label, '(value:', option.value, ')')
                setStatusFilter(option.value)
                setCurrentPage(1) // Reset to first page on filter change
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                statusFilter === option.value
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {option.label}
              <Badge
                variant="secondary"
                className="ml-2"
                style={{
                  background: statusFilter === option.value ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'
                }}
              >
                {option.count}
              </Badge>
            </button>
          ))}
        </div>
        
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
        {paginatedEntries.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No time entries found</h3>
            <p className="text-muted-foreground mb-4">
              There are no entries that match the current filter.
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
                {paginatedEntries.map((entry) => (
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
                              <div className="text-xs text-muted-foreground">Free text</div>
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
                                Effective rate
                              </div>
                            )}
                          </div>
                        ) : '-'}
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-right font-medium">
                      {entry.effective_hourly_rate || entry.hourly_rate ? (
                        formatCurrency(entry.hours * (entry.effective_hourly_rate || entry.hourly_rate))
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
                          
                          // Prefer computed status from database if available
                          let statusInfo
                          if (entry.computed_status && entry.computed_status_color) {
                            // Use pre-computed status from database
                            const labelMap = {
                              'factureerbaar': entry.computed_status_color === 'green' ? 'Billable' : 'Not yet billable',
                              'niet-factureerbaar': 'Non-billable',
                              'gefactureerd': 'Invoiced'
                            }
                            statusInfo = {
                              status: entry.computed_status as 'factureerbaar' | 'niet-factureerbaar' | 'gefactureerd',
                              color: entry.computed_status_color as 'green' | 'orange' | 'red' | 'purple',
                              label: labelMap[entry.computed_status as keyof typeof labelMap] || 'Unknown',
                              reason: 'Status calculated by database'
                            }
                          } else {
                            // Fallback to client-side calculation
                            statusInfo = getTimeEntryStatus(entry, client)
                          }

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
                          aria-label="More options"
                          data-entry-id={entry.id}
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
                                <button
                                  type="button"
                                  className="px-3 py-2 text-sm hover:bg-gray-100 flex w-full items-center text-left"
                                  onClick={() => {
                                    onEdit?.(entry)
                                    setOpenDropdown(null)
                                  }}
                                  aria-label="Edit time entry"
                                >
                                  <Edit2 className="h-4 w-4 mr-2" />
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="px-3 py-2 text-sm hover:bg-red-50 flex w-full items-center text-left text-red-600"
                                  onClick={() => {
                                    requestDelete(entry)
                                    setOpenDropdown(null)
                                  }}
                                  aria-label="Delete time entry"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </button>
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

        {/* Pagination Controls */}
        {showPagination && totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-700">
          <div className="text-sm text-slate-400" data-testid="time-entry-pagination-info">
            Page {currentPage} of {totalPages} • Showing {paginatedEntries.length} of {filteredEntries.length} entries
          </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="flex items-center gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>

              {/* Page numbers */}
              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }

                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handlePageChange(pageNum)}
                      className="w-10"
                    >
                      {pageNum}
                    </Button>
                  )
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
      </Card>

      {confirmDelete && (
        <DeleteConfirmationModal
          open={!!confirmDelete}
          onOpenChange={(open) => {
            if (!open) {
              closeConfirmation()
            }
          }}
          itemName="time entry"
          description={`Are you sure you want to delete "${confirmDelete.description}"? This action cannot be undone.`}
          onConfirm={async () => {
            await performDelete(confirmDelete.id)
            closeConfirmation()
          }}
          onCancel={closeConfirmation}
        />
      )}
    </>
  )
}

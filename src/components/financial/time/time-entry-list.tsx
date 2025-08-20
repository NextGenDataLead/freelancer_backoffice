'use client'

import { useState, useEffect } from 'react'
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
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { 
  Clock, 
  MoreHorizontal, 
  Edit2, 
  Trash2, 
  FileText, 
  Building2,
  CheckCircle,
  XCircle,
  Calendar,
  Euro
} from 'lucide-react'
import type { TimeEntryWithClient } from '@/lib/types/financial'

interface TimeEntryListProps {
  onEdit?: (timeEntry: TimeEntryWithClient) => void
  onRefresh?: () => void
  limit?: number
  showPagination?: boolean
}

export function TimeEntryList({ onEdit, onRefresh, limit, showPagination }: TimeEntryListProps) {
  const [timeEntries, setTimeEntries] = useState<TimeEntryWithClient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 0,
    total: 0
  })

  const fetchTimeEntries = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (limit) params.set('limit', limit.toString())
      // Add timestamp to prevent caching
      params.set('_t', Date.now().toString())
      
      const response = await fetch(`/api/time-entries?${params.toString()}`, {
        cache: 'no-store', // Prevent caching
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch time entries')
      }
      
      const data = await response.json()
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
    if (!confirm('Weet je zeker dat je deze tijdregistratie wilt verwijderen?')) {
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
      alert('Er is een fout opgetreden bij het verwijderen')
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
      alert('Er is een fout opgetreden bij het bijwerken')
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
    const billableEntries = timeEntries.filter(entry => entry.billable && !entry.invoiced)
    const totalHours = timeEntries.reduce((sum, entry) => sum + entry.hours, 0)
    const billableHours = billableEntries.reduce((sum, entry) => sum + entry.hours, 0)
    const totalValue = timeEntries.reduce((sum, entry) => 
      sum + (entry.hours * (entry.hourly_rate || 0)), 0)
    const unbilledValue = billableEntries.reduce((sum, entry) => 
      sum + (entry.hours * (entry.hourly_rate || 0)), 0)

    return { totalHours, billableHours, totalValue, unbilledValue }
  }

  const stats = getTotalStats()

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Tijdregistraties
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
            Tijdregistraties
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchTimeEntries} variant="outline">
              Opnieuw proberen
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
            Tijdregistraties
          </div>
          <div className="text-sm text-muted-foreground">
            {timeEntries.length} van {pagination.total} registraties
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
                Totaal uren
              </div>
            </div>
            
            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
              <div className="text-lg font-bold text-green-700 dark:text-green-300">
                {formatTime(stats.billableHours)}
              </div>
              <div className="text-xs text-green-600 dark:text-green-400">
                Factureerbaar
              </div>
            </div>
            
            <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
              <div className="text-lg font-bold text-purple-700 dark:text-purple-300">
                {formatCurrency(stats.totalValue)}
              </div>
              <div className="text-xs text-purple-600 dark:text-purple-400">
                Totale waarde
              </div>
            </div>
            
            <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
              <div className="text-lg font-bold text-orange-700 dark:text-orange-300">
                {formatCurrency(stats.unbilledValue)}
              </div>
              <div className="text-xs text-orange-600 dark:text-orange-400">
                Nog te factureren
              </div>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {timeEntries.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nog geen tijdregistraties</h3>
            <p className="text-muted-foreground mb-4">
              Start met het registreren van je gewerkte uren
            </p>
          </div>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead>Klant</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Beschrijving</TableHead>
                  <TableHead className="text-right">Uren</TableHead>
                  <TableHead className="text-right">Tarief</TableHead>
                  <TableHead className="text-right">Waarde</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timeEntries.map((entry) => (
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
                      <div className="flex items-center justify-center gap-2">
                        <Badge 
                          variant={entry.billable ? "default" : "secondary"}
                          className="cursor-pointer"
                          onClick={() => handleToggleBillable(entry)}
                        >
                          {entry.billable ? (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Factureerbaar
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3 mr-1" />
                              Niet factureerbaar
                            </>
                          )}
                        </Badge>
                        
                        {entry.billable && entry.invoiced && (
                          <Badge variant="outline" className="text-green-600">
                            <FileText className="h-3 w-3 mr-1" />
                            Gefactureerd
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => onEdit?.(entry)}
                            className="cursor-pointer"
                          >
                            <Edit2 className="h-4 w-4 mr-2" />
                            Bewerken
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDelete(entry.id)}
                            className="cursor-pointer text-red-600 dark:text-red-400"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Verwijderen
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
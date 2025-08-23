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
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Clock, 
  Euro, 
  Users, 
  AlertTriangle, 
  Calendar,
  FileText,
  TrendingUp,
  CheckCircle,
  Building2,
  Timer
} from 'lucide-react'
import type { ClientInvoicingSummary } from '@/lib/types/financial'

interface ClientInvoicingDashboardProps {
  onCreateInvoice: (client: ClientInvoicingSummary) => void
}

interface InvoicingData {
  clients: ClientInvoicingSummary[]
  summary: {
    total_clients: number
    ready_for_invoicing: number
    overdue_for_invoicing: number
    total_unbilled_hours: number
    total_unbilled_amount: number
  }
  filter: string
}

export function ClientInvoicingDashboard({ onCreateInvoice }: ClientInvoicingDashboardProps) {
  const [data, setData] = useState<InvoicingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('ready')

  const fetchData = async (selectedFilter: string = filter) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/clients/ready-for-invoicing?filter=${selectedFilter}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch invoicing data')
      }

      const result = await response.json()
      setData(result.data)
    } catch (err) {
      console.error('Error fetching invoicing data:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter)
    fetchData(newFilter)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const formatHours = (hours: number) => {
    return `${hours.toFixed(1)}u`
  }

  const getFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case 'weekly':
        return 'Wekelijks'
      case 'monthly':
        return 'Maandelijks'
      case 'on_demand':
        return 'Op aanvraag'
      default:
        return frequency
    }
  }

  const getFrequencyBadge = (frequency: string) => {
    switch (frequency) {
      case 'weekly':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      case 'monthly':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'on_demand':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
    }
  }

  const getClientStatusIcon = (client: ClientInvoicingSummary) => {
    if (client.overdue_for_invoicing) {
      return <AlertTriangle className="h-4 w-4 text-red-500" />
    } else if (client.ready_for_invoicing) {
      return <CheckCircle className="h-4 w-4 text-green-500" />
    } else {
      return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted animate-pulse rounded w-24"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted animate-pulse rounded w-20 mb-2"></div>
                <div className="h-3 bg-muted animate-pulse rounded w-32"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-red-600 dark:text-red-400">
            Fout bij laden van factureringsgegevens: {error}
          </div>
          <Button onClick={() => fetchData()} className="mt-4">
            Opnieuw proberen
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Klanten</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.summary.total_clients || 0}</div>
            <p className="text-xs text-muted-foreground">
              Totaal aantal klanten met tijd
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Klaar voor facturatie</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {data?.summary.ready_for_invoicing || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Klanten die gefactureerd kunnen worden
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Achterstallig</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {data?.summary.overdue_for_invoicing || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Te laat met factureren
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Onfactureert</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.summary.total_unbilled_amount ? formatCurrency(data.summary.total_unbilled_amount) : '€0,00'}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatHours(data?.summary.total_unbilled_hours || 0)} aan onfactureert tijd
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Client List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Factureringsstatus per klant</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Overzicht van klanten met onfactureert tijd
              </p>
            </div>
            <Select value={filter} onValueChange={handleFilterChange}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter klanten" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ready">Klaar voor facturatie</SelectItem>
                <SelectItem value="overdue">Achterstallig</SelectItem>
                <SelectItem value="weekly">Wekelijks schema</SelectItem>
                <SelectItem value="monthly">Maandelijks schema</SelectItem>
                <SelectItem value="all">Alle klanten</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {!data?.clients || data.clients.length === 0 ? (
            <div className="text-center py-12">
              <Timer className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Geen klanten gevonden</h3>
              <p className="text-muted-foreground">
                {filter === 'ready' 
                  ? 'Geen klanten klaar voor facturatie'
                  : 'Geen klanten voor het geselecteerde filter'
                }
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Klant</TableHead>
                  <TableHead>Schema</TableHead>
                  <TableHead className="text-right">Uren</TableHead>
                  <TableHead className="text-right">Bedrag</TableHead>
                  <TableHead className="text-right">Dagen geleden</TableHead>
                  <TableHead className="w-32">Actie</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {getClientStatusIcon(client)}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {client.company_name || client.name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {client.company_name && client.name}
                          {client.email && (
                            <span className="block text-xs">{client.email}</span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Badge className={getFrequencyBadge(client.invoicing_frequency)}>
                        {getFrequencyLabel(client.invoicing_frequency)}
                      </Badge>
                    </TableCell>
                    
                    <TableCell className="text-right font-mono">
                      {formatHours(client.unbilled_hours || 0)}
                    </TableCell>
                    
                    <TableCell className="text-right font-medium">
                      {formatCurrency(client.unbilled_amount || 0)}
                    </TableCell>
                    
                    <TableCell className="text-right">
                      {client.days_since_last_invoice !== null ? (
                        <span className={
                          client.overdue_for_invoicing ? 'text-red-600' : 
                          client.days_since_last_invoice > 30 ? 'text-orange-600' : 
                          'text-muted-foreground'
                        }>
                          {client.days_since_last_invoice} dagen
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Nieuw</span>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => onCreateInvoice(client)}
                        disabled={(client.unbilled_hours || 0) === 0}
                      >
                        <FileText className="h-3 w-3 mr-1" />
                        Factureren
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Edit, Trash2, Building2, User, MapPin, Mail, Phone } from 'lucide-react'
import type { ClientWithInvoices } from '@/lib/types/financial'

interface ClientListProps {
  onAddClient?: () => void
  onEditClient?: (client: ClientWithInvoices) => void
  onDeleteClient?: (client: ClientWithInvoices) => void
}

interface ClientsResponse {
  data: ClientWithInvoices[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export function ClientList({ onAddClient, onEditClient, onDeleteClient }: ClientListProps) {
  const [clients, setClients] = useState<ClientWithInvoices[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchClients = async (page: number = 1) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/clients?page=${page}&limit=20`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch clients')
      }

      const data: ClientsResponse = await response.json()
      setClients(data.data)
      setCurrentPage(data.pagination.page)
      setTotalPages(data.pagination.totalPages)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClients()
  }, [])

  const handleDeleteClient = async (client: ClientWithInvoices) => {
    if (!confirm(`Weet je zeker dat je klant "${client.name}" wilt verwijderen?`)) {
      return
    }

    try {
      const response = await fetch(`/api/clients/${client.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to delete client')
      }

      // Refresh the client list
      fetchClients(currentPage)
      
      if (onDeleteClient) {
        onDeleteClient(client)
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error deleting client')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const getClientType = (client: ClientWithInvoices) => {
    if (client.is_business) {
      return client.company_name || client.name
    }
    return `${client.name} (Particulier)`
  }

  const getLocationText = (client: ClientWithInvoices) => {
    const parts = []
    if (client.city) parts.push(client.city)
    if (client.country_code && client.country_code !== 'NL') {
      parts.push(client.country_code)
    }
    return parts.join(', ') || 'Nederland'
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Klanten</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="h-4 bg-muted animate-pulse rounded w-8"></div>
                <div className="h-4 bg-muted animate-pulse rounded flex-1"></div>
                <div className="h-4 bg-muted animate-pulse rounded w-24"></div>
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
          <CardTitle>Klanten</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-600 dark:text-red-400">
            Fout bij laden van klanten: {error}
          </div>
          <Button onClick={() => fetchClients()} className="mt-4">
            Opnieuw proberen
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
        <div>
          <CardTitle>Klanten</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Beheer je klanten en hun contactgegevens
          </p>
        </div>
        <Button onClick={onAddClient}>
          <Plus className="h-4 w-4 mr-2" />
          Nieuwe klant
        </Button>
      </CardHeader>
      
      <CardContent>
        {clients.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nog geen klanten</h3>
            <p className="text-muted-foreground mb-4">
              Voeg je eerste klant toe om te beginnen met factureren
            </p>
            <Button onClick={onAddClient}>
              <Plus className="h-4 w-4 mr-2" />
              Eerste klant toevoegen
            </Button>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>Naam / Bedrijf</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Locatie</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Factuurtotaal</TableHead>
                  <TableHead className="w-20">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client, index) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {(currentPage - 1) * 20 + index + 1}
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        {client.is_business ? (
                          <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        ) : (
                          <User className="h-4 w-4 text-green-600 dark:text-green-400" />
                        )}
                        <div>
                          <div className="font-medium">
                            {getClientType(client)}
                          </div>
                          {client.vat_number && (
                            <div className="text-xs text-muted-foreground">
                              BTW: {client.vat_number}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-1">
                        {client.email && (
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Mail className="h-3 w-3 mr-1" />
                            {client.email}
                          </div>
                        )}
                        {client.phone && (
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Phone className="h-3 w-3 mr-1" />
                            {client.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center text-sm">
                        <MapPin className="h-3 w-3 mr-1 text-muted-foreground" />
                        {getLocationText(client)}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        client.is_business
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                          : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                      }`}>
                        {client.is_business ? 'B2B' : 'B2C'}
                      </span>
                      {client.is_supplier && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 ml-1">
                          Leverancier
                        </span>
                      )}
                    </TableCell>
                    
                    <TableCell className="text-right">
                      {client.total_invoiced 
                        ? formatCurrency(parseFloat(client.total_invoiced.toString()))
                        : formatCurrency(0)
                      }
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEditClient?.(client)}
                          className="h-7 w-7"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClient(client)}
                          className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-muted-foreground">
                  Pagina {currentPage} van {totalPages}
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchClients(currentPage - 1)}
                    disabled={currentPage <= 1}
                  >
                    Vorige
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchClients(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                  >
                    Volgende
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
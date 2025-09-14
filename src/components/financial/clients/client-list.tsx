'use client'

import React, { useEffect, useState } from 'react'
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
import { Plus, Edit, Trash2, Building2, User, MapPin, Mail, Phone, Euro, FolderOpen } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ProjectList } from '@/components/financial/projects/project-list'
import { ProjectForm } from '@/components/financial/projects/project-form'
import type { ClientWithInvoices } from '@/lib/types/financial'

interface ClientListProps {
  onAddClient?: () => void
  onEditClient?: (client: ClientWithInvoices) => void
  onDeleteClient?: (client: ClientWithInvoices) => void
}

// Enhanced client type with project management fields
interface EnhancedClient extends ClientWithInvoices {
  active?: boolean
  hourly_rate?: number
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
  const [clients, setClients] = useState<EnhancedClient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  
  // Enhanced states for project management
  const [updatingClients, setUpdatingClients] = useState<Set<string>>(new Set())
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const [editingRates, setEditingRates] = useState<Set<string>>(new Set())
  const [showProjectForm, setShowProjectForm] = useState(false)
  const [selectedClientForProject, setSelectedClientForProject] = useState<EnhancedClient | null>(null)
  const [editingProject, setEditingProject] = useState<any>(null)

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

  const handleClientStatusToggle = async (client: EnhancedClient) => {
    const clientId = client.id
    const newActiveStatus = !client.active
    
    setUpdatingClients(prev => new Set(prev).add(clientId))
    
    try {
      const response = await fetch(`/api/clients/${clientId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: newActiveStatus })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update client status')
      }

      // Update local state
      setClients(prev => prev.map(c => 
        c.id === clientId 
          ? { ...c, active: newActiveStatus }
          : c
      ))

    } catch (error) {
      console.error('Error updating client status:', error)
      alert(error instanceof Error ? error.message : 'Error updating client status')
    } finally {
      setUpdatingClients(prev => {
        const newSet = new Set(prev)
        newSet.delete(clientId)
        return newSet
      })
    }
  }

  const handleHourlyRateUpdate = async (client: EnhancedClient, newRate: number | null) => {
    const clientId = client.id
    
    try {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...client,
          hourly_rate: newRate 
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update hourly rate')
      }

      // Update local state
      setClients(prev => prev.map(c => 
        c.id === clientId 
          ? { ...c, hourly_rate: newRate }
          : c
      ))

    } catch (error) {
      console.error('Error updating hourly rate:', error)
      alert(error instanceof Error ? error.message : 'Error updating hourly rate')
    }
  }

  const toggleProjectExpansion = (clientId: string) => {
    setExpandedProjects(prev => {
      const newSet = new Set(prev)
      if (newSet.has(clientId)) {
        newSet.delete(clientId)
      } else {
        newSet.add(clientId)
      }
      return newSet
    })
  }

  const handleCreateProject = (client: EnhancedClient) => {
    setSelectedClientForProject(client)
    setEditingProject(null)
    setShowProjectForm(true)
  }

  const handleEditProject = (project: any) => {
    setSelectedClientForProject(clients.find(c => c.id === project.client_id) || null)
    setEditingProject(project)
    setShowProjectForm(true)
  }

  const handleProjectSuccess = async (project?: any) => {
    setShowProjectForm(false)
    setSelectedClientForProject(null)
    setEditingProject(null)
    
    // Refresh the clients data to update project counts
    await fetchClients(currentPage)
    
    // Show success feedback (you could replace this with a toast notification)
    const action = editingProject ? 'bijgewerkt' : 'aangemaakt'
    console.log(`✅ Project "${project?.name}" succesvol ${action}`)
  }

  const handleDeleteClient = async (client: EnhancedClient) => {
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
                  <TableHead>Uurtarief</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Projecten</TableHead>
                  <TableHead className="w-32">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client, index) => {
                  const isUpdating = updatingClients.has(client.id)
                  const isProjectsExpanded = expandedProjects.has(client.id)
                  const isEditingRate = editingRates.has(client.id)

                  return (
                    <React.Fragment key={client.id}>
                      <TableRow className={client.active === false ? 'opacity-60' : ''}>
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
                      <div className="flex items-center space-x-2">
                        {isEditingRate ? (
                          <Input
                            type="number"
                            step="0.01"
                            defaultValue={client.hourly_rate || ''}
                            placeholder="€0,00"
                            className="w-20 h-7 text-sm"
                            onBlur={(e) => {
                              const newRate = e.target.value ? parseFloat(e.target.value) : null
                              handleHourlyRateUpdate(client, newRate)
                              setEditingRates(prev => {
                                const newSet = new Set(prev)
                                newSet.delete(client.id)
                                return newSet
                              })
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.currentTarget.blur()
                              }
                            }}
                            autoFocus
                          />
                        ) : (
                          <div 
                            className="flex items-center cursor-pointer hover:bg-muted/50 px-2 py-1 rounded text-sm"
                            onClick={() => setEditingRates(prev => new Set(prev).add(client.id))}
                          >
                            <Euro className="h-3 w-3 mr-1 text-muted-foreground" />
                            {client.hourly_rate ? formatCurrency(client.hourly_rate) : 'Niet ingesteld'}
                          </div>
                        )}
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
                    
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={client.active !== false}
                          disabled={isUpdating}
                          onCheckedChange={() => handleClientStatusToggle(client)}
                          className="h-4 w-7"
                        />
                        {isUpdating && (
                          <div className="h-3 w-3 animate-spin rounded-full border border-muted-foreground border-t-foreground"></div>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleProjectExpansion(client.id)}
                        className="h-7 px-2"
                      >
                        <FolderOpen className={`h-3 w-3 mr-1 ${isProjectsExpanded ? 'text-blue-600' : 'text-muted-foreground'}`} />
                        <span className="text-xs">
                          {isProjectsExpanded ? 'Verberg' : 'Projecten'}
                        </span>
                      </Button>
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
                              size="sm"
                              onClick={() => handleDeleteClient(client)}
                              className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      
                      {/* Project Row */}
                      {isProjectsExpanded && (
                        <TableRow>
                          <TableCell colSpan={9} className="p-0 bg-muted/20">
                            <ProjectList
                              client={client}
                              expanded={true}
                              onEditProject={handleEditProject}
                              onCreateProject={() => handleCreateProject(client)}
                              onRefresh={() => fetchClients(currentPage)}
                            />
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  )
                })}
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
      
      {/* Project Form Dialog */}
      <Dialog open={showProjectForm} onOpenChange={setShowProjectForm}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingProject ? 'Project bewerken' : 'Nieuw project'}
            </DialogTitle>
          </DialogHeader>
          {selectedClientForProject && (
            <ProjectForm
              client={selectedClientForProject}
              project={editingProject}
              onSuccess={handleProjectSuccess}
              onCancel={() => setShowProjectForm(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
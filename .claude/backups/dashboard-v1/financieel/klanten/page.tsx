'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ClientList } from '@/components/financial/clients/client-list'
import { ClientForm } from '@/components/financial/clients/client-form'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Users, Plus, ArrowLeft, FolderOpen, Euro, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface ClientStats {
  activeClients: number
  activeProjects: number
  averageHourlyRate: number | null
  totalClients: number
  totalProjects: number
}

export default function ClientsPage() {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingClient, setEditingClient] = useState<any>(null)
  const [clientStats, setClientStats] = useState<ClientStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  const fetchClientStats = async () => {
    try {
      setStatsLoading(true)
      const response = await fetch('/api/clients/stats')
      if (response.ok) {
        const data = await response.json()
        setClientStats(data.data)
      } else {
        console.error('Failed to fetch client stats')
      }
    } catch (error) {
      console.error('Error fetching client stats:', error)
    } finally {
      setStatsLoading(false)
    }
  }

  useEffect(() => {
    fetchClientStats()
  }, [])

  const handleClientCreated = (client: any) => {
    setShowCreateForm(false)
    // Refresh stats
    fetchClientStats()
    // Refresh the list - this would normally trigger a refetch
    window.location.reload()
  }

  const handleClientUpdated = (client: any) => {
    setEditingClient(null)
    // Refresh stats
    fetchClientStats()
    // Refresh the list
    window.location.reload()
  }

  const handleEditClient = (client: any) => {
    setEditingClient(client)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/financieel">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Terug naar Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Klantenbeheer</h1>
            <p className="text-muted-foreground mt-1">
              Beheer je klanten en leveranciers
            </p>
          </div>
        </div>
        
        <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nieuwe Klant
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nieuwe Klant Toevoegen</DialogTitle>
            </DialogHeader>
            <ClientForm 
              onSuccess={handleClientCreated}
              onCancel={() => setShowCreateForm(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actieve Klanten</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="flex items-center">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <div className="h-7 bg-muted animate-pulse rounded w-12"></div>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{clientStats?.activeClients || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {clientStats?.totalClients ? `${clientStats.totalClients} totaal` : 'Geen klanten'}
                </p>
              </>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actieve Projecten</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="flex items-center">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <div className="h-7 bg-muted animate-pulse rounded w-12"></div>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{clientStats?.activeProjects || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {clientStats?.totalProjects ? `${clientStats.totalProjects} totaal` : 'Geen projecten'}
                </p>
              </>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gemiddelde Uurtarief</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="flex items-center">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <div className="h-7 bg-muted animate-pulse rounded w-16"></div>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {clientStats?.averageHourlyRate ? `€${clientStats.averageHourlyRate.toFixed(2)}` : '€0,00'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {clientStats?.averageHourlyRate ? 'Gewogen gemiddelde' : 'Geen tarieven ingesteld'}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Client List */}
      <ClientList onEditClient={handleEditClient} />

      {/* Edit Client Dialog */}
      <Dialog open={!!editingClient} onOpenChange={() => setEditingClient(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Klant Bewerken</DialogTitle>
          </DialogHeader>
          {editingClient && (
            <ClientForm 
              client={editingClient}
              onSuccess={handleClientUpdated}
              onCancel={() => setEditingClient(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
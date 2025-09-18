'use client'

// Enhanced clients component with health insights integration
// Combines client management with comprehensive health analytics

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ClientList } from '@/components/financial/clients/client-list'
import { ClientForm } from '@/components/financial/clients/client-form'
import { ClientHealthOverview } from '@/components/financial/clients/client-health-overview'
import { ActionableInsights } from '@/components/financial/clients/actionable-insights'
import { ClientHealthCard } from '@/components/financial/clients/client-health-card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Users, Plus, FolderOpen, Euro, Loader2, Filter, Search, LayoutGrid, List, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface ClientHealthData {
  id: string
  name: string
  revenue: {
    thisMonth: number
    lastMonth: number
    total: number
  }
  payment: {
    averageDays: number
    overdueAmount: number
    overdueCount: number
    lastPayment: string
  }
  projects: {
    active: number
    completed: number
    onHold: number
  }
  engagement: {
    lastActivity: string
    hoursThisMonth: number
    communicationScore: number
  }
}

interface ClientHealthScore {
  client: ClientHealthData
  score: number
  status: 'excellent' | 'good' | 'warning' | 'at_risk'
  riskFactors: string[]
  opportunities: string[]
  trends: {
    revenue: 'up' | 'down' | 'stable'
    engagement: 'up' | 'down' | 'stable'
    payment: 'improving' | 'declining' | 'stable'
  }
}

interface ClientStats {
  activeClients: number
  activeProjects: number
  averageHourlyRate: number | null
  totalClients: number
  totalProjects: number
}

interface ClientsContentProps {
  showHeader?: boolean
  className?: string
}

export function ClientsContent({ showHeader = true, className = '' }: ClientsContentProps) {
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
    fetchClientStats()
    window.location.reload()
  }

  const handleClientUpdated = (client: any) => {
    setEditingClient(null)
    fetchClientStats()
    window.location.reload()
  }

  const handleEditClient = (client: any) => {
    setEditingClient(client)
  }

  const handleAddClient = () => {
    setShowCreateForm(true)
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header - conditional rendering based on showHeader prop */}
      {showHeader ? (
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
      ) : (
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Klantenbeheer</h3>
            <p className="text-muted-foreground text-sm">
              Beheer je klanten en leveranciers
            </p>
          </div>

          <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
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
      )}

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
      <ClientList onEditClient={handleEditClient} onAddClient={handleAddClient} />

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
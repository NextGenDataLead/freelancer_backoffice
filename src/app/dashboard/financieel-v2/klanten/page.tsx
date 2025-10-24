'use client'

import { useState, useEffect } from 'react'
import { GlassmorphicMetricCard } from '@/components/dashboard/glassmorphic-metric-card'
import { Card, CardContent } from '@/components/ui/card'
import { ClientList } from '@/components/financial/clients/client-list'
import { ClientForm } from '@/components/financial/clients/client-form'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Users, Plus, FolderOpen, Euro } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ClientStats {
  activeClients: number
  activeProjects: number
  averageHourlyRate: number | null
  totalClients: number
  totalProjects: number
}

export default function KlantenPage() {
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
    <section className="main-grid" aria-label="Clients content">
      {/* Metric Cards Section */}
      <article className="glass-card" style={{ gridColumn: 'span 12', gridRow: 'span 1' }}>
        <div className="card-header">
          <div className="flex gap-3 ml-auto">
            <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
              <DialogTrigger asChild>
                <button type="button" className="action-chip">
                  <Plus className="h-4 w-4 mr-2" />
                  Nieuwe Klant
                </button>
              </DialogTrigger>
              <DialogContent
                className={cn(
                  'max-w-2xl max-h-[90vh] overflow-y-auto',
                  'bg-gradient-to-br from-slate-950/95 via-slate-900/90 to-slate-950/95',
                  'border border-white/10 backdrop-blur-2xl',
                  'shadow-[0_40px_120px_rgba(15,23,42,0.45)] text-slate-100'
                )}
              >
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
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '1.5rem' }}>
          {/* Card 1: Active Clients */}
          <div style={{ gridColumn: 'span 4' }}>
            <GlassmorphicMetricCard
              icon={Users}
              iconColor="rgba(59, 130, 246, 0.7)"
              title="Active Clients"
              value={statsLoading ? '...' : clientStats?.activeClients || 0}
              subtitle={statsLoading ? '...' : `${clientStats?.totalClients || 0} totaal klanten`}
              badge={{
                label: 'Active',
                color: 'rgba(59, 130, 246, 0.25)',
              }}
              gradient="linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(37, 99, 235, 0.08))"
            />
          </div>

          {/* Card 2: Active Projects */}
          <div style={{ gridColumn: 'span 4' }}>
            <GlassmorphicMetricCard
              icon={FolderOpen}
              iconColor="rgba(139, 92, 246, 0.7)"
              title="Active Projects"
              value={statsLoading ? '...' : clientStats?.activeProjects || 0}
              subtitle={statsLoading ? '...' : `${clientStats?.totalProjects || 0} totaal projecten`}
              badge={{
                label: 'Projects',
                color: 'rgba(139, 92, 246, 0.25)',
              }}
              gradient="linear-gradient(135deg, rgba(139, 92, 246, 0.12), rgba(124, 58, 237, 0.08))"
            />
          </div>

          {/* Card 3: Average Hourly Rate */}
          <div style={{ gridColumn: 'span 4' }}>
            <GlassmorphicMetricCard
              icon={Euro}
              iconColor="rgba(16, 185, 129, 0.7)"
              title="Average Hourly Rate"
              value={statsLoading ? '...' : clientStats?.averageHourlyRate ? `€${clientStats.averageHourlyRate.toFixed(2)}` : '€0,00'}
              subtitle={clientStats?.averageHourlyRate ? 'Gewogen gemiddelde' : 'Geen tarieven ingesteld'}
              badge={{
                label: 'Rate',
                color: 'rgba(16, 185, 129, 0.25)',
              }}
              gradient="linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(5, 150, 105, 0.08))"
            />
          </div>
        </div>
      </article>

      {/* Client List */}
      <article className="glass-card" style={{ gridColumn: 'span 12', gridRow: 'span 1' }} aria-labelledby="client-list-title">
        <div className="card-header">
          <h2 className="card-header__title flex items-center" id="client-list-title">
            <Users className="h-5 w-5 mr-2" />
            All Clients
          </h2>
          <p className="card-header__subtitle">
            Beheer je klanten en leveranciers
          </p>
        </div>
        <CardContent className="pt-6">
          <ClientList onEditClient={handleEditClient} onAddClient={handleAddClient} />
        </CardContent>
      </article>

      {/* Edit Client Dialog */}
      <Dialog open={!!editingClient} onOpenChange={() => setEditingClient(null)}>
        <DialogContent
          className={cn(
            'max-w-2xl max-h-[90vh] overflow-y-auto',
            'bg-gradient-to-br from-slate-950/95 via-slate-900/90 to-slate-950/95',
            'border border-white/10 backdrop-blur-2xl',
            'shadow-[0_40px_120px_rgba(15,23,42,0.45)] text-slate-100'
          )}
        >
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
    </section>
  )
}

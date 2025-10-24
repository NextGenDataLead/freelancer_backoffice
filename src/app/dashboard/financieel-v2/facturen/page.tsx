'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { GlassmorphicMetricCard } from '@/components/dashboard/glassmorphic-metric-card'
import { Card, CardContent } from '@/components/ui/card'
import { InvoiceList } from '@/components/financial/invoices/invoice-list'
import { InvoiceForm } from '@/components/financial/invoices/invoice-form'
import { InvoiceDetailModal } from '@/components/financial/invoices/invoice-detail-modal'
import { ClientInvoiceWizard } from '@/components/financial/invoices/client-invoice-wizard'
import { ComprehensiveInvoicingWizard } from '@/components/financial/invoices/comprehensive-invoicing-wizard'
import { FileText, Plus, Euro, Clock, AlertTriangle, Send, Receipt } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { ClientInvoicingSummary } from '@/lib/types/financial'

export default function FacturenPage() {
  const searchParams = useSearchParams()

  // Core state management
  const [editingInvoice, setEditingInvoice] = useState<any>(null)
  const [viewingInvoice, setViewingInvoice] = useState<any>(null)
  const [selectedClientForInvoicing, setSelectedClientForInvoicing] = useState<ClientInvoicingSummary | null>(null)

  // Modal states
  const [showComprehensiveWizard, setShowComprehensiveWizard] = useState(false)
  const [showManualInvoiceForm, setShowManualInvoiceForm] = useState(false)
  const [showClientInvoiceWizard, setShowClientInvoiceWizard] = useState(false)

  // Action modal states
  const [showRemindersModal, setShowRemindersModal] = useState(false)
  const [showVATOverview, setShowVATOverview] = useState(false)

  // Metrics state
  const [metrics, setMetrics] = useState<any>(null)
  const [metricsLoading, setMetricsLoading] = useState(true)

  // Fetch metrics
  const fetchMetrics = async () => {
    try {
      setMetricsLoading(true)
      const response = await fetch('/api/invoices/dashboard-metrics')
      if (response.ok) {
        const data = await response.json()
        setMetrics(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error)
    } finally {
      setMetricsLoading(false)
    }
  }

  useEffect(() => {
    fetchMetrics()
  }, [])

  // Handle action query parameter to open comprehensive wizard
  useEffect(() => {
    const action = searchParams.get('action')

    if (action === 'create') {
      setShowComprehensiveWizard(true)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [searchParams])

  const handleInvoiceCreated = (invoice: any) => {
    setShowManualInvoiceForm(false)
    window.location.reload()
  }

  const handleInvoiceUpdated = (invoice: any) => {
    setEditingInvoice(null)
    window.location.reload()
  }

  const handleEditInvoice = (invoice: any) => {
    setEditingInvoice(invoice)
  }

  const handleViewInvoice = (invoice: any) => {
    setViewingInvoice(invoice)
  }

  const handleInvoiceStatusUpdate = async (invoice: any, newStatus: string) => {
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update status')
      }

      setViewingInvoice(null)
      window.location.reload()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error updating status')
      throw err
    }
  }

  const handleOpenComprehensiveWizard = () => {
    setShowComprehensiveWizard(true)
  }

  const handleComprehensiveWizardSuccess = (invoices: any[]) => {
    setShowComprehensiveWizard(false)
    window.location.reload()
  }

  const handleCreateInvoiceFromClient = (client: ClientInvoicingSummary) => {
    setSelectedClientForInvoicing(client)
    setShowClientInvoiceWizard(true)
  }

  const handleClientInvoiceSuccess = (invoice: any) => {
    setShowClientInvoiceWizard(false)
    setSelectedClientForInvoicing(null)
    setViewingInvoice(invoice)
  }

  const handleCloseClientInvoiceWizard = () => {
    setShowClientInvoiceWizard(false)
    setSelectedClientForInvoicing(null)
  }

  const handleShowTemplates = () => {
    window.location.href = '/dashboard/financieel/facturen/template'
  }

  const handleShowReminders = () => {
    setShowRemindersModal(true)
  }

  const handleShowVATOverview = () => {
    setShowVATOverview(true)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  return (
    <section className="main-grid" aria-label="Invoices content">
      {/* Metric Cards Section */}
      <article className="glass-card" style={{ gridColumn: 'span 12', gridRow: 'span 1' }}>
        <div className="card-header">
          <div className="flex gap-3 ml-auto">
            <button
              type="button"
              className="action-chip"
              onClick={handleOpenComprehensiveWizard}
            >
              <Plus className="h-4 w-4 mr-2" />
              Start Factuur Wizard
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '1.5rem' }}>
          {/* Card 1: Billable */}
          <div style={{ gridColumn: 'span 4' }}>
            <GlassmorphicMetricCard
              icon={Euro}
              iconColor="rgba(59, 130, 246, 0.7)"
              title="Factureerbaar"
              value={metricsLoading ? '...' : formatCurrency(metrics?.factureerbaar || 0)}
              subtitle="Klaar voor facturering"
              badge={{
                label: 'Ready',
                color: 'rgba(59, 130, 246, 0.25)',
              }}
              gradient="linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(37, 99, 235, 0.08))"
            />
          </div>

          {/* Card 2: Total Registration */}
          <div style={{ gridColumn: 'span 4' }}>
            <GlassmorphicMetricCard
              icon={Clock}
              iconColor="rgba(16, 185, 129, 0.7)"
              title="Total Unbilled"
              value={metricsLoading ? '...' : formatCurrency(metrics?.totale_registratie || 0)}
              subtitle="Alle onfactureerd tijd"
              badge={{
                label: 'Pending',
                color: 'rgba(16, 185, 129, 0.25)',
              }}
              gradient="linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(5, 150, 105, 0.08))"
            />
          </div>

          {/* Card 3: Overdue */}
          <div style={{ gridColumn: 'span 4' }}>
            <GlassmorphicMetricCard
              icon={AlertTriangle}
              iconColor="rgba(251, 146, 60, 0.7)"
              title="Achterstallig"
              value={metricsLoading ? '...' : formatCurrency(metrics?.achterstallig || 0)}
              subtitle={metricsLoading ? '...' : `${metrics?.achterstallig_count || 0} facturen over vervaldatum`}
              badge={{
                label: metrics?.achterstallig > 0 ? 'Actie!' : 'OK',
                color: metrics?.achterstallig > 0 ? 'rgba(251, 146, 60, 0.35)' : 'rgba(251, 146, 60, 0.25)',
              }}
              gradient="linear-gradient(135deg, rgba(251, 146, 60, 0.12), rgba(249, 115, 22, 0.08))"
            />
          </div>
        </div>
      </article>

      {/* Action Cards Row */}
      <article className="glass-card" style={{ gridColumn: 'span 4', gridRow: 'span 1' }} aria-labelledby="templates-title">
        <div className="card-header">
          <h2 className="card-header__title" id="templates-title">
            Templates
          </h2>
        </div>
        <CardContent className="pt-6">
          <button
            type="button"
            className="w-full flex items-center p-4 rounded-lg hover:bg-white/5 transition-colors cursor-pointer text-left"
            onClick={handleShowTemplates}
          >
            <FileText className="h-6 w-6 mr-3" style={{ color: 'rgba(59, 130, 246, 0.7)' }} />
            <div>
              <h3 className="font-semibold text-slate-100">Beheer Templates</h3>
              <p className="text-sm text-slate-400">Factuur templates aanpassen</p>
            </div>
          </button>
        </CardContent>
      </article>

      <article className="glass-card" style={{ gridColumn: 'span 4', gridRow: 'span 1' }} aria-labelledby="reminders-title">
        <div className="card-header">
          <h2 className="card-header__title" id="reminders-title">
            Herinneringen
          </h2>
        </div>
        <CardContent className="pt-6">
          <button
            type="button"
            className="w-full flex items-center p-4 rounded-lg hover:bg-white/5 transition-colors cursor-pointer text-left"
            onClick={handleShowReminders}
          >
            <Send className="h-6 w-6 mr-3" style={{ color: 'rgba(251, 146, 60, 0.7)' }} />
            <div>
              <h3 className="font-semibold text-slate-100">Betalingsherinneringen</h3>
              <p className="text-sm text-slate-400">Verstuur herinneringen</p>
            </div>
          </button>
        </CardContent>
      </article>

      <article className="glass-card" style={{ gridColumn: 'span 4', gridRow: 'span 1' }} aria-labelledby="vat-title">
        <div className="card-header">
          <h2 className="card-header__title" id="vat-title">
            BTW Overzicht
          </h2>
        </div>
        <CardContent className="pt-6">
          <button
            type="button"
            className="w-full flex items-center p-4 rounded-lg hover:bg-white/5 transition-colors cursor-pointer text-left"
            onClick={handleShowVATOverview}
          >
            <Receipt className="h-6 w-6 mr-3" style={{ color: 'rgba(16, 185, 129, 0.7)' }} />
            <div>
              <h3 className="font-semibold text-slate-100">BTW Gegevens</h3>
              <p className="text-sm text-slate-400">Bekijk BTW aangifte</p>
            </div>
          </button>
        </CardContent>
      </article>

      {/* Complete Invoice List */}
      <article className="glass-card" style={{ gridColumn: 'span 12', gridRow: 'span 1' }} aria-labelledby="all-invoices-title">
        <div className="card-header">
          <h2 className="card-header__title flex items-center" id="all-invoices-title">
            <FileText className="h-5 w-5 mr-2" />
            All Invoices
          </h2>
          <p className="card-header__subtitle">
            Beheer je facturen en houd je financiële overzicht bij
          </p>
        </div>
        <CardContent className="pt-6">
          <InvoiceList
            onEditInvoice={handleEditInvoice}
            onViewInvoice={handleViewInvoice}
          />
        </CardContent>
      </article>

      {/* Comprehensive Invoicing Wizard */}
      <ComprehensiveInvoicingWizard
        isOpen={showComprehensiveWizard}
        onClose={() => setShowComprehensiveWizard(false)}
        onSuccess={handleComprehensiveWizardSuccess}
      />

      {/* Manual Invoice Creation Modal */}
      {showManualInvoiceForm && (
        <Dialog open={showManualInvoiceForm} onOpenChange={setShowManualInvoiceForm}>
          <DialogContent
            className={cn(
              'max-w-4xl max-h-[90vh] overflow-y-auto',
              'bg-gradient-to-br from-slate-950/95 via-slate-900/90 to-slate-950/95',
              'border border-white/10 backdrop-blur-2xl',
              'shadow-[0_40px_120px_rgba(15,23,42,0.45)] text-slate-100'
            )}
          >
            <DialogHeader>
              <DialogTitle>Nieuwe Handmatige Factuur</DialogTitle>
            </DialogHeader>
            <InvoiceForm
              onSuccess={handleInvoiceCreated}
              onCancel={() => setShowManualInvoiceForm(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Client Invoice Wizard Modal */}
      <ClientInvoiceWizard
        client={selectedClientForInvoicing}
        isOpen={showClientInvoiceWizard}
        onClose={handleCloseClientInvoiceWizard}
        onSuccess={handleClientInvoiceSuccess}
      />

      {/* Edit Invoice Modal */}
      {editingInvoice && (
        <Dialog open={!!editingInvoice} onOpenChange={() => setEditingInvoice(null)}>
          <DialogContent
            className={cn(
              'max-w-4xl max-h-[90vh] overflow-y-auto',
              'bg-gradient-to-br from-slate-950/95 via-slate-900/90 to-slate-950/95',
              'border border-white/10 backdrop-blur-2xl',
              'shadow-[0_40px_120px_rgba(15,23,42,0.45)] text-slate-100'
            )}
          >
            <DialogHeader>
              <DialogTitle>Factuur Bewerken</DialogTitle>
            </DialogHeader>
            <InvoiceForm
              invoice={editingInvoice}
              onSuccess={handleInvoiceUpdated}
              onCancel={() => setEditingInvoice(null)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Invoice Detail Modal */}
      <InvoiceDetailModal
        invoice={viewingInvoice}
        isOpen={!!viewingInvoice}
        onClose={() => setViewingInvoice(null)}
        onEdit={(invoice) => {
          setViewingInvoice(null)
          setEditingInvoice(invoice)
        }}
        onStatusUpdate={handleInvoiceStatusUpdate}
      />

      {/* Action Modals */}
      {showRemindersModal && (
        <Dialog open={showRemindersModal} onOpenChange={setShowRemindersModal}>
          <DialogContent
            className={cn(
              'max-w-2xl',
              'bg-gradient-to-br from-slate-950/95 via-slate-900/90 to-slate-950/95',
              'border border-white/10 backdrop-blur-2xl',
              'shadow-[0_40px_120px_rgba(15,23,42,0.45)] text-slate-100'
            )}
          >
            <DialogHeader>
              <DialogTitle>Betalingsherinneringen</DialogTitle>
            </DialogHeader>
            <div className="p-8 text-center text-slate-400">
              <Send className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Herinneringen functionaliteit komt binnenkort beschikbaar.</p>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {showVATOverview && (
        <Dialog open={showVATOverview} onOpenChange={setShowVATOverview}>
          <DialogContent
            className={cn(
              'max-w-4xl',
              'bg-gradient-to-br from-slate-950/95 via-slate-900/90 to-slate-950/95',
              'border border-white/10 backdrop-blur-2xl',
              'shadow-[0_40px_120px_rgba(15,23,42,0.45)] text-slate-100'
            )}
          >
            <DialogHeader>
              <DialogTitle>BTW Overzicht</DialogTitle>
            </DialogHeader>
            <div className="p-8 text-center text-slate-400">
              <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>BTW overzicht en aangifte functionaliteit komt binnenkort beschikbaar.</p>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </section>
  )
}

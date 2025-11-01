'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { InvoiceList } from '@/components/financial/invoices/invoice-list'
import { InvoiceForm } from '@/components/financial/invoices/invoice-form'
import { InvoiceDetailModal } from '@/components/financial/invoices/invoice-detail-modal'
import { ClientInvoiceWizard } from '@/components/financial/invoices/client-invoice-wizard'
import { DashboardMetrics } from '@/components/financial/invoices/dashboard-metrics'
import { ComprehensiveInvoicingWizard } from '@/components/financial/invoices/comprehensive-invoicing-wizard'
import { FileText, Plus, ArrowLeft, Euro, Clock, Send, Receipt } from 'lucide-react'
import Link from 'next/link'
import type { ClientInvoicingSummary } from '@/lib/types/financial'

interface InvoicesContentProps {
  showHeader?: boolean
  className?: string
}

export function InvoicesContent({ showHeader = true, className = '' }: InvoicesContentProps) {
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

  // Handle action query parameter to open comprehensive wizard
  useEffect(() => {
    const action = searchParams.get('action')
    const unbilledAmount = searchParams.get('unbilled_amount')

    if (action === 'create') {
      setShowComprehensiveWizard(true)
      // Clean up URL without refreshing
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [searchParams])

  const handleInvoiceCreated = (invoice: any) => {
    setShowManualInvoiceForm(false)
    // Refresh the invoice list
    window.location.reload()
  }

  const handleInvoiceUpdated = (invoice: any) => {
    setEditingInvoice(null)
    // Refresh the invoice list
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

      // Close the modal and refresh data
      setViewingInvoice(null)
      window.location.reload()
    } catch (err) {
      toast.error('Failed to update status', {
        description: err instanceof Error ? err.message : 'An error occurred'
      })
      throw err
    }
  }

  // Comprehensive wizard handlers
  const handleOpenComprehensiveWizard = () => {
    setShowComprehensiveWizard(true)
  }

  const handleComprehensiveWizardSuccess = (invoices: any[]) => {
    setShowComprehensiveWizard(false)
    // Show success message and refresh the page
    console.log('Generated invoices:', invoices)
    window.location.reload()
  }

  const handleCreateInvoiceFromClient = (client: ClientInvoicingSummary) => {
    setSelectedClientForInvoicing(client)
    setShowClientInvoiceWizard(true)
  }

  const handleClientInvoiceSuccess = (invoice: any) => {
    setShowClientInvoiceWizard(false)
    setSelectedClientForInvoicing(null)
    // Optionally show the created invoice
    setViewingInvoice(invoice)
  }

  const handleCloseClientInvoiceWizard = () => {
    setShowClientInvoiceWizard(false)
    setSelectedClientForInvoicing(null)
  }

  // Action handlers
  const handleShowTemplates = () => {
    // Navigate to template settings page instead of showing modal
    window.location.href = '/dashboard/financieel/facturen/template'
  }

  const handleShowReminders = () => {
    setShowRemindersModal(true)
  }

  const handleShowVATOverview = () => {
    setShowVATOverview(true)
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
              <h1 className="text-3xl font-bold tracking-tight">Facturen</h1>
              <p className="text-muted-foreground mt-1">
                Beheer je facturen en houd je financiële overzicht bij
              </p>
            </div>
          </div>
          <Button
            onClick={handleOpenComprehensiveWizard}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Start Factuur Wizard
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Facturen</h3>
            <p className="text-muted-foreground text-sm">
              Beheer je facturen en houd je financiële overzicht bij
            </p>
          </div>
          <Button
            onClick={handleOpenComprehensiveWizard}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Start Factuur Wizard
          </Button>
        </div>
      )}

      {/* Dashboard Metrics - Top Row */}
      <DashboardMetrics />

      {/* Action Cards - Middle Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card
          className="hover:bg-accent/50 transition-colors cursor-pointer"
          onClick={handleShowTemplates}
        >
          <CardContent className="flex items-center p-4">
            <FileText className="h-6 w-6 text-blue-600 mr-3" />
            <div>
              <h3 className="font-semibold">Templates</h3>
              <p className="text-sm text-muted-foreground">Beheer factuur templates</p>
            </div>
          </CardContent>
        </Card>

        <Card
          className="hover:bg-accent/50 transition-colors cursor-pointer"
          onClick={handleShowReminders}
        >
          <CardContent className="flex items-center p-4">
            <Send className="h-6 w-6 text-orange-600 mr-3" />
            <div>
              <h3 className="font-semibold">Herinneringen</h3>
              <p className="text-sm text-muted-foreground">Verstuur betalingsherinneringen</p>
            </div>
          </CardContent>
        </Card>

        <Card
          className="hover:bg-accent/50 transition-colors cursor-pointer"
          onClick={handleShowVATOverview}
        >
          <CardContent className="flex items-center p-4">
            <Receipt className="h-6 w-6 text-green-600 mr-3" />
            <div>
              <h3 className="font-semibold">BTW Overzicht</h3>
              <p className="text-sm text-muted-foreground">Bekijk BTW gegevens en aangifte</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Complete Invoice List - Bottom Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Alle Facturen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <InvoiceList
            onEditInvoice={handleEditInvoice}
            onViewInvoice={handleViewInvoice}
          />
        </CardContent>
      </Card>

      {/* Comprehensive Invoicing Wizard */}
      <ComprehensiveInvoicingWizard
        isOpen={showComprehensiveWizard}
        onClose={() => setShowComprehensiveWizard(false)}
        onSuccess={handleComprehensiveWizardSuccess}
      />

      {/* Manual Invoice Creation Modal */}
      {showManualInvoiceForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Nieuwe Handmatige Factuur</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowManualInvoiceForm(false)}
                >
                  <Plus className="h-4 w-4 rotate-45" />
                </Button>
              </div>
              <InvoiceForm
                onSuccess={handleInvoiceCreated}
                onCancel={() => setShowManualInvoiceForm(false)}
              />
            </div>
          </div>
        </div>
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
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Factuur Bewerken</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingInvoice(null)}
                >
                  <Plus className="h-4 w-4 rotate-45" />
                </Button>
              </div>
              <InvoiceForm
                invoice={editingInvoice}
                onSuccess={handleInvoiceUpdated}
                onCancel={() => setEditingInvoice(null)}
              />
            </div>
          </div>
        </div>
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

      {/* Action Modals - Other modals */}

      {showRemindersModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Betalingsherinneringen</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRemindersModal(false)}
              >
                <Plus className="h-4 w-4 rotate-45" />
              </Button>
            </div>
            <div className="p-8 text-center text-muted-foreground">
              <Send className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Herinneringen functionaliteit komt binnenkort beschikbaar.</p>
            </div>
          </div>
        </div>
      )}

      {showVATOverview && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-4xl w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">BTW Overzicht</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowVATOverview(false)}
              >
                <Plus className="h-4 w-4 rotate-45" />
              </Button>
            </div>
            <div className="p-8 text-center text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>BTW overzicht en aangifte functionaliteit komt binnenkort beschikbaar.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
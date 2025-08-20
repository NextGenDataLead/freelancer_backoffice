'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { InvoiceList } from '@/components/financial/invoices/invoice-list'
import { InvoiceForm } from '@/components/financial/invoices/invoice-form'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { FileText, Plus, ArrowLeft, Euro, Clock, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

export default function InvoicesPage() {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<any>(null)

  const handleInvoiceCreated = (invoice: any) => {
    setShowCreateForm(false)
    // Refresh the list - this would normally trigger a refetch
    window.location.reload()
  }

  const handleInvoiceUpdated = (invoice: any) => {
    setEditingInvoice(null)
    // Refresh the list
    window.location.reload()
  }

  const handleEditInvoice = (invoice: any) => {
    setEditingInvoice(invoice)
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
            <h1 className="text-3xl font-bold tracking-tight">Facturenbeheer</h1>
            <p className="text-muted-foreground mt-1">
              Maak en beheer je facturen met automatische BTW berekening
            </p>
          </div>
        </div>
        
        <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nieuwe Factuur
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nieuwe Factuur Maken</DialogTitle>
            </DialogHeader>
            <InvoiceForm 
              onSuccess={handleInvoiceCreated}
              onCancel={() => setShowCreateForm(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deze Maand</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€12.450,00</div>
            <p className="text-xs text-muted-foreground">
              +15% t.o.v. vorige maand
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Openstaand</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€3.850,00</div>
            <p className="text-xs text-muted-foreground">
              5 facturen wachten op betaling
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Achterstallig</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€1.200,00</div>
            <p className="text-xs text-muted-foreground">
              2 facturen over de vervaldatum
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">BTW Geïnd</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€2.614,50</div>
            <p className="text-xs text-muted-foreground">
              21% BTW deze maand
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
          <CardContent className="flex items-center p-4">
            <FileText className="h-6 w-6 text-blue-600 mr-3" />
            <div>
              <h3 className="font-semibold">Concepten</h3>
              <p className="text-sm text-muted-foreground">3 concept facturen</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
          <CardContent className="flex items-center p-4">
            <Clock className="h-6 w-6 text-orange-600 mr-3" />
            <div>
              <h3 className="font-semibold">Herinneringen</h3>
              <p className="text-sm text-muted-foreground">Verstuur betalingsherinneringen</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
          <CardContent className="flex items-center p-4">
            <Euro className="h-6 w-6 text-green-600 mr-3" />
            <div>
              <h3 className="font-semibold">BTW Overzicht</h3>
              <p className="text-sm text-muted-foreground">Bekijk BTW gegevens</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice List */}
      <Card>
        <CardHeader>
          <CardTitle>Alle Facturen</CardTitle>
        </CardHeader>
        <CardContent>
          <InvoiceList onEditInvoice={handleEditInvoice} />
        </CardContent>
      </Card>

      {/* Edit Invoice Dialog */}
      <Dialog open={!!editingInvoice} onOpenChange={() => setEditingInvoice(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Factuur Bewerken</DialogTitle>
          </DialogHeader>
          {editingInvoice && (
            <InvoiceForm 
              invoice={editingInvoice}
              onSuccess={handleInvoiceUpdated}
              onCancel={() => setEditingInvoice(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
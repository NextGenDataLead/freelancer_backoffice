'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { RecurringExpenseForm } from './recurring-expense-form'
import { RecurringExpensesList } from './recurring-expenses-list'
import { PreviewModal } from './preview-modal'
import { formatEuropeanCurrency } from '@/lib/utils/formatEuropeanNumber'
import { Plus, ArrowLeft, Repeat, TrendingUp, Calendar, Euro } from 'lucide-react'
import Link from 'next/link'

interface RecurringExpensesContentProps {
  showHeader?: boolean
  className?: string
}

interface RecurringTemplate {
  id: string
  name: string
  amount: number
  frequency: string
  is_active: boolean
  next_occurrence: string
  annual_cost?: number
  category?: { name: string }
}

export function RecurringExpensesContent({ showHeader = true, className = '' }: RecurringExpensesContentProps) {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<any>(null)
  const [previewingTemplate, setPreviewingTemplate] = useState<any>(null)
  const [templates, setTemplates] = useState<RecurringTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalTemplates: 0,
    activeTemplates: 0,
    totalMonthlyAmount: 0,
    totalAnnualCost: 0
  })

  // Fetch templates
  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/recurring-expenses/templates')
      const data = await response.json()

      if (data.success) {
        setTemplates(data.data)

        // Calculate stats
        const active = data.data.filter((t: RecurringTemplate) => t.is_active)
        const totalAnnual = data.data.reduce((sum: number, t: RecurringTemplate) => sum + (t.annual_cost || 0), 0)

        setStats({
          totalTemplates: data.data.length,
          activeTemplates: active.length,
          totalMonthlyAmount: totalAnnual / 12,
          totalAnnualCost: totalAnnual
        })
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTemplates()
  }, [])

  const handleTemplateCreated = () => {
    setShowCreateForm(false)
    fetchTemplates()
  }

  const handleTemplateUpdated = () => {
    setEditingTemplate(null)
    fetchTemplates()
  }

  const handleEditTemplate = (template: any) => {
    setEditingTemplate(template)
  }

  const handlePreviewTemplate = (template: any) => {
    setPreviewingTemplate(template)
  }

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Weet je zeker dat je deze terugkerende uitgave wilt verwijderen?')) {
      return
    }

    try {
      const response = await fetch(`/api/recurring-expenses/templates/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchTemplates()
      }
    } catch (error) {
      console.error('Error deleting template:', error)
    }
  }

  const handleToggleActive = async (template: RecurringTemplate) => {
    try {
      const response = await fetch(`/api/recurring-expenses/templates/${template.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !template.is_active })
      })

      if (response.ok) {
        fetchTemplates()
      }
    } catch (error) {
      console.error('Error toggling template:', error)
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      {showHeader && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard/financieel-v2">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Terug naar Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Terugkerende Uitgaven</h1>
              <p className="text-muted-foreground mt-1">
                Beheer abonnementen, huur en andere vaste kosten voor nauwkeurige cashflow voorspellingen
              </p>
            </div>
          </div>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nieuwe Template
          </Button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totaal Templates</CardTitle>
            <Repeat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTemplates}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeTemplates} actief
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Maandelijks</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatEuropeanCurrency(stats.totalMonthlyAmount)}
            </div>
            <p className="text-xs text-muted-foreground">
              Gemiddelde vaste kosten
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Jaarlijks</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatEuropeanCurrency(stats.totalAnnualCost)}
            </div>
            <p className="text-xs text-muted-foreground">
              Totale jaarkosten
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cashflow Impact</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatEuropeanCurrency(stats.totalMonthlyAmount * 3)}
            </div>
            <p className="text-xs text-muted-foreground">
              Kwartaal voorspelling
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Templates List */}
      <RecurringExpensesList
        templates={templates}
        loading={loading}
        onEdit={handleEditTemplate}
        onDelete={handleDeleteTemplate}
        onToggleActive={handleToggleActive}
        onPreview={handlePreviewTemplate}
      />

      {/* Create Dialog */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nieuwe Terugkerende Uitgave</DialogTitle>
          </DialogHeader>
          <RecurringExpenseForm
            onSuccess={handleTemplateCreated}
            onCancel={() => setShowCreateForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingTemplate} onOpenChange={(open) => !open && setEditingTemplate(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Terugkerende Uitgave Bewerken</DialogTitle>
          </DialogHeader>
          <RecurringExpenseForm
            template={editingTemplate}
            onSuccess={handleTemplateUpdated}
            onCancel={() => setEditingTemplate(null)}
          />
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      {previewingTemplate && (
        <PreviewModal
          template={previewingTemplate}
          open={!!previewingTemplate}
          onClose={() => setPreviewingTemplate(null)}
        />
      )}
    </div>
  )
}

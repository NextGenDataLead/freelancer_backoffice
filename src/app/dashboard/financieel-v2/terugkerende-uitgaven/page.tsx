'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { ExpenseForm } from '@/components/financial/expenses/expense-form'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { RecurringExpensesList } from '@/components/financial/recurring-expenses/recurring-expenses-list'
import { RecurringExpenseForm } from '@/components/financial/recurring-expenses/recurring-expense-form'
import { PreviewModal } from '@/components/financial/recurring-expenses/preview-modal'
import { DeleteConfirmationDialog } from '@/components/financial/recurring-expenses/delete-confirmation-dialog'
import { formatEuropeanCurrency } from '@/lib/utils/formatEuropeanNumber'
import { Plus, Repeat, TrendingUp, Calendar, Euro, Receipt } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GlassmorphicMetricCard } from '@/components/dashboard/glassmorphic-metric-card'

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

export default function TerugkerendeUitgavenPage() {
  const router = useRouter()
  const pathname = usePathname()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<any>(null)
  const [previewingTemplate, setPreviewingTemplate] = useState<any>(null)
  const [deletingTemplate, setDeletingTemplate] = useState<RecurringTemplate | null>(null)
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

  const handleExpenseCreated = () => {
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

  const handleDeleteTemplate = (id: string) => {
    const template = templates.find(t => t.id === id)
    if (template) {
      setDeletingTemplate(template)
    }
  }

  const confirmDelete = async () => {
    if (!deletingTemplate) return

    try {
      const response = await fetch(`/api/recurring-expenses/templates/${deletingTemplate.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Template deleted successfully')
        fetchTemplates()
      } else {
        toast.error('Failed to delete template')
      }
    } catch (error) {
      console.error('Error deleting template:', error)
      toast.error('An error occurred while deleting the template')
    } finally {
      setDeletingTemplate(null)
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
        toast.success('Template updated successfully')
        fetchTemplates()
      } else {
        toast.error('Failed to update template')
      }
    } catch (error) {
      console.error('Error toggling template:', error)
      toast.error('An error occurred while updating the template')
    }
  }

  return (
    <section className="main-grid" aria-label="Recurring expenses content">
      {/* Tab Navigation */}
      <article className="glass-card" style={{ gridColumn: 'span 12', gridRow: 'span 1', padding: '0.75rem 1.5rem' }}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={cn(
                'relative px-4 py-2.5 text-sm font-medium transition-all duration-300 rounded-xl flex items-center gap-2',
                pathname === '/dashboard/financieel-v2/uitgaven'
                  ? 'text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              )}
              onClick={() => router.push('/dashboard/financieel-v2/uitgaven')}
            >
              {pathname === '/dashboard/financieel-v2/uitgaven' && (
                <span
                  className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 backdrop-blur-sm"
                  style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }}
                />
              )}
              <Receipt className="h-4 w-4 relative" />
              <span className="relative">All Expenses</span>
            </button>
            <button
              type="button"
              className={cn(
                'relative px-4 py-2.5 text-sm font-medium transition-all duration-300 rounded-xl flex items-center gap-2',
                pathname === '/dashboard/financieel-v2/terugkerende-uitgaven'
                  ? 'text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              )}
              onClick={() => router.push('/dashboard/financieel-v2/terugkerende-uitgaven')}
            >
              {pathname === '/dashboard/financieel-v2/terugkerende-uitgaven' && (
                <span
                  className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 backdrop-blur-sm"
                  style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }}
                />
              )}
              <Repeat className="h-4 w-4 relative" />
              <span className="relative">Recurring</span>
            </button>
          </div>

          <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
            <DialogTrigger asChild>
              <button
                type="button"
                className="action-chip"
                style={{ background: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.3)' }}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Template
              </button>
            </DialogTrigger>
            <DialogContent
              className={cn(
                'max-w-2xl max-h-[90vh] overflow-y-auto',
                'bg-gradient-to-br from-slate-950/95 via-slate-900/90 to-slate-950/95 border border-white/10 backdrop-blur-2xl shadow-[0_40px_120px_rgba(15,23,42,0.45)] text-slate-100'
              )}
            >
              <DialogHeader>
                <DialogTitle>New Recurring Expense</DialogTitle>
              </DialogHeader>
              <ExpenseForm
                onSuccess={handleExpenseCreated}
                onCancel={() => setShowCreateForm(false)}
                variant="glass"
                defaultRecurring={true}
              />
            </DialogContent>
          </Dialog>
        </div>
      </article>

      {/* Monthly Stats Cards */}
      <article className="glass-card" style={{ gridColumn: 'span 12', gridRow: 'span 1' }} aria-labelledby="recurring-title">
        <div className="card-header">
          <div>
            <h2 className="card-header__title" id="recurring-title">
              Recurring Expenses
            </h2>
            <p className="card-header__subtitle">
              Manage subscriptions, rent and other fixed costs for accurate cashflow forecasting
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '1.5rem' }}>
          {/* Card 1: Total Templates */}
          <div style={{ gridColumn: 'span 3' }}>
            <GlassmorphicMetricCard
              icon={Repeat}
              iconColor="rgba(139, 92, 246, 0.7)"
              title="Total Templates"
              value={loading ? '...' : stats.totalTemplates}
              subtitle={`${stats.activeTemplates} active`}
              badge={{
                label: 'Templates',
                color: 'rgba(139, 92, 246, 0.25)',
              }}
              gradient="linear-gradient(135deg, rgba(139, 92, 246, 0.12), rgba(124, 58, 237, 0.08))"
            />
          </div>

          {/* Card 2: Monthly */}
          <div style={{ gridColumn: 'span 3' }}>
            <GlassmorphicMetricCard
              icon={Calendar}
              iconColor="rgba(34, 211, 238, 0.7)"
              title="Monthly"
              value={loading ? '...' : formatEuropeanCurrency(stats.totalMonthlyAmount)}
              subtitle="Average fixed costs"
              badge={{
                label: 'MTD',
                color: 'rgba(34, 211, 238, 0.25)',
              }}
              gradient="linear-gradient(135deg, rgba(34, 211, 238, 0.12), rgba(6, 182, 212, 0.08))"
            />
          </div>

          {/* Card 3: Yearly */}
          <div style={{ gridColumn: 'span 3' }}>
            <GlassmorphicMetricCard
              icon={TrendingUp}
              iconColor="rgba(16, 185, 129, 0.7)"
              title="Yearly"
              value={loading ? '...' : formatEuropeanCurrency(stats.totalAnnualCost)}
              subtitle="Total annual costs"
              badge={{
                label: 'Annual',
                color: 'rgba(16, 185, 129, 0.25)',
              }}
              gradient="linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(5, 150, 105, 0.08))"
            />
          </div>

          {/* Card 4: Cashflow Impact */}
          <div style={{ gridColumn: 'span 3' }}>
            <GlassmorphicMetricCard
              icon={Euro}
              iconColor="rgba(251, 146, 60, 0.7)"
              title="Cashflow Impact"
              value={loading ? '...' : formatEuropeanCurrency(stats.totalMonthlyAmount * 3)}
              subtitle="Quarterly forecast"
              badge={{
                label: 'Q1',
                color: 'rgba(251, 146, 60, 0.25)',
              }}
              gradient="linear-gradient(135deg, rgba(251, 146, 60, 0.12), rgba(249, 115, 22, 0.08))"
            />
          </div>
        </div>
      </article>

      {/* Templates List */}
      <article className="glass-card" style={{ gridColumn: 'span 12', gridRow: 'span 1' }} aria-labelledby="templates-title">
        <div className="card-header">
          <h2 className="card-header__title" id="templates-title">
            Recurring Templates
          </h2>
          <p className="card-header__subtitle">
            Beheer je terugkerende uitgaven en automatische registraties
          </p>
        </div>
        <CardContent className="pt-6">
          <RecurringExpensesList
            templates={templates}
            loading={loading}
            onEdit={handleEditTemplate}
            onDelete={handleDeleteTemplate}
            onToggleActive={handleToggleActive}
            onPreview={handlePreviewTemplate}
          />
        </CardContent>
      </article>

      {/* Edit Dialog */}
      <Dialog
        open={!!editingTemplate}
        onOpenChange={(open) => {
          if (!open) {
            setEditingTemplate(null)
          }
        }}
      >
        <DialogContent className={cn(
          'max-w-2xl max-h-[90vh] overflow-y-auto',
          'bg-gradient-to-br from-slate-950/95 via-slate-900/90 to-slate-950/95 border border-white/10 backdrop-blur-2xl shadow-[0_40px_120px_rgba(15,23,42,0.45)] text-slate-100'
        )}>
          <DialogHeader>
            <DialogTitle>Edit Recurring Expense</DialogTitle>
          </DialogHeader>
          {editingTemplate && (
            <RecurringExpenseForm
              template={editingTemplate}
              onSuccess={handleTemplateUpdated}
              onCancel={() => setEditingTemplate(null)}
            />
          )}
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

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={!!deletingTemplate}
        onOpenChange={(open) => !open && setDeletingTemplate(null)}
        onConfirm={confirmDelete}
        title="Delete Template?"
        templateName={deletingTemplate?.name}
      />
    </section>
  )
}

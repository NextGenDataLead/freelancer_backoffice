'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { GlassmorphicMetricCard } from '@/components/dashboard/glassmorphic-metric-card'
import { useExpenseMetrics } from '@/hooks/use-expense-metrics'
import { formatEuropeanCurrency } from '@/lib/utils/formatEuropeanNumber'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ExpenseList } from '@/components/financial/expenses/expense-list'
import { ExpenseForm } from '@/components/financial/expenses/expense-form'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import {
  Euro,
  Plus,
  Receipt,
  TrendingDown,
  TrendingUp,
  FileText,
  BarChart3,
  ShoppingCart,
  Repeat
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function UitgavenPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState<any>(null)
  const { metrics, loading } = useExpenseMetrics()

  // Handle action query parameter
  useEffect(() => {
    const action = searchParams.get('action')
    if (action === 'add_expense' || action === 'create') {
      setShowCreateForm(true)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [searchParams])

  // Listen for custom event to open modal
  useEffect(() => {
    const handleOpenExpenseModal = () => {
      setShowCreateForm(true)
    }

    window.addEventListener('open-expense-modal', handleOpenExpenseModal)
    return () => window.removeEventListener('open-expense-modal', handleOpenExpenseModal)
  }, [])

  const handleExpenseCreated = () => {
    setShowCreateForm(false)
    window.location.reload()
  }

  const handleExpenseUpdated = () => {
    setEditingExpense(null)
    window.location.reload()
  }

  const handleEditExpense = (expense: any) => {
    setEditingExpense(expense)
  }

  // Calculate trend indicator
  const expenseTrend = metrics?.currentMonth.percentageChange || 0
  const isTrendPositive = expenseTrend < 0 // For expenses, lower is better

  return (
    <section className="main-grid" aria-label="Expenses content">
      {/* Tab Navigation */}
      <article className="glass-card" style={{ gridColumn: 'span 12', gridRow: 'span 1', padding: '0.75rem 1.5rem' }}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={cn(
                'relative px-4 py-2.5 text-sm font-medium transition-all duration-300 rounded-xl',
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
                New Expense
              </button>
            </DialogTrigger>
            <DialogContent
              className={cn(
                'max-w-2xl max-h-[90vh] overflow-y-auto',
                'bg-gradient-to-br from-slate-950/95 via-slate-900/90 to-slate-950/95 border border-white/10 backdrop-blur-2xl shadow-[0_40px_120px_rgba(15,23,42,0.45)] text-slate-100'
              )}
            >
              <DialogHeader>
                <DialogTitle>Add New Expense</DialogTitle>
              </DialogHeader>
              <ExpenseForm
                onSuccess={handleExpenseCreated}
                onCancel={() => setShowCreateForm(false)}
                variant="glass"
              />
            </DialogContent>
          </Dialog>
        </div>
      </article>

      {/* Monthly Stats Cards */}
      <article className="glass-card" style={{ gridColumn: 'span 12', gridRow: 'span 1' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '1.5rem' }}>
          {/* Card 1: This Month */}
          <div style={{ gridColumn: 'span 3' }}>
            <GlassmorphicMetricCard
              icon={TrendingDown}
              iconColor="rgba(239, 68, 68, 0.7)"
              title="This Month"
              value={loading ? '...' : formatEuropeanCurrency(metrics?.currentMonth.totalAmount || 0)}
              subtitle=""
              badge={{
                label: 'MTD',
                color: 'rgba(239, 68, 68, 0.25)',
              }}
              trendComparison={{
                icon: isTrendPositive ? TrendingDown : TrendingUp,
                value: `${expenseTrend >= 0 ? '+' : ''}${expenseTrend.toFixed(1)}%`,
                label: 'vs last month',
                isPositive: isTrendPositive,
                inline: true,
              }}
              gradient="linear-gradient(135deg, rgba(239, 68, 68, 0.12), rgba(220, 38, 38, 0.08))"
            />
          </div>

          {/* Card 2: VAT Paid */}
          <div style={{ gridColumn: 'span 3' }}>
            <GlassmorphicMetricCard
              icon={Euro}
              iconColor="rgba(34, 211, 238, 0.7)"
              title="VAT Paid"
              value={loading ? '...' : formatEuropeanCurrency(metrics?.vatPaid.deductibleAmount || 0)}
              subtitle="VAT deductible"
              badge={{
                label: 'Deductible',
                color: 'rgba(34, 211, 238, 0.25)',
              }}
              gradient="linear-gradient(135deg, rgba(34, 211, 238, 0.12), rgba(6, 182, 212, 0.08))"
            />
          </div>

          {/* Card 3: OCR Processed */}
          <div style={{ gridColumn: 'span 3' }}>
            <GlassmorphicMetricCard
              icon={Receipt}
              iconColor="rgba(139, 92, 246, 0.7)"
              title="OCR Processed"
              value={loading ? '...' : metrics?.ocrProcessed.ocrCount || 0}
              subtitle={`${metrics?.ocrProcessed.percentageAutomatic || 0}% automatically processed`}
              badge={{
                label: 'Automated',
                color: 'rgba(139, 92, 246, 0.25)',
              }}
              gradient="linear-gradient(135deg, rgba(139, 92, 246, 0.12), rgba(124, 58, 237, 0.08))"
            />
          </div>

          {/* Card 4: Categories */}
          <div style={{ gridColumn: 'span 3' }}>
            <GlassmorphicMetricCard
              icon={BarChart3}
              iconColor="rgba(251, 146, 60, 0.7)"
              title="Categories"
              value={loading ? '...' : metrics?.categories.uniqueCount || 0}
              subtitle="Different expense types"
              badge={{
                label: 'Active',
                color: 'rgba(251, 146, 60, 0.25)',
              }}
              gradient="linear-gradient(135deg, rgba(251, 146, 60, 0.12), rgba(249, 115, 22, 0.08))"
            />
          </div>
        </div>
      </article>

      {/* Expense List - Pivot Table */}
      <article className="glass-card" style={{ gridColumn: 'span 12', gridRow: 'span 1' }} aria-labelledby="all-expenses-title">
        <div className="card-header">
          <h2 className="card-header__title" id="all-expenses-title">
            All Expenses
          </h2>
          <p className="card-header__subtitle">
            Manage your business expenses and receipts
          </p>
        </div>
        <CardContent className="pt-6">
          <ExpenseList onEditExpense={handleEditExpense} />
        </CardContent>
      </article>

      {/* Edit Expense Dialog */}
      <Dialog open={!!editingExpense} onOpenChange={() => setEditingExpense(null)}>
        <DialogContent
          className={cn(
            'max-w-2xl max-h-[90vh] overflow-y-auto',
            'bg-gradient-to-br from-slate-950/95 via-slate-900/90 to-slate-950/95 border border-white/10 backdrop-blur-2xl shadow-[0_40px_120px_rgba(15,23,42,0.45)] text-slate-100'
          )}
        >
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
          </DialogHeader>
          {editingExpense && (
            <ExpenseForm
              expense={editingExpense}
              onSuccess={handleExpenseUpdated}
              onCancel={() => setEditingExpense(null)}
              variant="glass"
            />
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}

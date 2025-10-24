'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
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

  const getCategoryDisplayName = (category: string) => {
    const categories: Record<string, string> = {
      'kantoorbenodigdheden': 'Kantoorbenodigdheden',
      'reiskosten': 'Reiskosten',
      'maaltijden_zakelijk': 'Maaltijden & Zakelijk Entertainment',
      'marketing_reclame': 'Marketing & Reclame',
      'software_ict': 'Software & ICT',
      'afschrijvingen': 'Afschrijvingen Bedrijfsmiddelen',
      'verzekeringen': 'Verzekeringen',
      'professionele_diensten': 'Professionele Diensten',
      'werkruimte_kantoor': 'Werkruimte & Kantoorkosten',
      'voertuigkosten': 'Voertuigkosten',
      'telefoon_communicatie': 'Telefoon & Communicatie',
      'vakliteratuur': 'Vakliteratuur',
      'werkkleding': 'Werkkleding',
      'relatiegeschenken_representatie': 'Relatiegeschenken & Representatie',
      'overige_zakelijk': 'Overige Zakelijke Kosten'
    }
    return categories[category] || category
  }

  // Calculate trend indicator
  const expenseTrend = metrics?.currentMonth.percentageChange || 0
  const isTrendPositive = expenseTrend < 0 // For expenses, lower is better

  return (
    <section className="main-grid" aria-label="Expenses content">
      {/* Monthly Stats Cards */}
      <article className="glass-card" style={{ gridColumn: 'span 12', gridRow: 'span 1' }}>
        <div className="card-header">
          <div className="flex gap-3 ml-auto">
            <button
              type="button"
              className="action-chip"
              style={{ background: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.3)' }}
              onClick={() => router.push('/dashboard/financieel-v2/terugkerende-uitgaven')}
            >
              <Repeat className="h-4 w-4 mr-2" />
              Terugkerende Uitgaven
            </button>
            <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
              <DialogTrigger asChild>
                <button type="button" className="action-chip">
                  <Plus className="h-4 w-4 mr-2" />
                  Nieuwe Uitgave
                </button>
              </DialogTrigger>
              <DialogContent
                className={cn(
                  'max-w-2xl max-h-[90vh] overflow-y-auto',
                  'bg-gradient-to-br from-slate-950/95 via-slate-900/90 to-slate-950/95 border border-white/10 backdrop-blur-2xl shadow-[0_40px_120px_rgba(15,23,42,0.45)] text-slate-100'
                )}
              >
                <DialogHeader>
                  <DialogTitle>Nieuwe Uitgave Toevoegen</DialogTitle>
                </DialogHeader>
                <ExpenseForm
                  onSuccess={handleExpenseCreated}
                  onCancel={() => setShowCreateForm(false)}
                  variant="glass"
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

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
              subtitle="BTW aftrekbaar"
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

      {/* Category Insights - 3 Cards */}
      <article className="glass-card" style={{ gridColumn: 'span 4', gridRow: 'span 1' }} aria-labelledby="top-categories-title">
        <div className="card-header">
          <h2 className="card-header__title" id="top-categories-title">
            Top Categories
          </h2>
        </div>
        <CardContent className="pt-6">
          <div className="space-y-3">
            {loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="h-4 bg-muted animate-pulse rounded w-32"></div>
                    <div className="h-4 bg-muted animate-pulse rounded w-16"></div>
                  </div>
                ))}
              </div>
            ) : metrics?.categories.topCategories.length ? (
              metrics.categories.topCategories.slice(0, 4).map((category, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">{getCategoryDisplayName(category.category)}</span>
                  <span className="text-sm font-medium text-slate-100">{formatEuropeanCurrency(category.totalAmount)}</span>
                </div>
              ))
            ) : (
              <div className="text-sm text-slate-400">Geen uitgaven deze maand</div>
            )}
          </div>
        </CardContent>
      </article>

      <article className="glass-card" style={{ gridColumn: 'span 4', gridRow: 'span 1' }} aria-labelledby="ocr-status-title">
        <div className="card-header">
          <h2 className="card-header__title" id="ocr-status-title">
            OCR Status
          </h2>
        </div>
        <CardContent className="pt-6">
          <div className="space-y-3">
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="h-4 bg-muted animate-pulse rounded w-32"></div>
                    <div className="h-4 bg-muted animate-pulse rounded w-16"></div>
                  </div>
                ))}
              </div>
            ) : metrics?.ocrProcessed.totalCount ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-green-400">Automatisch verwerkt</span>
                  <span className="text-sm font-medium text-slate-100">{metrics.ocrProcessed.ocrCount} bonnetjes</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-red-400">Handmatig ingevoerd</span>
                  <span className="text-sm font-medium text-slate-100">{metrics.ocrProcessed.totalCount - metrics.ocrProcessed.ocrCount} bonnetjes</span>
                </div>
                <div className="flex items-center justify-between font-medium pt-2 border-t border-white/10">
                  <span className="text-sm text-slate-300">Totaal dit kwartaal</span>
                  <span className="text-sm text-slate-100">{metrics.ocrProcessed.totalCount} uitgaven</span>
                </div>
              </>
            ) : (
              <div className="text-sm text-slate-400">Geen uitgaven deze maand</div>
            )}
          </div>
        </CardContent>
      </article>

      <article className="glass-card" style={{ gridColumn: 'span 4', gridRow: 'span 1' }} aria-labelledby="vat-overview-title">
        <div className="card-header">
          <h2 className="card-header__title" id="vat-overview-title">
            BTW Overview
          </h2>
        </div>
        <CardContent className="pt-6">
          <div className="space-y-3">
            {loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="h-4 bg-muted animate-pulse rounded w-20"></div>
                    <div className="h-4 bg-muted animate-pulse rounded w-16"></div>
                  </div>
                ))}
              </div>
            ) : metrics?.vatPaid.breakdown.length ? (
              <>
                {metrics.vatPaid.breakdown.map((vat, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">{Math.round(vat.rate * 100)}% BTW</span>
                    <span className="text-sm font-medium text-slate-100">{formatEuropeanCurrency(vat.amount)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between font-medium pt-2 border-t border-white/10">
                  <span className="text-sm text-slate-300">Totaal aftrekbaar</span>
                  <span className="text-sm text-slate-100">{formatEuropeanCurrency(metrics.vatPaid.deductibleAmount)}</span>
                </div>
              </>
            ) : (
              <div className="text-sm text-slate-400">Geen BTW betaald deze maand</div>
            )}
          </div>
        </CardContent>
      </article>

      {/* Expense List */}
      <article className="glass-card" style={{ gridColumn: 'span 12', gridRow: 'span 1' }} aria-labelledby="all-expenses-title">
        <div className="card-header">
          <h2 className="card-header__title" id="all-expenses-title">
            All Expenses
          </h2>
          <p className="card-header__subtitle">
            Beheer je zakelijke uitgaven en bonnen
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
            <DialogTitle>Uitgave Bewerken</DialogTitle>
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

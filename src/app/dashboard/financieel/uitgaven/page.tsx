'use client'

import { useState } from 'react'
import { useExpenseMetrics } from '@/hooks/use-expense-metrics'
import { formatEuropeanCurrency } from '@/lib/utils/formatEuropeanNumber'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ExpenseList } from '@/components/financial/expenses/expense-list'
import { ExpenseForm } from '@/components/financial/expenses/expense-form'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Euro, Plus, ArrowLeft, Receipt, Camera, TrendingDown } from 'lucide-react'
import Link from 'next/link'

export default function ExpensesPage() {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState<any>(null)
  const { metrics, loading, error } = useExpenseMetrics()

  const handleExpenseCreated = (expense: any) => {
    setShowCreateForm(false)
    // Refresh the list - this would normally trigger a refetch
    window.location.reload()
  }

  const handleExpenseUpdated = (expense: any) => {
    setEditingExpense(null)
    // Refresh the list
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
            <h1 className="text-3xl font-bold tracking-tight">Uitgavenbeheer</h1>
            <p className="text-muted-foreground mt-1">
              Registreer uitgaven met OCR bonnetjesscan en automatische categorisering
            </p>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Camera className="h-4 w-4 mr-2" />
                Scan Bonnetje
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nieuwe Uitgave - OCR Scan</DialogTitle>
              </DialogHeader>
              <ExpenseForm 
                onSuccess={handleExpenseCreated}
                onCancel={() => setShowCreateForm(false)}
                enableOCR={true}
              />
            </DialogContent>
          </Dialog>
          
          <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nieuwe Uitgave
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nieuwe Uitgave Toevoegen</DialogTitle>
              </DialogHeader>
              <ExpenseForm 
                onSuccess={handleExpenseCreated}
                onCancel={() => setShowCreateForm(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deze Maand</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : formatEuropeanCurrency(metrics?.currentMonth.totalAmount || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {loading ? '...' : 
                metrics?.currentMonth.percentageChange && metrics.currentMonth.percentageChange > 0 
                  ? `+${metrics.currentMonth.percentageChange}% t.o.v. vorige maand`
                  : metrics?.currentMonth.percentageChange && metrics.currentMonth.percentageChange < 0
                  ? `${metrics.currentMonth.percentageChange}% t.o.v. vorige maand`
                  : 'Geen wijziging t.o.v. vorige maand'
              }
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">BTW Betaald</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : formatEuropeanCurrency(metrics?.vatPaid.deductibleAmount || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              BTW aftrekbaar
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Met OCR</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : metrics?.ocrProcessed.ocrCount || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {loading ? '...' : `${metrics?.ocrProcessed.percentageAutomatic || 0}% automatisch verwerkt`}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categorieën</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : metrics?.categories.uniqueCount || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Verschillende uitgaventypes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Category Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Categorieën</CardTitle>
          </CardHeader>
          <CardContent>
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
                    <span className="text-sm">{getCategoryDisplayName(category.category)}</span>
                    <span className="text-sm font-medium">{formatEuropeanCurrency(category.totalAmount)}</span>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">Geen uitgaven deze maand</div>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">OCR Status</CardTitle>
          </CardHeader>
          <CardContent>
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
                    <span className="text-sm text-green-600">Automatisch verwerkt</span>
                    <span className="text-sm font-medium">{metrics.ocrProcessed.ocrCount} bonnetjes</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-red-600">Handmatig ingevoerd</span>
                    <span className="text-sm font-medium">{metrics.ocrProcessed.totalCount - metrics.ocrProcessed.ocrCount} bonnetjes</span>
                  </div>
                  <div className="flex items-center justify-between font-medium pt-2 border-t">
                    <span className="text-sm">Totaal dit kwartaal</span>
                    <span className="text-sm">{metrics.ocrProcessed.totalCount} uitgaven</span>
                  </div>
                </>
              ) : (
                <div className="text-sm text-muted-foreground">Geen uitgaven deze maand</div>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">BTW Overzicht</CardTitle>
          </CardHeader>
          <CardContent>
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
                      <span className="text-sm">{Math.round(vat.rate * 100)}% BTW</span>
                      <span className="text-sm font-medium">{formatEuropeanCurrency(vat.amount)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between font-medium pt-2 border-t">
                    <span className="text-sm">Totaal aftrekbaar</span>
                    <span className="text-sm">{formatEuropeanCurrency(metrics.vatPaid.deductibleAmount)}</span>
                  </div>
                </>
              ) : (
                <div className="text-sm text-muted-foreground">Geen BTW betaald deze maand</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expense List */}
      <Card>
        <CardHeader>
          <CardTitle>Alle Uitgaven</CardTitle>
        </CardHeader>
        <CardContent>
          <ExpenseList onEditExpense={handleEditExpense} />
        </CardContent>
      </Card>

      {/* Edit Expense Dialog */}
      <Dialog open={!!editingExpense} onOpenChange={() => setEditingExpense(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Uitgave Bewerken</DialogTitle>
          </DialogHeader>
          {editingExpense && (
            <ExpenseForm 
              expense={editingExpense}
              onSuccess={handleExpenseUpdated}
              onCancel={() => setEditingExpense(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
'use client'

import { useState } from 'react'
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
            <div className="text-2xl font-bold">€2.450,00</div>
            <p className="text-xs text-muted-foreground">
              +8% t.o.v. vorige maand
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">BTW Betaald</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€514,50</div>
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
            <div className="text-2xl font-bold">18</div>
            <p className="text-xs text-muted-foreground">
              75% automatisch verwerkt
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categorieën</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
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
              <div className="flex items-center justify-between">
                <span className="text-sm">Kantoorbenodigdheden</span>
                <span className="text-sm font-medium">€650,00</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Software & Abonnementen</span>
                <span className="text-sm font-medium">€480,00</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Reis & Verblijf</span>
                <span className="text-sm font-medium">€320,00</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Marketing</span>
                <span className="text-sm font-medium">€280,00</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">OCR Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-green-600">Hoge betrouwbaarheid</span>
                <span className="text-sm font-medium">15 bonnetjes</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-yellow-600">Gemiddelde betrouwbaarheid</span>
                <span className="text-sm font-medium">3 bonnetjes</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-red-600">Handmatig invoeren</span>
                <span className="text-sm font-medium">6 bonnetjes</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">BTW Overzicht</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">21% BTW</span>
                <span className="text-sm font-medium">€445,50</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">9% BTW</span>
                <span className="text-sm font-medium">€69,00</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">0% BTW</span>
                <span className="text-sm font-medium">€0,00</span>
              </div>
              <div className="flex items-center justify-between font-medium">
                <span className="text-sm">Totaal aftrekbaar</span>
                <span className="text-sm">€514,50</span>
              </div>
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
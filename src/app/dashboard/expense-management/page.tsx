'use client'

import { useState } from 'react'
import { Plus, Receipt, CreditCard, Settings, TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ExpenseList } from '@/components/expense-management/expense-list'
import { ExpenseForm } from '@/components/expense-management/expense-form'
import { SeedDataButton } from '@/components/expense-management/seed-data-button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useExpenseDashboard } from '@/hooks/use-expense-dashboard'

interface DashboardStatsProps {
  stats: {
    pending_approval_count: number
    pending_approval_amount: number
    approved_this_month: number
    approved_this_month_amount: number
    reimbursements_pending: number
    reimbursements_pending_amount: number
    top_categories: Array<{
      name: string
      amount: number
      count: number
    }>
    monthly_trend: Array<{
      month: string
      amount: number
      count: number
    }>
  }
}

function DashboardStats({ stats }: DashboardStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.pending_approval_count}</div>
          <p className="text-xs text-muted-foreground">
            €{stats.pending_approval_amount.toFixed(2)} total value
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Approved This Month</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.approved_this_month}</div>
          <p className="text-xs text-muted-foreground">
            €{stats.approved_this_month_amount.toFixed(2)} total value
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Reimbursement</CardTitle>
          <AlertCircle className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.reimbursements_pending}</div>
          <p className="text-xs text-muted-foreground">
            €{stats.reimbursements_pending_amount.toFixed(2)} to be paid
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Top Category</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats.top_categories[0]?.name || 'No data'}
          </div>
          <p className="text-xs text-muted-foreground">
            {stats.top_categories[0] ? `€${stats.top_categories[0].amount.toFixed(2)} spent` : 'No expenses yet'}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

interface TopCategoriesProps {
  categories: Array<{
    name: string
    amount: number
    count: number
  }>
}

function TopCategories({ categories }: TopCategoriesProps) {
  if (!categories.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Categories</CardTitle>
          <CardDescription>Last 3 months spending by category</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No expense data available</p>
        </CardContent>
      </Card>
    )
  }

  const maxAmount = Math.max(...categories.map(c => c.amount))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Categories</CardTitle>
        <CardDescription>Last 3 months spending by category</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {categories.map((category, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-sm font-medium">{category.name}</span>
              <span className="text-xs text-muted-foreground">
                {category.count} expense{category.count !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-20 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full"
                  style={{ width: `${(category.amount / maxAmount) * 100}%` }}
                />
              </div>
              <span className="text-sm font-medium min-w-0">
                €{category.amount.toFixed(2)}
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

interface MonthlyTrendProps {
  trend: Array<{
    month: string
    amount: number
    count: number
  }>
}

function MonthlyTrend({ trend }: MonthlyTrendProps) {
  if (!trend.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Monthly Trend</CardTitle>
          <CardDescription>Expense spending over the last 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No expense data available</p>
        </CardContent>
      </Card>
    )
  }

  const maxAmount = Math.max(...trend.map(t => t.amount))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Trend</CardTitle>
        <CardDescription>Expense spending over the last 6 months</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {trend.map((month, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-medium">{month.month}</span>
                <span className="text-xs text-muted-foreground">
                  {month.count} expense{month.count !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full"
                    style={{ width: maxAmount > 0 ? `${(month.amount / maxAmount) * 100}%` : '0%' }}
                  />
                </div>
                <span className="text-sm font-medium min-w-0">
                  €{month.amount.toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default function ExpenseManagementPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const { stats, loading, error, refetch } = useExpenseDashboard()

  const handleExpenseCreated = () => {
    setShowCreateDialog(false)
    setRefreshTrigger(prev => prev + 1)
    refetch()
  }

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1)
    refetch()
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Expense Management</h1>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="space-y-0 pb-2">
                <div className="h-4 bg-gray-200 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-6 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="h-5 bg-gray-200 rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-4 bg-gray-200 rounded animate-pulse" />
                ))}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <div className="h-5 bg-gray-200 rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-4 bg-gray-200 rounded animate-pulse" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Expense Management</h1>
        </div>
        
        <SeedDataButton />
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <p className="text-sm text-muted-foreground">
                Failed to load dashboard data. {error}
              </p>
              <Button variant="outline" size="sm" onClick={refetch}>
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Expense Management</h1>
          <p className="text-muted-foreground">
            Manage your business expenses, receipts, and approvals
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <CreditCard className="h-4 w-4 mr-2" />
            Import Cards
          </Button>
          
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Expense
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Expense</DialogTitle>
              </DialogHeader>
              <ExpenseForm 
                onSuccess={handleExpenseCreated}
                onCancel={() => setShowCreateDialog(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {stats && stats.pending_approval_count === 0 && stats.approved_this_month === 0 && (
        <SeedDataButton />
      )}

      {stats && <DashboardStats stats={stats} />}

      <div className="grid gap-6 md:grid-cols-2">
        {stats && <TopCategories categories={stats.top_categories} />}
        {stats && <MonthlyTrend trend={stats.monthly_trend} />}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Expenses</CardTitle>
              <CardDescription>
                View and manage your expense submissions
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs defaultValue="all" className="w-full">
            <div className="px-6 pt-0 pb-4">
              <TabsList>
                <TabsTrigger value="all">All Expenses</TabsTrigger>
                <TabsTrigger value="pending">
                  Pending
                  {stats && stats.pending_approval_count > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {stats.pending_approval_count}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="approved">Approved</TabsTrigger>
                <TabsTrigger value="rejected">Rejected</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="all" className="mt-0">
              <ExpenseList key={refreshTrigger} />
            </TabsContent>
            
            <TabsContent value="pending" className="mt-0">
              <ExpenseList key={`pending-${refreshTrigger}`} statusFilter="submitted,under_review" />
            </TabsContent>
            
            <TabsContent value="approved" className="mt-0">
              <ExpenseList key={`approved-${refreshTrigger}`} statusFilter="approved" />
            </TabsContent>
            
            <TabsContent value="rejected" className="mt-0">
              <ExpenseList key={`rejected-${refreshTrigger}`} statusFilter="rejected" />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
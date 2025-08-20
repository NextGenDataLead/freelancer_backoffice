'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, TrendingUp, TrendingDown, DollarSign, Users, FileText, Clock } from 'lucide-react'

interface DashboardStatsProps {
  className?: string
}

interface StatsData {
  totalRevenue: number
  totalExpenses: number
  netProfit: number
  outstandingInvoices: number
  clientCount: number
  draftInvoices: number
  unbilledHours: number
  vatToPay: number
  loading: boolean
}

export function DashboardStats({ className }: DashboardStatsProps) {
  const [stats, setStats] = useState<StatsData>({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    outstandingInvoices: 0,
    clientCount: 0,
    draftInvoices: 0,
    unbilledHours: 0,
    vatToPay: 0,
    loading: true
  })

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        // Get current month dates
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString()

        // Parallel fetch for all dashboard data
        const [profitLossRes, invoicesRes, clientsRes, timeEntriesRes] = await Promise.all([
          fetch(`/api/reports/profit-loss?date_from=${startOfMonth}&date_to=${endOfMonth}`),
          fetch('/api/invoices?limit=1000'),
          fetch('/api/clients?limit=1000'),
          fetch(`/api/time-entries?date_from=${startOfMonth}&date_to=${endOfMonth}&billable=true&invoiced=false&limit=1000`)
        ])

        const profitLoss = await profitLossRes.json()
        const invoices = await invoicesRes.json()
        const clients = await clientsRes.json()
        const timeEntries = await timeEntriesRes.json()

        // Calculate outstanding invoices
        const outstandingAmount = invoices.data?.reduce((sum: number, invoice: any) => {
          return invoice.status === 'sent' || invoice.status === 'overdue' 
            ? sum + parseFloat(invoice.total_amount) 
            : sum
        }, 0) || 0

        // Calculate draft invoices
        const draftCount = invoices.data?.filter((invoice: any) => invoice.status === 'draft').length || 0

        // Calculate unbilled hours
        const totalHours = timeEntries.data?.reduce((sum: number, entry: any) => {
          return sum + parseFloat(entry.hours)
        }, 0) || 0

        setStats({
          totalRevenue: profitLoss.data?.revenue?.total_invoiced || 0,
          totalExpenses: profitLoss.data?.expenses?.total_expenses || 0,
          netProfit: profitLoss.data?.profit_summary?.net_profit || 0,
          outstandingInvoices: outstandingAmount,
          clientCount: clients.pagination?.total || 0,
          draftInvoices: draftCount,
          unbilledHours: totalHours,
          vatToPay: profitLoss.data?.vat_summary?.net_vat_position || 0,
          loading: false
        })
      } catch (error) {
        console.error('Error fetching dashboard stats:', error)
        setStats(prev => ({ ...prev, loading: false }))
      }
    }

    fetchDashboardStats()
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const formatHours = (hours: number) => {
    return `${hours.toFixed(1)}h`
  }

  if (stats.loading) {
    return (
      <div className={`grid gap-4 md:grid-cols-2 lg:grid-cols-4 ${className}`}>
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                <div className="h-4 bg-muted animate-pulse rounded w-24"></div>
              </CardTitle>
              <div className="h-4 w-4 bg-muted animate-pulse rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted animate-pulse rounded w-20 mb-1"></div>
              <div className="h-3 bg-muted animate-pulse rounded w-32"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const statCards = [
    {
      title: "Omzet deze maand",
      value: formatCurrency(stats.totalRevenue),
      icon: DollarSign,
      change: "+12.5% vs vorige maand",
      positive: true
    },
    {
      title: "Uitgaven deze maand", 
      value: formatCurrency(stats.totalExpenses),
      icon: TrendingDown,
      change: "+2.3% vs vorige maand",
      positive: false
    },
    {
      title: "Netto winst",
      value: formatCurrency(stats.netProfit),
      icon: stats.netProfit >= 0 ? TrendingUp : TrendingDown,
      change: stats.netProfit >= 0 ? "Positief resultaat" : "Verlies",
      positive: stats.netProfit >= 0
    },
    {
      title: "Openstaande facturen",
      value: formatCurrency(stats.outstandingInvoices),
      icon: FileText,
      change: `${stats.draftInvoices} concepten`,
      positive: null
    },
    {
      title: "Actieve klanten",
      value: stats.clientCount.toString(),
      icon: Users,
      change: "Totaal aantal klanten",
      positive: null
    },
    {
      title: "Uren niet gefactureerd",
      value: formatHours(stats.unbilledHours),
      icon: Clock,
      change: "Te factureren uren",
      positive: null
    },
    {
      title: "BTW te betalen",
      value: formatCurrency(stats.vatToPay),
      icon: stats.vatToPay >= 0 ? TrendingDown : TrendingUp,
      change: stats.vatToPay >= 0 ? "Te betalen" : "Te ontvangen",
      positive: stats.vatToPay <= 0
    },
    {
      title: "Concept facturen",
      value: stats.draftInvoices.toString(),
      icon: FileText,
      change: "Nog te verzenden",
      positive: null
    }
  ]

  return (
    <div className={`grid gap-4 md:grid-cols-2 lg:grid-cols-4 ${className}`}>
      {statCards.map((stat, index) => {
        const Icon = stat.icon
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className={`text-xs ${
                stat.positive === true 
                  ? 'text-green-600 dark:text-green-400' 
                  : stat.positive === false
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-muted-foreground'
              }`}>
                {stat.change}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { TijdContent } from '@/components/financial/time/tijd-content'
import { ClientsContent } from '@/components/financial/clients/clients-content'
import { InvoicesContent } from '@/components/financial/invoices/invoices-content'
import { ExpensesContent } from '@/components/financial/expenses/expenses-content'
import { TaxContent } from '@/components/financial/tax/tax-content'
import { FinancialOverview } from '@/components/dashboard/financial-overview'
import { ActiveTimerWidget } from '@/components/dashboard/active-timer-widget'
import { ClientHealthDashboard } from '@/components/dashboard/client-health-dashboard'
import { CashFlowForecast } from '@/components/dashboard/cash-flow-forecast'
import {
  Clock,
  Users,
  Receipt,
  FileText,
  Calculator,
  LayoutDashboard,
  BarChart3,
  Settings,
  UserPlus,
  TrendingUp
} from 'lucide-react'

interface FinancialTab {
  id: string
  label: string
  icon: React.ReactNode
  content: React.ReactNode
  disabled?: boolean
}

interface FinancialTabsProps {
  className?: string
}

const OverviewTabContent = ({
  onTabChange,
  dashboardMetrics
}: {
  onTabChange: (tabId: string) => void
  dashboardMetrics?: { totale_registratie: number; achterstallig: number } | null
}) => (
  <div className="space-y-6">
    {/* Responsive layout with mobile-first approach */}
    <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
      {/* Main content - Financial Overview */}
      <div className="lg:col-span-2 space-y-4 sm:space-y-6 lg:space-y-8">
        <div className="mobile-card-glass">
          <FinancialOverview />
        </div>
      </div>

      {/* Sidebar - Active Timer and Quick Actions */}
      <div className="space-y-4 sm:space-y-6">
        {/* Active Timer Widget */}
        <ActiveTimerWidget
          onNavigateToTimer={() => onTabChange('tijd')}
        />

        {/* Client Health Dashboard */}
        <ClientHealthDashboard
          onViewAllClients={() => onTabChange('klanten')}
        />

        {/* Mobile-optimized Financial Quick Actions */}
        <div className="mobile-card-glass">
          <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Quick Actions
          </h2>
          <div className="space-y-2 sm:space-y-3">
            <button
              onClick={() => onTabChange('tijd')}
              className="block w-full text-left"
            >
              <div className="mobile-kpi-card p-3 sm:p-3 rounded-lg border border-border/50 hover:border-primary/30 focus-mobile-enhanced">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg flex-shrink-0">
                    <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">Time Tracking</p>
                    <p className="text-xs text-muted-foreground hidden sm:block">Log hours worked</p>
                  </div>
                </div>
              </div>
            </button>
            <button
              onClick={() => {
                const params = new URLSearchParams(window.location.search)
                params.set('tab', 'klanten')
                window.history.pushState({}, '', `/dashboard/financieel?${params.toString()}`)
                window.dispatchEvent(new PopStateEvent('popstate'))
              }}
              className="block w-full text-left"
            >
              <div className="mobile-kpi-card p-3 sm:p-3 rounded-lg border border-border/50 hover:border-primary/30 focus-mobile-enhanced">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-success/10 rounded-lg flex-shrink-0">
                    <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">Clients & Projects</p>
                    <p className="text-xs text-muted-foreground hidden sm:block">Manage portfolio</p>
                  </div>
                </div>
              </div>
            </button>
            <div className="mobile-kpi-card p-3 sm:p-3 rounded-lg border border-border/50 hover:border-accent/30 opacity-75">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-accent/10 rounded-lg flex-shrink-0">
                  <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">Invoices</p>
                  <p className="text-xs text-muted-foreground hidden sm:block">Coming soon</p>
                </div>
              </div>
            </div>
            <div className="mobile-kpi-card p-3 sm:p-3 rounded-lg border border-border/50 hover:border-purple-400/30 opacity-75">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-purple-500/10 rounded-lg flex-shrink-0">
                  <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">Expenses</p>
                  <p className="text-xs text-muted-foreground hidden sm:block">Coming soon</p>
                </div>
              </div>
            </div>
            <div className="mobile-kpi-card p-3 sm:p-3 rounded-lg border border-border/50 hover:border-green-400/30 opacity-75">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-green-500/10 rounded-lg flex-shrink-0">
                  <UserPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">VAT/ICP Reports</p>
                  <p className="text-xs text-muted-foreground hidden sm:block">Coming soon</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile-optimized Financial Health Insights */}
        <div className="mobile-card-glass">
          <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
            <span className="hidden sm:inline">Financial Health</span>
            <span className="sm:hidden">Health</span>
          </h2>
          <div className="space-y-2 sm:space-y-3">
            <div className="p-2.5 sm:p-3 rounded-lg bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/20">
              <p className="text-xs sm:text-sm font-medium text-primary">Cash Flow Status</p>
              <p className="text-xs text-muted-foreground mt-1">
                Strong position with €8.5K revenue this month
              </p>
            </div>
            <div className="p-2.5 sm:p-3 rounded-lg bg-gradient-to-r from-success/5 to-green-500/5 border border-success/20">
              <p className="text-xs sm:text-sm font-medium text-green-400">Growth Trend</p>
              <p className="text-xs text-muted-foreground mt-1">
                12% increase compared to last month
              </p>
            </div>
            <div className="p-2.5 sm:p-3 rounded-lg bg-gradient-to-r from-orange-500/5 to-amber-500/5 border border-orange-500/20">
              <p className="text-xs sm:text-sm font-medium text-orange-400">Action Required</p>
              <p className="text-xs text-muted-foreground mt-1">
                1 overdue invoice needs follow-up
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Cash Flow Forecast - Full Width */}
    <CashFlowForecast dashboardMetrics={dashboardMetrics} />
  </div>
)


export function FinancialTabs({ className }: FinancialTabsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState('tijd')
  const [dashboardMetrics, setDashboardMetrics] = useState<{totale_registratie: number; achterstallig: number} | null>(null)

  // Handle tab change and update URL
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)

    // Update URL with tab parameter
    const params = new URLSearchParams(searchParams.toString())
    if (tabId === 'tijd') {
      params.delete('tab')
    } else {
      params.set('tab', tabId)
    }

    const newUrl = params.toString()
      ? `/dashboard/financieel?${params.toString()}`
      : '/dashboard/financieel'

    router.push(newUrl, { scroll: false })
  }

  // Define available tabs - Removed redundant Overview tab (now in Command Center)
  const tabs: FinancialTab[] = [
    {
      id: 'tijd',
      label: 'Time Tracking',
      icon: <Clock className="h-4 w-4" />,
      content: <TijdContent showHeader={false} />
    },
    {
      id: 'uitgaven',
      label: 'Expenses',
      icon: <Receipt className="h-4 w-4" />,
      content: <ExpensesContent showHeader={false} />
    },
    {
      id: 'facturen',
      label: 'Invoices',
      icon: <FileText className="h-4 w-4" />,
      content: <InvoicesContent showHeader={false} />
    },
    {
      id: 'klanten',
      label: 'Clients',
      icon: <Users className="h-4 w-4" />,
      content: <ClientsContent showHeader={false} />
    },
    {
      id: 'belasting',
      label: 'Tax',
      icon: <Calculator className="h-4 w-4" />,
      content: <TaxContent showHeader={false} />
    }
  ]

  // Initialize active tab from URL parameter
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam && tabs.find(tab => tab.id === tabParam)) {
      setActiveTab(tabParam)
    }
  }, [searchParams])

  // Fetch dashboard metrics for cash flow component
  useEffect(() => {
    const fetchDashboardMetrics = async () => {
      try {
        const response = await fetch('/api/invoices/dashboard-metrics')
        if (response.ok) {
          const data = await response.json()
          setDashboardMetrics(data.data)
        }
      } catch (error) {
        console.error('Failed to fetch dashboard metrics:', error)
      }
    }

    fetchDashboardMetrics()
  }, [])

  return (
    <div className={className}>
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        {/* Tab Navigation */}
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 lg:grid-cols-5 h-auto p-1 bg-muted/50">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              disabled={tab.disabled}
              className={`
                flex items-center justify-center gap-1.5 sm:gap-2
                px-2 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm
                data-[state=active]:bg-background data-[state=active]:shadow-sm
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-200
              `}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">
                {tab.label.split(' ')[0]}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Tab Content */}
        <div className="mt-6">
          {tabs.map((tab) => (
            <TabsContent
              key={tab.id}
              value={tab.id}
              className="space-y-6 focus-visible:outline-none"
            >
              {tab.content}
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </div>
  )
}
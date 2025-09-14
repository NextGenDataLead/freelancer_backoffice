'use client'

import { KPICard, ProgressCard, StatusCard, SectionHeader } from './dashboard-cards'
import { FinancialCharts } from '../financial/charts/financial-charts'
import { 
  Euro, 
  TrendingUp, 
  Users, 
  FileText, 
  Clock, 
  Target,
  AlertCircle,
  CreditCard,
  Banknote,
  Calculator,
  BarChart3
} from 'lucide-react'

// Mock data - in real implementation, this would come from your API
const mockFinancialData = {
  monthlyRevenue: 8500,
  revenueTrend: 12,
  unpaidInvoices: 2400,
  overdueCount: 1,
  totalInvoices: 15,
  paidInvoices: 12,
  monthlyExpenses: 1200,
  profitMargin: 85.9,
  billableHours: 120,
  targetHours: 160,
  hourlyRate: 75,
  vatOwed: 1785,
  upcomingTaxDeadlines: [
    { label: 'VAT Return Q3', value: '15 Oct' },
    { label: 'Income Tax', value: '31 Dec' }
  ]
}

export function FinancialOverview() {
  const invoiceProgress = (mockFinancialData.paidInvoices / mockFinancialData.totalInvoices) * 100
  const hoursProgress = (mockFinancialData.billableHours / mockFinancialData.targetHours) * 100
  
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight mobile-sharp-text">Financial Overview</h2>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base hidden sm:block">Your complete financial health at a glance</p>
        </div>
        <div className="mobile-status-indicator status-active">
          <span className="hidden sm:inline">Real-time</span>
          <span className="sm:hidden">Live</span>
        </div>
      </div>

      {/* Mobile-first Enhanced Key Financial Metrics with glassmorphism */}
      <div className="dashboard-grid-mobile sm:dashboard-grid">
        <div className="mobile-kpi-card mobile-card-glass space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1 min-w-0 flex-1">
              <p className="mobile-metric-title">Monthly Revenue</p>
              <p className="text-2xl sm:text-3xl font-bold metric-number text-green-400 mobile-sharp-text">
                €{mockFinancialData.monthlyRevenue.toLocaleString()}
              </p>
            </div>
            <div className="p-2 sm:p-3 bg-success/20 rounded-xl flex-shrink-0">
              <Euro className="h-5 w-5 sm:h-6 sm:w-6 text-green-400 chart-glow-green" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Current month</p>
            <div className="flex items-center gap-1 text-green-400 text-xs sm:text-sm font-medium">
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
              +{mockFinancialData.revenueTrend}%
            </div>
          </div>
        </div>

        <div className="mobile-kpi-card mobile-card-glass space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1 min-w-0 flex-1">
              <p className="mobile-metric-title">Outstanding Amount</p>
              <p className="text-2xl sm:text-3xl font-bold metric-number text-orange-400 mobile-sharp-text">
                €{mockFinancialData.unpaidInvoices.toLocaleString()}
              </p>
            </div>
            <div className="p-2 sm:p-3 bg-orange-500/20 rounded-xl relative flex-shrink-0">
              <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-orange-400 chart-glow-orange" />
              {mockFinancialData.overdueCount > 0 && (
                <div className="notification-badge">{mockFinancialData.overdueCount}</div>
              )}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-0">
            <p className="text-xs text-muted-foreground">
              {mockFinancialData.overdueCount} overdue invoice{mockFinancialData.overdueCount !== 1 ? 's' : ''}
            </p>
            <div className={`text-xs px-2 py-1 rounded-full self-start sm:self-auto ${
              mockFinancialData.overdueCount > 0 ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
            }`}>
              {mockFinancialData.overdueCount > 0 ? 'Action needed' : 'Up to date'}
            </div>
          </div>
        </div>

        <div className="mobile-kpi-card mobile-card-glass space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1 min-w-0 flex-1">
              <p className="mobile-metric-title">Profit Margin</p>
              <p className="text-2xl sm:text-3xl font-bold metric-number text-primary mobile-sharp-text">
                {mockFinancialData.profitMargin}%
              </p>
            </div>
            <div className="p-2 sm:p-3 bg-primary/20 rounded-xl flex-shrink-0">
              <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-primary chart-glow-blue" />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-0">
            <p className="text-xs text-muted-foreground">
              €{mockFinancialData.monthlyExpenses} monthly expenses
            </p>
            <div className="flex items-center gap-1 text-primary text-xs sm:text-sm font-medium">
              ↗ +3.2% improvement
            </div>
          </div>
        </div>

        <div className="mobile-kpi-card mobile-card-glass space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1 min-w-0 flex-1">
              <p className="mobile-metric-title">Hourly Rate</p>
              <p className="text-2xl sm:text-3xl font-bold metric-number text-purple-400 mobile-sharp-text">
                €{mockFinancialData.hourlyRate}
              </p>
            </div>
            <div className="p-2 sm:p-3 bg-purple-500/20 rounded-xl flex-shrink-0">
              <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-purple-400" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Average this month</p>
            <p className="text-xs text-purple-400 font-medium">Competitive rate</p>
          </div>
        </div>
      </div>

      {/* Mobile-first Enhanced Progress Tracking with glassmorphism */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
        <div className="mobile-card-glass space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="p-1.5 sm:p-2 bg-primary/20 rounded-lg flex-shrink-0">
                <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-primary chart-glow-blue" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-sm sm:text-base truncate">Invoice Collection</h3>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Track payment status</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl sm:text-2xl font-bold metric-number mobile-sharp-text">
                {mockFinancialData.paidInvoices}/{mockFinancialData.totalInvoices}
              </p>
              <p className="text-xs text-muted-foreground">invoices</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span className={`font-medium ${
                invoiceProgress >= 80 ? 'text-green-400' : 
                invoiceProgress >= 60 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {Math.round(invoiceProgress)}%
              </span>
            </div>
            <div className="mobile-progress-bar">
              <div 
                className={`progress-fill ${
                  invoiceProgress >= 80 ? 'progress-fill-success' : 
                  invoiceProgress >= 60 ? 'progress-fill-warning' : 'bg-red-500'
                }`}
                style={{ width: `${invoiceProgress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{mockFinancialData.paidInvoices} paid</span>
              <span>{mockFinancialData.totalInvoices - mockFinancialData.paidInvoices} pending</span>
            </div>
          </div>
        </div>

        <div className="mobile-card-glass space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="p-1.5 sm:p-2 bg-accent/20 rounded-lg flex-shrink-0">
                <Target className="h-4 w-4 sm:h-5 sm:w-5 text-accent chart-glow-orange" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-sm sm:text-base truncate">Monthly Hours Target</h3>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Billable hours progress</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl sm:text-2xl font-bold metric-number mobile-sharp-text">
                {mockFinancialData.billableHours}/{mockFinancialData.targetHours}
              </p>
              <p className="text-xs text-muted-foreground">hours</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span className={`font-medium ${
                hoursProgress >= 75 ? 'text-green-400' : 
                hoursProgress >= 50 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {Math.round(hoursProgress)}%
              </span>
            </div>
            <div className="mobile-progress-bar">
              <div 
                className={`progress-fill ${
                  hoursProgress >= 75 ? 'progress-fill-success' : 
                  hoursProgress >= 50 ? 'progress-fill-warning' : 'bg-red-500'
                }`}
                style={{ width: `${hoursProgress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{mockFinancialData.billableHours}h logged</span>
              <span>{mockFinancialData.targetHours - mockFinancialData.billableHours}h remaining</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile-first Enhanced Financial Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        <div className="mobile-card-glass space-y-3 sm:space-y-4 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 ${
                mockFinancialData.overdueCount > 0 ? 'bg-orange-500/20' : 'bg-success/20'
              }`}>
                <CreditCard className={`h-4 w-4 sm:h-5 sm:w-5 ${
                  mockFinancialData.overdueCount > 0 ? 'text-orange-400' : 'text-green-400'
                }`} />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-sm sm:text-base truncate">Payment Status</h3>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Invoice collection</p>
              </div>
            </div>
            <div className={`mobile-status-indicator flex-shrink-0 ${
              mockFinancialData.overdueCount > 0 ? 'status-warning' : 'status-active'
            }`}>
              <span>{mockFinancialData.totalInvoices}</span>
            </div>
          </div>
          <div className="space-y-2 sm:space-y-3">
            <div className="flex justify-between items-center p-2 rounded-lg bg-success/10">
              <span className="text-xs sm:text-sm text-green-400">Paid invoices</span>
              <span className="font-medium text-green-400">{mockFinancialData.paidInvoices}</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded-lg bg-yellow-500/10">
              <span className="text-xs sm:text-sm text-yellow-400">Pending payment</span>
              <span className="font-medium text-yellow-400">{mockFinancialData.totalInvoices - mockFinancialData.paidInvoices}</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded-lg bg-red-500/10">
              <span className="text-xs sm:text-sm text-red-400">Overdue</span>
              <span className="font-medium text-red-400">{mockFinancialData.overdueCount}</span>
            </div>
          </div>
        </div>

        <div className="mobile-card-glass space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="p-1.5 sm:p-2 bg-primary/20 rounded-lg flex-shrink-0">
                <Calculator className="h-4 w-4 sm:h-5 sm:w-5 text-primary chart-glow-blue" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-sm sm:text-base truncate">Tax Obligations</h3>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">VAT/ICP tracking</p>
              </div>
            </div>
            <div className="mobile-status-indicator status-warning flex-shrink-0">
              <span>{mockFinancialData.upcomingTaxDeadlines.length}</span>
            </div>
          </div>
          <div className="space-y-2 sm:space-y-3">
            <div className="flex justify-between items-center p-2 rounded-lg bg-orange-500/10">
              <span className="text-xs sm:text-sm text-orange-400">VAT owed</span>
              <span className="font-medium text-orange-400">€{mockFinancialData.vatOwed}</span>
            </div>
            {mockFinancialData.upcomingTaxDeadlines.map((deadline, index) => (
              <div key={index} className="flex justify-between items-center p-2 rounded-lg bg-primary/10">
                <span className="text-xs sm:text-sm text-primary truncate">{deadline.label}</span>
                <span className="font-medium text-primary flex-shrink-0">{deadline.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mobile-card-glass space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="p-1.5 sm:p-2 bg-purple-500/20 rounded-lg flex-shrink-0">
                <Banknote className="h-4 w-4 sm:h-5 sm:w-5 text-purple-400" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-sm sm:text-base truncate">Monthly Expenses</h3>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Expense tracking</p>
              </div>
            </div>
            <div className="mobile-status-indicator status-active flex-shrink-0">
              <span>8</span>
            </div>
          </div>
          <div className="space-y-2 sm:space-y-3">
            <div className="flex justify-between items-center p-2 rounded-lg bg-purple-500/10">
              <span className="text-xs sm:text-sm text-purple-400">Total expenses</span>
              <span className="font-medium text-purple-400">€{mockFinancialData.monthlyExpenses}</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded-lg bg-muted/20">
              <span className="text-xs sm:text-sm text-muted-foreground truncate">Office & Equipment</span>
              <span className="font-medium flex-shrink-0">€450</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded-lg bg-muted/20">
              <span className="text-xs sm:text-sm text-muted-foreground truncate">Software & Tools</span>
              <span className="font-medium flex-shrink-0">€320</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded-lg bg-muted/20">
              <span className="text-xs sm:text-sm text-muted-foreground truncate">Travel & Transport</span>
              <span className="font-medium flex-shrink-0">€180</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Financial Charts Section */}
      <div className="mobile-card-glass space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-accent/20 rounded-lg">
            <BarChart3 className="h-5 w-5 text-accent chart-glow-orange" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-semibold mobile-sharp-text">Interactive Analytics</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">Advanced financial visualizations</p>
          </div>
        </div>
        
        <FinancialCharts />
      </div>

      {/* Mobile-optimized Enhanced Financial Health Alert */}
      {mockFinancialData.overdueCount > 0 && (
        <div className="mobile-card-glass border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 to-orange-500/10">
          <div className="flex items-start space-x-3 sm:space-x-4">
            <div className="p-2 sm:p-3 bg-yellow-500/20 rounded-xl flex-shrink-0">
              <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-400 chart-glow-orange" />
            </div>
            <div className="flex-1 space-y-2 sm:space-y-3 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-semibold text-yellow-400 mobile-sharp-text">
                  <span className="hidden sm:inline">Financial Health Alert</span>
                  <span className="sm:hidden">Health Alert</span>
                </h3>
                <div className="notification-badge bg-yellow-500 flex-shrink-0">
                  {mockFinancialData.overdueCount}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-yellow-300 text-sm sm:text-base">
                  You have {mockFinancialData.overdueCount} overdue invoice{mockFinancialData.overdueCount !== 1 ? 's' : ''} worth €{mockFinancialData.unpaidInvoices.toLocaleString()}.
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Consider following up with clients to maintain healthy cash flow and improve your financial position.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 pt-2">
                <div className="btn-primary-glow text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 cursor-pointer">
                  Follow Up Now
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground">
                  or set automatic reminders
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
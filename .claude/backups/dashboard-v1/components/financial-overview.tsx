'use client'

import { KPICard, ProgressCard, StatusCard, SectionHeader } from './dashboard-cards'
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
  Calculator
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
    <div className="space-y-6">
      <SectionHeader 
        title="Financial Overview" 
        description="Your complete financial health at a glance"
        action={{
          label: "Full Financial Dashboard",
          href: "/dashboard/financieel"
        }}
      />

      {/* Key Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Monthly Revenue"
          value={`€${mockFinancialData.monthlyRevenue.toLocaleString()}`}
          subtitle="Current month"
          trend={{
            value: mockFinancialData.revenueTrend,
            direction: 'up',
            label: 'vs last month'
          }}
          icon={<Euro className="h-4 w-4" />}
          status="positive"
          action={{
            label: "View Details",
            href: "/dashboard/financieel"
          }}
        />

        <KPICard
          title="Outstanding Amount"
          value={`€${mockFinancialData.unpaidInvoices.toLocaleString()}`}
          subtitle={`${mockFinancialData.overdueCount} overdue invoice${mockFinancialData.overdueCount !== 1 ? 's' : ''}`}
          icon={<FileText className="h-4 w-4" />}
          status={mockFinancialData.overdueCount > 0 ? "warning" : "neutral"}
          action={{
            label: "Manage Invoices",
            href: "/dashboard/financieel/facturen"
          }}
        />

        <KPICard
          title="Profit Margin"
          value={`${mockFinancialData.profitMargin}%`}
          subtitle={`€${mockFinancialData.monthlyExpenses} monthly expenses`}
          trend={{
            value: 3.2,
            direction: 'up',
            label: 'improvement'
          }}
          icon={<TrendingUp className="h-4 w-4" />}
          status="positive"
        />

        <KPICard
          title="Hourly Rate"
          value={`€${mockFinancialData.hourlyRate}`}
          subtitle="Average this month"
          icon={<Clock className="h-4 w-4" />}
          status="neutral"
          action={{
            label: "Track Time",
            href: "/dashboard/financieel/tijd"
          }}
        />
      </div>

      {/* Progress Tracking */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ProgressCard
          title="Invoice Collection"
          description="Track payment status of issued invoices"
          current={mockFinancialData.paidInvoices}
          target={mockFinancialData.totalInvoices}
          unit="invoices"
          progress={invoiceProgress}
          icon={<CreditCard className="h-4 w-4" />}
          color={invoiceProgress >= 80 ? 'green' : invoiceProgress >= 60 ? 'yellow' : 'red'}
        />

        <ProgressCard
          title="Monthly Hours Target"
          description="Billable hours progress toward monthly goal"
          current={mockFinancialData.billableHours}
          target={mockFinancialData.targetHours}
          unit="hours"
          progress={hoursProgress}
          icon={<Target className="h-4 w-4" />}
          color={hoursProgress >= 75 ? 'green' : hoursProgress >= 50 ? 'yellow' : 'red'}
        />
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatusCard
          title="Payment Status"
          description="Current invoice collection status"
          status={mockFinancialData.overdueCount > 0 ? "warning" : "success"}
          count={mockFinancialData.totalInvoices}
          items={[
            { label: "Paid invoices", value: mockFinancialData.paidInvoices },
            { label: "Pending payment", value: mockFinancialData.totalInvoices - mockFinancialData.paidInvoices },
            { label: "Overdue", value: mockFinancialData.overdueCount }
          ]}
          action={{
            label: "Manage Invoices",
            href: "/dashboard/financieel/facturen"
          }}
        />

        <StatusCard
          title="Tax Obligations"
          description="Upcoming tax deadlines and payments"
          status="info"
          count={mockFinancialData.upcomingTaxDeadlines.length}
          items={[
            { label: "VAT owed", value: `€${mockFinancialData.vatOwed}` },
            ...mockFinancialData.upcomingTaxDeadlines
          ]}
          action={{
            label: "Tax Dashboard",
            href: "/dashboard/financieel/belasting"
          }}
        />

        <StatusCard
          title="Monthly Expenses"
          description="Current month expense tracking"
          status="success"
          count={8}
          items={[
            { label: "Total expenses", value: `€${mockFinancialData.monthlyExpenses}` },
            { label: "Office & Equipment", value: "€450" },
            { label: "Software & Tools", value: "€320" },
            { label: "Travel & Transport", value: "€180" }
          ]}
          action={{
            label: "Manage Expenses",
            href: "/dashboard/financieel/uitgaven"
          }}
        />
      </div>

      {/* Financial Health Alert */}
      {mockFinancialData.overdueCount > 0 && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-yellow-800 dark:text-yellow-200">
                Financial Health Alert
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                You have {mockFinancialData.overdueCount} overdue invoice{mockFinancialData.overdueCount !== 1 ? 's' : ''} worth €{mockFinancialData.unpaidInvoices.toLocaleString()}. 
                Consider following up with clients to maintain healthy cash flow.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
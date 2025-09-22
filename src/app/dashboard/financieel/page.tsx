'use client'

import { UnifiedFinancialDashboard } from '@/components/dashboard/unified-financial-dashboard'
import { FinancialTabs } from '@/components/financial/financial-tabs'
import { ProfitTargetSetupModalV2 } from '@/components/financial/profit-targets/profit-target-setup-modal-v2'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useProfitTargets } from '@/hooks/use-profit-targets'
import {
  LayoutDashboard,
  Clock,
  Receipt,
  FileText,
  Users,
  Calculator
} from 'lucide-react'

export default function FinancialDashboard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [showProfitTargetSetup, setShowProfitTargetSetup] = useState(false)
  const { targets, needsSetup, isLoading, refetch } = useProfitTargets()

  // Handle tab changes with URL updates
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    const params = new URLSearchParams(searchParams.toString())

    if (tabId === 'dashboard') {
      params.delete('tab')
    } else {
      params.set('tab', tabId)
    }

    const newUrl = params.toString()
      ? `/dashboard/financieel?${params.toString()}`
      : '/dashboard/financieel'

    router.push(newUrl, { scroll: false })
  }

  // Initialize from URL
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam) {
      setActiveTab(tabParam)
    }
  }, [searchParams])

  // Show profit target setup modal if needed
  useEffect(() => {
    if (!isLoading && needsSetup) {
      // Small delay to let the page load first
      const timer = setTimeout(() => {
        setShowProfitTargetSetup(true)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [isLoading, needsSetup])

  const handleProfitTargetComplete = async () => {
    console.log('Profit target setup completed, refreshing data...')
    setShowProfitTargetSetup(false)
    // Refresh the targets data and reload the page
    await refetch()
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-background">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        {/* Tab Navigation */}
        <div className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-40">
          <div className="container mx-auto px-4 sm:px-6">
            <TabsList className="grid w-full max-w-4xl mx-auto grid-cols-3 sm:grid-cols-6 h-auto p-1 bg-transparent">
              <TabsTrigger
                value="dashboard"
                className="flex items-center gap-1.5 px-2 sm:px-3 py-2 text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Command Center</span>
                <span className="sm:hidden">Dashboard</span>
              </TabsTrigger>
              <TabsTrigger
                value="tijd"
                className="flex items-center gap-1.5 px-2 sm:px-3 py-2 text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <Clock className="h-4 w-4" />
                <span className="hidden sm:inline">Time Tracking</span>
                <span className="sm:hidden">Time</span>
              </TabsTrigger>
              <TabsTrigger
                value="uitgaven"
                className="flex items-center gap-1.5 px-2 sm:px-3 py-2 text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <Receipt className="h-4 w-4" />
                <span className="hidden sm:inline">Expenses</span>
                <span className="sm:hidden">Expenses</span>
              </TabsTrigger>
              <TabsTrigger
                value="facturen"
                className="flex items-center gap-1.5 px-2 sm:px-3 py-2 text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Invoices</span>
                <span className="sm:hidden">Invoices</span>
              </TabsTrigger>
              <TabsTrigger
                value="klanten"
                className="flex items-center gap-1.5 px-2 sm:px-3 py-2 text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Clients</span>
                <span className="sm:hidden">Clients</span>
              </TabsTrigger>
              <TabsTrigger
                value="belasting"
                className="flex items-center gap-1.5 px-2 sm:px-3 py-2 text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <Calculator className="h-4 w-4" />
                <span className="hidden sm:inline">Tax</span>
                <span className="sm:hidden">Tax</span>
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* Tab Content */}
        <TabsContent value="dashboard" className="mt-0 focus-visible:outline-none">
          <UnifiedFinancialDashboard onTabChange={handleTabChange} />
        </TabsContent>

        <TabsContent value="tijd" className="mt-0 focus-visible:outline-none">
          <FinancialTabs />
        </TabsContent>

        <TabsContent value="uitgaven" className="mt-0 focus-visible:outline-none">
          <FinancialTabs />
        </TabsContent>

        <TabsContent value="facturen" className="mt-0 focus-visible:outline-none">
          <FinancialTabs />
        </TabsContent>

        <TabsContent value="klanten" className="mt-0 focus-visible:outline-none">
          <FinancialTabs />
        </TabsContent>

        <TabsContent value="belasting" className="mt-0 focus-visible:outline-none">
          <FinancialTabs />
        </TabsContent>
      </Tabs>

      {/* Profit Target Setup Modal - Required Setup */}
      {showProfitTargetSetup && (
        <ProfitTargetSetupModalV2
          onComplete={handleProfitTargetComplete}
          onClose={() => {}} // Non-dismissible modal
          isModal={true}
        />
      )}
    </div>
  )
}
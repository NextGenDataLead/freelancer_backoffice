'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Clock,
  AlertTriangle,
  Menu,
  Home,
  Users,
  Timer,
  Receipt,
  CreditCard,
  ChevronDown,
  Bell,
  CheckCircle,
  AlertCircle,
  Calendar,
  FileText,
  Euro,
  TrendingUp,
  Target,
  Settings
} from 'lucide-react'

interface ActionItem {
  id: string
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  type: 'invoice' | 'time' | 'client' | 'expense' | 'vat'
  date: string
}

interface MetricConfig {
  value: number | string
  label: string
  icon: React.ComponentType<any>
  color?: string
}

interface ActionConfig {
  label: string
  icon: React.ComponentType<any>
  onClick: () => void
  variant?: 'default' | 'outline' | 'ghost'
  color?: string
}

interface FinancialHeaderProps {
  metric: MetricConfig
  pageAction: ActionConfig
  firstName?: string
}

// Mock action items - replace with real data from your API
const mockActionItems: ActionItem[] = [
  {
    id: '1',
    title: 'Invoice #2024-003 Overdue',
    description: 'TechCorp invoice is 5 days overdue - €2,450',
    priority: 'high',
    type: 'invoice',
    date: '2025-01-02'
  },
  {
    id: '2',
    title: 'Missing Time Entry',
    description: 'Yesterday: 4 hours not logged for Project Alpha',
    priority: 'medium',
    type: 'time',
    date: '2025-01-06'
  },
  {
    id: '3',
    title: 'VAT Filing Due',
    description: 'Q4 2024 VAT filing due in 3 days',
    priority: 'high',
    type: 'vat',
    date: '2025-01-10'
  },
  {
    id: '4',
    title: 'Client Contract Review',
    description: 'StartupCo contract expires in 2 weeks',
    priority: 'medium',
    type: 'client',
    date: '2025-01-20'
  }
]

const navItems = [
  {
    href: '/dashboard/financieel',
    label: 'Home',
    icon: Home,
    description: 'Financial dashboard overview'
  },
  {
    href: '/dashboard/financieel/klanten',
    label: 'Clients & Projects',
    icon: Users,
    description: 'Manage clients and projects'
  },
  {
    href: '/dashboard/financieel/tijd',
    label: 'Time',
    icon: Timer,
    description: 'Track and manage time entries'
  },
  {
    href: '/dashboard/financieel/facturen',
    label: 'Invoices',
    icon: Receipt,
    description: 'Create and manage invoices',
    comingSoon: true
  },
  {
    href: '/dashboard/financieel/uitgaven',
    label: 'Expenses',
    icon: CreditCard,
    description: 'Track business expenses',
    comingSoon: true
  },
]

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high': return 'text-red-400 bg-red-500/10 border-red-500/30'
    case 'medium': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'
    case 'low': return 'text-blue-400 bg-blue-500/10 border-blue-500/30'
    default: return 'text-muted-foreground bg-muted/10 border-border/30'
  }
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'invoice': return Receipt
    case 'time': return Clock
    case 'client': return Users
    case 'expense': return CreditCard
    case 'vat': return FileText
    default: return AlertCircle
  }
}

export function FinancialHeader({ metric, pageAction, firstName = 'User' }: FinancialHeaderProps) {
  const [actionsModalOpen, setActionsModalOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  const highPriorityActions = mockActionItems.filter(item => item.priority === 'high')
  const actionCount = mockActionItems.length
  const MetricIcon = metric.icon
  const ActionIcon = pageAction.icon

  return (
    <>
      <div className="mobile-sticky-header mobile-glass-effect border-t-0 rounded-none border-x-0 z-50">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            
            {/* Left: Navigation Menu */}
            <div className="flex items-center">
              {/* Desktop Navigation - visible on lg+ screens */}
              <nav className="hidden lg:flex items-center space-x-1">
                {navItems.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href
                  const isComingSoon = item.comingSoon
                  
                  return (
                    <Button
                      key={item.href}
                      variant={isActive ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => !isComingSoon && router.push(item.href)}
                      disabled={isComingSoon}
                      className={`flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors ${
                        isActive 
                          ? 'bg-primary/10 text-primary border-primary/20' 
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      } ${isComingSoon ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                      {isComingSoon && (
                        <Badge variant="secondary" className="text-xs ml-1">Soon</Badge>
                      )}
                    </Button>
                  )
                })}
              </nav>

              {/* Mobile Hamburger Menu - visible on smaller screens */}
              <div className="lg:hidden relative">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mobile-card-glass hover:border-primary/30 focus:border-primary/30"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                  <Menu className="h-4 w-4" />
                  <span className="sr-only">Open navigation menu</span>
                </Button>
                
                {/* Mobile dropdown menu */}
                {dropdownOpen && (
                  <>
                    {/* Backdrop overlay */}
                    <div 
                      className="fixed inset-0 z-[9998]"
                      onClick={() => setDropdownOpen(false)}
                    />
                    
                    {/* Menu content */}
                    <div className="absolute top-full left-0 mt-2 w-64 bg-background border border-border rounded-lg shadow-2xl z-[9999] py-2">
                      <div className="px-4 py-3 border-b border-border/50">
                        <p className="text-xs text-muted-foreground">Navigation</p>
                        <p className="text-sm font-medium text-foreground">Welcome, {firstName}</p>
                      </div>
                      
                      <div className="py-2">
                        {navItems.map((item) => {
                          const Icon = item.icon
                          const isActive = pathname === item.href
                          const isComingSoon = item.comingSoon
                          
                          return (
                            <button
                              key={item.href}
                              onClick={() => {
                                if (!isComingSoon) {
                                  router.push(item.href)
                                  setDropdownOpen(false)
                                }
                              }}
                              disabled={isComingSoon}
                              className={`w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-muted/50 transition-colors ${
                                isActive ? 'bg-primary/10 text-primary' : ''
                              } ${isComingSoon ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                              <Icon className="h-4 w-4 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">{item.label}</span>
                                  {isComingSoon && (
                                    <Badge variant="secondary" className="text-xs">Soon</Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                              </div>
                              {isActive && <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Right: Actions + Metrics + Page Action Section */}
            <div className="flex items-center gap-3 border border-border/50 rounded-lg px-3 py-2 mobile-card-glass">
              {/* Actions Required */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActionsModalOpen(true)}
                className="flex items-center gap-2 hover:bg-orange-500/10 border-0 p-2"
              >
                <div className="relative">
                  <AlertTriangle className="h-4 w-4 text-orange-400" />
                  {actionCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                      {actionCount > 9 ? '9+' : actionCount}
                    </span>
                  )}
                </div>
                <span className="hidden sm:inline text-sm font-medium">Actions</span>
              </Button>

              {/* Separator */}
              <div className="h-6 w-px bg-border/50" />

              {/* Dynamic Metric */}
              <div className="flex items-center gap-2">
                <MetricIcon className="h-4 w-4 text-primary" />
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">{metric.label}</span>
                  <span className="text-sm font-semibold text-foreground">{metric.value}</span>
                </div>
              </div>

              {/* Separator */}
              <div className="h-6 w-px bg-border/50" />

              {/* Page-specific Action */}
              <Button
                variant={pageAction.variant || "default"}
                size="sm"
                onClick={pageAction.onClick}
                className={`flex items-center gap-2 ${pageAction.color || ''}`}
              >
                <ActionIcon className="h-4 w-4" />
                <span className="hidden sm:inline text-sm font-medium">{pageAction.label}</span>
                <span className="sm:hidden text-xs">{pageAction.label.split(' ')[0]}</span>
              </Button>

              {/* Separator */}
              <div className="h-6 w-px bg-border/50" />

              {/* User Avatar */}
              <UserButton 
                appearance={{
                  elements: {
                    avatarBox: 'w-8 h-8',
                  },
                }}
                userProfileMode="navigation"
                userProfileUrl="/dashboard/settings"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Actions Modal */}
      <Dialog open={actionsModalOpen} onOpenChange={setActionsModalOpen} modal={true}>
        <DialogContent className="bg-background/95 backdrop-blur-md border border-border/50 rounded-xl p-6 shadow-2xl shadow-black/10 max-w-md ring-1 ring-white/10 transition-colors duration-200">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-orange-400" />
              Actions Required
            </DialogTitle>
            <DialogDescription>
              Items that need your attention ({actionCount} total)
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {mockActionItems.map((item) => {
              const Icon = getTypeIcon(item.type)
              
              return (
                <div 
                  key={item.id}
                  className={`p-3 rounded-lg border ${getPriorityColor(item.priority)} transition-colors duration-150 hover:bg-muted/5 cursor-pointer`}
                >
                  <div className="flex items-start gap-3">
                    <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium truncate">{item.title}</p>
                        <Badge variant="outline" className={`text-xs ${getPriorityColor(item.priority)}`}>
                          {item.priority}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{item.description}</p>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {new Date(item.date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            
            {mockActionItems.length === 0 && (
              <div className="text-center py-8">
                <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">All caught up!</p>
                <p className="text-xs text-muted-foreground">No actions required at the moment.</p>
              </div>
            )}
          </div>
          
          {mockActionItems.length > 0 && (
            <div className="pt-3 border-t border-border/50">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => setActionsModalOpen(false)}
              >
                Mark All as Reviewed
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

// Helper function to format hours
export const formatHours = (hours: number) => {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

// Predefined metric configurations for different pages
export const headerMetrics = {
  home: (todayHours: number) => ({
    value: formatHours(todayHours),
    label: 'Today',
    icon: Clock,
  }),
  clients: (activeClients: number) => ({
    value: `${activeClients}`,
    label: 'Active Clients',
    icon: Users,
  }),
  time: (weekHours: number) => ({
    value: formatHours(weekHours),
    label: 'This Week',
    icon: Timer,
  }),
  invoices: (pendingAmount: string) => ({
    value: pendingAmount,
    label: 'Pending',
    icon: Euro,
  }),
  expenses: (monthlyTotal: string) => ({
    value: monthlyTotal,
    label: 'This Month',
    icon: TrendingUp,
  }),
}

// Predefined page action configurations
export const headerPageActions = {
  home: (onStartTimer: () => void) => ({
    label: 'Start Timer',
    icon: Timer,
    onClick: onStartTimer,
    variant: 'default' as const,
    color: 'bg-green-600 hover:bg-green-700 text-white'
  }),
  clients: (onAddClient: () => void) => ({
    label: 'Add Client',
    icon: Users,
    onClick: onAddClient,
    variant: 'default' as const,
  }),
  time: (onLogTime: () => void) => ({
    label: 'Log Time',
    icon: Clock,
    onClick: onLogTime,
    variant: 'default' as const,
  }),
  invoices: (onCreateInvoice: () => void) => ({
    label: 'Create Invoice',
    icon: Receipt,
    onClick: onCreateInvoice,
    variant: 'default' as const,
  }),
  expenses: (onAddExpense: () => void) => ({
    label: 'Add Expense',
    icon: CreditCard,
    onClick: onAddExpense,
    variant: 'default' as const,
  }),
}
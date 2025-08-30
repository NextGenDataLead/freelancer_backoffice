'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  BarChart3, 
  Users, 
  TrendingUp, 
  DollarSign,
  Activity,
  Settings,
  Bell,
  Menu,
  X,
  Home,
  FileText,
  MessageSquare,
  Table,
  Shield,
  User,
  Calculator,
  Clock,
  Euro,
  Receipt,
  ChevronRight,
  Building2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSidebar } from '@/hooks/use-app-state'

const navigationItems = [
  { name: 'Overview', icon: Home, href: '/dashboard' },
  { name: 'Analytics', icon: BarChart3, href: '/dashboard/analytics' },
  { name: 'Expense Management', icon: Receipt, href: '/dashboard/expense-management' },
  {
    name: 'Financieel',
    icon: Calculator,
    href: '/dashboard/financieel',
    children: [
      { name: 'Dashboard', icon: Home, href: '/dashboard/financieel' },
      { name: 'Facturen', icon: FileText, href: '/dashboard/financieel/facturen' },
      { name: 'Klanten', icon: Users, href: '/dashboard/financieel/klanten' },
      { name: 'Tijdregistratie', icon: Clock, href: '/dashboard/financieel/tijd' },
      { name: 'Uitgaven', icon: Euro, href: '/dashboard/financieel/uitgaven' },
      { name: 'Belasting', icon: Building2, href: '/dashboard/financieel/belasting' },
      { name: 'Rapporten', icon: TrendingUp, href: '/dashboard/financieel/rapporten' }
    ]
  },
  { name: 'Forms', icon: FileText, href: '/dashboard/forms' },
  { name: 'Modals', icon: MessageSquare, href: '/dashboard/modals' },
  { name: 'Tables', icon: Table, href: '/dashboard/tables' },
  { name: 'Users', icon: Users, href: '/dashboard/users' },
  { name: 'Revenue', icon: DollarSign, href: '/dashboard/revenue' },
  { name: 'Profile', icon: User, href: '/dashboard/profile' },
  { name: 'Privacy', icon: Shield, href: '/dashboard/privacy' },
  { name: 'Settings', icon: Settings, href: '/dashboard/settings' },
]

export function Sidebar() {
  const { sidebarOpen, closeSidebar } = useSidebar()
  const pathname = usePathname()
  const [expandedFinancial, setExpandedFinancial] = React.useState(
    pathname.startsWith('/dashboard/financieel')
  )

  // Auto-expand financial section when on financial pages
  React.useEffect(() => {
    if (pathname.startsWith('/dashboard/financieel')) {
      setExpandedFinancial(true)
    }
  }, [pathname])

  const isActivePage = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-violet-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">SaaS Template</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={closeSidebar}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav className="mt-6 px-4">
          <div className="space-y-1">
            {navigationItems.map((item) => (
              <div key={item.name}>
                {item.children ? (
                  // Financial section with submenu
                  <div>
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-left"
                      size="sm"
                      onClick={() => setExpandedFinancial(!expandedFinancial)}
                    >
                      <item.icon className="mr-3 h-4 w-4" />
                      {item.name}
                      <ChevronRight className={`ml-auto h-3 w-3 transition-transform ${expandedFinancial ? 'rotate-90' : ''}`} />
                    </Button>
                    {expandedFinancial && (
                      <div className="ml-6 mt-1 space-y-1">
                        {item.children.map((child) => (
                          <Link key={child.name} href={child.href}>
                            <Button
                              variant={isActivePage(child.href) ? "default" : "ghost"}
                              className="w-full justify-start text-left text-sm"
                              size="sm"
                            >
                              <child.icon className="mr-2 h-3 w-3" />
                              {child.name}
                            </Button>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  // Regular navigation item
                  <Link href={item.href}>
                    <Button
                      variant={isActivePage(item.href) ? "default" : "ghost"}
                      className="w-full justify-start text-left"
                      size="sm"
                    >
                      <item.icon className="mr-3 h-4 w-4" />
                      {item.name}
                    </Button>
                  </Link>
                )}
              </div>
            ))}
          </div>
        </nav>
      </div>
    </>
  )
}

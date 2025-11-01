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
  { 
    name: 'Dashboard', 
    icon: Home, 
    href: '/dashboard',
    category: 'main' 
  },
  {
    name: 'Financial Hub',
    icon: Calculator,
    href: '/dashboard/financieel-v2',
    category: 'main',
    children: [
      { name: 'Overview', icon: BarChart3, href: '/dashboard/financieel-v2' },
      { name: 'Clients', icon: Users, href: '/dashboard/financieel-v2/klanten' },
      { name: 'Time Tracking', icon: Clock, href: '/dashboard/financieel-v2/tijd' },
      { name: 'Invoices', icon: FileText, href: '/dashboard/financieel-v2/facturen' },
      { name: 'Expenses', icon: Euro, href: '/dashboard/financieel-v2/uitgaven' },
      { name: 'Tax & Reports', icon: Building2, href: '/dashboard/financieel-v2/belasting' }
    ]
  },
  { 
    name: 'Analytics', 
    icon: TrendingUp, 
    href: '/dashboard/analytics',
    category: 'main' 
  },
  { 
    name: 'Profile', 
    icon: User, 
    href: '/dashboard/profile',
    category: 'secondary' 
  },
  { 
    name: 'Users', 
    icon: Users, 
    href: '/dashboard/users',
    category: 'secondary' 
  },
  { 
    name: 'Privacy', 
    icon: Shield, 
    href: '/dashboard/privacy',
    category: 'secondary' 
  },
  { 
    name: 'Settings', 
    icon: Settings, 
    href: '/dashboard/settings',
    category: 'secondary' 
  },
]

export function Sidebar() {
  const { sidebarOpen, closeSidebar } = useSidebar()
  const pathname = usePathname()
  const [expandedFinancial, setExpandedFinancial] = React.useState(
    pathname.startsWith('/dashboard/financieel-v2')
  )

  // Auto-expand financial section when on financial pages
  React.useEffect(() => {
    if (pathname.startsWith('/dashboard/financieel-v2')) {
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
        fixed inset-y-0 left-0 z-50 w-64 bg-background border-r border-border shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-primary to-accent rounded-lg flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">FreelancePro</span>
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

        <nav className="mt-6 px-3 h-[calc(100vh-8rem)] overflow-y-auto">
          <div className="space-y-6">
            {/* Main Navigation */}
            <div className="space-y-1">
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Main
              </div>
              {navigationItems
                .filter(item => item.category === 'main')
                .map((item) => (
                  <div key={item.name}>
                    {item.children ? (
                      // Financial Hub with submenu
                      <div className="space-y-1">
                        <Button
                          variant="ghost"
                          className={`w-full justify-start text-left h-9 px-3 font-medium transition-colors hover:bg-accent hover:text-accent-foreground ${
                            pathname.startsWith(item.href) ? 'bg-accent text-accent-foreground' : ''
                          }`}
                          onClick={() => setExpandedFinancial(!expandedFinancial)}
                        >
                          <item.icon className="mr-3 h-4 w-4 shrink-0" />
                          <span className="truncate">{item.name}</span>
                          <ChevronRight className={`ml-auto h-3 w-3 shrink-0 transition-transform duration-200 ${expandedFinancial ? 'rotate-90' : ''}`} />
                        </Button>
                        {expandedFinancial && (
                          <div className="ml-3 space-y-1 border-l border-border pl-4">
                            {item.children.map((child) => (
                              <Link key={child.name} href={child.href}>
                                <Button
                                  variant="ghost"
                                  className={`w-full justify-start text-left h-8 px-3 text-sm font-normal transition-colors hover:bg-accent hover:text-accent-foreground ${
                                    isActivePage(child.href) ? 'bg-accent text-accent-foreground font-medium' : 'text-muted-foreground'
                                  }`}
                                >
                                  <child.icon className="mr-2 h-3 w-3 shrink-0" />
                                  <span className="truncate">{child.name}</span>
                                </Button>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      // Regular main navigation item
                      <Link href={item.href}>
                        <Button
                          variant="ghost"
                          className={`w-full justify-start text-left h-9 px-3 font-medium transition-colors hover:bg-accent hover:text-accent-foreground ${
                            isActivePage(item.href) ? 'bg-accent text-accent-foreground' : ''
                          }`}
                        >
                          <item.icon className="mr-3 h-4 w-4 shrink-0" />
                          <span className="truncate">{item.name}</span>
                        </Button>
                      </Link>
                    )}
                  </div>
                ))}
            </div>

            {/* Secondary Navigation */}
            <div className="space-y-1 border-t border-border pt-4">
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Account
              </div>
              {navigationItems
                .filter(item => item.category === 'secondary')
                .map((item) => (
                  <Link key={item.name} href={item.href}>
                    <Button
                      variant="ghost"
                      className={`w-full justify-start text-left h-8 px-3 text-sm font-normal transition-colors hover:bg-accent hover:text-accent-foreground ${
                        isActivePage(item.href) ? 'bg-accent text-accent-foreground font-medium' : 'text-muted-foreground'
                      }`}
                    >
                      <item.icon className="mr-3 h-3 w-3 shrink-0" />
                      <span className="truncate">{item.name}</span>
                    </Button>
                  </Link>
                ))}
            </div>
          </div>
        </nav>
      </div>
    </>
  )
}

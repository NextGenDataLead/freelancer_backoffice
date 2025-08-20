'use client'

import * as React from 'react'
import Link from 'next/link'
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
  User
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSidebar } from '@/hooks/use-app-state'

const navigationItems = [
  { name: 'Overview', icon: Home, href: '/dashboard', active: true },
  { name: 'Analytics', icon: BarChart3, href: '/dashboard/analytics', active: false },
  { name: 'Forms', icon: FileText, href: '/dashboard/forms', active: false },
  { name: 'Modals', icon: MessageSquare, href: '/dashboard/modals', active: false },
  { name: 'Tables', icon: Table, href: '/dashboard/tables', active: false },
  { name: 'Users', icon: Users, href: '/dashboard/users', active: false },
  { name: 'Revenue', icon: DollarSign, href: '/dashboard/revenue', active: false },
  { name: 'Profile', icon: User, href: '/dashboard/profile', active: false },
  { name: 'Privacy', icon: Shield, href: '/dashboard/privacy', active: false },
  { name: 'Settings', icon: Settings, href: '/dashboard/settings', active: false },
]

export function Sidebar() {
  const { sidebarOpen, closeSidebar } = useSidebar()

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
              <Link key={item.name} href={item.href}>
                <Button
                  variant={item.active ? "default" : "ghost"}
                  className="w-full justify-start text-left"
                  size="sm"
                >
                  <item.icon className="mr-3 h-4 w-4" />
                  {item.name}
                </Button>
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </>
  )
}

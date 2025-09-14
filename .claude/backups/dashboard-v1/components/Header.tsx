'use client'

import * as React from 'react'
import { Button } from "@/components/ui/button"
import { UserButton } from '@clerk/nextjs'
import { 
  Menu,
  Home,
  ChevronRight,
} from "lucide-react"
import { useSidebar } from '@/hooks/use-app-state'
import { NotificationBell } from '@/components/notifications/notification-bell'

interface HeaderProps {
  isDashboardConnected: boolean;
}

export function Header({ isDashboardConnected }: HeaderProps) {
  const { toggleSidebar } = useSidebar()

  return (
    <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={toggleSidebar}
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center space-x-2 text-sm text-slate-500">
            <Home className="h-4 w-4" />
            <ChevronRight className="h-4 w-4" />
            <span className="font-medium text-slate-900">Dashboard</span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Dashboard connection indicator */}
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              isDashboardConnected ? 'bg-green-500' : 'bg-red-500'
            }`} />
            <span className="text-xs text-slate-500">
              {isDashboardConnected ? 'Live' : 'Offline'}
            </span>
          </div>
          
          <NotificationBell />
          
          {/* Clerk User Button with Sign Out */}
          <UserButton afterSignOutUrl="/" />
        </div>
      </div>
    </div>
  )
}

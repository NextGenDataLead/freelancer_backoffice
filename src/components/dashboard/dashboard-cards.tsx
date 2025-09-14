'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowRight, 
  Users, 
  Clock, 
  Euro, 
  FileText, 
  AlertCircle,
  CheckCircle2,
  Calendar,
  Target,
  Activity
} from 'lucide-react'
import Link from 'next/link'
import { ReactNode } from 'react'

// Base card interface
interface BaseCardProps {
  title: string
  description?: string
  className?: string
}

// KPI Card Component
interface KPICardProps extends BaseCardProps {
  value: string | number
  subtitle?: string
  trend?: {
    value: number
    direction: 'up' | 'down'
    label?: string
  }
  icon: ReactNode
  action?: {
    label: string
    href: string
  }
  status?: 'positive' | 'negative' | 'neutral' | 'warning'
}

export function KPICard({ 
  title, 
  description, 
  value, 
  subtitle, 
  trend, 
  icon, 
  action, 
  status = 'neutral',
  className = '' 
}: KPICardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'positive': return 'text-green-600'
      case 'negative': return 'text-red-600'
      case 'warning': return 'text-yellow-600'
      default: return 'text-foreground'
    }
  }

  const getTrendColor = (direction: string) => {
    return direction === 'up' ? 'text-green-600' : 'text-red-600'
  }

  return (
    <Card className={`hover:shadow-md transition-shadow ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="h-4 w-4 text-muted-foreground">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold mb-1">
          <span className={getStatusColor(status)}>{value}</span>
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mb-2">{subtitle}</p>
        )}
        {trend && (
          <div className="flex items-center space-x-1">
            {trend.direction === 'up' ? (
              <TrendingUp className="h-3 w-3 text-green-600" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-600" />
            )}
            <span className={`text-xs font-medium ${getTrendColor(trend.direction)}`}>
              {trend.value > 0 ? '+' : ''}{trend.value}%
            </span>
            {trend.label && (
              <span className="text-xs text-muted-foreground">{trend.label}</span>
            )}
          </div>
        )}
        {action && (
          <div className="mt-3">
            <Button variant="outline" size="sm" asChild>
              <Link href={action.href}>
                {action.label}
                <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Progress Card Component
interface ProgressCardProps extends BaseCardProps {
  current: number
  target: number
  unit: string
  progress: number // 0-100
  icon: ReactNode
  color?: 'blue' | 'green' | 'yellow' | 'red'
}

export function ProgressCard({ 
  title, 
  description, 
  current, 
  target, 
  unit, 
  progress, 
  icon, 
  color = 'blue',
  className = '' 
}: ProgressCardProps) {
  const getProgressColor = (color: string) => {
    switch (color) {
      case 'green': return 'bg-green-600'
      case 'yellow': return 'bg-yellow-600'
      case 'red': return 'bg-red-600'
      default: return 'bg-blue-600'
    }
  }

  return (
    <Card className={`hover:shadow-md transition-shadow ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="h-4 w-4 text-muted-foreground">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold">{current}</span>
            <span className="text-sm text-muted-foreground">of {target} {unit}</span>
          </div>
          <Progress value={progress} className="w-full" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{progress}% completed</span>
            <span>{target - current} {unit} remaining</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Status Card Component
interface StatusCardProps extends BaseCardProps {
  status: 'success' | 'warning' | 'error' | 'info'
  count: number
  items: Array<{ label: string; value: string | number }>
  action?: {
    label: string
    href: string
  }
}

export function StatusCard({ 
  title, 
  description, 
  status, 
  count, 
  items, 
  action,
  className = '' 
}: StatusCardProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'success':
        return {
          icon: <CheckCircle2 className="h-4 w-4" />,
          badge: 'bg-green-100 text-green-800 border-green-200',
          color: 'text-green-600'
        }
      case 'warning':
        return {
          icon: <AlertCircle className="h-4 w-4" />,
          badge: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          color: 'text-yellow-600'
        }
      case 'error':
        return {
          icon: <AlertCircle className="h-4 w-4" />,
          badge: 'bg-red-100 text-red-800 border-red-200',
          color: 'text-red-600'
        }
      default:
        return {
          icon: <Activity className="h-4 w-4" />,
          badge: 'bg-blue-100 text-blue-800 border-blue-200',
          color: 'text-blue-600'
        }
    }
  }

  const statusConfig = getStatusConfig(status)

  return (
    <Card className={`hover:shadow-md transition-shadow ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Badge variant="outline" className={statusConfig.badge}>
            {statusConfig.icon}
            <span className="ml-1">{count}</span>
          </Badge>
        </div>
        {description && (
          <CardDescription>{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">{item.label}</span>
            <span className="font-medium">{item.value}</span>
          </div>
        ))}
        {action && (
          <div className="mt-4">
            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link href={action.href}>
                {action.label}
                <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Quick Action Card Component
interface QuickActionCardProps extends BaseCardProps {
  icon: ReactNode
  href: string
  shortcut?: string
  variant?: 'default' | 'featured'
}

export function QuickActionCard({ 
  title, 
  description, 
  icon, 
  href, 
  shortcut,
  variant = 'default',
  className = '' 
}: QuickActionCardProps) {
  const cardClass = variant === 'featured' 
    ? 'border-primary bg-primary/5 hover:bg-primary/10' 
    : 'hover:bg-accent/50'

  return (
    <Card className={`hover:shadow-md transition-all cursor-pointer ${cardClass} ${className}`}>
      <Link href={href}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${variant === 'featured' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
              {icon}
            </div>
            <div className="flex-1">
              <h3 className="font-medium">{title}</h3>
              {description && (
                <p className="text-sm text-muted-foreground">{description}</p>
              )}
            </div>
            {shortcut && (
              <Badge variant="outline" className="text-xs">
                {shortcut}
              </Badge>
            )}
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardContent>
      </Link>
    </Card>
  )
}

// Section Header Component
interface SectionHeaderProps {
  title: string
  description?: string
  action?: {
    label: string
    href: string
  }
}

export function SectionHeader({ title, description, action }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        {description && (
          <p className="text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {action && (
        <Button variant="outline" asChild>
          <Link href={action.href}>
            {action.label}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      )}
    </div>
  )
}
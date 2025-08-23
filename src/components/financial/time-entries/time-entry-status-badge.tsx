'use client'

import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { CheckCircle, Clock, XCircle, Info } from 'lucide-react'
import type { TimeEntryStatusInfo } from '@/lib/utils/time-entry-status'

interface TimeEntryStatusBadgeProps {
  statusInfo: TimeEntryStatusInfo
  size?: 'sm' | 'md' | 'lg'
  showTooltip?: boolean
  showIcon?: boolean
}

export function TimeEntryStatusBadge({ 
  statusInfo, 
  size = 'sm',
  showTooltip = true,
  showIcon = true
}: TimeEntryStatusBadgeProps) {
  
  const getStatusIcon = () => {
    if (!showIcon) return null
    
    switch (statusInfo.status) {
      case 'gefactureerd':
        return <CheckCircle className="h-3 w-3 mr-1" />
      case 'factureerbaar':
        return <Clock className="h-3 w-3 mr-1" />
      case 'niet-factureerbaar':
        return <XCircle className="h-3 w-3 mr-1" />
      default:
        return <Info className="h-3 w-3 mr-1" />
    }
  }
  
  const getVariantClass = () => {
    switch (statusInfo.color) {
      case 'green':
        return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200'
      case 'orange':
        return 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200'
      case 'red':
        return 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200'
      case 'purple':
        return 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200'
    }
  }
  
  const getSizeClass = () => {
    switch (size) {
      case 'lg':
        return 'px-3 py-1.5 text-sm'
      case 'md':
        return 'px-2 py-1 text-xs'
      case 'sm':
      default:
        return 'px-2 py-0.5 text-xs'
    }
  }
  
  const badgeContent = (
    <Badge 
      variant="secondary" 
      className={`${getVariantClass()} ${getSizeClass()} border font-medium`}
    >
      {getStatusIcon()}
      {statusInfo.label}
    </Badge>
  )
  
  if (!showTooltip) {
    return badgeContent
  }
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badgeContent}
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">{statusInfo.label}</p>
          <p className="text-sm text-muted-foreground">{statusInfo.reason}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * Status indicator dot for compact displays
 */
interface StatusDotProps {
  statusInfo: TimeEntryStatusInfo
  size?: number
  showTooltip?: boolean
}

export function TimeEntryStatusDot({ 
  statusInfo, 
  size = 8,
  showTooltip = true 
}: StatusDotProps) {
  
  const getColorClass = () => {
    switch (statusInfo.color) {
      case 'green':
        return 'bg-green-500'
      case 'orange':
        return 'bg-orange-500'
      case 'red':
        return 'bg-red-500'
      case 'purple':
        return 'bg-purple-500'
      default:
        return 'bg-gray-500'
    }
  }
  
  const dotElement = (
    <div 
      className={`rounded-full ${getColorClass()}`}
      style={{ width: size, height: size }}
    />
  )
  
  if (!showTooltip) {
    return dotElement
  }
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {dotElement}
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">{statusInfo.label}</p>
          <p className="text-sm text-muted-foreground">{statusInfo.reason}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
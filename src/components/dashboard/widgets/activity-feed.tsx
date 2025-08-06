'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  UserPlus, 
  DollarSign, 
  Settings, 
  AlertTriangle,
  CheckCircle,
  Clock
} from "lucide-react"

const activities = [
  {
    id: 1,
    type: 'user_signup',
    title: 'New user registration',
    description: 'john.doe@company.com signed up for Professional plan',
    timestamp: '2 minutes ago',
    icon: UserPlus,
    iconColor: 'text-green-600',
    bgColor: 'bg-green-50'
  },
  {
    id: 2,
    type: 'payment',
    title: 'Payment received',
    description: '$79.00 from Acme Corp - Monthly subscription',
    timestamp: '15 minutes ago',
    icon: DollarSign,
    iconColor: 'text-blue-600',
    bgColor: 'bg-blue-50'
  },
  {
    id: 3,
    type: 'system',
    title: 'System update completed',
    description: 'Dashboard components updated successfully',
    timestamp: '1 hour ago',
    icon: CheckCircle,
    iconColor: 'text-green-600',
    bgColor: 'bg-green-50'
  },
  {
    id: 4,
    type: 'settings',
    title: 'Settings modified',
    description: 'API rate limits updated by admin@company.com',
    timestamp: '2 hours ago',
    icon: Settings,
    iconColor: 'text-gray-600',
    bgColor: 'bg-gray-50'
  },
  {
    id: 5,
    type: 'alert',
    title: 'Usage warning',
    description: 'API usage at 85% of monthly limit',
    timestamp: '4 hours ago',
    icon: AlertTriangle,
    iconColor: 'text-yellow-600',
    bgColor: 'bg-yellow-50'
  },
  {
    id: 6,
    type: 'user_signup',
    title: 'New user registration',
    description: 'sarah.wilson@startup.io signed up for Starter plan',
    timestamp: '6 hours ago',
    icon: UserPlus,
    iconColor: 'text-green-600',
    bgColor: 'bg-green-50'
  }
]

export function ActivityFeed() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Clock className="mr-2 h-5 w-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-3">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full ${activity.bgColor} flex items-center justify-center`}>
                <activity.icon className={`h-4 w-4 ${activity.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {activity.title}
                  </p>
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {activity.timestamp}
                  </Badge>
                </div>
                <p className="text-sm text-slate-600 mt-1">
                  {activity.description}
                </p>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6 text-center">
          <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
            View all activity →
          </button>
        </div>
      </CardContent>
    </Card>
  )
}
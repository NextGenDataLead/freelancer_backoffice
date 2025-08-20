'use client'

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Users,
  DollarSign,
  FileText
} from "lucide-react"

const activities = [
  {
    icon: Users,
    title: "New user signed up",
    description: "john.doe@example.com just joined.",
    time: "10m ago",
    badge: "New"
  },
  {
    icon: DollarSign,
    title: "Subscription payment received",
    description: "Payment of $99 from acme.inc.",
    time: "1h ago",
    badge: "Billing"
  },
  {
    icon: FileText,
    title: "New form submission",
    description: "Contact form submitted by Jane Smith.",
    time: "3h ago",
    badge: "Forms"
  },
  {
    icon: Users,
    title: "User upgraded plan",
    description: "jane.smith@example.com upgraded to Pro.",
    time: "1d ago",
    badge: "Billing"
  },
]

export function ActivityFeed() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity, index) => (
            <div key={index} className="flex items-start space-x-4">
              <div className="bg-slate-100 rounded-full p-2">
                <activity.icon className="h-5 w-5 text-slate-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-slate-900">{activity.title}</p>
                  <Badge variant="outline">{activity.badge}</Badge>
                </div>
                <p className="text-sm text-slate-600">{activity.description}</p>
                <p className="text-xs text-slate-500 mt-1">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

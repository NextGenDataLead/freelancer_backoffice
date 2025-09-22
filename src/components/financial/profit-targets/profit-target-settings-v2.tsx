'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Target,
  CheckCircle,
  Zap
} from 'lucide-react'
import { useProfitTargets } from '@/hooks/use-profit-targets'
import { useToast } from '@/hooks/use-toast'
import { ComponentBasedProfitTargetsForm } from './component-based-profit-targets-form'

interface ProfitTargetSettingsProps {
  className?: string
}

export function ProfitTargetSettings({ className }: ProfitTargetSettingsProps) {
  const { targets, refetch } = useProfitTargets()
  const { toast } = useToast()

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <CardTitle>Component-Based Profit Targets</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {targets?.setup_completed && (
              <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                <CheckCircle className="h-3 w-3 mr-1" />
                Configured
              </Badge>
            )}
          </div>
        </div>
        <CardDescription>
          Set actionable targets for hours, rates, subscribers, and fees. This provides specific insights and eliminates the identical health scores issue.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Zap className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Component-Based Approach
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                This approach provides actionable business insights by breaking down revenue targets into specific, controllable components: working hours, hourly rates, subscriber counts, and subscription fees.
              </p>
            </div>
          </div>
        </div>

        <ComponentBasedProfitTargetsForm
          onComplete={() => {
            refetch()
            toast({
              title: "Success",
              description: "Component-based profit targets configured successfully!",
            })
          }}
        />
      </CardContent>
    </Card>
  )
}
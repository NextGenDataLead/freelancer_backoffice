'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useProfitTargets } from '@/hooks/use-profit-targets'
import { useToast } from '@/hooks/use-toast'
import { Clock, TrendingUp, Users, DollarSign, Calculator, Target } from 'lucide-react'

interface ComponentBasedProfitTargetsFormProps {
  onComplete?: () => void
  className?: string
}

export function ComponentBasedProfitTargetsForm({
  onComplete,
  className = ''
}: ComponentBasedProfitTargetsFormProps) {
  const { targets, updateTargets, isLoading } = useProfitTargets()
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    monthly_hours_target: 0, // 0 = not configured
    target_hourly_rate: 0,
    target_billable_ratio: 90, // Target percentage of hours that should be billable (0-100)
    target_working_days_per_week: [1, 2, 3, 4, 5], // Monday-Friday by default
    target_monthly_active_users: 0,
    target_avg_subscription_fee: 0,
    monthly_cost_target: 750
  })

  // Track which revenue streams are enabled - time-based always enabled
  const [timeBasedEnabled, setTimeBasedEnabled] = useState(true) // Always enabled for freelancers
  const [subscriptionEnabled, setSubscriptionEnabled] = useState(false)

  const [isSubmitting, setIsSubmitting] = useState(false)

  // Load existing targets when component mounts
  useEffect(() => {
    if (targets) {
      const hasSubscription = (targets.target_monthly_active_users || 0) > 0 && (targets.target_avg_subscription_fee || 0) > 0

      setFormData({
        monthly_hours_target: targets.monthly_hours_target || 160, // Default to 160h for time-based
        target_hourly_rate: targets.target_hourly_rate || 75, // Default to €75/h
        target_billable_ratio: targets.target_billable_ratio || 90, // Default to 90%
        target_working_days_per_week: targets.target_working_days_per_week || [1, 2, 3, 4, 5], // Default Mon-Fri
        target_monthly_active_users: targets.target_monthly_active_users || 0,
        target_avg_subscription_fee: targets.target_avg_subscription_fee || 0,
        monthly_cost_target: targets.monthly_cost_target || 750
      })

      // Time-based is always enabled, only check subscription status
      setSubscriptionEnabled(hasSubscription)
    } else {
      // Set defaults for new users - time-based enabled by default
      setFormData(prev => ({
        ...prev,
        monthly_hours_target: 160,
        target_hourly_rate: 75,
        target_billable_ratio: 90,
        target_working_days_per_week: [1, 2, 3, 4, 5]
      }))
    }
  }, [targets])

  // Real-time calculated values (only count enabled streams)
  const timeBasedRevenue = timeBasedEnabled ? (formData.monthly_hours_target * formData.target_hourly_rate) : 0
  const subscriptionRevenue = subscriptionEnabled ? (formData.target_monthly_active_users * formData.target_avg_subscription_fee) : 0
  const calculatedRevenue = timeBasedRevenue + subscriptionRevenue
  const calculatedProfit = calculatedRevenue - formData.monthly_cost_target

  const handleInputChange = (field: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const toggleWorkingDay = (day: number) => {
    setFormData(prev => {
      const currentDays = prev.target_working_days_per_week
      const isSelected = currentDays.includes(day)

      // Don't allow deselecting if it's the last day
      if (isSelected && currentDays.length === 1) {
        return prev
      }

      const newDays = isSelected
        ? currentDays.filter(d => d !== day)
        : [...currentDays, day].sort((a, b) => a - b)

      return {
        ...prev,
        target_working_days_per_week: newDays
      }
    })
  }

  const validateForm = (): string[] => {
    const errors: string[] = []

    // Time-based validation (always required since always enabled)
    if (formData.monthly_hours_target < 1 || formData.monthly_hours_target > 300) {
      errors.push('Monthly hours target must be between 1 and 300')
    }

    if (formData.target_hourly_rate < 1 || formData.target_hourly_rate > 500) {
      errors.push('Target hourly rate must be between €1 and €500')
    }

    if (formData.target_billable_ratio < 50 || formData.target_billable_ratio > 100) {
      errors.push('Target billable ratio must be between 50% and 100%')
    }

    if (!formData.target_working_days_per_week || formData.target_working_days_per_week.length === 0) {
      errors.push('At least one working day must be selected')
    }

    // Validate subscription stream if enabled
    if (subscriptionEnabled) {
      if (formData.target_monthly_active_users < 1 || formData.target_monthly_active_users > 1000) {
        errors.push('Monthly active users target must be between 1 and 1000')
      }

      if (formData.target_avg_subscription_fee < 1 || formData.target_avg_subscription_fee > 500) {
        errors.push('Average subscription fee must be between €1 and €500')
      }
    }

    // Validate cost target
    if (formData.monthly_cost_target < 0 || formData.monthly_cost_target > 50000) {
      errors.push('Monthly cost target must be between €0 and €50,000')
    }

    return errors
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const errors = validateForm()
    if (errors.length > 0) {
      toast({
        title: "Validation Error",
        description: errors.join(', '),
        variant: "destructive"
      })
      return
    }

    setIsSubmitting(true)

    try {
      await updateTargets({
        monthly_revenue_target_cents: calculatedRevenue * 100,
        monthly_cost_target_cents: formData.monthly_cost_target * 100,
        // Send actual values for enabled streams, 0 for disabled streams
        monthly_hours_target: timeBasedEnabled ? formData.monthly_hours_target : 0,
        target_hourly_rate_cents: timeBasedEnabled ? formData.target_hourly_rate * 100 : 0,
        target_billable_ratio: timeBasedEnabled ? formData.target_billable_ratio : 90,
        target_working_days_per_week: timeBasedEnabled ? formData.target_working_days_per_week : [1, 2, 3, 4, 5],
        target_monthly_active_users: subscriptionEnabled ? formData.target_monthly_active_users : 0,
        target_avg_subscription_fee_cents: subscriptionEnabled ? formData.target_avg_subscription_fee * 100 : 0,
        setup_step_completed: 3
      })

      toast({
        title: "Success",
        description: "Component-based profit targets have been updated successfully!",
      })

      onComplete?.()
    } catch (error) {
      console.error('Error updating profit targets:', error)
      toast({
        title: "Error",
        description: "Failed to update profit targets. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className={`space-y-6 ${className}`}>
      {/* Time-Based Revenue Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Time-Based Revenue Targets</h3>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center px-2 py-1 rounded-md bg-green-100 text-green-700 border border-green-200 text-xs font-medium">
              Always Enabled
            </div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Core revenue stream for freelancers and consultants. Set your target billable hours and desired hourly rate.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="monthly_hours_target" className="text-sm font-medium">
              Monthly Hours Target
            </Label>
            <Input
              id="monthly_hours_target"
              type="number"
              min="1"
              max="300"
              value={formData.monthly_hours_target || ''}
              onChange={(e) => handleInputChange('monthly_hours_target', parseInt(e.target.value) || 0)}
              className="mt-1"
              placeholder="160"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">Target billable hours per month (1-300)</p>
          </div>
          <div>
            <Label htmlFor="target_hourly_rate" className="text-sm font-medium">
              Target Hourly Rate (€)
            </Label>
            <Input
              id="target_hourly_rate"
              type="number"
              min="1"
              max="500"
              value={formData.target_hourly_rate || ''}
              onChange={(e) => handleInputChange('target_hourly_rate', parseInt(e.target.value) || 0)}
              className="mt-1"
              placeholder="75"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">Average rate per billable hour (€1-€500)</p>
          </div>
          <div>
            <Label htmlFor="target_billable_ratio" className="text-sm font-medium">
              Target Billable Ratio (%)
            </Label>
            <Input
              id="target_billable_ratio"
              type="number"
              min="50"
              max="100"
              value={formData.target_billable_ratio || ''}
              onChange={(e) => handleInputChange('target_billable_ratio', parseInt(e.target.value) || 0)}
              className="mt-1"
              placeholder="90"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">Target percentage of tracked hours that should be billable (50-100%)</p>
          </div>
        </div>

        {/* Working Days Selector */}
        <div className="mt-4">
          <Label className="text-sm font-medium mb-2 block">
            Working Days per Week
          </Label>
          <div className="flex flex-wrap gap-2">
            {[
              { day: 1, label: 'Mon' },
              { day: 2, label: 'Tue' },
              { day: 3, label: 'Wed' },
              { day: 4, label: 'Thu' },
              { day: 5, label: 'Fri' },
              { day: 6, label: 'Sat' },
              { day: 7, label: 'Sun' }
            ].map(({ day, label }) => {
              const isSelected = formData.target_working_days_per_week.includes(day)
              const isOnlySelected = isSelected && formData.target_working_days_per_week.length === 1

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleWorkingDay(day)}
                  disabled={isOnlySelected}
                  className={`
                    px-4 py-2 rounded-md text-sm font-medium transition-colors
                    ${isSelected
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }
                    ${isOnlySelected ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  {label}
                </button>
              )
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Select your typical working days (at least one required)
          </p>
        </div>

        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
              Time-based Revenue: €{timeBasedRevenue.toLocaleString()}/month
            </p>
          </div>
        </div>
      </Card>

      {/* Subscription Revenue Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">SaaS Revenue Targets</h3>
            <div className="inline-flex items-center px-2 py-1 rounded-md bg-blue-100 text-blue-700 border border-blue-200 text-xs font-medium">
              Optional
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="subscription-toggle" className="text-sm font-medium">
              Enable SaaS Revenue
            </Label>
            <Switch
              id="subscription-toggle"
              checked={subscriptionEnabled}
              onCheckedChange={(checked) => {
                setSubscriptionEnabled(checked)
                if (!checked) {
                  // Clear values when disabled
                  setFormData(prev => ({
                    ...prev,
                    target_monthly_active_users: 0,
                    target_avg_subscription_fee: 0
                  }))
                } else {
                  // Set default values when enabled
                  setFormData(prev => ({
                    ...prev,
                    target_monthly_active_users: prev.target_monthly_active_users || 10,
                    target_avg_subscription_fee: prev.target_avg_subscription_fee || 25
                  }))
                }
              }}
            />
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Only enable this if you have SaaS products, subscriptions, or recurring revenue streams alongside your time-based work.
        </p>

        {subscriptionEnabled ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="target_monthly_active_users" className="text-sm font-medium">
                  Monthly Active Users Target
                </Label>
                <Input
                  id="target_monthly_active_users"
                  type="number"
                  min="1"
                  max="1000"
                  value={formData.target_monthly_active_users || ''}
                  onChange={(e) => handleInputChange('target_monthly_active_users', parseInt(e.target.value) || 0)}
                  className="mt-1"
                  placeholder="10"
                />
                <p className="text-xs text-muted-foreground mt-1">Target paying subscribers (1-1000)</p>
              </div>
              <div>
                <Label htmlFor="target_avg_subscription_fee" className="text-sm font-medium">
                  Average Subscription Fee (€)
                </Label>
                <Input
                  id="target_avg_subscription_fee"
                  type="number"
                  min="1"
                  max="500"
                  value={formData.target_avg_subscription_fee || ''}
                  onChange={(e) => handleInputChange('target_avg_subscription_fee', parseInt(e.target.value) || 0)}
                  className="mt-1"
                  placeholder="25"
                />
                <p className="text-xs text-muted-foreground mt-1">Average monthly fee per subscriber (€1-€500)</p>
              </div>
            </div>
            <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  Subscription Revenue: €{subscriptionRevenue.toLocaleString()}/month
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg text-center">
            <p className="text-sm text-muted-foreground">
              SaaS revenue stream is disabled. Most freelancers only need time-based revenue tracking. Enable SaaS revenue only if you have subscription products or recurring revenue streams.
            </p>
          </div>
        )}
      </Card>

      {/* Cost Target Section */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calculator className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Monthly Cost Target</h3>
        </div>
        <div className="max-w-md">
          <Label htmlFor="monthly_cost_target" className="text-sm font-medium">
            Monthly Cost Target (€)
          </Label>
          <Input
            id="monthly_cost_target"
            type="number"
            min="0"
            max="50000"
            value={formData.monthly_cost_target}
            onChange={(e) => handleInputChange('monthly_cost_target', parseInt(e.target.value) || 0)}
            className="mt-1"
          />
          <p className="text-xs text-muted-foreground mt-1">Expected monthly business costs (€0-€50,000)</p>
        </div>
      </Card>

      {/* Total Summary */}
      <Card className="p-6 bg-gradient-to-r from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20">
        <div className="flex items-center gap-2 mb-4">
          <Target className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Calculated Targets</h3>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm">Time-based Revenue:</span>
            <span className="font-semibold">€{timeBasedRevenue.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Subscription Revenue:</span>
            <span className="font-semibold">€{subscriptionRevenue.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center border-t pt-2">
            <span className="font-medium">Total Monthly Revenue:</span>
            <span className="font-bold text-lg">€{calculatedRevenue.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Monthly Costs:</span>
            <span className="font-semibold">€{formData.monthly_cost_target.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center border-t pt-2">
            <span className="font-semibold text-primary">Target Monthly Profit:</span>
            <span className={`font-bold text-lg ${calculatedProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              €{calculatedProfit.toLocaleString()}
            </span>
          </div>
        </div>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="min-w-[120px]"
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Saving...
            </div>
          ) : (
            'Save Targets'
          )}
        </Button>
      </div>
    </form>
  )
}
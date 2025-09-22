'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Target,
  TrendingUp,
  DollarSign,
  Calculator,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Trophy,
  AlertCircle
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ProfitTargetSetupModalV2Props {
  onComplete: (targets: any) => void
  onClose: () => void
  isModal?: boolean
}

export function ProfitTargetSetupModalV2({
  onComplete,
  onClose,
  isModal = true
}: ProfitTargetSetupModalV2Props) {
  // Minimal state - no complex derived state
  const [currentStep, setCurrentStep] = useState(1)
  const [revenue, setRevenue] = useState('')
  const [costs, setCosts] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<{revenue?: string, costs?: string}>({})
  const { toast } = useToast()

  // Simple profit calculation
  const profit = revenue && costs ? parseFloat(revenue) - parseFloat(costs) : 0

  // Direct handlers - no optimization initially
  const handleRevenueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setRevenue(value)
    if (errors.revenue) {
      setErrors(prev => ({ ...prev, revenue: undefined }))
    }
  }

  const handleCostsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setCosts(value)
    if (errors.costs) {
      setErrors(prev => ({ ...prev, costs: undefined }))
    }
  }

  const validateStep2 = () => {
    const newErrors: {revenue?: string, costs?: string} = {}

    if (!revenue || parseFloat(revenue) <= 0) {
      newErrors.revenue = 'Please enter a valid revenue amount'
    }
    if (!costs || parseFloat(costs) < 0) {
      newErrors.costs = 'Please enter a valid cost amount'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (currentStep === 2 && !validateStep2()) {
      return
    }
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    if (!validateStep2()) return

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/profit-targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monthly_revenue_target_cents: Math.round(parseFloat(revenue) * 100),
          monthly_cost_target_cents: Math.round(parseFloat(costs) * 100),
          setup_step_completed: 3
        })
      })

      if (!response.ok) throw new Error('Failed to save targets')

      const result = await response.json()

      toast({
        title: "🎉 Profit Targets Set!",
        description: "Your financial goals are now configured. Let's start tracking your progress!",
      })

      onComplete({
        ...result.data,
        monthly_revenue_target: parseFloat(revenue),
        monthly_cost_target: parseFloat(costs),
        monthly_profit_target: profit,
        currency_code: 'EUR',
        setup_completed: true,
        setup_step_completed: 3
      })
    } catch (error) {
      console.error('Error saving profit targets:', error)
      toast({
        title: "Error",
        description: "Failed to save profit targets. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const progress = (currentStep / 3) * 100

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto dashboard-card-glass border-0">
        <CardHeader className="text-center space-y-4 border-b border-slate-200/20">
          <div className="flex items-center justify-center">
            <Badge variant="outline" className="text-xs bg-white/10 border-slate-300/30 text-foreground font-medium">
              Step {currentStep} of 3 • Required Setup
            </Badge>
          </div>

          <Progress
            value={progress}
            className="w-full h-3 bg-slate-200/50 dark:bg-slate-800/50"
            indicatorClassName="bg-gradient-to-r from-primary to-blue-500 chart-glow-blue transition-all duration-500 ease-out"
          />

          <div className="flex items-center justify-center gap-3">
            {currentStep === 1 && <Sparkles className="h-8 w-8 text-primary chart-glow-blue" />}
            {currentStep === 2 && <DollarSign className="h-8 w-8 text-primary chart-glow-blue" />}
            {currentStep === 3 && <CheckCircle className="h-8 w-8 text-emerald-500 chart-glow-green" />}
            <div className="text-left">
              <CardTitle className="text-xl text-foreground">
                {currentStep === 1 && "Welcome to Your Financial Journey! 🚀"}
                {currentStep === 2 && "Set Your Monthly Targets 💰"}
                {currentStep === 3 && "You're All Set! 🎉"}
              </CardTitle>
              <CardDescription className="text-base text-muted-foreground">
                {currentStep === 1 && "Let's set up your profit targets to track your business success"}
                {currentStep === 2 && "Define your revenue and cost targets for tracking"}
                {currentStep === 3 && "Your profit targets are configured and ready to track"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-8">
          {/* Step 1 */}
          {currentStep === 1 && (
            <div className="space-y-6 text-center">
              <div className="mx-auto w-24 h-24 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center border border-primary/20">
                <Target className="h-12 w-12 text-primary chart-glow-blue" />
              </div>
              <div className="space-y-4">
                <p className="text-lg text-muted-foreground">
                  Setting clear financial targets is required to use your dashboard.
                  This will help you:
                </p>
                <div className="mobile-card-glass p-4 border border-primary/20">
                  <p className="text-sm text-foreground font-medium">
                    💡 Don't worry - you can easily change these targets anytime in Settings
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="mobile-card-glass p-6 kpi-card border border-primary/10">
                    <TrendingUp className="h-8 w-8 text-primary chart-glow-blue mx-auto mb-3" />
                    <p className="font-medium text-foreground">Track Progress</p>
                    <p className="text-sm text-muted-foreground mt-1">Monitor your growth</p>
                  </div>
                  <div className="mobile-card-glass p-6 kpi-card border border-emerald-500/10">
                    <Calculator className="h-8 w-8 text-emerald-500 chart-glow-green mx-auto mb-3" />
                    <p className="font-medium text-foreground">Plan Budgets</p>
                    <p className="text-sm text-muted-foreground mt-1">Smart financial planning</p>
                  </div>
                  <div className="mobile-card-glass p-6 kpi-card border border-accent/10">
                    <Trophy className="h-8 w-8 text-accent chart-glow-orange mx-auto mb-3" />
                    <p className="font-medium text-foreground">Achieve Goals</p>
                    <p className="text-sm text-muted-foreground mt-1">Reach your targets</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2 */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="revenue-input" className="text-base font-medium flex items-center gap-2 text-foreground">
                    <TrendingUp className="h-5 w-5 text-emerald-500 chart-glow-green" />
                    Monthly Revenue Target
                  </Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground font-medium">€</span>
                    <Input
                      id="revenue-input"
                      type="number"
                      placeholder="8,500"
                      value={revenue}
                      onChange={handleRevenueChange}
                      className={`pl-10 text-lg h-14 transition-all focus:ring-2 focus:ring-primary ${
                        errors.revenue ? 'border-destructive focus:border-destructive' : 'border-input focus:border-primary'
                      }`}
                    />
                  </div>
                  {errors.revenue && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {errors.revenue}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    How much revenue do you aim to generate monthly?
                  </p>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="costs-input" className="text-base font-medium flex items-center gap-2 text-foreground">
                    <Calculator className="h-5 w-5 text-accent chart-glow-orange" />
                    Monthly Cost Target
                  </Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground font-medium">€</span>
                    <Input
                      id="costs-input"
                      type="number"
                      placeholder="3,500"
                      value={costs}
                      onChange={handleCostsChange}
                      className={`pl-10 text-lg h-14 transition-all focus:ring-2 focus:ring-primary ${
                        errors.costs ? 'border-destructive focus:border-destructive' : 'border-input focus:border-primary'
                      }`}
                    />
                  </div>
                  {errors.costs && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {errors.costs}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    What are your expected monthly business costs?
                  </p>
                </div>
              </div>

              {revenue && costs && (
                <div className="mobile-card-glass p-6 border border-primary/20">
                  <div className="flex items-center justify-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-full">
                      <Target className="h-8 w-8 text-primary chart-glow-blue" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground font-medium">Your Monthly Profit Target</p>
                      <p className={`text-3xl font-bold metric-number ${profit >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                        €{Math.abs(profit).toLocaleString('nl-NL')}
                        {profit < 0 && <span className="text-sm ml-1">(Loss)</span>}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mobile-card-glass p-4 border border-primary/20">
                <p className="text-sm text-foreground font-medium">
                  💡 These numbers help track your business performance - you can adjust them anytime
                </p>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {currentStep === 3 && (
            <div className="space-y-6 text-center">
              <div className="mx-auto w-24 h-24 bg-gradient-to-br from-emerald-500/20 to-primary/20 rounded-full flex items-center justify-center border border-emerald-500/20">
                <Trophy className="h-12 w-12 text-emerald-500 chart-glow-green" />
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="mobile-card-glass p-6 border border-emerald-500/10">
                    <TrendingUp className="h-8 w-8 text-emerald-500 chart-glow-green mx-auto mb-3" />
                    <p className="text-sm font-medium text-foreground">Revenue Target</p>
                    <p className="text-xl font-bold text-emerald-500 metric-number">€{parseFloat(revenue || '0').toLocaleString('nl-NL')}</p>
                  </div>
                  <div className="mobile-card-glass p-6 border border-accent/10">
                    <Calculator className="h-8 w-8 text-accent chart-glow-orange mx-auto mb-3" />
                    <p className="text-sm font-medium text-foreground">Cost Target</p>
                    <p className="text-xl font-bold text-accent metric-number">€{parseFloat(costs || '0').toLocaleString('nl-NL')}</p>
                  </div>
                  <div className="mobile-card-glass p-6 border border-primary/10">
                    <Target className="h-8 w-8 text-primary chart-glow-blue mx-auto mb-3" />
                    <p className="text-sm font-medium text-foreground">Profit Target</p>
                    <p className={`text-xl font-bold metric-number ${profit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                      €{Math.abs(profit).toLocaleString('nl-NL')}
                    </p>
                  </div>
                </div>

                <div className="mobile-card-glass p-6 border border-primary/20">
                  <p className="text-base text-foreground">
                    🎯 Your dashboard will now track progress towards these targets with real-time insights and gamified achievements!
                  </p>
                </div>

                <div className="mobile-card-glass p-4 border border-primary/20">
                  <p className="text-sm text-foreground font-medium">
                    💡 Remember: You can easily adjust these targets anytime in Settings → Business
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-8 border-t border-border mt-8">
            {currentStep > 1 && (
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={isSubmitting}
                className="px-6 py-3"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
            )}

            {currentStep < 3 ? (
              <Button
                onClick={handleNext}
                disabled={currentStep === 2 && (!revenue || !costs)}
                className="px-6 py-3 btn-primary-glow"
              >
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !revenue || !costs}
                className="px-6 py-3 btn-primary-glow"
              >
                {isSubmitting ? 'Saving...' : 'Complete Setup'}
                <CheckCircle className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
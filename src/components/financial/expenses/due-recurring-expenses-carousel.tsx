'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plus, Settings, ArrowLeft, ArrowRight, Loader2, AlertTriangle } from 'lucide-react'
import { formatEuropeanCurrency } from '@/lib/utils/formatEuropeanNumber'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface DueRecurringExpense {
  template: {
    id: string
    name: string
    description?: string
    amount: number
    frequency: string
    vat_rate: number
  }
  occurrences_due: number
  total_amount: number
  next_occurrence_date: string
  last_occurrence_date: string
}

interface DueRecurringExpensesCarouselProps {
  onExpenseCreated?: () => void
  variant?: 'default' | 'glass'
}

const frequencyLabels: Record<string, string> = {
  weekly: 'Wekelijks',
  monthly: 'Maandelijks',
  quarterly: 'Kwartaal',
  yearly: 'Jaarlijks'
}

export function DueRecurringExpensesCarousel({ onExpenseCreated, variant = 'default' }: DueRecurringExpensesCarouselProps) {
  const router = useRouter()
  const [dueExpenses, setDueExpenses] = useState<DueRecurringExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const isGlass = variant === 'glass'

  useEffect(() => {
    fetchDueExpenses()
  }, [])

  const fetchDueExpenses = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/recurring-expenses/due')

      if (!response.ok) {
        throw new Error('Failed to fetch due recurring expenses')
      }

      const data = await response.json()
      setDueExpenses(data.data || [])
    } catch (error) {
      console.error('Error fetching due recurring expenses:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateExpenses = async (templateId: string) => {
    try {
      setCreating(templateId)

      const response = await fetch(`/api/recurring-expenses/templates/${templateId}/create-expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const contentType = response.headers.get('content-type') || ''
      const parseJson = async () => {
        if (contentType.includes('application/json')) {
          return response.json()
        }
        const text = await response.text()
        try {
          return JSON.parse(text)
        } catch {
          return { message: text }
        }
      }

      if (!response.ok) {
        const error = await parseJson()
        throw new Error(error.message || 'Failed to create expenses')
      }

      const result = await parseJson()

      // Remove this expense from the list
      setDueExpenses(prev => prev.filter(exp => exp.template.id !== templateId))

      // Adjust current index if needed
      if (currentIndex >= dueExpenses.length - 1 && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1)
      }

      // Notify parent component
      onExpenseCreated?.()

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('expense:created', {
          detail: {
            templateId,
            expensesCreated: result?.data?.count || outstandingOccurrences.length,
            source: 'recurring_template'
          }
        }))
      }

      // Show success message
      toast.success('Expenses created!', {
        description: `Successfully created ${result.data.count} expense(s)`
      })
    } catch (error) {
      console.error('Error creating expenses:', error)
      toast.error('Failed to create expenses', {
        description: error instanceof Error ? error.message : 'An error occurred'
      })
    } finally {
      setCreating(null)
    }
  }

  const handleAdjustTemplate = (templateId: string) => {
    router.push(`/dashboard/financieel-v2/terugkerende-uitgaven?edit=${templateId}`)
  }

  const goToNext = () => {
    if (currentIndex < dueExpenses.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  // Don't show if no due expenses
  if (!loading && dueExpenses.length === 0) {
    return null
  }

  if (loading) {
    return (
      <Card
        className={cn(
          'border-dashed border-2 border-orange-300 bg-orange-50/50',
          isGlass && 'bg-gradient-to-br from-slate-950/95 via-slate-900/90 to-slate-950/95 border-white/10 backdrop-blur-2xl text-slate-200 shadow-[0_30px_80px_rgba(15,23,42,0.45)]'
        )}
      >
        <CardContent className="py-8">
          <div className={cn('flex items-center justify-center gap-2 text-orange-600', isGlass && 'text-sky-300')}>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Terugkerende uitgaven controleren...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const currentExpense = dueExpenses[currentIndex]

  return (
    <Card
      className={cn(
        'border-2 border-orange-300 bg-orange-50/50',
        isGlass && 'bg-gradient-to-br from-slate-950/95 via-slate-900/90 to-slate-950/95 border-white/10 backdrop-blur-2xl text-slate-100 shadow-[0_30px_80px_rgba(15,23,42,0.45)]'
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start sm:items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className={cn('h-4 w-4 sm:h-5 sm:w-5 text-orange-600 flex-shrink-0', isGlass && 'text-sky-300')} />
            <CardTitle className={cn('text-orange-900 text-sm sm:text-base truncate', isGlass && 'text-slate-100 font-semibold')}>
              Terugkerende uitgaven te verwerken
            </CardTitle>
          </div>
          <Badge
            variant="secondary"
            className={cn(
              'bg-orange-200 text-orange-900 text-xs flex-shrink-0',
              isGlass && 'bg-sky-400/20 text-sky-200 border border-white/10 backdrop-blur'
            )}
          >
            {dueExpenses.length} {dueExpenses.length === 1 ? 'template' : 'templates'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-4">
        {/* Carousel Card */}
        <div
          className={cn(
            'bg-white rounded-lg border-2 border-orange-200 p-4 space-y-3',
            isGlass && 'bg-white/5 border-white/10 backdrop-blur-xl text-slate-100'
          )}
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1 min-w-0">
              <h3 className={cn('text-base font-semibold text-gray-900 truncate', isGlass && 'text-slate-100')}>
                {currentExpense.template.name}
              </h3>
              {currentExpense.template.description && (
                <p className={cn('text-sm text-gray-600 line-clamp-2', isGlass && 'text-slate-300/80')}>
                  {currentExpense.template.description}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge
                  variant="outline"
                  className={cn('text-xs', isGlass && 'border-white/20 text-slate-100 bg-transparent')}
                >
                  {frequencyLabels[currentExpense.template.frequency] || currentExpense.template.frequency}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn('text-xs', isGlass && 'border-white/20 text-slate-100 bg-transparent')}
                >
                  {currentExpense.template.vat_rate}% BTW
                </Badge>
              </div>
            </div>
          </div>

          {/* Occurrence Info */}
          <Alert
            className={cn('bg-orange-50 border-orange-200', isGlass && 'bg-white/5 border-white/10 text-slate-100')}
          >
            <AlertDescription className={cn('text-sm', isGlass && 'text-slate-100')}>
              <div className="space-y-1">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <span className={cn('font-medium text-orange-900 text-xs sm:text-sm', isGlass && 'text-slate-100')}>
                    {currentExpense.occurrences_due} {currentExpense.occurrences_due === 1 ? 'uitgave' : 'uitgaven'} te verwerken
                  </span>
                  <span className={cn('text-orange-900 font-semibold text-xs sm:text-sm', isGlass && 'text-sky-200')}>
                    {formatEuropeanCurrency(currentExpense.total_amount)} totaal
                  </span>
                </div>
                <div className={cn('text-xs text-orange-700 break-words', isGlass && 'text-slate-300/80')}>
                  Periode: {new Date(currentExpense.next_occurrence_date).toLocaleDateString('nl-NL')} - {new Date(currentExpense.last_occurrence_date).toLocaleDateString('nl-NL')}
                </div>
              </div>
            </AlertDescription>
          </Alert>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch gap-2">
            <Button
              onClick={() => handleCreateExpenses(currentExpense.template.id)}
              disabled={creating === currentExpense.template.id}
              className={cn(
                'flex-1 bg-orange-600 hover:bg-orange-700 text-white text-sm',
                isGlass && 'bg-sky-500/90 hover:bg-sky-400 text-slate-900 font-medium shadow-[0_18px_40px_rgba(56,189,248,0.35)]'
              )}
            >
              {creating === currentExpense.template.id ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Toevoegen...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Toevoegen
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleAdjustTemplate(currentExpense.template.id)}
              className={cn(
                'flex-1 text-sm',
                isGlass && 'border-white/15 text-slate-100 hover:bg-white/10 hover:text-slate-100'
              )}
            >
              <Settings className="h-4 w-4 mr-2" />
              Aanpassen
            </Button>
          </div>
        </div>

        {/* Navigation */}
        {dueExpenses.length > 1 && (
          <div className="flex items-center justify-between pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToPrevious}
              disabled={currentIndex === 0}
              className={cn(
                'text-xs sm:text-sm px-2 sm:px-3',
                isGlass && 'text-slate-200 hover:text-slate-100 hover:bg-white/10 disabled:opacity-40'
              )}
            >
              <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              <span className="hidden sm:inline">Vorige</span>
            </Button>
            <span className={cn('text-xs sm:text-sm text-gray-600 px-2', isGlass && 'text-slate-300/70')}>
              {currentIndex + 1} van {dueExpenses.length}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={goToNext}
              disabled={currentIndex === dueExpenses.length - 1}
              className={cn(
                'text-xs sm:text-sm px-2 sm:px-3',
                isGlass && 'text-slate-200 hover:text-slate-100 hover:bg-white/10 disabled:opacity-40'
              )}
            >
              <span className="hidden sm:inline">Volgende</span>
              <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 ml-1" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

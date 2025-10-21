'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Repeat, Plus, Settings, ArrowLeft, ArrowRight, Loader2, CheckCircle, AlertTriangle } from 'lucide-react'
import { formatEuropeanCurrency } from '@/lib/utils/formatEuropeanNumber'
import { useRouter } from 'next/navigation'

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
}

const frequencyLabels: Record<string, string> = {
  weekly: 'Wekelijks',
  monthly: 'Maandelijks',
  quarterly: 'Kwartaal',
  yearly: 'Jaarlijks'
}

export function DueRecurringExpensesCarousel({ onExpenseCreated }: DueRecurringExpensesCarouselProps) {
  const router = useRouter()
  const [dueExpenses, setDueExpenses] = useState<DueRecurringExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)

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

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create expenses')
      }

      const result = await response.json()

      // Remove this expense from the list
      setDueExpenses(prev => prev.filter(exp => exp.template.id !== templateId))

      // Adjust current index if needed
      if (currentIndex >= dueExpenses.length - 1 && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1)
      }

      // Notify parent component
      onExpenseCreated?.()

      // Show success message
      alert(`${result.data.count} uitgave(n) succesvol aangemaakt!`)
    } catch (error) {
      console.error('Error creating expenses:', error)
      alert(error instanceof Error ? error.message : 'Fout bij aanmaken van uitgaven')
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
      <Card className="border-dashed border-2 border-orange-300 bg-orange-50/50">
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-2 text-orange-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Terugkerende uitgaven controleren...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const currentExpense = dueExpenses[currentIndex]

  return (
    <Card className="border-2 border-orange-300 bg-orange-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-start sm:items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 flex-shrink-0" />
            <CardTitle className="text-orange-900 text-sm sm:text-base truncate">Terugkerende uitgaven te verwerken</CardTitle>
          </div>
          <Badge variant="secondary" className="bg-orange-200 text-orange-900 text-xs flex-shrink-0">
            {dueExpenses.length} {dueExpenses.length === 1 ? 'template' : 'templates'}
          </Badge>
        </div>
        <CardDescription className="text-orange-800 text-xs sm:text-sm">
          Deze terugkerende uitgaven zijn verlopen en kunnen automatisch worden toegevoegd
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 px-4">
        {/* Carousel Card */}
        <div className="bg-white rounded-lg border-2 border-orange-200 p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1 min-w-0">
              <h3 className="text-base font-semibold text-gray-900 truncate">{currentExpense.template.name}</h3>
              {currentExpense.template.description && (
                <p className="text-sm text-gray-600 line-clamp-2">{currentExpense.template.description}</p>
              )}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant="outline" className="text-xs">
                  {frequencyLabels[currentExpense.template.frequency] || currentExpense.template.frequency}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {currentExpense.template.vat_rate}% BTW
                </Badge>
              </div>
            </div>
          </div>

          {/* Occurrence Info */}
          <Alert className="bg-orange-50 border-orange-200">
            <AlertDescription className="text-sm">
              <div className="space-y-1">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <span className="font-medium text-orange-900 text-xs sm:text-sm">
                    {currentExpense.occurrences_due} {currentExpense.occurrences_due === 1 ? 'uitgave' : 'uitgaven'} te verwerken
                  </span>
                  <span className="text-orange-900 font-semibold text-xs sm:text-sm">
                    {formatEuropeanCurrency(currentExpense.total_amount)} totaal
                  </span>
                </div>
                <div className="text-xs text-orange-700 break-words">
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
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white text-sm"
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
              className="flex-1 text-sm"
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
              className="text-xs sm:text-sm px-2 sm:px-3"
            >
              <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              <span className="hidden sm:inline">Vorige</span>
            </Button>
            <span className="text-xs sm:text-sm text-gray-600 px-2">
              {currentIndex + 1} van {dueExpenses.length}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={goToNext}
              disabled={currentIndex === dueExpenses.length - 1}
              className="text-xs sm:text-sm px-2 sm:px-3"
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

'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatEuropeanCurrency } from '@/lib/utils/formatEuropeanNumber'
import { Calendar, TrendingUp, Euro, Loader2 } from 'lucide-react'

interface PreviewModalProps {
  template: any
  open: boolean
  onClose: () => void
}

interface Occurrence {
  date: string
  amount: number
  gross_amount: number
  vat_amount: number
  deductible_vat_amount: number
}

interface PreviewData {
  occurrences: Occurrence[]
  metrics: {
    count: number
    total_cost: number
    annual_cost: number
    average_monthly_cost: number
  }
}

export function PreviewModal({ template, open, onClose }: PreviewModalProps) {
  const [loading, setLoading] = useState(true)
  const [previewData, setPreviewData] = useState<PreviewData | null>(null)

  useEffect(() => {
    if (open && template) {
      fetchPreview()
    }
  }, [open, template])

  const fetchPreview = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/recurring-expenses/templates/${template.id}/preview?count=6`)
      const data = await response.json()

      if (data.success) {
        setPreviewData(data.data)
      }
    } catch (error) {
      console.error('Error fetching preview:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Preview Recurring Expense: {template?.name}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : previewData ? (
          <div className="space-y-6">
            {/* Metrics */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <TrendingUp className="h-4 w-4" />
                  Annual Cost
                </div>
                <div className="text-2xl font-bold">
                  {formatEuropeanCurrency(previewData.metrics.annual_cost)}
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Calendar className="h-4 w-4" />
                  Monthly Average
                </div>
                <div className="text-2xl font-bold">
                  {formatEuropeanCurrency(previewData.metrics.average_monthly_cost)}
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Euro className="h-4 w-4" />
                  Total (6 months)
                </div>
                <div className="text-2xl font-bold">
                  {formatEuropeanCurrency(previewData.metrics.total_cost)}
                </div>
              </div>
            </div>

            {/* Occurrences */}
            <div>
              <h3 className="font-medium mb-3">Next 6 Occurrences</h3>
              <div className="space-y-2">
                {previewData.occurrences.map((occurrence, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <div className="font-medium">
                        {new Date(occurrence.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Excl. VAT: {formatEuropeanCurrency(occurrence.amount)}
                        {occurrence.vat_amount > 0 && (
                          <> • VAT: {formatEuropeanCurrency(occurrence.vat_amount)}</>
                        )}
                        {occurrence.deductible_vat_amount > 0 && (
                          <> • Deductible: {formatEuropeanCurrency(occurrence.deductible_vat_amount)}</>
                        )}
                      </div>
                    </div>
                    <div className="text-lg font-bold">
                      {formatEuropeanCurrency(occurrence.gross_amount)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Info */}
            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
              💡 This forecast is automatically added to your cashflow forecast
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            Could not load preview
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

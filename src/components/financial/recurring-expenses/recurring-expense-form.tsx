'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Loader2 } from 'lucide-react'

interface RecurringExpenseFormProps {
  template?: any
  onSuccess: () => void
  onCancel: () => void
}

export function RecurringExpenseForm({ template, onSuccess, onCancel }: RecurringExpenseFormProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    amount: '',
    frequency: 'monthly',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    day_of_month: '',
    amount_escalation_percentage: '',
    vat_rate: '21.00',
    is_vat_deductible: true,
    business_use_percentage: '100',
    is_active: true
  })

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name || '',
        description: template.description || '',
        amount: template.amount?.toString() || '',
        frequency: template.frequency || 'monthly',
        start_date: template.start_date || new Date().toISOString().split('T')[0],
        end_date: template.end_date || '',
        day_of_month: template.day_of_month?.toString() || '',
        amount_escalation_percentage: template.amount_escalation_percentage?.toString() || '',
        vat_rate: template.vat_rate?.toString() || '21.00',
        is_vat_deductible: template.is_vat_deductible !== false,
        business_use_percentage: template.business_use_percentage?.toString() || '100',
        is_active: template.is_active !== false
      })
    }
  }, [template])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload = {
        name: formData.name,
        description: formData.description || null,
        amount: parseFloat(formData.amount),
        frequency: formData.frequency,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        day_of_month: formData.day_of_month ? parseInt(formData.day_of_month) : null,
        amount_escalation_percentage: formData.amount_escalation_percentage ? parseFloat(formData.amount_escalation_percentage) : null,
        vat_rate: parseFloat(formData.vat_rate),
        is_vat_deductible: formData.is_vat_deductible,
        business_use_percentage: parseFloat(formData.business_use_percentage),
        is_active: formData.is_active,
        next_occurrence: formData.start_date
      }

      const url = template
        ? `/api/recurring-expenses/templates/${template.id}`
        : '/api/recurring-expenses/templates'

      const response = await fetch(url, {
        method: template ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        onSuccess()
      } else {
        const error = await response.json()
        alert(error.message || 'Er is een fout opgetreden')
      }
    } catch (error) {
      console.error('Form submission error:', error)
      alert('Er is een fout opgetreden')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Naam *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="bijv. Kantoorhuur, Adobe CC, etc."
            required
          />
        </div>

        <div>
          <Label htmlFor="description">Omschrijving</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Optionele beschrijving..."
            rows={2}
          />
        </div>
      </div>

      {/* Amount & Frequency */}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="amount">Bedrag (excl. BTW) *</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            placeholder="0.00"
            required
          />
        </div>

        <div>
          <Label htmlFor="frequency">Frequentie *</Label>
          <Select
            value={formData.frequency}
            onValueChange={(value) => setFormData({ ...formData, frequency: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Wekelijks</SelectItem>
              <SelectItem value="monthly">Maandelijks</SelectItem>
              <SelectItem value="quarterly">Kwartaal</SelectItem>
              <SelectItem value="yearly">Jaarlijks</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Dates */}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="start_date">Startdatum *</Label>
          <Input
            id="start_date"
            type="date"
            value={formData.start_date}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            required
          />
        </div>

        <div>
          <Label htmlFor="end_date">Einddatum (optioneel)</Label>
          <Input
            id="end_date"
            type="date"
            value={formData.end_date}
            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Laat leeg voor onbepaalde tijd
          </p>
        </div>
      </div>

      {/* Monthly day preference */}
      {formData.frequency === 'monthly' && (
        <div>
          <Label htmlFor="day_of_month">Dag van de maand (optioneel)</Label>
          <Input
            id="day_of_month"
            type="number"
            min="1"
            max="31"
            value={formData.day_of_month}
            onChange={(e) => setFormData({ ...formData, day_of_month: e.target.value })}
            placeholder="bijv. 1 voor eerste dag van maand"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Bijvoorbeeld: 1 = eerste dag, 15 = 15e dag
          </p>
        </div>
      )}

      {/* Escalation */}
      <div>
        <Label htmlFor="escalation">Jaarlijkse verhoging % (optioneel)</Label>
        <Input
          id="escalation"
          type="number"
          step="0.1"
          min="0"
          max="100"
          value={formData.amount_escalation_percentage}
          onChange={(e) => setFormData({ ...formData, amount_escalation_percentage: e.target.value })}
          placeholder="bijv. 2.5 voor 2.5% per jaar"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Voor inflatie-aanpassingen of contractuele verhogingen
        </p>
      </div>

      {/* VAT Settings */}
      <div className="space-y-4 p-4 border rounded-lg">
        <h3 className="font-medium">BTW Instellingen</h3>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="vat_rate">BTW Tarief %</Label>
            <Input
              id="vat_rate"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={formData.vat_rate}
              onChange={(e) => setFormData({ ...formData, vat_rate: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="business_use">Zakelijk gebruik %</Label>
            <Input
              id="business_use"
              type="number"
              min="0"
              max="100"
              value={formData.business_use_percentage}
              onChange={(e) => setFormData({ ...formData, business_use_percentage: e.target.value })}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="vat_deductible">BTW aftrekbaar?</Label>
          <Switch
            id="vat_deductible"
            checked={formData.is_vat_deductible}
            onCheckedChange={(checked) => setFormData({ ...formData, is_vat_deductible: checked })}
          />
        </div>
      </div>

      {/* Active Status */}
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div>
          <Label htmlFor="is_active">Template actief</Label>
          <p className="text-sm text-muted-foreground">
            Alleen actieve templates worden meegenomen in cashflow voorspelling
          </p>
        </div>
        <Switch
          id="is_active"
          checked={formData.is_active}
          onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Annuleren
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {template ? 'Bijwerken' : 'Aanmaken'}
        </Button>
      </div>
    </form>
  )
}

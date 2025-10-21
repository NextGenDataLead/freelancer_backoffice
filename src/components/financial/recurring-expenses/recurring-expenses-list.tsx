'use client'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatEuropeanCurrency } from '@/lib/utils/formatEuropeanNumber'
import { Edit, Trash2, Eye, Power, PowerOff } from 'lucide-react'

interface Template {
  id: string
  name: string
  description?: string
  amount: number
  frequency: string
  is_active: boolean
  next_occurrence: string
  annual_cost?: number
  category?: { name: string }
}

interface RecurringExpensesListProps {
  templates: Template[]
  loading: boolean
  onEdit: (template: Template) => void
  onDelete: (id: string) => void
  onToggleActive: (template: Template) => void
  onPreview: (template: Template) => void
}

const frequencyLabels: Record<string, string> = {
  weekly: 'Wekelijks',
  monthly: 'Maandelijks',
  quarterly: 'Kwartaal',
  yearly: 'Jaarlijks'
}

export function RecurringExpensesList({
  templates,
  loading,
  onEdit,
  onDelete,
  onToggleActive,
  onPreview
}: RecurringExpensesListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Templates laden...</p>
        </div>
      </div>
    )
  }

  if (templates.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed rounded-lg">
        <h3 className="text-lg font-medium mb-2">Geen terugkerende uitgaven</h3>
        <p className="text-muted-foreground mb-4">
          Maak je eerste template om vaste kosten automatisch te voorspellen
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Naam</TableHead>
            <TableHead>Frequentie</TableHead>
            <TableHead>Bedrag</TableHead>
            <TableHead>Jaarkosten</TableHead>
            <TableHead>Volgende</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Acties</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {templates.map((template) => (
            <TableRow key={template.id} className={!template.is_active ? 'opacity-50' : ''}>
              <TableCell>
                <div>
                  <div className="font-medium">{template.name}</div>
                  {template.description && (
                    <div className="text-sm text-muted-foreground">{template.description}</div>
                  )}
                  {template.category && (
                    <Badge variant="outline" className="mt-1 text-xs">
                      {template.category.name}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">
                  {frequencyLabels[template.frequency] || template.frequency}
                </Badge>
              </TableCell>
              <TableCell className="font-medium">
                {formatEuropeanCurrency(template.amount)}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {template.annual_cost ? formatEuropeanCurrency(template.annual_cost) : '-'}
              </TableCell>
              <TableCell className="text-sm">
                {new Date(template.next_occurrence).toLocaleDateString('nl-NL', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </TableCell>
              <TableCell>
                <Badge variant={template.is_active ? 'default' : 'secondary'}>
                  {template.is_active ? 'Actief' : 'Inactief'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onPreview(template)}
                    title="Bekijk voorspelling"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onToggleActive(template)}
                    title={template.is_active ? 'Deactiveren' : 'Activeren'}
                  >
                    {template.is_active ? (
                      <PowerOff className="h-4 w-4" />
                    ) : (
                      <Power className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(template)}
                    title="Bewerken"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(template.id)}
                    title="Verwijderen"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

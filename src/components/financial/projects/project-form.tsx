'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Loader2, FolderOpen, Euro, Info } from 'lucide-react'

// Validation schemas
const CreateProjectSchema = z.object({
  name: z.string().min(1, 'Projectnaam is verplicht'),
  description: z.string().optional(),
  hourly_rate: z.preprocess(
    (val) => {
      if (val === '' || val === null || val === undefined) return undefined
      const num = Number(val)
      return isNaN(num) ? undefined : num
    },
    z.number().positive('Uurtarief moet positief zijn').optional()
  )
})

const UpdateProjectSchema = CreateProjectSchema.extend({
  id: z.string().uuid()
})

// Types
interface Client {
  id: string
  name: string
  company_name?: string
  hourly_rate?: number
  is_business: boolean
}

interface Project {
  id: string
  name: string
  description?: string
  hourly_rate?: number
  client_id: string
  active: boolean
}

interface ProjectWithClient extends Project {
  clients: Client
}

interface ProjectFormProps {
  client: Client
  project?: ProjectWithClient
  onSuccess?: (project: ProjectWithClient) => void
  onCancel?: () => void
}

export function ProjectForm({ client, project, onSuccess, onCancel }: ProjectFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const schema = project ? UpdateProjectSchema : CreateProjectSchema
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      ...(project ? { id: project.id } : {}),
      name: project?.name || '',
      description: project?.description || '',
      hourly_rate: project?.hourly_rate || undefined,
    },
  })

  const watchedHourlyRate = form.watch('hourly_rate')

  // Determine effective hourly rate (project overrides client)
  const getEffectiveRate = () => {
    if (watchedHourlyRate && watchedHourlyRate > 0) {
      return watchedHourlyRate
    }
    return client?.hourly_rate || null
  }

  const getRateSource = () => {
    if (watchedHourlyRate && watchedHourlyRate > 0) {
      return 'project'
    }
    if (client?.hourly_rate) {
      return 'client'
    }
    return 'none'
  }

  const onSubmit = async (data: any) => {
    setIsSubmitting(true)

    try {
      const url = project ? `/api/projects/${project.id}` : '/api/projects'
      const method = project ? 'PATCH' : 'POST'

      // Prepare request data
      const requestData = {
        ...data,
        client_id: client.id,
        ...(project ? { id: project.id } : {}),
        // Convert empty string to null for hourly_rate
        hourly_rate: data.hourly_rate || null
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('API Error:', error)
        throw new Error(error.error || error.message || `Failed to ${project ? 'update' : 'create'} project`)
      }

      const result = await response.json()
      onSuccess?.(result.data)

      // Reset form if creating new project
      if (!project) {
        form.reset()
      }
    } catch (error) {
      console.error('Project form error:', error)
      toast.error('Failed to save project', {
        description: error instanceof Error ? error.message : 'An error occurred'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FolderOpen className="h-5 w-5" />
        <h3 className="text-lg font-medium">
          {project ? 'Project bewerken' : 'Nieuw project'}
        </h3>
      </div>
      
      <div className="text-sm text-muted-foreground">
        Voor: {client.is_business && client.company_name ? client.company_name : client.name}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Project Name */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Projectnaam</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Website redesign, Marketing campagne, etc."
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Project Description */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Beschrijving (optioneel)</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Korte beschrijving van het project..."
                    className="resize-none"
                    rows={3}
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Hourly Rate */}
          <FormField
            control={form.control}
            name="hourly_rate"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Euro className="h-4 w-4" />
                  Uurtarief (optioneel)
                </FormLabel>
                <FormControl>
                  <Input 
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    {...field}
                    value={field.value || ''}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value === '') {
                        field.onChange(undefined)
                      } else {
                        const numValue = parseFloat(value)
                        field.onChange(isNaN(numValue) ? undefined : numValue)
                      }
                    }}
                  />
                </FormControl>
                <FormDescription>
                  Laat leeg om het uurtarief van de klant te gebruiken
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Rate Information Display */}
          <div className="rounded-lg border p-3 bg-muted/50">
            <div className="flex items-center gap-2 text-sm">
              <Info className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Effectief uurtarief:</span>
              {(() => {
                const effectiveRate = getEffectiveRate()
                const source = getRateSource()
                
                if (!effectiveRate) {
                  return (
                    <span className="text-orange-600 dark:text-orange-400">
                      Geen tarief ingesteld
                    </span>
                  )
                }
                
                return (
                  <span className="text-green-600 dark:text-green-400">
                    €{effectiveRate.toFixed(2)}
                    <span className="text-muted-foreground ml-1">
                      ({source === 'project' ? 'project tarief' : 'klant tarief'})
                    </span>
                  </span>
                )
              })()}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {project ? 'Project bijwerken' : 'Project toevoegen'}
            </Button>
            
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Annuleren
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  )
}
'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { 
  FolderOpen, 
  Edit, 
  Trash2, 
  Plus,
  Euro,
  Clock,
  ChevronDown,
  ChevronRight
} from 'lucide-react'

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
  created_at: string
  clients: Client
}

interface ProjectListProps {
  client: Client
  expanded?: boolean
  onToggleExpanded?: () => void
  onEditProject?: (project: Project) => void
  onDeleteProject?: (project: Project) => void
  onCreateProject?: () => void
  onRefresh?: () => void
}

export function ProjectList({ 
  client, 
  expanded = false,
  onToggleExpanded,
  onEditProject, 
  onDeleteProject,
  onCreateProject,
  onRefresh
}: ProjectListProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [updatingProjects, setUpdatingProjects] = useState<Set<string>>(new Set())

  const fetchProjects = async () => {
    if (!expanded) return // Don't fetch if not expanded
    
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/projects?client_id=${client.id}&active=true`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch projects')
      }

      const data = await response.json()
      setProjects(data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  // Fetch projects when expanded
  useEffect(() => {
    if (expanded) {
      fetchProjects()
    }
  }, [expanded, client.id])

  const handleStatusToggle = async (project: Project) => {
    const projectId = project.id
    const newActiveStatus = !project.active
    
    setUpdatingProjects(prev => new Set(prev).add(projectId))
    
    try {
      const response = await fetch(`/api/projects/${projectId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: newActiveStatus })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update project status')
      }

      // Update local state
      setProjects(prev => prev.map(p => 
        p.id === projectId 
          ? { ...p, active: newActiveStatus }
          : p
      ))

    } catch (error) {
      console.error('Error updating project status:', error)
      alert(error instanceof Error ? error.message : 'Error updating project status')
    } finally {
      setUpdatingProjects(prev => {
        const newSet = new Set(prev)
        newSet.delete(projectId)
        return newSet
      })
    }
  }

  const handleDeleteProject = async (project: Project) => {
    if (!confirm(`Weet je zeker dat je project "${project.name}" wilt verwijderen?`)) {
      return
    }

    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete project')
      }

      // Refresh the project list
      fetchProjects()
      
      // Notify parent to refresh client data (project counts)
      onRefresh?.()
      
      if (onDeleteProject) {
        onDeleteProject(project)
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error deleting project')
    }
  }

  const getEffectiveHourlyRate = (project: Project) => {
    return project.hourly_rate || client.hourly_rate || null
  }

  const getRateSource = (project: Project) => {
    if (project.hourly_rate) return 'project'
    if (client.hourly_rate) return 'client'
    return 'none'
  }

  return (
    <div className="border-l-2 border-muted pl-4 ml-2">
      {/* Projects Header */}
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleExpanded}
            className="h-6 w-6 p-0"
          >
            {expanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </Button>
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            Projecten ({projects.length})
          </span>
        </div>

        {expanded && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onCreateProject}
            className="h-6 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Project
          </Button>
        )}
      </div>

      {/* Projects List */}
      {expanded && (
        <div className="space-y-2">
          {loading && (
            <div className="text-sm text-muted-foreground py-4">
              <div className="flex items-center space-x-2">
                <div className="h-3 bg-muted animate-pulse rounded w-24"></div>
                <div className="h-3 bg-muted animate-pulse rounded w-16"></div>
              </div>
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 dark:text-red-400 py-2">
              Fout bij laden van projecten: {error}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={fetchProjects}
                className="ml-2 h-6 text-xs"
              >
                Opnieuw proberen
              </Button>
            </div>
          )}

          {!loading && !error && projects.length === 0 && (
            <div className="text-sm text-muted-foreground py-4">
              <div className="flex items-center justify-between">
                <span>Nog geen projecten</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onCreateProject}
                  className="h-6 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Eerste project
                </Button>
              </div>
            </div>
          )}

          {!loading && !error && projects.map((project) => {
            const effectiveRate = getEffectiveHourlyRate(project)
            const rateSource = getRateSource(project)
            const isUpdating = updatingProjects.has(project.id)

            return (
              <div
                key={project.id}
                className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-medium text-sm truncate">
                      {project.name}
                    </div>
                    {!project.active && (
                      <Badge variant="outline" className="text-xs">
                        Inactief
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 mt-1">
                    {/* Hourly Rate */}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Euro className="h-3 w-3" />
                      {effectiveRate ? (
                        <span>
                          €{effectiveRate.toFixed(2)}
                          <span className="ml-1 text-xs">
                            ({rateSource === 'project' ? 'project' : 'klant'})
                          </span>
                        </span>
                      ) : (
                        <span className="text-orange-500">Geen tarief</span>
                      )}
                    </div>

                    {/* Created Date */}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(project.created_at).toLocaleDateString('nl-NL')}
                    </div>
                  </div>

                  {project.description && (
                    <div className="text-xs text-muted-foreground mt-1 truncate">
                      {project.description}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-4">
                  {/* Active Toggle */}
                  <Switch
                    checked={project.active}
                    onCheckedChange={() => handleStatusToggle(project)}
                    disabled={isUpdating}
                    className="scale-75"
                  />

                  {/* Actions */}
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditProject?.(project)}
                      className="h-6 w-6 p-0"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteProject(project)}
                      className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
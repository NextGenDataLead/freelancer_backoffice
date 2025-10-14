// Global type definitions for the SaaS template

export interface User {
  id: string
  email: string
  name: string
  organizationId: string
  role: 'admin' | 'member' | 'viewer'
  createdAt: Date
  updatedAt: Date
}

export interface Organization {
  id: string
  name: string
  slug: string
  plan: 'free' | 'pro' | 'enterprise'
  createdAt: Date
  updatedAt: Date
}

// Client and Project Status Types (Enhancement #2)
// Matches database enums from migration 045_add_status_enums.sql

/**
 * Client Status
 * - prospect: Potential client, not yet signed
 * - active: Currently working together
 * - on_hold: Temporarily paused relationship
 * - completed: Finished all work, may return
 * - deactivated: No longer working together (churned)
 */
export type ClientStatus =
  | 'prospect'
  | 'active'
  | 'on_hold'
  | 'completed'
  | 'deactivated'

/**
 * Project Status
 * - prospect: Proposed project, not yet approved
 * - active: Currently in progress
 * - on_hold: Temporarily paused
 * - completed: Successfully finished
 * - cancelled: Cancelled before completion
 */
export type ProjectStatus =
  | 'prospect'
  | 'active'
  | 'on_hold'
  | 'completed'
  | 'cancelled'

export interface ApiResponse<T = unknown> {
  data: T
  message: string
  success: boolean
}

export interface PaginatedResponse<T = unknown> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Re-export financial types
export * from './types/financial';
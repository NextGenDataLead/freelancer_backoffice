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
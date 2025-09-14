'use client'

import * as React from "react"
import { useAuth, useUser } from '@clerk/nextjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { 
  Users, 
  Shield, 
  Settings, 
  BarChart3, 
  DollarSign, 
  TrendingUp,
  UserCheck,
  UserX,
  Crown,
  Eye,
  UserPlus,
  AlertCircle
} from 'lucide-react'
import { Sidebar } from './Sidebar'
import { useState, useEffect } from 'react'

interface UserProfile {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  role: string
  is_active: boolean
  created_at: string
  last_sign_in_at: string | null
  onboarding_complete: boolean
}

interface AdminStats {
  totalUsers: number
  activeUsers: number
  owners: number
  admins: number
  members: number
  viewers: number
  recentSignups: number
}

export function DashboardContent() {
  const { userId } = useAuth()
  const { user } = useUser()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    activeUsers: 0,
    owners: 0,
    admins: 0,
    members: 0,
    viewers: 0,
    recentSignups: 0
  })
  
  // Role management form
  const [selectedEmail, setSelectedEmail] = useState('')
  const [selectedRole, setSelectedRole] = useState('')
  const [promoting, setPromoting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
        
        // Calculate stats
        const userStats = data.users.reduce((acc: AdminStats, user: UserProfile) => {
          acc.totalUsers++
          if (user.is_active) acc.activeUsers++
          if (user.role === 'owner') acc.owners++
          if (user.role === 'admin') acc.admins++
          if (user.role === 'member') acc.members++
          if (user.role === 'viewer') acc.viewers++
          
          // Count recent signups (last 30 days)
          const thirtyDaysAgo = new Date()
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
          if (new Date(user.created_at) > thirtyDaysAgo) {
            acc.recentSignups++
          }
          
          return acc
        }, {
          totalUsers: 0,
          activeUsers: 0,
          owners: 0,
          admins: 0,
          members: 0,
          viewers: 0,
          recentSignups: 0
        })
        
        setStats(userStats)
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEmail || !selectedRole) return

    setPromoting(true)
    setMessage(null)

    try {
      const response = await fetch('/api/admin/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: selectedEmail,
          role: selectedRole
        })
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: data.message })
        setSelectedEmail('')
        setSelectedRole('')
        fetchUsers() // Refresh user list
      } else {
        setMessage({ type: 'error', text: data.error })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update user role' })
    } finally {
      setPromoting(false)
    }
  }

  useEffect(() => {
    if (userId && user) {
      fetchUsers()
    }
  }, [userId, user])

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="h-4 w-4 text-yellow-600" />
      case 'admin': return <Shield className="h-4 w-4 text-blue-600" />
      case 'member': return <UserCheck className="h-4 w-4 text-green-600" />
      case 'viewer': return <Eye className="h-4 w-4 text-gray-600" />
      default: return <UserX className="h-4 w-4 text-red-600" />
    }
  }

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'admin': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'member': return 'bg-green-100 text-green-800 border-green-200'
      case 'viewer': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-red-100 text-red-800 border-red-200'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="lg:pl-64">
          <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Header */}
        <div className="border-b border-border bg-background">
          <div className="flex items-center justify-between p-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                Manage users, roles, and system settings
              </p>
            </div>
            <ThemeToggle />
          </div>
        </div>

        {/* Dashboard content */}
        <div className="p-6">
          <div className="space-y-6">
            
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalUsers}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.activeUsers} active users
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Recent Signups</CardTitle>
                  <UserPlus className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.recentSignups}</div>
                  <p className="text-xs text-muted-foreground">Last 30 days</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Admins</CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.owners + stats.admins}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.owners} owners, {stats.admins} admins
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Members</CardTitle>
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.members + stats.viewers}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.members} members, {stats.viewers} viewers
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* User Management Form */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Change User Role
                  </CardTitle>
                  <CardDescription>
                    Update user permissions and access levels
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleRoleChange} className="space-y-4">
                    <div>
                      <Label htmlFor="user-email">User Email</Label>
                      <Input
                        id="user-email"
                        type="email"
                        value={selectedEmail}
                        onChange={(e) => setSelectedEmail(e.target.value)}
                        placeholder="user@example.com"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="user-role">New Role</Label>
                      <Select value={selectedRole} onValueChange={setSelectedRole} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Button type="submit" disabled={promoting} className="w-full">
                      {promoting ? 'Updating...' : 'Update Role'}
                    </Button>
                    
                    {message && (
                      <div className={`p-3 rounded-lg text-sm ${
                        message.type === 'success' 
                          ? 'bg-green-50 text-green-800 border border-green-200' 
                          : 'bg-red-50 text-red-800 border border-red-200'
                      }`}>
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          {message.text}
                        </div>
                      </div>
                    )}
                  </form>
                </CardContent>
              </Card>

              {/* User List */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    All Users
                  </CardTitle>
                  <CardDescription>
                    Manage user accounts and permissions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {users.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">No users found</p>
                    ) : (
                      users.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                {getRoleIcon(user.role)}
                                <div>
                                  <p className="font-medium text-sm">
                                    {user.first_name && user.last_name 
                                      ? `${user.first_name} ${user.last_name}`
                                      : user.email
                                    }
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {user.email}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={getRoleBadgeStyle(user.role)}>
                              {user.role}
                            </Badge>
                            {!user.is_active && (
                              <Badge variant="secondary" className="bg-red-100 text-red-800">
                                Inactive
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Role Hierarchy Guide */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Role Hierarchy
                </CardTitle>
                <CardDescription>
                  Understanding user roles and permissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg border bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Crown className="h-4 w-4 text-yellow-600" />
                      <span className="font-semibold text-yellow-800 dark:text-yellow-200">Owner</span>
                    </div>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      Full system access, can manage all users and settings
                    </p>
                  </div>
                  
                  <div className="p-4 rounded-lg border bg-blue-50 dark:bg-blue-950/20 border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-4 w-4 text-blue-600" />
                      <span className="font-semibold text-blue-800 dark:text-blue-200">Admin</span>
                    </div>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Can manage users and access admin dashboard
                    </p>
                  </div>
                  
                  <div className="p-4 rounded-lg border bg-green-50 dark:bg-green-950/20 border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <UserCheck className="h-4 w-4 text-green-600" />
                      <span className="font-semibold text-green-800 dark:text-green-200">Member</span>
                    </div>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Full CRUD access to financial dashboard
                    </p>
                  </div>
                  
                  <div className="p-4 rounded-lg border bg-gray-50 dark:bg-gray-950/20 border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Eye className="h-4 w-4 text-gray-600" />
                      <span className="font-semibold text-gray-800 dark:text-gray-200">Viewer</span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Read-only access to financial dashboard
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
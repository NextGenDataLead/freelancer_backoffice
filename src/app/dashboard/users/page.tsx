'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Users, UserPlus, Shield, Crown, Eye, User, CheckCircle, XCircle, Calendar } from 'lucide-react'
import { toast } from 'sonner'

interface User {
  id: string
  email: string
  first_name?: string
  last_name?: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
  is_active: boolean
  created_at: string
  last_sign_in_at?: string
  onboarding_complete: boolean
}

const roleIcons = {
  owner: Crown,
  admin: Shield,
  member: User,
  viewer: Eye
}

const roleColors = {
  owner: 'bg-purple-100 text-purple-800',
  admin: 'bg-blue-100 text-blue-800',
  member: 'bg-green-100 text-green-800',
  viewer: 'bg-gray-100 text-gray-800'
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [promoting, setPromoting] = useState<string | null>(null)
  const [promotionData, setPromotionData] = useState({ email: '', role: '' })

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
      } else {
        toast.error('Failed to load users')
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handlePromoteUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!promotionData.email || !promotionData.role) {
      toast.error('Please fill in all fields')
      return
    }

    setPromoting(promotionData.email)

    try {
      const response = await fetch('/api/admin/promote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(promotionData),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(data.message)
        setPromotionData({ email: '', role: '' })
        fetchUsers() // Refresh the list
      } else {
        toast.error(data.error || 'Failed to update user role')
      }
    } catch (error) {
      console.error('Failed to promote user:', error)
      toast.error('Failed to update user role')
    } finally {
      setPromoting(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-6 w-6 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          </div>
          <p className="text-gray-600">Manage user roles and permissions in your organization</p>
        </div>

        {/* Promote User Form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Change User Role
            </CardTitle>
            <CardDescription>
              Update a user's role and permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePromoteUser} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">User Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@example.com"
                    value={promotionData.email}
                    onChange={(e) => setPromotionData({ ...promotionData, email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="role">New Role</Label>
                  <Select onValueChange={(value) => setPromotionData({ ...promotionData, role: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button 
                type="submit" 
                disabled={promoting !== null}
                className="w-full md:w-auto"
              >
                {promoting ? 'Updating...' : 'Update Role'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Organization Users ({users.length})</CardTitle>
            <CardDescription>
              All users in your organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Sign In</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const RoleIcon = roleIcons[user.role]
                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {user.first_name && user.last_name 
                                ? `${user.first_name} ${user.last_name}`
                                : user.email
                              }
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={roleColors[user.role]}>
                            <RoleIcon className="h-3 w-3 mr-1" />
                            {user.role.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {user.is_active ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                            <span className={user.is_active ? 'text-green-700' : 'text-red-700'}>
                              {user.is_active ? 'Active' : 'Inactive'}
                            </span>
                            {!user.onboarding_complete && (
                              <Badge variant="outline" className="ml-2">
                                Onboarding
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Calendar className="h-3 w-3" />
                            {user.last_sign_in_at 
                              ? formatDate(user.last_sign_in_at)
                              : 'Never'
                            }
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-500">
                            {formatDate(user.created_at)}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
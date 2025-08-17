import { useUser, useOrganization } from '@clerk/nextjs'
import { useSupabaseClient } from '@/hooks/use-supabase-client'
import { useQuery } from '@tanstack/react-query'

export interface UserProfile {
  id: string
  tenant_id: string | null
  clerk_user_id: string
  email: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  role: 'owner' | 'admin' | 'member' | 'viewer'
  created_at: string
  updated_at: string
  is_active: boolean
  preferences: Record<string, any>
}

export const useUserProfile = () => {
  const { user } = useUser()
  const { supabase } = useSupabaseClient()

  return useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async (): Promise<UserProfile | null> => {
      if (!user) return null

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('clerk_user_id', user.id)
        .single()

      if (error) {
        console.error('Error fetching user profile:', error)
        return null
      }
      
      return data
    },
    enabled: !!user,
  })
}

export const useUserPermissions = () => {
  const { data: profile } = useUserProfile()
  
  const hasPermission = (permission: string) => {
    if (!profile) return false
    
    // Define role hierarchy
    const rolePermissions = {
      owner: ['*'], // All permissions
      admin: ['manage_users', 'manage_settings', 'view_analytics', 'manage_content', 'view_content'],
      member: ['manage_content', 'view_content'],
      viewer: ['view_content'],
    }
    
    const userPermissions = rolePermissions[profile.role] || []
    return userPermissions.includes('*') || userPermissions.includes(permission)
  }
  
  const isOwner = profile?.role === 'owner'
  const isAdmin = profile?.role === 'admin' || isOwner
  const isMember = profile?.role === 'member' || isAdmin
  
  return { 
    hasPermission, 
    role: profile?.role,
    isOwner,
    isAdmin,
    isMember,
    profile
  }
}

export const useUserOrganizations = () => {
  const { user } = useUser()
  const { supabase } = useSupabaseClient()

  return useQuery({
    queryKey: ['user-organizations', user?.id],
    queryFn: async () => {
      if (!user) return []

      const { data, error } = await supabase
        .from('organization_memberships')
        .select(`
          id,
          role,
          joined_at,
          organization:organizations (
            id,
            name,
            slug,
            description,
            created_at
          )
        `)
        .eq('user_id', user.id)

      if (error) {
        console.error('Error fetching user organizations:', error)
        return []
      }

      return data || []
    },
    enabled: !!user,
  })
}
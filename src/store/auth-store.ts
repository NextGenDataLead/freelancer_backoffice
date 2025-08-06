import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { UserProfile } from '@/hooks/use-user'

interface AuthState {
  // User state
  userProfile: UserProfile | null
  isAuthenticated: boolean
  isLoading: boolean
  
  // User preferences from local storage
  preferences: {
    theme: 'light' | 'dark' | 'system'
    sidebarCollapsed: boolean
    language: string
    timezone: string
  }
  
  // Actions
  setUserProfile: (profile: UserProfile | null) => void
  setIsAuthenticated: (authenticated: boolean) => void
  setIsLoading: (loading: boolean) => void
  updatePreferences: (preferences: Partial<AuthState['preferences']>) => void
  clearAuthState: () => void
}

const defaultPreferences = {
  theme: 'system' as const,
  sidebarCollapsed: false,
  language: 'en',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      userProfile: null,
      isAuthenticated: false,
      isLoading: false,
      preferences: defaultPreferences,
      
      // Actions
      setUserProfile: (profile) => set({ 
        userProfile: profile,
        isAuthenticated: !!profile,
      }),
      
      setIsAuthenticated: (authenticated) => set({ 
        isAuthenticated: authenticated 
      }),
      
      setIsLoading: (loading) => set({ 
        isLoading: loading 
      }),
      
      updatePreferences: (newPreferences) => set((state) => ({
        preferences: { ...state.preferences, ...newPreferences }
      })),
      
      clearAuthState: () => set({
        userProfile: null,
        isAuthenticated: false,
        isLoading: false,
        // Keep preferences but reset auth state
      }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      // Only persist preferences, not sensitive auth data
      partialize: (state) => ({ 
        preferences: state.preferences 
      }),
    }
  )
)

// Selectors for better performance
export const useAuthUser = () => useAuthStore((state) => state.userProfile)
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated)
export const useAuthLoading = () => useAuthStore((state) => state.isLoading)
export const useUserPreferences = () => useAuthStore((state) => state.preferences)
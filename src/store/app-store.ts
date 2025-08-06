import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface AppState {
  // UI State
  sidebarOpen: boolean
  currentPage: string
  breadcrumbs: Array<{ label: string; href: string }>
  
  // Theme state
  theme: 'light' | 'dark' | 'system'
  
  // Loading states
  globalLoading: boolean
  loadingStates: Record<string, boolean>
  
  // Feature flags
  features: Record<string, boolean>
  
  // Actions
  setSidebarOpen: (open: boolean) => void
  setCurrentPage: (page: string) => void
  setBreadcrumbs: (breadcrumbs: AppState['breadcrumbs']) => void
  setTheme: (theme: AppState['theme']) => void
  setGlobalLoading: (loading: boolean) => void
  setLoadingState: (key: string, loading: boolean) => void
  setFeature: (feature: string, enabled: boolean) => void
  resetAppState: () => void
}

const defaultFeatures = {
  darkMode: true,
  analytics: true,
  notifications: true,
  realtime: false,
  beta_charts: true,
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      sidebarOpen: false,
      currentPage: '',
      breadcrumbs: [],
      theme: 'system',
      globalLoading: false,
      loadingStates: {},
      features: defaultFeatures,
      
      // Actions
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      
      setCurrentPage: (page) => set({ currentPage: page }),
      
      setBreadcrumbs: (breadcrumbs) => set({ breadcrumbs }),
      
      setTheme: (theme) => set({ theme }),
      
      setGlobalLoading: (loading) => set({ globalLoading: loading }),
      
      setLoadingState: (key, loading) => set((state) => ({
        loadingStates: { ...state.loadingStates, [key]: loading }
      })),
      
      setFeature: (feature, enabled) => set((state) => ({
        features: { ...state.features, [feature]: enabled }
      })),
      
      resetAppState: () => set({
        sidebarOpen: false,
        currentPage: '',
        breadcrumbs: [],
        globalLoading: false,
        loadingStates: {},
        // Keep theme and features
      }),
    }),
    {
      name: 'app-storage',
      storage: createJSONStorage(() => localStorage),
      // Persist UI preferences and features
      partialize: (state) => ({
        theme: state.theme,
        features: state.features,
      }),
    }
  )
)

// Selectors
export const useSidebarOpen = () => useAppStore((state) => state.sidebarOpen)
export const useCurrentPage = () => useAppStore((state) => state.currentPage)
export const useBreadcrumbs = () => useAppStore((state) => state.breadcrumbs)
export const useTheme = () => useAppStore((state) => state.theme)
export const useGlobalLoading = () => useAppStore((state) => state.globalLoading)
export const useLoadingState = (key: string) => useAppStore((state) => state.loadingStates[key] || false)
export const useFeatures = () => useAppStore((state) => state.features)
export const useFeature = (feature: string) => useAppStore((state) => state.features[feature] || false)
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useAppStore, useTheme, useSidebarOpen } from '@/store/app-store'

/**
 * Enhanced app state hook that manages global UI state
 * Automatically tracks current page and updates breadcrumbs
 */
export const useAppState = () => {
  const pathname = usePathname()
  const {
    currentPage,
    breadcrumbs,
    setCurrentPage,
    setBreadcrumbs,
    resetAppState,
  } = useAppStore()

  // Update current page when pathname changes
  useEffect(() => {
    setCurrentPage(pathname)
    
    // Generate breadcrumbs based on pathname
    const segments = pathname.split('/').filter(Boolean)
    const newBreadcrumbs = [
      { label: 'Home', href: '/' },
    ]
    
    let currentPath = ''
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`
      const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace('-', ' ')
      newBreadcrumbs.push({
        label,
        href: currentPath,
      })
    })
    
    setBreadcrumbs(newBreadcrumbs)
  }, [pathname, setCurrentPage, setBreadcrumbs])

  return {
    currentPage,
    breadcrumbs,
    pathname,
    resetAppState,
  }
}

/**
 * Hook for managing sidebar state
 * Includes responsive behavior and keyboard shortcuts
 */
export const useSidebar = () => {
  const { sidebarOpen, setSidebarOpen } = useAppStore()

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen)
  const openSidebar = () => setSidebarOpen(true)
  const closeSidebar = () => setSidebarOpen(false)

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + B to toggle sidebar
      if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
        event.preventDefault()
        toggleSidebar()
      }
      
      // Escape to close sidebar on mobile
      if (event.key === 'Escape' && sidebarOpen) {
        closeSidebar()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [sidebarOpen])

  return {
    sidebarOpen,
    setSidebarOpen,
    toggleSidebar,
    openSidebar,
    closeSidebar,
  }
}

/**
 * Hook for theme management with system preference detection
 */
export const useThemeManager = () => {
  const { theme, setTheme } = useAppStore()

  // Detect system theme changes
  useEffect(() => {
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      
      const handleChange = () => {
        // Force re-render when system theme changes
        document.documentElement.classList.toggle('dark', mediaQuery.matches)
      }
      
      handleChange() // Apply initial theme
      mediaQuery.addEventListener('change', handleChange)
      
      return () => mediaQuery.removeEventListener('change', handleChange)
    } else {
      // Apply explicit theme
      document.documentElement.classList.toggle('dark', theme === 'dark')
    }
  }, [theme])

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
    setTheme(newTheme)
  }

  const getEffectiveTheme = () => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return theme
  }

  return {
    theme,
    setTheme,
    toggleTheme,
    effectiveTheme: getEffectiveTheme(),
  }
}
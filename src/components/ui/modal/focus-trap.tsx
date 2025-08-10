"use client"

import * as React from "react"

interface FocusTrapProps {
  children: React.ReactNode
  enabled?: boolean
  onEscape?: () => void
}

/**
 * Focus trap component for modal accessibility
 * Traps focus within the modal and handles keyboard navigation
 */
export function FocusTrap({ children, enabled = true, onEscape }: FocusTrapProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const sentinelStartRef = React.useRef<HTMLDivElement>(null)
  const sentinelEndRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!enabled || !containerRef.current) return

    // Get all focusable elements within the container
    const getFocusableElements = () => {
      if (!containerRef.current) return []
      
      const focusableSelectors = [
        'button:not([disabled])',
        'input:not([disabled])',
        'textarea:not([disabled])',
        'select:not([disabled])',
        'a[href]',
        '[tabindex]:not([tabindex="-1"])',
        '[contenteditable]'
      ].join(', ')

      return Array.from(
        containerRef.current.querySelectorAll(focusableSelectors)
      ) as HTMLElement[]
    }

    const handleFocus = (event: FocusEvent) => {
      if (!containerRef.current) return

      const focusableElements = getFocusableElements()
      if (focusableElements.length === 0) return

      const target = event.target as HTMLElement
      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      // If focus is on start sentinel, move to last element
      if (target === sentinelStartRef.current) {
        event.preventDefault()
        lastElement.focus()
      }
      
      // If focus is on end sentinel, move to first element
      if (target === sentinelEndRef.current) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && onEscape) {
        event.preventDefault()
        onEscape()
        return
      }

      if (event.key !== 'Tab') return

      const focusableElements = getFocusableElements()
      if (focusableElements.length === 0) return

      const currentIndex = focusableElements.indexOf(event.target as HTMLElement)
      
      // If shift+tab and we're on the first element, go to last
      if (event.shiftKey && currentIndex === 0) {
        event.preventDefault()
        focusableElements[focusableElements.length - 1].focus()
      }
      // If tab and we're on the last element, go to first
      else if (!event.shiftKey && currentIndex === focusableElements.length - 1) {
        event.preventDefault()
        focusableElements[0].focus()
      }
    }

    // Set initial focus to first focusable element
    const focusableElements = getFocusableElements()
    if (focusableElements.length > 0) {
      // Find element with autoFocus prop or first focusable element
      const autoFocusElement = focusableElements.find(el => 
        el.hasAttribute('autoFocus') || el.hasAttribute('data-autofocus')
      )
      const elementToFocus = autoFocusElement || focusableElements[0]
      elementToFocus.focus()
    }

    // Add event listeners
    document.addEventListener('focusin', handleFocus)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('focusin', handleFocus)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [enabled, onEscape])

  if (!enabled) {
    return <>{children}</>
  }

  return (
    <div ref={containerRef}>
      {/* Start sentinel */}
      <div
        ref={sentinelStartRef}
        tabIndex={0}
        style={{ position: 'fixed', top: 0, left: 0, width: 1, height: 1, opacity: 0 }}
        aria-hidden="true"
      />
      
      {children}
      
      {/* End sentinel */}
      <div
        ref={sentinelEndRef}
        tabIndex={0}
        style={{ position: 'fixed', top: 0, left: 0, width: 1, height: 1, opacity: 0 }}
        aria-hidden="true"
      />
    </div>
  )
}

/**
 * Hook for managing focus restoration when modal closes
 */
export function useFocusRestore() {
  const activeElementRef = React.useRef<HTMLElement | null>(null)

  const saveFocus = React.useCallback(() => {
    activeElementRef.current = document.activeElement as HTMLElement
  }, [])

  const restoreFocus = React.useCallback(() => {
    if (activeElementRef.current && typeof activeElementRef.current.focus === 'function') {
      activeElementRef.current.focus()
    }
  }, [])

  return { saveFocus, restoreFocus }
}

/**
 * Hook for managing body scroll lock when modal is open
 */
export function useScrollLock(enabled: boolean) {
  React.useEffect(() => {
    if (!enabled) return

    const originalOverflow = document.body.style.overflow
    const originalPaddingRight = document.body.style.paddingRight

    // Calculate scrollbar width to prevent layout shift
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

    // Lock scroll
    document.body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`
    }

    return () => {
      document.body.style.overflow = originalOverflow
      document.body.style.paddingRight = originalPaddingRight
    }
  }, [enabled])
}
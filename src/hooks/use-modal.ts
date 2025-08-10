"use client"

import * as React from "react"

// Basic modal state interface
export interface ModalState {
  isOpen: boolean
  data?: any
}

// Modal actions interface
export interface ModalActions {
  open: (data?: any) => void
  close: () => void
  toggle: () => void
  setData: (data: any) => void
}

// Combined modal hook return type
export interface UseModalReturn extends ModalState, ModalActions {}

/**
 * Basic modal state management hook
 * Provides simple open/close functionality with optional data
 */
export function useModal(initialOpen = false, initialData?: any): UseModalReturn {
  const [isOpen, setIsOpen] = React.useState(initialOpen)
  const [data, setData] = React.useState(initialData)

  const open = React.useCallback((newData?: any) => {
    if (newData !== undefined) {
      setData(newData)
    }
    setIsOpen(true)
  }, [])

  const close = React.useCallback(() => {
    setIsOpen(false)
  }, [])

  const toggle = React.useCallback(() => {
    setIsOpen(prev => !prev)
  }, [])

  const updateData = React.useCallback((newData: any) => {
    setData(newData)
  }, [])

  return {
    isOpen,
    data,
    open,
    close,
    toggle,
    setData: updateData
  }
}

// Multi-modal state management
export interface UseModalManagerOptions {
  modals: string[]
  exclusive?: boolean // Only one modal can be open at a time
}

export interface ModalManagerState {
  [modalId: string]: ModalState
}

export interface ModalManagerActions {
  open: (modalId: string, data?: any) => void
  close: (modalId: string) => void
  closeAll: () => void
  toggle: (modalId: string, data?: any) => void
  isOpen: (modalId: string) => boolean
  getData: (modalId: string) => any
  setData: (modalId: string, data: any) => void
  getOpenModals: () => string[]
}

export interface UseModalManagerReturn extends ModalManagerActions {
  modals: ModalManagerState
}

/**
 * Modal manager hook for managing multiple modals
 * Useful for complex applications with many modals
 */
export function useModalManager({ 
  modals = [], 
  exclusive = false 
}: UseModalManagerOptions): UseModalManagerReturn {
  const [modalStates, setModalStates] = React.useState<ModalManagerState>(() =>
    modals.reduce((acc, modalId) => ({
      ...acc,
      [modalId]: { isOpen: false, data: undefined }
    }), {})
  )

  const open = React.useCallback((modalId: string, data?: any) => {
    if (!modals.includes(modalId)) {
      console.warn(`Modal "${modalId}" is not registered with the modal manager`)
      return
    }

    setModalStates(prev => {
      const newStates = { ...prev }

      // Close all other modals if exclusive mode is enabled
      if (exclusive) {
        Object.keys(newStates).forEach(id => {
          if (id !== modalId) {
            newStates[id] = { ...newStates[id], isOpen: false }
          }
        })
      }

      newStates[modalId] = {
        isOpen: true,
        data: data !== undefined ? data : prev[modalId]?.data
      }

      return newStates
    })
  }, [modals, exclusive])

  const close = React.useCallback((modalId: string) => {
    if (!modals.includes(modalId)) {
      console.warn(`Modal "${modalId}" is not registered with the modal manager`)
      return
    }

    setModalStates(prev => ({
      ...prev,
      [modalId]: { ...prev[modalId], isOpen: false }
    }))
  }, [modals])

  const closeAll = React.useCallback(() => {
    setModalStates(prev => {
      const newStates = { ...prev }
      Object.keys(newStates).forEach(modalId => {
        newStates[modalId] = { ...newStates[modalId], isOpen: false }
      })
      return newStates
    })
  }, [])

  const toggle = React.useCallback((modalId: string, data?: any) => {
    if (!modals.includes(modalId)) {
      console.warn(`Modal "${modalId}" is not registered with the modal manager`)
      return
    }

    const currentState = modalStates[modalId]
    if (currentState?.isOpen) {
      close(modalId)
    } else {
      open(modalId, data)
    }
  }, [modals, modalStates, open, close])

  const isOpen = React.useCallback((modalId: string) => {
    return modalStates[modalId]?.isOpen || false
  }, [modalStates])

  const getData = React.useCallback((modalId: string) => {
    return modalStates[modalId]?.data
  }, [modalStates])

  const setData = React.useCallback((modalId: string, data: any) => {
    if (!modals.includes(modalId)) {
      console.warn(`Modal "${modalId}" is not registered with the modal manager`)
      return
    }

    setModalStates(prev => ({
      ...prev,
      [modalId]: { ...prev[modalId], data }
    }))
  }, [modals])

  const getOpenModals = React.useCallback(() => {
    return Object.keys(modalStates).filter(modalId => modalStates[modalId]?.isOpen)
  }, [modalStates])

  return {
    modals: modalStates,
    open,
    close,
    closeAll,
    toggle,
    isOpen,
    getData,
    setData,
    getOpenModals
  }
}

// Confirmation modal hook with promise-based result
export interface UseConfirmationModalOptions {
  title?: string
  description?: string
  confirmText?: string
  cancelText?: string
  variant?: "default" | "destructive" | "warning"
}

export interface UseConfirmationModalReturn {
  isOpen: boolean
  confirm: (options?: Partial<UseConfirmationModalOptions>) => Promise<boolean>
  ConfirmationDialog: React.ComponentType<{}>
}

/**
 * Confirmation modal hook with promise-based API
 * Returns a promise that resolves with the user's choice
 */
export function useConfirmationModal(
  defaultOptions: UseConfirmationModalOptions = {}
): UseConfirmationModalReturn {
  const [isOpen, setIsOpen] = React.useState(false)
  const [options, setOptions] = React.useState(defaultOptions)
  const resolveRef = React.useRef<(value: boolean) => void>()

  const confirm = React.useCallback(
    (newOptions: Partial<UseConfirmationModalOptions> = {}) => {
      return new Promise<boolean>((resolve) => {
        setOptions({ ...defaultOptions, ...newOptions })
        setIsOpen(true)
        resolveRef.current = resolve
      })
    },
    [defaultOptions]
  )

  const handleConfirm = React.useCallback(() => {
    setIsOpen(false)
    resolveRef.current?.(true)
  }, [])

  const handleCancel = React.useCallback(() => {
    setIsOpen(false)
    resolveRef.current?.(false)
  }, [])

  const ConfirmationDialog = React.useCallback(() => {
    // This would typically import and use the ConfirmationModal component
    // For now, returning a placeholder div to avoid circular imports
    return React.createElement('div', { 
      style: { display: isOpen ? 'block' : 'none' }
    }, 'Confirmation Modal Placeholder')
  }, [isOpen])

  return {
    isOpen,
    confirm,
    ConfirmationDialog
  }
}

// Modal stack management for complex modal interactions
export interface ModalStackItem {
  id: string
  component: React.ComponentType<any>
  props: any
  onClose?: () => void
}

export interface UseModalStackReturn {
  stack: ModalStackItem[]
  push: (item: Omit<ModalStackItem, 'id'>) => string
  pop: () => ModalStackItem | undefined
  remove: (id: string) => void
  clear: () => void
  length: number
  current: ModalStackItem | undefined
}

/**
 * Modal stack hook for managing a stack of modals
 * Useful for complex modal flows and nested modals
 */
export function useModalStack(): UseModalStackReturn {
  const [stack, setStack] = React.useState<ModalStackItem[]>([])

  const push = React.useCallback((item: Omit<ModalStackItem, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    const stackItem: ModalStackItem = { ...item, id }
    
    setStack(prev => [...prev, stackItem])
    return id
  }, [])

  const pop = React.useCallback(() => {
    let poppedItem: ModalStackItem | undefined

    setStack(prev => {
      if (prev.length === 0) return prev
      
      poppedItem = prev[prev.length - 1]
      return prev.slice(0, -1)
    })

    return poppedItem
  }, [])

  const remove = React.useCallback((id: string) => {
    setStack(prev => prev.filter(item => item.id !== id))
  }, [])

  const clear = React.useCallback(() => {
    setStack([])
  }, [])

  const current = stack.length > 0 ? stack[stack.length - 1] : undefined

  return {
    stack,
    push,
    pop,
    remove,
    clear,
    length: stack.length,
    current
  }
}

// Global modal state using context (optional)
export interface ModalContextValue {
  modals: ModalManagerState
  open: (modalId: string, data?: any) => void
  close: (modalId: string) => void
  closeAll: () => void
  isOpen: (modalId: string) => boolean
}

export const ModalContext = React.createContext<ModalContextValue | null>(null)

export function useModalContext() {
  const context = React.useContext(ModalContext)
  if (!context) {
    throw new Error('useModalContext must be used within a ModalProvider')
  }
  return context
}

// Provider component for global modal state
export interface ModalProviderProps {
  children: React.ReactNode
  modals: string[]
  exclusive?: boolean
}

export function ModalProvider({ children, modals, exclusive }: ModalProviderProps) {
  const modalManager = useModalManager({ modals, exclusive })

  const value: ModalContextValue = {
    modals: modalManager.modals,
    open: modalManager.open,
    close: modalManager.close,
    closeAll: modalManager.closeAll,
    isOpen: modalManager.isOpen
  }

  return React.createElement(ModalContext.Provider, { value }, children)
}
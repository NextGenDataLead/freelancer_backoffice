"use client"

import * as React from "react"
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { X, AlertTriangle, Info, CheckCircle, AlertCircle } from "lucide-react"
import { FocusTrap, useFocusRestore, useScrollLock } from "./focus-trap"

// Modal types for different use cases
export type ModalType = "default" | "info" | "success" | "warning" | "error"
export type ModalSize = "sm" | "md" | "lg" | "xl" | "full"

// Base modal props interface
export interface BaseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  type?: ModalType
  size?: ModalSize
  showCloseButton?: boolean
  closeOnOverlayClick?: boolean
  closeOnEscape?: boolean
  className?: string
  children?: React.ReactNode
}

// Modal action button interface
export interface ModalAction {
  label: string
  onClick: () => void | Promise<void>
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  disabled?: boolean
  loading?: boolean
  autoFocus?: boolean
}

// Enhanced modal props with actions
export interface ModalProps extends BaseModalProps {
  primaryAction?: ModalAction
  secondaryAction?: ModalAction
  actions?: ModalAction[]
  footer?: React.ReactNode
  trapFocus?: boolean
  lockScroll?: boolean
  restoreFocus?: boolean
}

// Modal size class mappings
const sizeClasses: Record<ModalSize, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-xl",
  full: "sm:max-w-4xl"
}

// Modal type configurations
const typeConfig: Record<ModalType, { icon: React.ComponentType<any>, iconColor: string }> = {
  default: { icon: Info, iconColor: "text-blue-500" },
  info: { icon: Info, iconColor: "text-blue-500" },
  success: { icon: CheckCircle, iconColor: "text-green-500" },
  warning: { icon: AlertTriangle, iconColor: "text-yellow-500" },
  error: { icon: AlertCircle, iconColor: "text-red-500" }
}

/**
 * Base Modal component with accessibility features and customizable styling
 */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  type = "default",
  size = "md",
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  className,
  children,
  primaryAction,
  secondaryAction,
  actions,
  footer,
  trapFocus = true,
  lockScroll = true,
  restoreFocus = true,
  ...props
}: ModalProps) {
  const TypeIcon = typeConfig[type].icon
  const iconColor = typeConfig[type].iconColor
  
  // Focus management hooks
  const { saveFocus, restoreFocus: restoreFocusHandler } = useFocusRestore()
  
  // Scroll lock when modal is open
  useScrollLock(open && lockScroll)
  
  // Save focus when modal opens and restore when it closes
  React.useEffect(() => {
    if (open && restoreFocus) {
      saveFocus()
    } else if (!open && restoreFocus) {
      restoreFocusHandler()
    }
  }, [open, restoreFocus, saveFocus, restoreFocusHandler])

  // Handle escape key
  React.useEffect(() => {
    if (!closeOnEscape) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && open) {
        onOpenChange(false)
      }
    }

    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [open, closeOnEscape, onOpenChange])

  // Handle overlay click
  const handleOverlayClick = (event: React.MouseEvent) => {
    if (closeOnOverlayClick && event.target === event.currentTarget) {
      onOpenChange(false)
    }
  }

  // Render action buttons
  const renderActions = () => {
    const allActions = []

    // Add secondary action first (left side)
    if (secondaryAction) {
      allActions.push(
        <Button
          key="secondary"
          variant={secondaryAction.variant || "outline"}
          onClick={secondaryAction.onClick}
          disabled={secondaryAction.disabled}
          className="min-w-20"
        >
          {secondaryAction.loading && <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full" />}
          {secondaryAction.label}
        </Button>
      )
    }

    // Add primary action (right side)
    if (primaryAction) {
      allActions.push(
        <Button
          key="primary"
          variant={primaryAction.variant || "default"}
          onClick={primaryAction.onClick}
          disabled={primaryAction.disabled}
          autoFocus={primaryAction.autoFocus}
          className="min-w-20"
        >
          {primaryAction.loading && <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full" />}
          {primaryAction.label}
        </Button>
      )
    }

    // Add additional actions
    if (actions) {
      actions.forEach((action, index) => {
        allActions.push(
          <Button
            key={`action-${index}`}
            variant={action.variant || "outline"}
            onClick={action.onClick}
            disabled={action.disabled}
            autoFocus={action.autoFocus}
            className="min-w-20"
          >
            {action.loading && <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full" />}
            {action.label}
          </Button>
        )
      })
    }

    return allActions
  }

  const modalContent = (
    <DialogContent
      className={cn(sizeClasses[size], className)}
      showCloseButton={showCloseButton}
      onPointerDownOutside={closeOnOverlayClick ? undefined : (e) => e.preventDefault()}
      onEscapeKeyDown={closeOnEscape ? undefined : (e) => e.preventDefault()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby={description ? "modal-description" : undefined}
    >
      <DialogHeader>
        <DialogTitle id="modal-title" className="flex items-center gap-3">
          {type !== "default" && (
            <TypeIcon className={cn("h-5 w-5", iconColor)} aria-hidden="true" />
          )}
          {title}
        </DialogTitle>
        {description && (
          <DialogDescription id="modal-description" className="text-left">
            {description}
          </DialogDescription>
        )}
      </DialogHeader>

      {children && (
        <div className="py-4">
          {children}
        </div>
      )}

      {(primaryAction || secondaryAction || actions || footer) && (
        <DialogFooter>
          {footer || (
            <div className="flex gap-2 justify-end">
              {renderActions()}
            </div>
          )}
        </DialogFooter>
      )}
    </DialogContent>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange} {...props}>
      {trapFocus ? (
        <FocusTrap 
          enabled={open} 
          onEscape={closeOnEscape ? () => onOpenChange(false) : undefined}
        >
          {modalContent}
        </FocusTrap>
      ) : (
        modalContent
      )}
    </Dialog>
  )
}

/**
 * Modal trigger component for opening modals
 */
export interface ModalTriggerProps {
  children: React.ReactNode
  className?: string
  asChild?: boolean
}

export function ModalTrigger({ children, className, asChild, ...props }: ModalTriggerProps) {
  return (
    <DialogTrigger asChild={asChild} className={className} {...props}>
      {children}
    </DialogTrigger>
  )
}

// Export all dialog components for advanced usage
export {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
}
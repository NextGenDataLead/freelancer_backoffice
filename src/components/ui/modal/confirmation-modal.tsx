"use client"

import * as React from "react"
import { Modal, ModalProps, ModalAction } from "./modal"
import { AlertTriangle, Trash2, Check, X } from "lucide-react"

// Confirmation modal specific props
export interface ConfirmationModalProps extends Omit<ModalProps, 'primaryAction' | 'secondaryAction' | 'type'> {
  onConfirm: () => void | Promise<void>
  onCancel?: () => void
  confirmText?: string
  cancelText?: string
  variant?: "default" | "destructive" | "warning"
  isLoading?: boolean
  confirmButtonVariant?: ModalAction['variant']
}

/**
 * Confirmation Modal for user actions that require confirmation
 * Provides consistent UX for destructive or important actions
 */
export function ConfirmationModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  onConfirm,
  onCancel,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  isLoading = false,
  confirmButtonVariant,
  ...props
}: ConfirmationModalProps) {
  // Determine modal type and confirm button variant based on confirmation variant
  const getTypeAndVariant = () => {
    switch (variant) {
      case "destructive":
        return { 
          type: "error" as const, 
          buttonVariant: confirmButtonVariant || "destructive" as const 
        }
      case "warning":
        return { 
          type: "warning" as const, 
          buttonVariant: confirmButtonVariant || "default" as const 
        }
      default:
        return { 
          type: "default" as const, 
          buttonVariant: confirmButtonVariant || "default" as const 
        }
    }
  }

  const { type, buttonVariant } = getTypeAndVariant()

  const handleConfirm = async () => {
    try {
      await onConfirm()
    } catch (error) {
      console.error("Confirmation action failed:", error)
    }
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    } else {
      onOpenChange(false)
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      type={type}
      primaryAction={{
        label: confirmText,
        onClick: handleConfirm,
        variant: buttonVariant,
        loading: isLoading,
        disabled: isLoading
      }}
      secondaryAction={{
        label: cancelText,
        onClick: handleCancel,
        variant: "outline",
        disabled: isLoading
      }}
      closeOnOverlayClick={!isLoading}
      closeOnEscape={!isLoading}
      {...props}
    >
      {children}
    </Modal>
  )
}

// Specialized confirmation modals for common use cases

/**
 * Delete Confirmation Modal
 * Pre-configured for delete actions with destructive styling
 */
export interface DeleteConfirmationModalProps extends Omit<ConfirmationModalProps, 'variant' | 'confirmText' | 'type'> {
  itemName?: string
  permanentDelete?: boolean
}

export function DeleteConfirmationModal({
  title,
  description,
  itemName,
  permanentDelete = false,
  ...props
}: DeleteConfirmationModalProps) {
  const defaultTitle = title || `Delete ${itemName || 'item'}?`
  const defaultDescription = description || 
    `This action ${permanentDelete ? 'cannot be undone. This will permanently delete' : 'will delete'} the ${itemName || 'item'}${permanentDelete ? ' and remove all associated data.' : '.'}`

  return (
    <ConfirmationModal
      title={defaultTitle}
      description={defaultDescription}
      confirmText="Delete"
      variant="destructive"
      {...props}
    />
  )
}

/**
 * Save Changes Modal
 * Pre-configured for unsaved changes warnings
 */
export interface SaveChangesModalProps extends Omit<ConfirmationModalProps, 'variant' | 'type'> {
  hasUnsavedChanges?: boolean
}

export function SaveChangesModal({
  title = "Unsaved Changes",
  description = "You have unsaved changes. Do you want to save before leaving?",
  confirmText = "Save Changes",
  cancelText = "Discard Changes",
  ...props
}: SaveChangesModalProps) {
  return (
    <ConfirmationModal
      title={title}
      description={description}
      confirmText={confirmText}
      cancelText={cancelText}
      variant="warning"
      {...props}
    />
  )
}

/**
 * Logout Confirmation Modal
 * Pre-configured for logout actions
 */
export interface LogoutConfirmationModalProps extends Omit<ConfirmationModalProps, 'variant' | 'type'> {}

export function LogoutConfirmationModal({
  title = "Sign Out",
  description = "Are you sure you want to sign out? Any unsaved work may be lost.",
  confirmText = "Sign Out",
  cancelText = "Stay Signed In",
  ...props
}: LogoutConfirmationModalProps) {
  return (
    <ConfirmationModal
      title={title}
      description={description}
      confirmText={confirmText}
      cancelText={cancelText}
      variant="default"
      {...props}
    />
  )
}

/**
 * Generic Action Confirmation Modal
 * For custom confirmation actions with warning styling
 */
export interface ActionConfirmationModalProps extends Omit<ConfirmationModalProps, 'variant'> {
  actionName: string
  actionDescription?: string
}

export function ActionConfirmationModal({
  title,
  actionName,
  actionDescription,
  confirmText,
  ...props
}: ActionConfirmationModalProps) {
  const defaultTitle = title || `${actionName}?`
  const defaultConfirmText = confirmText || actionName
  const defaultDescription = actionDescription || `Are you sure you want to ${actionName.toLowerCase()}?`

  return (
    <ConfirmationModal
      title={defaultTitle}
      description={defaultDescription}
      confirmText={defaultConfirmText}
      variant="warning"
      {...props}
    />
  )
}
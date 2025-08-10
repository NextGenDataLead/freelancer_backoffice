"use client"

import * as React from "react"
import { Modal, ModalProps, ModalType } from "./modal"
import { Button } from "@/components/ui/button"
import { Info, CheckCircle, AlertTriangle, AlertCircle, HelpCircle } from "lucide-react"

// Info modal specific props
export interface InfoModalProps extends Omit<ModalProps, 'primaryAction' | 'secondaryAction' | 'type'> {
  type?: ModalType | "help"
  onClose?: () => void
  closeText?: string
  showCloseButton?: boolean
  actions?: Array<{
    label: string
    onClick: () => void
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  }>
}

/**
 * Info Modal for displaying information, alerts, and messages
 * Provides consistent UX for different types of informational content
 */
export function InfoModal({
  open,
  onOpenChange,
  title,
  description,
  type = "info",
  children,
  onClose,
  closeText = "Close",
  showCloseButton = true,
  actions,
  size = "md",
  ...props
}: InfoModalProps) {
  const handleClose = () => {
    if (onClose) {
      onClose()
    } else {
      onOpenChange(false)
    }
  }

  // Convert help type to info for the base modal
  const modalType = type === "help" ? "info" : type

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      type={modalType}
      size={size}
      showCloseButton={showCloseButton}
      primaryAction={
        !actions ? {
          label: closeText,
          onClick: handleClose,
          variant: "default"
        } : undefined
      }
      actions={actions}
      {...props}
    >
      {children}
    </Modal>
  )
}

// Specialized info modals for common use cases

/**
 * Success Modal
 * Pre-configured for success messages
 */
export interface SuccessModalProps extends Omit<InfoModalProps, 'type'> {}

export function SuccessModal({
  title = "Success!",
  closeText = "Continue",
  ...props
}: SuccessModalProps) {
  return (
    <InfoModal
      title={title}
      type="success"
      closeText={closeText}
      {...props}
    />
  )
}

/**
 * Error Modal
 * Pre-configured for error messages
 */
export interface ErrorModalProps extends Omit<InfoModalProps, 'type'> {
  error?: Error | string
  showErrorDetails?: boolean
}

export function ErrorModal({
  title = "Error",
  description,
  error,
  showErrorDetails = false,
  children,
  closeText = "Close",
  ...props
}: ErrorModalProps) {
  const errorMessage = error instanceof Error ? error.message : error
  const errorDescription = description || errorMessage || "An unexpected error occurred."

  return (
    <InfoModal
      title={title}
      description={errorDescription}
      type="error"
      closeText={closeText}
      {...props}
    >
      {children}
      {showErrorDetails && error instanceof Error && error.stack && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-muted-foreground">
            Error Details
          </summary>
          <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-32">
            {error.stack}
          </pre>
        </details>
      )}
    </InfoModal>
  )
}

/**
 * Warning Modal
 * Pre-configured for warning messages
 */
export interface WarningModalProps extends Omit<InfoModalProps, 'type'> {}

export function WarningModal({
  title = "Warning",
  closeText = "Understood",
  ...props
}: WarningModalProps) {
  return (
    <InfoModal
      title={title}
      type="warning"
      closeText={closeText}
      {...props}
    />
  )
}

/**
 * Help Modal
 * Pre-configured for help and documentation content
 */
export interface HelpModalProps extends Omit<InfoModalProps, 'type'> {
  topic?: string
}

export function HelpModal({
  title,
  topic,
  closeText = "Got it",
  size = "lg",
  ...props
}: HelpModalProps) {
  const helpTitle = title || (topic ? `Help: ${topic}` : "Help")

  return (
    <InfoModal
      title={helpTitle}
      type="help"
      closeText={closeText}
      size={size}
      {...props}
    />
  )
}

/**
 * Feature Announcement Modal
 * For announcing new features or updates
 */
export interface FeatureModalProps extends Omit<InfoModalProps, 'type'> {
  isNew?: boolean
  version?: string
}

export function FeatureModal({
  title = "New Feature",
  isNew = true,
  version,
  closeText = "Explore",
  children,
  ...props
}: FeatureModalProps) {
  return (
    <InfoModal
      title={title}
      type="success"
      closeText={closeText}
      {...props}
    >
      {isNew && (
        <div className="mb-4">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            New{version && ` in ${version}`}
          </span>
        </div>
      )}
      {children}
    </InfoModal>
  )
}

/**
 * Maintenance Modal
 * For system maintenance notifications
 */
export interface MaintenanceModalProps extends Omit<InfoModalProps, 'type'> {
  scheduledTime?: Date
  duration?: string
  affectedServices?: string[]
}

export function MaintenanceModal({
  title = "Scheduled Maintenance",
  scheduledTime,
  duration,
  affectedServices,
  children,
  closeText = "Acknowledge",
  ...props
}: MaintenanceModalProps) {
  return (
    <InfoModal
      title={title}
      type="warning"
      closeText={closeText}
      {...props}
    >
      <div className="space-y-3">
        {scheduledTime && (
          <div className="text-sm">
            <strong>Scheduled for:</strong> {scheduledTime.toLocaleString()}
          </div>
        )}
        {duration && (
          <div className="text-sm">
            <strong>Expected duration:</strong> {duration}
          </div>
        )}
        {affectedServices && affectedServices.length > 0 && (
          <div className="text-sm">
            <strong>Affected services:</strong>
            <ul className="list-disc list-inside mt-1 ml-2">
              {affectedServices.map((service, index) => (
                <li key={index}>{service}</li>
              ))}
            </ul>
          </div>
        )}
        {children}
      </div>
    </InfoModal>
  )
}
"use client"

import * as React from "react"
import { useForm, UseFormReturn, FieldValues, SubmitHandler } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ZodSchema } from "zod"
import { Modal, ModalProps } from "./modal"
import { Form } from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

// Form modal specific props
export interface FormModalProps<T extends FieldValues> extends Omit<ModalProps, 'children' | 'primaryAction' | 'secondaryAction'> {
  schema?: ZodSchema<T>
  defaultValues?: Partial<T>
  onSubmit: SubmitHandler<T>
  onCancel?: () => void
  submitText?: string
  cancelText?: string
  isLoading?: boolean
  children: (form: UseFormReturn<T>) => React.ReactNode
  resetOnSubmit?: boolean
  closeOnSubmit?: boolean
  form?: UseFormReturn<T> // Allow external form control
}

/**
 * Form Modal for forms within modals
 * Provides form state management and validation
 */
export function FormModal<T extends FieldValues>({
  open,
  onOpenChange,
  title,
  description,
  schema,
  defaultValues,
  onSubmit,
  onCancel,
  submitText = "Submit",
  cancelText = "Cancel",
  isLoading = false,
  children,
  resetOnSubmit = true,
  closeOnSubmit = true,
  form: externalForm,
  size = "md",
  ...props
}: FormModalProps<T>) {
  // Use external form or create internal one
  const internalForm = useForm<T>({
    resolver: schema ? zodResolver(schema) : undefined,
    defaultValues: defaultValues as any
  })

  const form = externalForm || internalForm

  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Handle form submission
  const handleSubmit = async (data: T) => {
    if (isSubmitting || isLoading) return

    setIsSubmitting(true)
    try {
      await onSubmit(data)
      
      if (resetOnSubmit) {
        form.reset()
      }
      
      if (closeOnSubmit) {
        onOpenChange(false)
      }
    } catch (error) {
      console.error("Form submission failed:", error)
      // Form stays open on error for user to retry
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle cancel
  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    } else {
      onOpenChange(false)
    }
    
    // Reset form on cancel
    if (resetOnSubmit) {
      form.reset()
    }
  }

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (!open && resetOnSubmit) {
      form.reset()
    }
  }, [open, form, resetOnSubmit])

  const isProcessing = isSubmitting || isLoading

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      size={size}
      closeOnOverlayClick={!isProcessing}
      closeOnEscape={!isProcessing}
      {...props}
      footer={
        <div className="flex gap-2 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isProcessing}
          >
            {cancelText}
          </Button>
          <Button
            type="submit"
            form="modal-form"
            disabled={isProcessing}
            className="min-w-24"
          >
            {isProcessing && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {submitText}
          </Button>
        </div>
      }
    >
      <Form {...form}>
        <form
          id="modal-form"
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-4"
        >
          {children(form)}
        </form>
      </Form>
    </Modal>
  )
}

// Hook for managing form modal state
export interface UseFormModalOptions<T extends FieldValues> {
  schema?: ZodSchema<T>
  defaultValues?: Partial<T>
  resetOnClose?: boolean
}

export interface UseFormModalReturn<T extends FieldValues> {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
  form: UseFormReturn<T>
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
}

export function useFormModal<T extends FieldValues>({
  schema,
  defaultValues,
  resetOnClose = true
}: UseFormModalOptions<T> = {}): UseFormModalReturn<T> {
  const [isOpen, setIsOpen] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)

  const form = useForm<T>({
    resolver: schema ? zodResolver(schema) : undefined,
    defaultValues: defaultValues as any
  })

  const open = React.useCallback(() => setIsOpen(true), [])
  const close = React.useCallback(() => {
    setIsOpen(false)
    if (resetOnClose) {
      form.reset()
    }
  }, [form, resetOnClose])
  const toggle = React.useCallback(() => setIsOpen(prev => !prev), [])

  return {
    isOpen,
    open,
    close,
    toggle,
    form,
    isLoading,
    setIsLoading
  }
}

// Specialized form modals for common use cases

/**
 * Quick Action Form Modal
 * For simple forms with minimal configuration
 */
export interface QuickFormModalProps<T extends FieldValues> extends Omit<FormModalProps<T>, 'children'> {
  fields: Array<{
    name: keyof T
    label: string
    type?: "text" | "email" | "password" | "number" | "textarea"
    placeholder?: string
    required?: boolean
  }>
}

export function QuickFormModal<T extends FieldValues>({
  fields,
  ...props
}: QuickFormModalProps<T>) {
  return (
    <FormModal {...props}>
      {(form) => (
        <div className="space-y-4">
          {fields.map((field) => (
            <div key={field.name as string} className="space-y-2">
              <label className="text-sm font-medium">
                {field.label}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </label>
              {field.type === "textarea" ? (
                <textarea
                  {...form.register(field.name as any)}
                  placeholder={field.placeholder}
                  className="w-full p-2 border rounded-md"
                  rows={3}
                />
              ) : (
                <input
                  {...form.register(field.name as any)}
                  type={field.type || "text"}
                  placeholder={field.placeholder}
                  className="w-full p-2 border rounded-md"
                />
              )}
              {form.formState.errors[field.name] && (
                <p className="text-sm text-destructive">
                  {form.formState.errors[field.name]?.message as string}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </FormModal>
  )
}
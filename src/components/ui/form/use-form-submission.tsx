"use client"

import * as React from "react"
import { UseFormReturn, FieldValues } from "react-hook-form"
import { useNotificationActions } from "@/store/notifications-store"

interface FormSubmissionOptions<T extends FieldValues> {
  form: UseFormReturn<T>
  onSubmit: (data: T) => Promise<void> | void
  onSuccess?: (data: T) => void
  onError?: (error: Error) => void
  successMessage?: string
  errorMessage?: string
  resetOnSuccess?: boolean
  validateBeforeSubmit?: boolean
}

interface FormSubmissionState {
  isSubmitting: boolean
  isSuccess: boolean
  isError: boolean
  error: Error | null
  attemptCount: number
}

/**
 * Hook for handling form submission with loading states, error handling, and notifications
 */
export function useFormSubmission<T extends FieldValues>({
  form,
  onSubmit,
  onSuccess,
  onError,
  successMessage = "Form submitted successfully!",
  errorMessage = "There was an error submitting the form.",
  resetOnSuccess = false,
  validateBeforeSubmit = true
}: FormSubmissionOptions<T>) {
  const { showSuccess, showError } = useNotificationActions()
  
  const [state, setState] = React.useState<FormSubmissionState>({
    isSubmitting: false,
    isSuccess: false,
    isError: false,
    error: null,
    attemptCount: 0
  })

  const submit = React.useCallback(async (data: T) => {
    setState(prev => ({
      ...prev,
      isSubmitting: true,
      isError: false,
      error: null,
      attemptCount: prev.attemptCount + 1
    }))

    try {
      // Validate form if required
      if (validateBeforeSubmit) {
        const isValid = await form.trigger()
        if (!isValid) {
          throw new Error("Form validation failed")
        }
      }

      // Execute submission
      await onSubmit(data)

      // Success state
      setState(prev => ({
        ...prev,
        isSubmitting: false,
        isSuccess: true,
        isError: false,
        error: null
      }))

      // Show success notification
      showSuccess("Success", successMessage)

      // Reset form if configured
      if (resetOnSuccess) {
        form.reset()
      }

      // Call success callback
      onSuccess?.(data)

    } catch (error) {
      const errorInstance = error instanceof Error ? error : new Error("Unknown error occurred")
      
      setState(prev => ({
        ...prev,
        isSubmitting: false,
        isSuccess: false,
        isError: true,
        error: errorInstance
      }))

      // Show error notification
      showError("Error", errorInstance.message || errorMessage)

      // Call error callback
      onError?.(errorInstance)
    }
  }, [
    form,
    onSubmit,
    onSuccess,
    onError,
    successMessage,
    errorMessage,
    resetOnSuccess,
    validateBeforeSubmit,
    showSuccess,
    showError
  ])

  const retry = React.useCallback(() => {
    if (form.formState.isValid) {
      submit(form.getValues())
    }
  }, [form, submit])

  const reset = React.useCallback(() => {
    setState({
      isSubmitting: false,
      isSuccess: false,
      isError: false,
      error: null,
      attemptCount: 0
    })
  }, [])

  return {
    ...state,
    submit,
    retry,
    reset
  }
}

/**
 * Hook for handling file upload with progress tracking and error handling
 */
interface FileUploadOptions {
  endpoint: string
  acceptedTypes?: string[]
  maxSize?: number // in bytes
  onProgress?: (progress: number) => void
  onSuccess?: (response: any) => void
  onError?: (error: Error) => void
}

interface FileUploadState {
  isUploading: boolean
  progress: number
  isSuccess: boolean
  isError: boolean
  error: Error | null
  uploadedFile: File | null
}

export function useFileUpload({
  endpoint,
  acceptedTypes,
  maxSize,
  onProgress,
  onSuccess,
  onError
}: FileUploadOptions) {
  const { showSuccess, showError } = useNotificationActions()
  
  const [state, setState] = React.useState<FileUploadState>({
    isUploading: false,
    progress: 0,
    isSuccess: false,
    isError: false,
    error: null,
    uploadedFile: null
  })

  const validateFile = (file: File): string | null => {
    if (acceptedTypes && !acceptedTypes.some(type => file.name.endsWith(type))) {
      return `File type not accepted. Allowed types: ${acceptedTypes.join(", ")}`
    }
    
    if (maxSize && file.size > maxSize) {
      return `File size too large. Maximum size: ${(maxSize / 1024 / 1024).toFixed(1)}MB`
    }
    
    return null
  }

  const upload = React.useCallback(async (file: File) => {
    // Validate file
    const validationError = validateFile(file)
    if (validationError) {
      const error = new Error(validationError)
      setState(prev => ({
        ...prev,
        isError: true,
        error
      }))
      showError("File Validation Error", validationError)
      onError?.(error)
      return
    }

    setState(prev => ({
      ...prev,
      isUploading: true,
      progress: 0,
      isError: false,
      error: null,
      uploadedFile: file
    }))

    try {
      const formData = new FormData()
      formData.append("file", file)

      const xhr = new XMLHttpRequest()

      return new Promise<any>((resolve, reject) => {
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100)
            setState(prev => ({ ...prev, progress }))
            onProgress?.(progress)
          }
        })

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const response = JSON.parse(xhr.responseText)
            setState(prev => ({
              ...prev,
              isUploading: false,
              isSuccess: true,
              progress: 100
            }))
            showSuccess("Upload Successful", "File uploaded successfully!")
            onSuccess?.(response)
            resolve(response)
          } else {
            const error = new Error(`Upload failed with status ${xhr.status}`)
            setState(prev => ({
              ...prev,
              isUploading: false,
              isError: true,
              error
            }))
            showError("Upload Failed", error.message)
            onError?.(error)
            reject(error)
          }
        })

        xhr.addEventListener("error", () => {
          const error = new Error("Upload failed due to network error")
          setState(prev => ({
            ...prev,
            isUploading: false,
            isError: true,
            error
          }))
          showError("Upload Failed", error.message)
          onError?.(error)
          reject(error)
        })

        xhr.open("POST", endpoint)
        xhr.send(formData)
      })

    } catch (error) {
      const errorInstance = error instanceof Error ? error : new Error("Upload failed")
      setState(prev => ({
        ...prev,
        isUploading: false,
        isError: true,
        error: errorInstance
      }))
      showError("Upload Error", errorInstance.message)
      onError?.(errorInstance)
    }
  }, [endpoint, acceptedTypes, maxSize, onProgress, onSuccess, onError, showSuccess, showError])

  const reset = React.useCallback(() => {
    setState({
      isUploading: false,
      progress: 0,
      isSuccess: false,
      isError: false,
      error: null,
      uploadedFile: null
    })
  }, [])

  return {
    ...state,
    upload,
    reset,
    validateFile
  }
}

/**
 * Hook for handling form field validation with debouncing
 */
interface FieldValidationOptions {
  validator: (value: any) => Promise<string | null> | string | null
  debounceMs?: number
  validateOnChange?: boolean
  validateOnBlur?: boolean
}

interface FieldValidationState {
  isValidating: boolean
  isValid: boolean | null
  error: string | null
}

export function useFieldValidation({
  validator,
  debounceMs = 300,
  validateOnChange = true,
  validateOnBlur = true
}: FieldValidationOptions) {
  const [state, setState] = React.useState<FieldValidationState>({
    isValidating: false,
    isValid: null,
    error: null
  })

  const debounceRef = React.useRef<NodeJS.Timeout>()

  const validate = React.useCallback(async (value: any) => {
    setState(prev => ({ ...prev, isValidating: true }))

    try {
      const result = await validator(value)
      setState({
        isValidating: false,
        isValid: result === null,
        error: result
      })
    } catch (error) {
      setState({
        isValidating: false,
        isValid: false,
        error: error instanceof Error ? error.message : "Validation error"
      })
    }
  }, [validator])

  const debouncedValidate = React.useCallback((value: any) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      validate(value)
    }, debounceMs)
  }, [validate, debounceMs])

  const handleChange = React.useCallback((value: any) => {
    if (validateOnChange) {
      debouncedValidate(value)
    }
  }, [debouncedValidate, validateOnChange])

  const handleBlur = React.useCallback((value: any) => {
    if (validateOnBlur) {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      validate(value)
    }
  }, [validate, validateOnBlur])

  React.useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  return {
    ...state,
    validate,
    handleChange,
    handleBlur
  }
}
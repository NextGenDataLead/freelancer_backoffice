"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { 
  AlertTriangle, 
  RefreshCw, 
  Bug, 
  Mail, 
  FileText,
  ChevronDown,
  ChevronUp
} from "lucide-react"
import { cn } from "@/lib/utils"

interface FormErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

interface FormErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<FormErrorDisplayProps>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  showErrorDetails?: boolean
}

interface FormErrorDisplayProps {
  error: Error | null
  errorInfo: React.ErrorInfo | null
  onRetry: () => void
  showDetails?: boolean
}

/**
 * Error boundary specifically designed for form components
 * Catches JavaScript errors anywhere in the form component tree
 */
export class FormErrorBoundary extends React.Component<FormErrorBoundaryProps, FormErrorBoundaryState> {
  constructor(props: FormErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): Partial<FormErrorBoundaryState> {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo
    })

    // Log error to external service in production
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    } else {
      console.error("Form Error Boundary caught an error:", error, errorInfo)
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultFormErrorDisplay
      return (
        <FallbackComponent
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onRetry={this.handleRetry}
          showDetails={this.props.showErrorDetails}
        />
      )
    }

    return this.props.children
  }
}

/**
 * Default error display component for forms
 */
function DefaultFormErrorDisplay({ 
  error, 
  errorInfo, 
  onRetry, 
  showDetails = false 
}: FormErrorDisplayProps) {
  const [showDetailedError, setShowDetailedError] = React.useState(false)
  const [reportSent, setReportSent] = React.useState(false)

  const handleSendReport = async () => {
    try {
      // In production, send error report to monitoring service
      await new Promise(resolve => setTimeout(resolve, 1000))
      setReportSent(true)
    } catch (err) {
      console.error("Failed to send error report:", err)
    }
  }

  const getErrorCategory = (error: Error | null): string => {
    if (!error) return "Unknown"
    
    const message = error.message.toLowerCase()
    const stack = error.stack?.toLowerCase() || ""
    
    if (message.includes("network") || message.includes("fetch")) return "Network"
    if (message.includes("validation") || message.includes("invalid")) return "Validation"
    if (message.includes("permission") || message.includes("unauthorized")) return "Permission"
    if (stack.includes("react-hook-form")) return "Form"
    if (stack.includes("zod")) return "Validation"
    
    return "Application"
  }

  const getErrorSeverity = (error: Error | null): "low" | "medium" | "high" => {
    if (!error) return "medium"
    
    const message = error.message.toLowerCase()
    
    if (message.includes("critical") || message.includes("fatal")) return "high"
    if (message.includes("warning") || message.includes("validation")) return "low"
    
    return "medium"
  }

  const severity = getErrorSeverity(error)
  const category = getErrorCategory(error)

  return (
    <Card className="border-destructive/50 bg-destructive/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <CardTitle className="text-destructive">Form Error Occurred</CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            <Badge 
              variant={severity === "high" ? "destructive" : severity === "medium" ? "default" : "secondary"}
            >
              {severity.toUpperCase()}
            </Badge>
            <Badge variant="outline">
              {category}
            </Badge>
          </div>
        </div>
        <CardDescription>
          Something went wrong while processing your form. Don't worry, your data is safe.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert>
            <Bug className="h-4 w-4" />
            <AlertDescription className="font-mono text-sm">
              {error.message || "An unexpected error occurred"}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-wrap gap-2">
          <Button onClick={onRetry} size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          
          {!reportSent ? (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSendReport}
            >
              <Mail className="mr-2 h-4 w-4" />
              Report Issue
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              <Mail className="mr-2 h-4 w-4" />
              Report Sent
            </Button>
          )}

          {(showDetails || showDetailedError) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetailedError(!showDetailedError)}
            >
              <FileText className="mr-2 h-4 w-4" />
              {showDetailedError ? (
                <>
                  Hide Details
                  <ChevronUp className="ml-1 h-3 w-3" />
                </>
              ) : (
                <>
                  Show Details
                  <ChevronDown className="ml-1 h-3 w-3" />
                </>
              )}
            </Button>
          )}
        </div>

        {showDetailedError && error && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Error Details</h4>
            <div className="rounded border bg-slate-50 p-3">
              <div className="space-y-2 text-xs font-mono">
                <div>
                  <span className="font-semibold">Error:</span> {error.name}
                </div>
                <div>
                  <span className="font-semibold">Message:</span> {error.message}
                </div>
                {error.stack && (
                  <div>
                    <span className="font-semibold">Stack Trace:</span>
                    <pre className="mt-1 whitespace-pre-wrap text-xs">
                      {error.stack}
                    </pre>
                  </div>
                )}
                {errorInfo?.componentStack && (
                  <div>
                    <span className="font-semibold">Component Stack:</span>
                    <pre className="mt-1 whitespace-pre-wrap text-xs">
                      {errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="rounded border border-blue-200 bg-blue-50 p-3">
          <h4 className="font-semibold text-sm text-blue-900">What can you do?</h4>
          <ul className="mt-2 space-y-1 text-sm text-blue-800">
            <li>• Try refreshing the page</li>
            <li>• Check your internet connection</li>
            <li>• Try filling out the form again</li>
            <li>• Contact support if the problem persists</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Hook for handling form errors and error states
 */
export function useFormErrorHandler() {
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [globalError, setGlobalError] = React.useState<string | null>(null)
  const [isErrored, setIsErrored] = React.useState(false)

  const addError = React.useCallback((field: string, message: string) => {
    setErrors(prev => ({ ...prev, [field]: message }))
    setIsErrored(true)
  }, [])

  const removeError = React.useCallback((field: string) => {
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[field]
      return newErrors
    })
    
    setIsErrored(Object.keys(errors).length > 1)
  }, [errors])

  const clearErrors = React.useCallback(() => {
    setErrors({})
    setGlobalError(null)
    setIsErrored(false)
  }, [])

  const setError = React.useCallback((error: string | Record<string, string>) => {
    if (typeof error === "string") {
      setGlobalError(error)
    } else {
      setErrors(error)
    }
    setIsErrored(true)
  }, [])

  const hasError = React.useCallback((field?: string): boolean => {
    if (field) {
      return !!errors[field]
    }
    return isErrored || !!globalError || Object.keys(errors).length > 0
  }, [errors, globalError, isErrored])

  const getError = React.useCallback((field: string): string | undefined => {
    return errors[field]
  }, [errors])

  return {
    errors,
    globalError,
    isErrored,
    addError,
    removeError,
    clearErrors,
    setError,
    hasError,
    getError,
  }
}

/**
 * Component for displaying form-level errors
 */
interface FormErrorDisplayProps {
  errors?: Record<string, string>
  globalError?: string | null
  className?: string
  onDismiss?: () => void
}

export function FormErrorDisplay({ 
  errors = {}, 
  globalError, 
  className,
  onDismiss
}: FormErrorDisplayProps) {
  const hasErrors = globalError || Object.keys(errors).length > 0

  if (!hasErrors) return null

  return (
    <Alert className={cn("border-destructive/50 bg-destructive/5", className)}>
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>
        {globalError && (
          <div className="font-medium text-destructive">{globalError}</div>
        )}
        {Object.keys(errors).length > 0 && (
          <div className="space-y-1">
            {globalError && <div className="mt-2" />}
            <div className="text-sm">Please fix the following errors:</div>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {Object.entries(errors).map(([field, message]) => (
                <li key={field}>
                  <span className="font-medium">{field}:</span> {message}
                </li>
              ))}
            </ul>
          </div>
        )}
        {onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 h-auto p-0 text-destructive hover:text-destructive"
            onClick={onDismiss}
          >
            Dismiss
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}
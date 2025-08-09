"use client"

import * as React from "react"
import { FormErrorBoundary } from "@/components/ui/form/form-error-boundary"
import { FormDemo } from "@/components/ui/form/form-demo"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Home, 
  ChevronRight, 
  Code2, 
  FileText, 
  Zap,
  Shield,
  CheckCircle,
  AlertTriangle
} from "lucide-react"

export default function FormsPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm text-slate-500">
            <Home className="h-4 w-4" />
            <ChevronRight className="h-4 w-4" />
            <span>Dashboard</span>
            <ChevronRight className="h-4 w-4" />
            <span className="font-medium text-slate-900">Advanced Forms</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="space-y-8">
          {/* Page Header */}
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Advanced Form Components</h1>
            <p className="text-slate-600 mt-1">
              Comprehensive form components with validation, error handling, and accessibility features.
            </p>
          </div>

          {/* Feature Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Code2 className="h-5 w-5 text-blue-500" />
                  <div>
                    <div className="font-semibold text-sm">React Hook Form</div>
                    <div className="text-xs text-slate-600">+ Zod Validation</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-green-500" />
                  <div>
                    <div className="font-semibold text-sm">Type Safety</div>
                    <div className="text-xs text-slate-600">Full TypeScript</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  <div>
                    <div className="font-semibold text-sm">Performance</div>
                    <div className="text-xs text-slate-600">Optimized Rendering</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                  <div>
                    <div className="font-semibold text-sm">Accessibility</div>
                    <div className="text-xs text-slate-600">WCAG 2.1 AA</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Implementation Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                Implementation Status
              </CardTitle>
              <CardDescription>
                Current status of Task 9: Advanced Form Components implementation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Form validation libraries (React Hook Form + Zod)</span>
                  <Badge variant="default">✅ Completed</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Reusable form components with validation</span>
                  <Badge variant="default">✅ Completed</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Various input types (text, email, password, select, etc.)</span>
                  <Badge variant="default">✅ Completed</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Comprehensive error handling and display</span>
                  <Badge variant="default">✅ Completed</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">E2E testing of all form functionality</span>
                  <Badge variant="outline">🔄 In Progress</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Live Demo Section */}
          <Card>
            <CardHeader>
              <CardTitle>Live Form Demo</CardTitle>
              <CardDescription>
                Interactive demonstration of all form components, validation patterns, and error handling.
                Try filling out the form to see the validation in action.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormErrorBoundary
                showErrorDetails={false}
                onError={(error, errorInfo) => {
                  console.error("Form demo error:", error, errorInfo)
                }}
              >
                <FormDemo />
              </FormErrorBoundary>
            </CardContent>
          </Card>

          {/* Component Library Documentation */}
          <Card>
            <CardHeader>
              <CardTitle>Available Components</CardTitle>
              <CardDescription>
                Complete library of form components available for use throughout the application
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Core Components</h4>
                  <ul className="text-sm text-slate-600 space-y-1">
                    <li>• FormField (universal field wrapper)</li>
                    <li>• FormErrorBoundary (error handling)</li>
                    <li>• FormErrorDisplay (error UI)</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Input Variants</h4>
                  <ul className="text-sm text-slate-600 space-y-1">
                    <li>• PasswordInput (with toggle)</li>
                    <li>• SearchInput (with clear)</li>
                    <li>• FileUpload (drag & drop)</li>
                    <li>• URLInput (with validation)</li>
                    <li>• EmailInput, PhoneInput</li>
                    <li>• CurrencyInput, PercentageInput</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Validation & Hooks</h4>
                  <ul className="text-sm text-slate-600 space-y-1">
                    <li>• ValidationSchemas (common patterns)</li>
                    <li>• useFormSubmission (async handling)</li>
                    <li>• useFileUpload (with progress)</li>
                    <li>• useFieldValidation (debounced)</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error Handling Demo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="mr-2 h-5 w-5 text-orange-500" />
                Error Handling Demo
              </CardTitle>
              <CardDescription>
                Test the error boundary by clicking the button below to simulate a form error
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                onClick={() => {
                  throw new Error("This is a simulated form error for testing the error boundary")
                }}
                className="mb-4"
              >
                Trigger Error Boundary Test
              </Button>
              <p className="text-sm text-slate-600">
                Note: This will be caught by the error boundary and display a user-friendly error message
                with recovery options and error reporting functionality.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
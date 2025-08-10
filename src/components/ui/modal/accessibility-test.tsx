"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Modal, ConfirmationModal, FormModal, InfoModal } from "./"
import { useModal, useConfirmationModal } from "@/hooks/use-modal"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const testFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  message: z.string().min(10, "Message must be at least 10 characters")
})

type TestFormData = z.infer<typeof testFormSchema>

/**
 * Accessibility test component for modals
 * Tests focus management, keyboard navigation, and ARIA attributes
 */
export function ModalAccessibilityTest() {
  const basicModal = useModal()
  const longModal = useModal()
  const nestedModal = useModal()
  const confirmation = useConfirmationModal()

  const [testResults, setTestResults] = React.useState<string[]>([])
  const [focusedElement, setFocusedElement] = React.useState<string>("")

  // Track focus changes for accessibility testing
  React.useEffect(() => {
    const handleFocus = (event: FocusEvent) => {
      const target = event.target as HTMLElement
      if (target.tagName && target.id) {
        setFocusedElement(`${target.tagName.toLowerCase()}#${target.id}`)
      } else if (target.tagName && target.className) {
        setFocusedElement(`${target.tagName.toLowerCase()}.${target.className.split(' ')[0]}`)
      } else {
        setFocusedElement(target.tagName?.toLowerCase() || 'unknown')
      }
    }

    document.addEventListener('focusin', handleFocus)
    return () => document.removeEventListener('focusin', handleFocus)
  }, [])

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`])
  }

  const handleFormSubmit = async (data: TestFormData) => {
    addTestResult(`Form submitted: ${data.name} (${data.email})`)
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        addTestResult("Form processing completed")
        resolve()
      }, 1000)
    })
  }

  const handleConfirmation = async () => {
    const confirmed = await confirmation.confirm({
      title: "Confirm Action",
      description: "Are you sure you want to proceed with this action?",
      confirmText: "Yes, proceed",
      cancelText: "Cancel"
    })
    
    addTestResult(`Confirmation result: ${confirmed ? 'confirmed' : 'cancelled'}`)
  }

  const testKeyboardNavigation = () => {
    addTestResult("Keyboard navigation test started")
    addTestResult("Instructions: Use Tab/Shift+Tab to navigate, Enter/Space to activate, Escape to close")
    basicModal.open()
  }

  const testFocusTrap = () => {
    addTestResult("Focus trap test started")
    addTestResult("Instructions: Try to Tab outside the modal - focus should stay trapped inside")
    longModal.open()
  }

  const testNestedModals = () => {
    addTestResult("Nested modals test started")
    basicModal.open()
  }

  return (
    <div className="space-y-8 p-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold mb-4">Modal Accessibility Test Suite</h1>
        <p className="text-gray-600 mb-6">
          Test focus management, keyboard navigation, and screen reader compatibility.
        </p>
        
        {focusedElement && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <strong>Currently focused:</strong> {focusedElement}
          </div>
        )}
      </div>

      {/* Test Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Button onClick={testKeyboardNavigation} data-autofocus>
          Test Keyboard Navigation
        </Button>
        
        <Button onClick={testFocusTrap} variant="outline">
          Test Focus Trap
        </Button>
        
        <Button onClick={testNestedModals} variant="outline">
          Test Nested Modals
        </Button>
        
        <Button onClick={handleConfirmation} variant="outline">
          Test Confirmation Modal
        </Button>
      </div>

      {/* Test Results */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-3">Test Results:</h3>
        <div className="bg-gray-50 p-4 rounded-lg max-h-60 overflow-y-auto">
          {testResults.length === 0 ? (
            <p className="text-gray-500">No test results yet</p>
          ) : (
            <ul className="space-y-1 text-sm font-mono">
              {testResults.map((result, index) => (
                <li key={index}>{result}</li>
              ))}
            </ul>
          )}
        </div>
        
        {testResults.length > 0 && (
          <Button 
            onClick={() => setTestResults([])} 
            variant="ghost" 
            size="sm" 
            className="mt-2"
          >
            Clear Results
          </Button>
        )}
      </div>

      {/* Basic Modal */}
      <Modal
        open={basicModal.isOpen}
        onOpenChange={basicModal.toggle}
        title="Basic Accessibility Test Modal"
        description="This modal tests basic keyboard navigation and focus management."
        primaryAction={{
          label: "Open Nested Modal",
          onClick: () => nestedModal.open(),
          autoFocus: true
        }}
        secondaryAction={{
          label: "Close",
          onClick: basicModal.close,
          variant: "outline"
        }}
      >
        <div className="space-y-4">
          <p>Use Tab and Shift+Tab to navigate between focusable elements.</p>
          <Input placeholder="Test input field" aria-label="Test input" />
          <Button variant="outline" onClick={() => addTestResult("Button in modal clicked")}>
            Test Button
          </Button>
        </div>
      </Modal>

      {/* Long Modal for Focus Trap Testing */}
      <Modal
        open={longModal.isOpen}
        onOpenChange={longModal.toggle}
        title="Focus Trap Test Modal"
        description="This modal contains many focusable elements to test focus trapping."
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="test-input-1">First Input</Label>
              <Input id="test-input-1" placeholder="First input" />
            </div>
            <div>
              <Label htmlFor="test-input-2">Second Input</Label>
              <Input id="test-input-2" placeholder="Second input" />
            </div>
          </div>
          
          <div>
            <Label htmlFor="test-textarea">Message</Label>
            <Textarea id="test-textarea" placeholder="Type your message here..." />
          </div>
          
          <div className="flex gap-2">
            <Button onClick={() => addTestResult("Primary action clicked")} autoFocus>
              Primary Action
            </Button>
            <Button variant="outline" onClick={() => addTestResult("Secondary action clicked")}>
              Secondary Action
            </Button>
            <Button variant="ghost" onClick={() => addTestResult("Tertiary action clicked")}>
              Tertiary Action
            </Button>
          </div>
          
          <div className="flex justify-end">
            <Button onClick={longModal.close}>Close Modal</Button>
          </div>
        </div>
      </Modal>

      {/* Nested Modal */}
      <Modal
        open={nestedModal.isOpen}
        onOpenChange={nestedModal.toggle}
        title="Nested Modal"
        description="This modal opened from another modal to test focus restoration."
        type="info"
      >
        <p>When you close this modal, focus should return to the button that opened it.</p>
        <div className="flex justify-end mt-4">
          <Button onClick={nestedModal.close} autoFocus>
            Close Nested Modal
          </Button>
        </div>
      </Modal>

      {/* Form Modal for Testing */}
      <FormModal
        open={basicModal.isOpen && nestedModal.isOpen}
        onOpenChange={() => {}}
        title="Accessible Form Modal"
        schema={testFormSchema}
        onSubmit={handleFormSubmit}
      >
        {(form) => (
          <div className="space-y-4">
            <div>
              <Label htmlFor="form-name">Name *</Label>
              <Input
                id="form-name"
                {...form.register("name")}
                placeholder="Enter your name"
                aria-describedby={form.formState.errors.name ? "name-error" : undefined}
              />
              {form.formState.errors.name && (
                <p id="name-error" className="text-sm text-red-600 mt-1" role="alert">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
            
            <div>
              <Label htmlFor="form-email">Email *</Label>
              <Input
                id="form-email"
                type="email"
                {...form.register("email")}
                placeholder="Enter your email"
                aria-describedby={form.formState.errors.email ? "email-error" : undefined}
              />
              {form.formState.errors.email && (
                <p id="email-error" className="text-sm text-red-600 mt-1" role="alert">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>
            
            <div>
              <Label htmlFor="form-message">Message *</Label>
              <Textarea
                id="form-message"
                {...form.register("message")}
                placeholder="Enter your message"
                aria-describedby={form.formState.errors.message ? "message-error" : undefined}
              />
              {form.formState.errors.message && (
                <p id="message-error" className="text-sm text-red-600 mt-1" role="alert">
                  {form.formState.errors.message.message}
                </p>
              )}
            </div>
          </div>
        )}
      </FormModal>
    </div>
  )
}
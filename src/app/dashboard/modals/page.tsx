"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { 
  Modal,
  ConfirmationModal,
  DeleteConfirmationModal,
  SaveChangesModal,
  LogoutConfirmationModal,
  FormModal,
  QuickFormModal,
  InfoModal,
  SuccessModal,
  ErrorModal,
  WarningModal,
  HelpModal,
  FeatureModal,
  MaintenanceModal,
  ModalAccessibilityTest
} from "@/components/ui/modal"
import { useModal, useConfirmationModal, ModalProvider } from "@/hooks/use-modal"
import { 
  PlayCircle, 
  Settings, 
  User, 
  Trash2, 
  Save, 
  LogOut, 
  AlertCircle,
  CheckCircle,
  Info,
  HelpCircle,
  Star,
  Wrench
} from "lucide-react"

// Form schemas
const userProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  bio: z.string().min(10, "Bio must be at least 10 characters"),
  role: z.enum(["admin", "user", "moderator"])
})

const contactFormSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(10, "Message must be at least 10 characters"),
  priority: z.enum(["low", "medium", "high"])
})

type UserProfileData = z.infer<typeof userProfileSchema>
type ContactFormData = z.infer<typeof contactFormSchema>

function ModalDemoSection() {
  // Modal hooks
  const basicModal = useModal()
  const customModal = useModal()
  const userProfileModal = useModal()
  const contactModal = useModal()
  const successModal = useModal()
  const errorModal = useModal()
  const warningModal = useModal()
  const helpModal = useModal()
  const featureModal = useModal()
  const maintenanceModal = useModal()
  
  // Confirmation modal hook
  const confirmation = useConfirmationModal()

  // Demo state
  const [demoData, setDemoData] = React.useState({
    userProfiles: [] as UserProfileData[],
    contacts: [] as ContactFormData[],
    lastAction: ""
  })

  const updateLastAction = (action: string) => {
    setDemoData(prev => ({ ...prev, lastAction: action }))
  }

  // Form submission handlers
  const handleUserProfileSubmit = async (data: UserProfileData) => {
    updateLastAction(`User profile created: ${data.name} (${data.email})`)
    setDemoData(prev => ({ 
      ...prev, 
      userProfiles: [...prev.userProfiles, data] 
    }))
    userProfileModal.close()
    successModal.open()
  }

  const handleContactSubmit = async (data: ContactFormData) => {
    updateLastAction(`Contact form submitted: ${data.subject} (${data.priority} priority)`)
    setDemoData(prev => ({ 
      ...prev, 
      contacts: [...prev.contacts, data] 
    }))
    contactModal.close()
    successModal.open()
  }

  // Confirmation handlers
  const handleDeleteUser = async () => {
    const confirmed = await confirmation.confirm({
      title: "Delete User Profile",
      description: "Are you sure you want to delete this user profile? This action cannot be undone.",
      confirmText: "Delete Profile",
      cancelText: "Cancel",
      variant: "destructive"
    })
    
    if (confirmed) {
      updateLastAction("User profile deleted")
      setDemoData(prev => ({ 
        ...prev, 
        userProfiles: prev.userProfiles.slice(0, -1) 
      }))
    }
  }

  const handleSaveChanges = async () => {
    const confirmed = await confirmation.confirm({
      title: "Save Changes",
      description: "You have unsaved changes. Would you like to save them before continuing?",
      confirmText: "Save Changes",
      cancelText: "Discard Changes"
    })
    
    updateLastAction(`Changes ${confirmed ? 'saved' : 'discarded'}`)
  }

  const handleLogout = async () => {
    const confirmed = await confirmation.confirm({
      title: "Confirm Logout",
      description: "Are you sure you want to log out? You will need to sign in again to access your account.",
      confirmText: "Log Out",
      cancelText: "Stay Signed In"
    })
    
    if (confirmed) {
      updateLastAction("User logged out")
      errorModal.open()
    }
  }

  return (
    <div className="space-y-8">
      {/* Status Display */}
      <Card>
        <CardHeader>
          <CardTitle>Demo Status</CardTitle>
          <CardDescription>Track the results of modal interactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>User Profiles Created</Label>
              <Badge variant="secondary" className="ml-2">
                {demoData.userProfiles.length}
              </Badge>
            </div>
            <div>
              <Label>Contact Forms Submitted</Label>
              <Badge variant="secondary" className="ml-2">
                {demoData.contacts.length}
              </Badge>
            </div>
            <div className="md:col-span-3">
              <Label>Last Action</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {demoData.lastAction || "No actions performed yet"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Basic Modals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlayCircle className="h-5 w-5" />
            Basic Modals
          </CardTitle>
          <CardDescription>
            Simple modals with different types and sizes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button onClick={basicModal.open} variant="outline">
              Basic Modal
            </Button>
            <Button onClick={customModal.open} variant="outline">
              Custom Modal
            </Button>
            <Button onClick={() => warningModal.open()} variant="outline">
              Warning Modal
            </Button>
            <Button onClick={() => helpModal.open()} variant="outline">
              Help Modal
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Form Modals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Form Modals
          </CardTitle>
          <CardDescription>
            Modals containing forms with validation and state management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button onClick={userProfileModal.open}>
              <User className="h-4 w-4 mr-2" />
              Create User Profile
            </Button>
            <Button onClick={contactModal.open} variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Contact Form
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Modals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Confirmation Modals
          </CardTitle>
          <CardDescription>
            Modals that require user confirmation for important actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button onClick={handleDeleteUser} variant="destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete User
            </Button>
            <Button onClick={handleSaveChanges} variant="outline">
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
            <Button onClick={handleLogout} variant="outline">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info Modals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Information Modals
          </CardTitle>
          <CardDescription>
            Modals that display information, feedback, or system status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button onClick={successModal.open} variant="outline">
              <CheckCircle className="h-4 w-4 mr-2" />
              Success
            </Button>
            <Button onClick={errorModal.open} variant="outline">
              <AlertCircle className="h-4 w-4 mr-2" />
              Error
            </Button>
            <Button onClick={featureModal.open} variant="outline">
              <Star className="h-4 w-4 mr-2" />
              New Feature
            </Button>
            <Button onClick={maintenanceModal.open} variant="outline">
              <Wrench className="h-4 w-4 mr-2" />
              Maintenance
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Basic Modal */}
      <Modal
        open={basicModal.isOpen}
        onOpenChange={basicModal.toggle}
        title="Basic Modal Example"
        description="This is a simple modal with basic content and actions."
        primaryAction={{
          label: "Confirm",
          onClick: () => {
            updateLastAction("Basic modal confirmed")
            basicModal.close()
          }
        }}
        secondaryAction={{
          label: "Cancel",
          onClick: basicModal.close,
          variant: "outline"
        }}
      >
        <div className="py-4">
          <p>This is the content area of the modal. You can put any React components here.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Use Tab to navigate between focusable elements and Escape to close.
          </p>
        </div>
      </Modal>

      {/* Custom Modal */}
      <Modal
        open={customModal.isOpen}
        onOpenChange={customModal.toggle}
        title="Custom Styled Modal"
        description="This modal demonstrates custom styling and multiple actions."
        type="info"
        size="lg"
        actions={[
          {
            label: "Primary Action",
            onClick: () => {
              updateLastAction("Primary action executed")
              customModal.close()
            },
            variant: "default"
          },
          {
            label: "Secondary Action",
            onClick: () => updateLastAction("Secondary action executed"),
            variant: "outline"
          },
          {
            label: "Destructive Action",
            onClick: () => {
              updateLastAction("Destructive action executed")
              customModal.close()
            },
            variant: "destructive"
          },
          {
            label: "Cancel",
            onClick: customModal.close,
            variant: "ghost"
          }
        ]}
      >
        <div className="space-y-4">
          <p>This modal showcases multiple action buttons with different variants.</p>
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900">Information</h4>
            <p className="text-sm text-blue-700 mt-1">
              Notice how the modal maintains proper focus management even with multiple actions.
            </p>
          </div>
        </div>
      </Modal>

      {/* User Profile Form Modal */}
      <FormModal
        open={userProfileModal.isOpen}
        onOpenChange={userProfileModal.toggle}
        title="Create User Profile"
        description="Fill out the form below to create a new user profile."
        schema={userProfileSchema}
        onSubmit={handleUserProfileSubmit}
        size="md"
      >
        {(form) => (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="profile-name">Full Name *</Label>
                <Input
                  id="profile-name"
                  {...form.register("name")}
                  placeholder="Enter full name"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>
              
              <div>
                <Label htmlFor="profile-email">Email Address *</Label>
                <Input
                  id="profile-email"
                  type="email"
                  {...form.register("email")}
                  placeholder="Enter email address"
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>
            </div>
            
            <div>
              <Label htmlFor="profile-role">Role</Label>
              <Select onValueChange={(value) => form.setValue("role", value as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="moderator">Moderator</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="profile-bio">Bio *</Label>
              <Textarea
                id="profile-bio"
                {...form.register("bio")}
                placeholder="Tell us about yourself..."
                rows={3}
              />
              {form.formState.errors.bio && (
                <p className="text-sm text-destructive mt-1">
                  {form.formState.errors.bio.message}
                </p>
              )}
            </div>
          </div>
        )}
      </FormModal>

      {/* Contact Form Modal */}
      <FormModal
        open={contactModal.isOpen}
        onOpenChange={contactModal.toggle}
        title="Contact Support"
        description="Send us a message and we'll get back to you as soon as possible."
        schema={contactFormSchema}
        onSubmit={handleContactSubmit}
      >
        {(form) => (
          <div className="space-y-4">
            <div>
              <Label htmlFor="contact-subject">Subject *</Label>
              <Input
                id="contact-subject"
                {...form.register("subject")}
                placeholder="What's this about?"
              />
              {form.formState.errors.subject && (
                <p className="text-sm text-destructive mt-1">
                  {form.formState.errors.subject.message}
                </p>
              )}
            </div>
            
            <div>
              <Label htmlFor="contact-priority">Priority</Label>
              <Select onValueChange={(value) => form.setValue("priority", value as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="contact-message">Message *</Label>
              <Textarea
                id="contact-message"
                {...form.register("message")}
                placeholder="Please describe your issue or question..."
                rows={4}
              />
              {form.formState.errors.message && (
                <p className="text-sm text-destructive mt-1">
                  {form.formState.errors.message.message}
                </p>
              )}
            </div>
          </div>
        )}
      </FormModal>

      {/* Info Modals */}
      <SuccessModal
        open={successModal.isOpen}
        onOpenChange={successModal.toggle}
        title="Success!"
        description="Your action was completed successfully."
        onClose={successModal.close}
      />

      <ErrorModal
        open={errorModal.isOpen}
        onOpenChange={errorModal.toggle}
        title="Logout Simulation"
        description="This would normally log you out, but this is just a demo."
        onClose={errorModal.close}
      />

      <WarningModal
        open={warningModal.isOpen}
        onOpenChange={warningModal.toggle}
        title="Warning"
        description="This action may have unintended consequences. Please review before proceeding."
        onClose={warningModal.close}
      />

      <HelpModal
        open={helpModal.isOpen}
        onOpenChange={helpModal.toggle}
        title="Help & Documentation"
        content="This modal system provides accessible, keyboard-navigable dialogs with proper focus management. All modals support Tab navigation, Escape key closing, and screen reader compatibility."
        onClose={helpModal.close}
      />

      <FeatureModal
        open={featureModal.isOpen}
        onOpenChange={featureModal.toggle}
        title="New Feature: Advanced Modals"
        description="We've just released our new modal system with enhanced accessibility features."
        features={[
          "Automatic focus management",
          "Keyboard navigation support", 
          "Screen reader compatibility",
          "Multiple modal types and sizes",
          "Form integration with validation"
        ]}
        onClose={featureModal.close}
      />

      <MaintenanceModal
        open={maintenanceModal.isOpen}
        onOpenChange={maintenanceModal.toggle}
        title="Scheduled Maintenance"
        description="We'll be performing system maintenance on Sunday, December 15th from 2:00 AM to 4:00 AM EST."
        scheduledTime="Sunday, December 15th, 2:00 AM - 4:00 AM EST"
        impact="During this time, some features may be temporarily unavailable."
        onClose={maintenanceModal.close}
      />
    </div>
  )
}

export default function ModalDemoPage() {
  const [showAccessibilityTest, setShowAccessibilityTest] = React.useState(false)

  return (
    <ModalProvider>
      <div className="container mx-auto p-6 space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Modal System Demo</h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive demonstration of the modal system with accessibility features,
            form integration, and various use cases.
          </p>
        </div>

        {/* Toggle Accessibility Test */}
        <Card>
          <CardHeader>
            <CardTitle>Accessibility Testing</CardTitle>
            <CardDescription>
              Use the accessibility test suite to verify keyboard navigation, focus management, and screen reader compatibility.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => setShowAccessibilityTest(!showAccessibilityTest)}
              variant={showAccessibilityTest ? "secondary" : "default"}
            >
              {showAccessibilityTest ? "Hide" : "Show"} Accessibility Test Suite
            </Button>
          </CardContent>
        </Card>

        {/* Accessibility Test Component */}
        {showAccessibilityTest && (
          <Card>
            <CardContent className="pt-6">
              <ModalAccessibilityTest />
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* Main Demo Section */}
        <ModalDemoSection />

        {/* Usage Information */}
        <Card>
          <CardHeader>
            <CardTitle>Usage Notes</CardTitle>
            <CardDescription>Important information about using the modal system</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <h4 className="font-medium">Keyboard Navigation</h4>
              <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                <li>• <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">Tab</kbd> - Move to next focusable element</li>
                <li>• <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">Shift+Tab</kbd> - Move to previous focusable element</li>
                <li>• <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">Escape</kbd> - Close modal</li>
                <li>• <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">Enter/Space</kbd> - Activate buttons</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium">Accessibility Features</h4>
              <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                <li>• Focus trap keeps focus within the modal</li>
                <li>• Focus restoration returns focus to trigger element</li>
                <li>• Proper ARIA labels and descriptions</li>
                <li>• Screen reader announcements</li>
                <li>• Scroll lock prevents background scrolling</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </ModalProvider>
  )
}
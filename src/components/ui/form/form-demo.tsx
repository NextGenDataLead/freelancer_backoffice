"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { useNotificationActions } from "@/store/notifications-store"
import {
  Form,
  ValidationSchemas,
  PasswordInput,
  SearchInput,
  FileUpload,
  URLInput,
  EmailInput,
  PhoneInput,
  CurrencyInput,
  PercentageInput
} from "./index"
import { FormField } from "./form-field"
import { Loader2, Save, RotateCcw } from "lucide-react"

// Comprehensive form schema showcasing all input types
const demoFormSchema = z.object({
  // Basic text inputs
  firstName: ValidationSchemas.requiredString("First name", 2, 50),
  lastName: ValidationSchemas.requiredString("Last name", 2, 50),
  email: ValidationSchemas.email,
  phone: ValidationSchemas.phone,
  website: ValidationSchemas.url,
  
  // Password with strength validation
  password: ValidationSchemas.password({
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true
  }),
  
  // Number inputs
  age: z.number().min(13, "Must be at least 13").max(120, "Must be realistic"),
  salary: z.number().positive("Salary must be positive"),
  
  // Text area
  bio: z.string().max(500, "Bio must be less than 500 characters").optional(),
  
  // Select dropdown
  country: z.string().min(1, "Please select a country"),
  
  // Checkbox
  termsAccepted: z.boolean().refine(val => val === true, "You must accept the terms"),
  
  // Radio selection
  experience: z.enum(["junior", "mid", "senior", "lead"]),
  
  // Switch toggle
  newsletter: z.boolean(),
  
  // Multiple checkboxes (skills)
  skills: z.array(z.string()).min(1, "Please select at least one skill"),
  
  // File upload (optional)
  resume: z.instanceof(File).optional(),
})

type DemoFormData = z.infer<typeof demoFormSchema>

const countryOptions = [
  { value: "us", label: "United States" },
  { value: "ca", label: "Canada" },
  { value: "uk", label: "United Kingdom" },
  { value: "de", label: "Germany" },
  { value: "fr", label: "France" },
  { value: "jp", label: "Japan" },
  { value: "au", label: "Australia" },
]

const experienceOptions = [
  { value: "junior", label: "Junior (0-2 years)" },
  { value: "mid", label: "Mid-level (2-5 years)" },
  { value: "senior", label: "Senior (5-8 years)" },
  { value: "lead", label: "Lead (8+ years)" },
]

const skillOptions = [
  "JavaScript", "TypeScript", "React", "Vue", "Angular", 
  "Node.js", "Python", "Java", "Go", "Rust"
]

export function FormDemo() {
  const { showSuccess, showError } = useNotificationActions()
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [selectedSkills, setSelectedSkills] = React.useState<string[]>([])

  const form = useForm<DemoFormData>({
    resolver: zodResolver(demoFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      website: "",
      password: "",
      age: undefined,
      salary: undefined,
      bio: "",
      country: "",
      termsAccepted: false,
      experience: undefined,
      newsletter: false,
      skills: [],
      resume: undefined,
    }
  })

  const onSubmit = async (data: DemoFormData) => {
    setIsSubmitting(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      showSuccess(
        "Form Submitted Successfully!", 
        "All form validation and submission patterns are working correctly."
      )
      
      console.log("Form data:", data)
    } catch (error) {
      showError("Submission Failed", "There was an error processing your form.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    form.reset()
    setSelectedSkills([])
  }

  const toggleSkill = (skill: string) => {
    const newSkills = selectedSkills.includes(skill)
      ? selectedSkills.filter(s => s !== skill)
      : [...selectedSkills, skill]
    
    setSelectedSkills(newSkills)
    form.setValue("skills", newSkills)
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Save className="mr-2 h-5 w-5" />
          Advanced Form Components Demo
        </CardTitle>
        <CardDescription>
          Comprehensive showcase of all form input types, validation patterns, and error handling.
          This demonstrates the reusable form components built for the SaaS template.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            
            {/* Basic Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  type="text"
                  label="First Name"
                  placeholder="Enter your first name"
                  required
                />
                
                <FormField
                  control={form.control}
                  name="lastName"
                  type="text"
                  label="Last Name"
                  placeholder="Enter your last name"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  type="email"
                  label="Email Address"
                  placeholder="Enter your email"
                  description="We'll never share your email with anyone else"
                  required
                />

                <FormField
                  control={form.control}
                  name="phone"
                  type="tel"
                  label="Phone Number"
                  placeholder="+1 (555) 123-4567"
                  description="Optional: For account recovery"
                />
              </div>

              <FormField
                control={form.control}
                name="website"
                type="url"
                label="Website"
                placeholder="https://yourwebsite.com"
                description="Optional: Your personal or company website"
              />
            </div>

            <Separator />

            {/* Security Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Security</h3>
              <FormField
                control={form.control}
                name="password"
                type="password"
                label="Password"
                placeholder="Create a strong password"
                description="Password must contain uppercase, lowercase, number, and special character"
                required
                showToggle
              />
            </div>

            <Separator />

            {/* Profile Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Profile Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="age"
                  type="number"
                  label="Age"
                  placeholder="25"
                  min={13}
                  max={120}
                  required
                />

                <FormField
                  control={form.control}
                  name="salary"
                  type="number"
                  label="Expected Salary (USD)"
                  placeholder="75000"
                  min={0}
                  step={1000}
                />

                <FormField
                  control={form.control}
                  name="country"
                  type="select"
                  label="Country"
                  placeholder="Select your country"
                  options={countryOptions}
                  required
                />
              </div>

              <FormField
                control={form.control}
                name="bio"
                type="textarea"
                label="Bio"
                placeholder="Tell us about yourself..."
                description="Brief description of your background and interests (max 500 characters)"
                rows={4}
              />
            </div>

            <Separator />

            {/* Experience Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Experience</h3>
              
              <FormField
                control={form.control}
                name="experience"
                type="radio"
                label="Experience Level"
                options={experienceOptions}
                orientation="vertical"
                required
              />

              {/* Skills Multi-Select */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Skills <span className="text-destructive">*</span>
                </label>
                <p className="text-sm text-slate-600">Select all that apply</p>
                <div className="flex flex-wrap gap-2">
                  {skillOptions.map((skill) => (
                    <Badge
                      key={skill}
                      variant={selectedSkills.includes(skill) ? "default" : "outline"}
                      className="cursor-pointer hover:bg-slate-100"
                      onClick={() => toggleSkill(skill)}
                    >
                      {skill}
                    </Badge>
                  ))}
                </div>
                {form.formState.errors.skills && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.skills.message}
                  </p>
                )}
              </div>
            </div>

            <Separator />

            {/* Preferences Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Preferences</h3>
              
              <FormField
                control={form.control}
                name="newsletter"
                type="switch"
                label="Newsletter Subscription"
                switchLabel="Receive our weekly newsletter"
                description="Get updates about new features and opportunities"
              />

              <FormField
                control={form.control}
                name="termsAccepted"
                type="checkbox"
                label="Agreement"
                checkboxLabel="I accept the terms and conditions"
                required
              />
            </div>

            <Separator />

            {/* File Upload Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Documents</h3>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Resume (Optional)</label>
                <FileUpload
                  acceptedTypes={[".pdf", ".doc", ".docx"]}
                  maxSize={5 * 1024 * 1024} // 5MB
                  onFileSelect={(files) => {
                    if (files && files.length > 0) {
                      form.setValue("resume", files[0])
                    }
                  }}
                />
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-between pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={isSubmitting}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset Form
              </Button>

              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="min-w-32"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Submit Form
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
"use client"

import { z } from "zod"

/**
 * Common validation schemas and utilities for forms
 * Provides reusable validation patterns across the application
 */

// Basic field validations
export const ValidationSchemas = {
  // Text fields
  requiredString: (fieldName: string, minLength = 1, maxLength = 255) =>
    z.string()
      .min(minLength, `${fieldName} is required`)
      .max(maxLength, `${fieldName} must be less than ${maxLength} characters`),

  optionalString: (maxLength = 255) =>
    z.string()
      .max(maxLength, `Must be less than ${maxLength} characters`)
      .optional(),

  // Email validation
  email: z.string()
    .email("Please enter a valid email address")
    .min(1, "Email is required"),

  // Password validation with configurable requirements
  password: (options?: {
    minLength?: number
    requireUppercase?: boolean
    requireLowercase?: boolean
    requireNumbers?: boolean
    requireSpecialChars?: boolean
    customMessage?: string
  }) => {
    const {
      minLength = 8,
      requireUppercase = true,
      requireLowercase = true,
      requireNumbers = true,
      requireSpecialChars = true,
      customMessage
    } = options || {}

    let regex = ""
    let requirements: string[] = []

    if (requireUppercase) {
      regex += "(?=.*[A-Z])"
      requirements.push("uppercase letter")
    }
    if (requireLowercase) {
      regex += "(?=.*[a-z])"
      requirements.push("lowercase letter")
    }
    if (requireNumbers) {
      regex += "(?=.*\\d)"
      requirements.push("number")
    }
    if (requireSpecialChars) {
      regex += "(?=.*[@$!%*?&])"
      requirements.push("special character")
    }

    const fullRegex = new RegExp(`^${regex}[A-Za-z\\d@$!%*?&]`)
    
    const defaultMessage = customMessage || 
      `Password must be at least ${minLength} characters and contain ${requirements.join(", ")}`

    return z.string()
      .min(minLength, `Password must be at least ${minLength} characters`)
      .regex(fullRegex, defaultMessage)
  },

  // URL validation
  url: z.string()
    .url("Please enter a valid URL")
    .optional()
    .or(z.literal("")),

  // Phone number validation (basic)
  phone: z.string()
    .regex(/^[\+]?[1-9][\d]{0,15}$/, "Please enter a valid phone number")
    .optional()
    .or(z.literal("")),

  // Number validations
  positiveNumber: z.number()
    .positive("Must be a positive number"),

  nonNegativeNumber: z.number()
    .min(0, "Must be 0 or greater"),

  numberInRange: (min: number, max: number) =>
    z.number()
      .min(min, `Must be at least ${min}`)
      .max(max, `Must be at most ${max}`),

  // Date validations
  futureDate: z.date()
    .refine((date) => date > new Date(), "Date must be in the future"),

  pastDate: z.date()
    .refine((date) => date < new Date(), "Date must be in the past"),

  // Boolean validations
  requiredCheckbox: z.boolean()
    .refine((val) => val === true, "This field is required"),

  // Array validations
  nonEmptyArray: (fieldName: string) =>
    z.array(z.string())
      .min(1, `At least one ${fieldName} is required`),

  // File validations
  fileSize: (maxSizeInMB: number) =>
    z.instanceof(File)
      .refine((file) => file.size <= maxSizeInMB * 1024 * 1024, 
        `File size must be less than ${maxSizeInMB}MB`),

  fileType: (allowedTypes: string[]) =>
    z.instanceof(File)
      .refine((file) => allowedTypes.includes(file.type),
        `File type must be one of: ${allowedTypes.join(", ")}`),
}

// Common form schemas
export const CommonSchemas = {
  // Contact form
  contact: z.object({
    name: ValidationSchemas.requiredString("Name", 2, 100),
    email: ValidationSchemas.email,
    subject: ValidationSchemas.requiredString("Subject", 5, 200),
    message: ValidationSchemas.requiredString("Message", 10, 1000),
  }),

  // Profile form
  profile: z.object({
    firstName: ValidationSchemas.requiredString("First name", 1, 50),
    lastName: ValidationSchemas.requiredString("Last name", 1, 50),
    email: ValidationSchemas.email,
    phone: ValidationSchemas.phone,
    bio: ValidationSchemas.optionalString(500),
  }),

  // Address form
  address: z.object({
    street: ValidationSchemas.requiredString("Street address", 5, 100),
    city: ValidationSchemas.requiredString("City", 2, 50),
    state: ValidationSchemas.requiredString("State", 2, 50),
    zipCode: z.string()
      .regex(/^\d{5}(-\d{4})?$/, "Please enter a valid ZIP code"),
    country: ValidationSchemas.requiredString("Country", 2, 50),
  }),

  // Password change form
  passwordChange: z.object({
    currentPassword: ValidationSchemas.requiredString("Current password"),
    newPassword: ValidationSchemas.password(),
    confirmPassword: ValidationSchemas.requiredString("Password confirmation"),
  }).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  }),

  // Settings form
  settings: z.object({
    notifications: z.object({
      email: z.boolean(),
      push: z.boolean(),
      sms: z.boolean(),
    }),
    privacy: z.object({
      profileVisible: z.boolean(),
      allowMessages: z.boolean(),
    }),
    theme: z.enum(["light", "dark", "system"]),
    language: z.string(),
  }),

  // Team invitation form
  teamInvite: z.object({
    email: ValidationSchemas.email,
    role: z.enum(["member", "admin", "owner"]),
    message: ValidationSchemas.optionalString(500),
  }),
}

// Form state management utilities
export const FormUtils = {
  // Get field error message
  getErrorMessage: (error: any): string => {
    if (typeof error === "string") return error
    if (error?.message) return error.message
    return "This field is invalid"
  },

  // Check if field has error
  hasError: (errors: any, fieldName: string): boolean => {
    return !!errors[fieldName]
  },

  // Get nested field error
  getNestedError: (errors: any, path: string): any => {
    return path.split(".").reduce((error, key) => error?.[key], errors)
  },

  // Format validation errors for display
  formatValidationErrors: (errors: z.ZodError): Record<string, string> => {
    const formattedErrors: Record<string, string> = {}
    
    errors.errors.forEach((error) => {
      const path = error.path.join(".")
      formattedErrors[path] = error.message
    })
    
    return formattedErrors
  },

  // Validate form data
  validateFormData: (schema: z.ZodSchema<any>, data: unknown): { 
    success: boolean;
    data?: any;
    errors?: Record<string, string>;
  } => {
    try {
      const validatedData = schema.parse(data)
      return { success: true, data: validatedData }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { 
          success: false, 
          errors: FormUtils.formatValidationErrors(error) 
        }
      }
      return { success: false, errors: { general: "Validation failed" } }
    }
  },
}

// Custom validation helpers
export const CustomValidations = {
  // Confirm password field
  confirmPassword: (passwordFieldName = "password") => 
    z.string().min(1, "Please confirm your password"),

  // Create confirm password refine
  createPasswordConfirmation: (passwordField: string, confirmField: string) => ({
    message: "Passwords don't match",
    path: [confirmField] as const,
  }),

  // Age validation
  minimumAge: (minAge: number) =>
    z.date().refine((date) => {
      const today = new Date()
      const birthDate = new Date(date)
      const age = today.getFullYear() - birthDate.getFullYear()
      return age >= minAge
    }, `Must be at least ${minAge} years old`),

  // File upload validation
  imageFile: z.instanceof(File).refine((file) => {
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    return validTypes.includes(file.type)
  }, "Please select a valid image file (JPEG, PNG, GIF, or WebP)"),

  // Strong password validation
  strongPassword: z.string()
    .min(12, "Password must be at least 12 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
      "Password must contain uppercase, lowercase, number, and special character")
    .refine((password) => {
      // Check for common weak passwords
      const commonPasswords = ["password", "123456", "qwerty", "admin"]
      return !commonPasswords.some(common => 
        password.toLowerCase().includes(common)
      )
    }, "Password contains common weak patterns"),

  // Username validation
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be less than 20 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores, and hyphens")
    .refine((username) => {
      // Reserved usernames
      const reserved = ["admin", "api", "www", "mail", "support"]
      return !reserved.includes(username.toLowerCase())
    }, "This username is reserved"),
}
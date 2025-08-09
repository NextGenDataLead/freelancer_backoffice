/**
 * Advanced Form Components
 * 
 * This module provides comprehensive form components built on top of shadcn/ui
 * and React Hook Form + Zod validation. Includes reusable form fields,
 * validation schemas, specialized input variants, and error handling.
 */

// Main form components
export { FormField } from "./form-field"
export { FormDemo } from "./form-demo"

// Validation utilities and schemas
export { 
  ValidationSchemas,
  CommonSchemas,
  FormUtils,
  CustomValidations
} from "./form-validation"

// Specialized input variants
export {
  PasswordInput,
  SearchInput,
  FileUpload,
  URLInput,
  CopyInput,
  EmailInput,
  PhoneInput,
  AddressInput,
  CurrencyInput,
  PercentageInput,
  NumberInput,
  DateTimeInput,
  TimeInput
} from "./input-variants"

// Error handling components and hooks
export {
  FormErrorBoundary,
  useFormErrorHandler,
  FormErrorDisplay
} from "./form-error-boundary"

export {
  useFormSubmission,
  useFileUpload,
  useFieldValidation
} from "./use-form-submission"

// Re-export shadcn form components for convenience
export {
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField as ShadcnFormField,
  useFormField
} from "@/components/ui/form"

// Re-export other form-related components
export { Input } from "@/components/ui/input"
export { Textarea } from "@/components/ui/textarea"
export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
export { Checkbox } from "@/components/ui/checkbox"
export { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
export { Switch } from "@/components/ui/switch"
export { Label } from "@/components/ui/label"
export { Button } from "@/components/ui/button"
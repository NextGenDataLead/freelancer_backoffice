"use client"

import * as React from "react"
import { 
  FormField as ShadcnFormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { 
  Control, 
  FieldPath, 
  FieldValues,
  type FieldError 
} from "react-hook-form"

// Base props for all form fields
interface BaseFormFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> {
  control: Control<TFieldValues>
  name: TName
  label: string
  description?: string
  placeholder?: string
  disabled?: boolean
  required?: boolean
  className?: string
}

// Text input specific props
interface TextInputProps<TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>>
  extends BaseFormFieldProps<TFieldValues, TName> {
  type: "text" | "email" | "url" | "tel"
  maxLength?: number
  minLength?: number
}

// Password input specific props
interface PasswordInputProps<TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>>
  extends BaseFormFieldProps<TFieldValues, TName> {
  type: "password"
  showToggle?: boolean
}

// Number input specific props
interface NumberInputProps<TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>>
  extends BaseFormFieldProps<TFieldValues, TName> {
  type: "number"
  min?: number
  max?: number
  step?: number
}

// Textarea specific props
interface TextareaProps<TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>>
  extends BaseFormFieldProps<TFieldValues, TName> {
  type: "textarea"
  rows?: number
  resize?: boolean
}

// Select specific props
interface SelectProps<TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>>
  extends BaseFormFieldProps<TFieldValues, TName> {
  type: "select"
  options: Array<{ value: string; label: string; disabled?: boolean }>
  emptyMessage?: string
}

// Checkbox specific props
interface CheckboxProps<TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>>
  extends BaseFormFieldProps<TFieldValues, TName> {
  type: "checkbox"
  checkboxLabel?: string
}

// Radio group specific props
interface RadioGroupProps<TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>>
  extends BaseFormFieldProps<TFieldValues, TName> {
  type: "radio"
  options: Array<{ value: string; label: string; disabled?: boolean }>
  orientation?: "horizontal" | "vertical"
}

// Switch specific props
interface SwitchProps<TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>>
  extends BaseFormFieldProps<TFieldValues, TName> {
  type: "switch"
  switchLabel?: string
}

// Union type for all form field props
type FormFieldProps<TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>> =
  | TextInputProps<TFieldValues, TName>
  | PasswordInputProps<TFieldValues, TName>
  | NumberInputProps<TFieldValues, TName>
  | TextareaProps<TFieldValues, TName>
  | SelectProps<TFieldValues, TName>
  | CheckboxProps<TFieldValues, TName>
  | RadioGroupProps<TFieldValues, TName>
  | SwitchProps<TFieldValues, TName>

/**
 * Universal form field component that renders different input types based on the type prop
 * Handles all common form patterns including validation, error display, and accessibility
 */
export function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>(props: FormFieldProps<TFieldValues, TName>) {
  const { control, name, label, description, className, disabled = false, required = false } = props

  // Password visibility toggle state
  const [showPassword, setShowPassword] = React.useState(false)

  const renderField = (field: any) => {
    switch (props.type) {
      case "text":
      case "email":
      case "url":
      case "tel": {
        const textProps = props as TextInputProps<TFieldValues, TName>
        return (
          <Input
            type={textProps.type}
            placeholder={textProps.placeholder}
            disabled={disabled}
            maxLength={textProps.maxLength}
            className={cn("transition-colors", className)}
            {...field}
          />
        )
      }

      case "password": {
        const passwordProps = props as PasswordInputProps<TFieldValues, TName>
        return (
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder={passwordProps.placeholder}
              disabled={disabled}
              className={cn("pr-10 transition-colors", className)}
              {...field}
            />
            {passwordProps.showToggle !== false && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={disabled}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-slate-400" />
                ) : (
                  <Eye className="h-4 w-4 text-slate-400" />
                )}
                <span className="sr-only">
                  {showPassword ? "Hide password" : "Show password"}
                </span>
              </Button>
            )}
          </div>
        )
      }

      case "number": {
        const numberProps = props as NumberInputProps<TFieldValues, TName>
        return (
          <Input
            type="number"
            placeholder={numberProps.placeholder}
            disabled={disabled}
            min={numberProps.min}
            max={numberProps.max}
            step={numberProps.step}
            className={cn("transition-colors", className)}
            {...field}
            onChange={(e) => {
              const value = e.target.value
              // Convert string to number, or undefined if empty
              const numValue = value === '' ? undefined : Number(value)
              field.onChange(numValue)
            }}
            value={field.value ?? ''}
          />
        )
      }

      case "textarea": {
        const textareaProps = props as TextareaProps<TFieldValues, TName>
        return (
          <Textarea
            placeholder={textareaProps.placeholder}
            disabled={disabled}
            rows={textareaProps.rows}
            className={cn(
              "transition-colors",
              !textareaProps.resize && "resize-none",
              className
            )}
            {...field}
          />
        )
      }

      case "select": {
        const selectProps = props as SelectProps<TFieldValues, TName>
        return (
          <Select onValueChange={field.onChange} defaultValue={field.value} disabled={disabled}>
            <SelectTrigger className={cn("transition-colors", className)}>
              <SelectValue placeholder={selectProps.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {selectProps.options.map((option) => (
                <SelectItem 
                  key={option.value} 
                  value={option.value}
                  disabled={option.disabled}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      }

      case "checkbox": {
        const checkboxProps = props as CheckboxProps<TFieldValues, TName>
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={field.value}
              onCheckedChange={field.onChange}
              disabled={disabled}
              className={className}
            />
            {checkboxProps.checkboxLabel && (
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                {checkboxProps.checkboxLabel}
              </label>
            )}
          </div>
        )
      }

      case "radio": {
        const radioProps = props as RadioGroupProps<TFieldValues, TName>
        return (
          <RadioGroup
            onValueChange={field.onChange}
            defaultValue={field.value}
            className={cn(
              radioProps.orientation === "horizontal" ? "flex flex-row space-x-4" : "flex flex-col space-y-2",
              className
            )}
            disabled={disabled}
          >
            {radioProps.options.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value} disabled={option.disabled} />
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  {option.label}
                </label>
              </div>
            ))}
          </RadioGroup>
        )
      }

      case "switch": {
        const switchProps = props as SwitchProps<TFieldValues, TName>
        return (
          <div className="flex items-center space-x-2">
            <Switch
              checked={field.value}
              onCheckedChange={field.onChange}
              disabled={disabled}
              className={className}
            />
            {switchProps.switchLabel && (
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                {switchProps.switchLabel}
              </label>
            )}
          </div>
        )
      }

      default:
        return null
    }
  }

  return (
    <ShadcnFormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </FormLabel>
          <FormControl>
            {renderField(field)}
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
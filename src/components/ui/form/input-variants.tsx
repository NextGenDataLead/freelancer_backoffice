"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { 
  Eye, 
  EyeOff, 
  Search, 
  X, 
  Upload, 
  FileText, 
  Link, 
  Copy,
  Check,
  Calendar,
  Clock,
  DollarSign,
  Percent,
  Hash,
  Mail,
  Phone,
  MapPin
} from "lucide-react"

// Password Input with toggle visibility
interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  showToggle?: boolean
  strengthIndicator?: boolean
}

export function PasswordInput({ 
  className, 
  showToggle = true, 
  strengthIndicator = false,
  ...props 
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = React.useState(false)
  const [strength, setStrength] = React.useState(0)

  const calculateStrength = (password: string) => {
    let score = 0
    if (password.length >= 8) score++
    if (/[a-z]/.test(password)) score++
    if (/[A-Z]/.test(password)) score++
    if (/\d/.test(password)) score++
    if (/[@$!%*?&]/.test(password)) score++
    return score
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (strengthIndicator) {
      setStrength(calculateStrength(e.target.value))
    }
    props.onChange?.(e)
  }

  const getStrengthColor = (score: number) => {
    if (score < 2) return "bg-red-500"
    if (score < 4) return "bg-yellow-500"
    return "bg-green-500"
  }

  const getStrengthText = (score: number) => {
    if (score < 2) return "Weak"
    if (score < 4) return "Medium"
    return "Strong"
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          type={showPassword ? "text" : "password"}
          className={cn("pr-10", className)}
          onChange={handleChange}
          {...props}
        />
        {showToggle && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4 text-slate-400" />
            ) : (
              <Eye className="h-4 w-4 text-slate-400" />
            )}
          </Button>
        )}
      </div>
      {strengthIndicator && props.value && (
        <div className="space-y-1">
          <div className="flex space-x-1">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-2 w-full rounded-full bg-slate-200",
                  i < strength && getStrengthColor(strength)
                )}
              />
            ))}
          </div>
          <p className="text-xs text-slate-600">
            Password strength: {getStrengthText(strength)}
          </p>
        </div>
      )}
    </div>
  )
}

// Search Input with clear button
interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  onClear?: () => void
}

export function SearchInput({ className, onClear, ...props }: SearchInputProps) {
  const [value, setValue] = React.useState(props.value || "")

  const handleClear = () => {
    setValue("")
    onClear?.()
  }

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <Input
        type="search"
        className={cn("pl-9 pr-9", className)}
        value={value}
        onChange={(e) => {
          setValue(e.target.value)
          props.onChange?.(e)
        }}
        {...props}
      />
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
          onClick={handleClear}
        >
          <X className="h-4 w-4 text-slate-400" />
        </Button>
      )}
    </div>
  )
}

// File Upload Input
interface FileUploadProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  onFileSelect?: (files: FileList | null) => void
  acceptedTypes?: string[]
  maxSize?: number // in bytes
  preview?: boolean
}

export function FileUpload({ 
  className, 
  onFileSelect, 
  acceptedTypes, 
  maxSize,
  preview = false,
  ...props 
}: FileUploadProps) {
  const [dragActive, setDragActive] = React.useState(false)
  const [files, setFiles] = React.useState<FileList | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const handleFiles = (fileList: FileList | null) => {
    if (fileList && maxSize) {
      const validFiles = Array.from(fileList).filter(file => file.size <= maxSize)
      if (validFiles.length !== fileList.length) {
        console.warn("Some files exceed the maximum size limit")
      }
    }
    setFiles(fileList)
    onFileSelect?.(fileList)
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "relative rounded-lg border-2 border-dashed border-slate-300 p-6 text-center transition-colors",
          dragActive && "border-blue-500 bg-blue-50",
          className
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          accept={acceptedTypes?.join(",")}
          onChange={(e) => handleFiles(e.target.files)}
          {...props}
        />
        <Upload className="mx-auto h-12 w-12 text-slate-400" />
        <p className="mt-2 text-sm text-slate-600">
          Drop files here or click to browse
        </p>
        {acceptedTypes && (
          <p className="mt-1 text-xs text-slate-500">
            Accepted: {acceptedTypes.join(", ")}
          </p>
        )}
        {maxSize && (
          <p className="text-xs text-slate-500">
            Max size: {(maxSize / 1024 / 1024).toFixed(1)}MB
          </p>
        )}
      </div>
      
      {files && files.length > 0 && (
        <div className="space-y-2">
          {Array.from(files).map((file, index) => (
            <div key={index} className="flex items-center space-x-2 rounded border p-2">
              <FileText className="h-4 w-4 text-slate-400" />
              <span className="flex-1 text-sm">{file.name}</span>
              <Badge variant="outline" className="text-xs">
                {(file.size / 1024).toFixed(1)}KB
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// URL Input with validation indicator
interface URLInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  showValidation?: boolean
}

export function URLInput({ className, showValidation = true, ...props }: URLInputProps) {
  const [isValid, setIsValid] = React.useState<boolean | null>(null)

  const validateURL = (url: string) => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (showValidation && value) {
      setIsValid(validateURL(value))
    } else {
      setIsValid(null)
    }
    props.onChange?.(e)
  }

  return (
    <div className="relative">
      <Link className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <Input
        type="url"
        className={cn("pl-9 pr-9", className)}
        onChange={handleChange}
        {...props}
      />
      {showValidation && isValid !== null && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {isValid ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <X className="h-4 w-4 text-red-500" />
          )}
        </div>
      )}
    </div>
  )
}

// Copy to Clipboard Input
interface CopyInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  copyText?: string
}

export function CopyInput({ className, copyText, ...props }: CopyInputProps) {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = async () => {
    const textToCopy = copyText || String(props.value || "")
    try {
      await navigator.clipboard.writeText(textToCopy)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Failed to copy:", error)
    }
  }

  return (
    <div className="relative">
      <Input
        readOnly
        className={cn("pr-9", className)}
        {...props}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
        onClick={handleCopy}
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <Copy className="h-4 w-4 text-slate-400" />
        )}
      </Button>
    </div>
  )
}

// Specialized input components with icons
export function EmailInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <Input
        type="email"
        className={cn("pl-9", className)}
        {...props}
      />
    </div>
  )
}

export function PhoneInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <Input
        type="tel"
        className={cn("pl-9", className)}
        {...props}
      />
    </div>
  )
}

export function AddressInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <Input
        type="text"
        className={cn("pl-9", className)}
        {...props}
      />
    </div>
  )
}

export function CurrencyInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <Input
        type="number"
        step="0.01"
        className={cn("pl-9", className)}
        {...props}
      />
    </div>
  )
}

export function PercentageInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <Percent className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <Input
        type="number"
        step="0.01"
        min="0"
        max="100"
        className={cn("pl-9", className)}
        {...props}
      />
    </div>
  )
}

export function NumberInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <Input
        type="number"
        className={cn("pl-9", className)}
        {...props}
      />
    </div>
  )
}

export function DateTimeInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <Input
        type="datetime-local"
        className={cn("pl-9", className)}
        {...props}
      />
    </div>
  )
}

export function TimeInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <Input
        type="time"
        className={cn("pl-9", className)}
        {...props}
      />
    </div>
  )
}
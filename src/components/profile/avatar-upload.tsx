'use client'

import * as React from 'react'
import { useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Camera, 
  Upload, 
  X, 
  User,
  Loader2,
  Image as ImageIcon
} from 'lucide-react'

interface AvatarUploadProps {
  currentUrl?: string
  onUploadComplete?: (url: string) => void
}

export function AvatarUpload({ currentUrl, onUploadComplete }: AvatarUploadProps) {
  const { user } = useUser()
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)
  const [isUploading, setIsUploading] = React.useState(false)
  const [dragOver, setDragOver] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleFileSelect = (file: File) => {
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file.')
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB.')
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    if (!user || !previewUrl) return

    setIsUploading(true)
    try {
      // Convert base64 to blob for Clerk upload
      const response = await fetch(previewUrl)
      const blob = await response.blob()

      // Upload to Clerk
      await user.setProfileImage({ file: blob })

      // Notify parent component
      onUploadComplete?.(user.imageUrl)
      setPreviewUrl(null)
    } catch (error) {
      console.error('Avatar upload error:', error)
      alert('Failed to upload avatar. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const clearPreview = () => {
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const avatarUrl = previewUrl || currentUrl || user?.imageUrl

  return (
    <div className="space-y-4">
      {/* Avatar Display */}
      <div className="flex items-center justify-center">
        <div className="relative">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-200 border-4 border-white shadow-lg">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User className="w-12 h-12 text-slate-400" />
              </div>
            )}
          </div>
          
          {previewUrl && (
            <div className="absolute -top-1 -right-1">
              <Badge variant="default" className="px-1.5 py-0.5 text-xs">
                Preview
              </Badge>
            </div>
          )}
        </div>
      </div>

      {/* Upload Interface */}
      {previewUrl ? (
        /* Preview Actions */
        <div className="space-y-3">
          <div className="flex items-center justify-center space-x-2">
            <Button
              onClick={handleUpload}
              disabled={isUploading}
              size="sm"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </>
              )}
            </Button>
            <Button
              onClick={clearPreview}
              variant="outline"
              size="sm"
              disabled={isUploading}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        /* Upload Interface */
        <div className="space-y-3">
          {/* Drag & Drop Area */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
              dragOver
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-300 hover:border-slate-400'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="space-y-2">
              <div className="flex justify-center">
                <ImageIcon className={`h-8 w-8 ${dragOver ? 'text-blue-500' : 'text-slate-400'}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {dragOver ? 'Drop your image here' : 'Click to upload or drag and drop'}
                </p>
                <p className="text-xs text-slate-500">
                  PNG, JPG, GIF up to 5MB
                </p>
              </div>
            </div>
          </div>

          {/* Upload Button */}
          <div className="flex justify-center">
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              size="sm"
            >
              <Camera className="mr-2 h-4 w-4" />
              Choose Photo
            </Button>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      )}

      {/* Help Text */}
      <div className="text-center">
        <p className="text-xs text-slate-500">
          Your profile photo will be visible to other users in your organization.
        </p>
      </div>
    </div>
  )
}
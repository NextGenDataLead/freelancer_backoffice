'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import { createPortal } from 'react-dom'

interface GlassmorphicModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  className?: string
}

export function GlassmorphicModal({
  isOpen,
  onClose,
  children,
  title,
  size = 'lg',
  className = ''
}: GlassmorphicModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    full: 'max-w-7xl'
  }

  const modalContent = (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      {/* Backdrop - glassmorphic overlay */}
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.08), rgba(2, 6, 23, 0.95) 70%)'
        }}
      />

      {/* Modal Container */}
      <div
        className={`relative w-full ${sizeClasses[size]} max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-300 ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glassmorphic Card */}
        <div
          className="relative flex flex-col overflow-hidden rounded-3xl border border-white/10 shadow-2xl"
          style={{
            background: 'linear-gradient(150deg, rgba(17, 24, 39, 0.85), rgba(15, 23, 42, 0.55))',
            backdropFilter: 'blur(24px)',
            boxShadow: '0 32px 96px -32px rgba(15, 23, 42, 0.95), 0 0 0 1px rgba(255, 255, 255, 0.05) inset'
          }}
        >
          {/* Gradient overlay effect */}
          <div
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              background: 'radial-gradient(circle at 20% 10%, rgba(255, 255, 255, 0.08), transparent 40%), radial-gradient(circle at 80% 90%, rgba(59, 130, 246, 0.12), transparent 55%)'
            }}
          />

          {/* Header */}
          {title && (
            <div className="relative z-10 flex items-center justify-between border-b border-white/10 px-6 py-4">
              <h2 className="text-xl font-semibold text-slate-100">{title}</h2>
              <button
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          )}

          {/* Close button without header */}
          {!title && (
            <button
              onClick={onClose}
              className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          )}

          {/* Content */}
          <div className="relative z-10 flex-1 overflow-y-auto px-6 py-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  )

  // Use portal to render modal at document root
  return typeof window !== 'undefined'
    ? createPortal(modalContent, document.body)
    : null
}

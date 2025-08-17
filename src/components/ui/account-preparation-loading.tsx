'use client'

import { useState, useEffect } from 'react'

interface AccountPreparationLoadingProps {
  onComplete?: () => void
  initialCount?: number
}

export function AccountPreparationLoading({ 
  onComplete, 
  initialCount = 20 
}: AccountPreparationLoadingProps) {
  const [count, setCount] = useState(initialCount)
  const [animationStep, setAnimationStep] = useState(0)

  const messages = [
    "🎨 Setting up your workspace...",
    "🔧 Configuring your preferences...", 
    "📊 Preparing your dashboard...",
    "🚀 Loading your profile...",
    "✨ Adding some magic...",
    "🎯 Optimizing your experience...",
    "🔮 Syncing everything together...",
    "🎪 Almost ready for the show...",
    "🌟 Polishing the final details...",
    "🎊 Getting ready to launch!"
  ]

  const getCurrentMessage = () => {
    const messageIndex = Math.floor((initialCount - count) / 2) % messages.length
    return messages[messageIndex]
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setCount(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          onComplete?.()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [onComplete])

  useEffect(() => {
    const animTimer = setInterval(() => {
      setAnimationStep(prev => (prev + 1) % 4)
    }, 300)

    return () => clearInterval(animTimer)
  }, [])

  const getSpinnerDots = () => {
    return Array.from({ length: 8 }, (_, i) => (
      <div
        key={i}
        className={`w-3 h-3 rounded-full transition-all duration-300 ${
          i === animationStep ? 'bg-blue-500 scale-125' : 
          i === (animationStep + 1) % 8 ? 'bg-blue-400 scale-110' :
          i === (animationStep + 2) % 8 ? 'bg-blue-300 scale-105' :
          'bg-gray-300 scale-100'
        }`}
        style={{
          transform: `rotate(${i * 45}deg) translateY(-20px)`,
          transformOrigin: '50% 20px'
        }}
      />
    ))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="text-center space-y-8 max-w-md mx-auto">
        
        {/* Cartoon Character */}
        <div className="relative mx-auto w-32 h-32 mb-8">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              {/* Spinner dots arranged in a circle */}
              <div className="relative w-16 h-16">
                {getSpinnerDots()}
              </div>
              
              {/* Central character */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className={`text-4xl transition-transform duration-300 ${
                  animationStep % 2 === 0 ? 'scale-110' : 'scale-100'
                }`}>
                  🎪
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Title */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Preparing Your Account
          </h1>
          <p className="text-gray-600 text-lg">
            We're setting up something amazing for you!
          </p>
        </div>

        {/* Countdown Circle */}
        <div className="relative mx-auto w-24 h-24">
          <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 36 36">
            {/* Background circle */}
            <path
              d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="2"
            />
            {/* Progress circle */}
            <path
              d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="url(#gradient)"
              strokeWidth="2"
              strokeDasharray={`${(initialCount - count) / initialCount * 100}, 100`}
              className="transition-all duration-1000 ease-out"
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="50%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold text-gray-700">{count}</span>
          </div>
        </div>

        {/* Dynamic Message */}
        <div className="space-y-3">
          <p className="text-lg font-medium text-gray-700 animate-pulse">
            {getCurrentMessage()}
          </p>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${((initialCount - count) / initialCount) * 100}%` }}
            />
          </div>
          
          <p className="text-sm text-gray-500">
            {Math.round(((initialCount - count) / initialCount) * 100)}% Complete
          </p>
        </div>

        {/* Fun animated elements */}
        <div className="flex justify-center space-x-4 text-2xl">
          <span className={`transition-transform duration-500 ${animationStep === 0 ? 'scale-125 rotate-12' : ''}`}>⭐</span>
          <span className={`transition-transform duration-500 ${animationStep === 1 ? 'scale-125 rotate-12' : ''}`}>🎨</span>
          <span className={`transition-transform duration-500 ${animationStep === 2 ? 'scale-125 rotate-12' : ''}`}>🚀</span>
          <span className={`transition-transform duration-500 ${animationStep === 3 ? 'scale-125 rotate-12' : ''}`}>✨</span>
        </div>
      </div>
    </div>
  )
}
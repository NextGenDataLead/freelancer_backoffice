'use client'

import * as React from 'react'
import { useAuth, useSignIn } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useNotificationActions } from '@/store/notifications-store'
import { Mail, ArrowLeft, Eye, EyeOff, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'

// Form schemas
const emailSchema = z.object({
  email: z.string().email('Please enter a valid email address')
})

const resetSchema = z.object({
  code: z.string().min(1, 'Verification code is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
      'Password must contain uppercase, lowercase, number and special character'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type EmailFormData = z.infer<typeof emailSchema>
type ResetFormData = z.infer<typeof resetSchema>

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [code, setCode] = React.useState('')
  const [successfulCreation, setSuccessfulCreation] = React.useState(false)
  const [secondFactor, setSecondFactor] = React.useState(false)
  const [error, setError] = React.useState('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [showPassword, setShowPassword] = React.useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)

  const router = useRouter()
  const { isSignedIn } = useAuth()
  const { isLoaded, signIn, setActive } = useSignIn()
  const { showSuccess, showError } = useNotificationActions()

  // Form for email step - using controlled inputs instead of React Hook Form
  const [emailInput, setEmailInput] = React.useState('')
  const [emailError, setEmailError] = React.useState('')

  // Form for reset step - using controlled inputs
  const [codeInput, setCodeInput] = React.useState('')
  const [passwordInput, setPasswordInput] = React.useState('')
  const [confirmPasswordInput, setConfirmPasswordInput] = React.useState('')
  const [resetError, setResetError] = React.useState('')

  React.useEffect(() => {
    if (isSignedIn) {
      router.push('/dashboard')
    }
  }, [isSignedIn, router])

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  // Validate email
  const validateEmail = (email: string) => {
    if (!email) return 'Email is required'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address'
    return ''
  }

  // Send password reset code to user's email
  const onEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!signIn) return

    const emailValidation = validateEmail(emailInput)
    if (emailValidation) {
      setEmailError(emailValidation)
      return
    }

    setIsSubmitting(true)
    setError('')
    setEmailError('')
    
    try {
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: emailInput,
      })
      
      setEmail(emailInput)
      setSuccessfulCreation(true)
      showSuccess(
        'Reset Code Sent', 
        `We've sent a password reset code to ${emailInput}. Please check your inbox.`
      )
    } catch (err: any) {
      console.error('Password reset request error:', err)
      const errorMessage = err?.errors?.[0]?.longMessage || 'Failed to send reset code. Please try again.'
      setError(errorMessage)
      showError('Reset Failed', errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Validate reset form
  const validateResetForm = () => {
    const errors = []
    if (!codeInput) errors.push('Verification code is required')
    if (!passwordInput) errors.push('Password is required')
    if (passwordInput.length < 8) errors.push('Password must be at least 8 characters')
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(passwordInput)) {
      errors.push('Password must contain uppercase, lowercase, number and special character')
    }
    if (passwordInput !== confirmPasswordInput) errors.push("Passwords don't match")
    return errors
  }

  // Reset password with verification code
  const onResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!signIn) return

    const validationErrors = validateResetForm()
    if (validationErrors.length > 0) {
      setResetError(validationErrors[0])
      return
    }

    setIsSubmitting(true)
    setError('')
    setResetError('')

    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code: codeInput,
        password: passwordInput,
      })

      if (result.status === 'needs_second_factor') {
        setSecondFactor(true)
        setError('Two-factor authentication is required to complete the password reset.')
      } else if (result.status === 'complete') {
        // Set the active session (user is now signed in)
        await setActive({ session: result.createdSessionId })
        showSuccess(
          'Password Reset Successful', 
          'Your password has been reset and you are now signed in.'
        )
        router.push('/dashboard')
      } else {
        console.log('Unexpected sign-in result:', result)
        setError('Password reset completed but sign-in status is unclear. Please try signing in manually.')
      }
    } catch (err: any) {
      console.error('Password reset error:', err)
      const errorMessage = err?.errors?.[0]?.longMessage || 'Failed to reset password. Please check your code and try again.'
      setError(errorMessage)
      showError('Reset Failed', errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to Sign In Link */}
        <div className="mb-6">
          <Link
            href="/sign-in"
            className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Sign In
          </Link>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center">
              <Mail className="mr-2 h-5 w-5" />
              {!successfulCreation ? 'Reset Password' : 'Enter New Password'}
            </CardTitle>
            <CardDescription>
              {!successfulCreation 
                ? 'Enter your email address and we\'ll send you a reset code'
                : `Enter the code sent to ${email} and your new password`
              }
            </CardDescription>
          </CardHeader>

          <CardContent>
            {!successfulCreation ? (
              // Email form
              <form onSubmit={onEmailSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className={emailError ? 'border-red-500' : ''}
                  />
                  {emailError && (
                    <p className="text-sm text-red-600">{emailError}</p>
                  )}
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <span className="text-sm text-red-700">{error}</span>
                    </div>
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending Reset Code...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Send Reset Code
                    </>
                  )}
                </Button>
              </form>
            ) : (
              // Reset form
              <form onSubmit={onResetSubmit} className="space-y-4">
                {/* Verification Code */}
                <div className="space-y-2">
                  <Label htmlFor="code">Verification Code</Label>
                  <Input
                    id="code"
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value)}
                    className={resetError && codeInput === '' ? 'border-red-500' : ''}
                  />
                </div>

                {/* New Password */}
                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter new password"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className={`pr-10 ${resetError && passwordInput === '' ? 'border-red-500' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm new password"
                      value={confirmPasswordInput}
                      onChange={(e) => setConfirmPasswordInput(e.target.value)}
                      className={`pr-10 ${resetError && confirmPasswordInput === '' ? 'border-red-500' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Password Requirements */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <h4 className="text-sm font-medium text-slate-900 mb-2">Password Requirements:</h4>
                  <ul className="text-xs text-slate-600 space-y-1">
                    <li>• At least 8 characters long</li>
                    <li>• Contains uppercase and lowercase letters</li>
                    <li>• Contains at least one number</li>
                    <li>• Contains at least one special character (@$!%*?&)</li>
                  </ul>
                </div>

                {(error || resetError) && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <span className="text-sm text-red-700">{error || resetError}</span>
                    </div>
                  </div>
                )}

                {secondFactor && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <span className="text-sm text-amber-700">
                        Two-factor authentication is required. Please complete the 2FA process to finish resetting your password.
                      </span>
                    </div>
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Resetting Password...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Reset Password
                    </>
                  )}
                </Button>

                {/* Resend Code Option */}
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setSuccessfulCreation(false)
                      setError('')
                      setResetError('')
                      setCodeInput('')
                      setPasswordInput('')
                      setConfirmPasswordInput('')
                    }}
                    className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    Didn't receive a code? Try again
                  </button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Sign Up Link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-600">
            Don't have an account?{' '}
            <Link href="/sign-up" className="text-blue-600 hover:text-blue-700 font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
'use client'

import * as Clerk from '@clerk/elements/common'
import * as SignIn from '@clerk/elements/sign-in'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { ArrowLeft, Eye, EyeOff, Loader2, Mail, Shield } from 'lucide-react'
import { useState } from 'react'

export default function SignInPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <SignIn.Root>
          {/* Initial Sign In Step */}
          <SignIn.Step name="start">
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center">
                  <Shield className="mr-2 h-5 w-5" />
                  Sign in to SaaS Template
                </CardTitle>
                <p className="text-sm text-slate-600">Welcome back! Please sign in to continue</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Social Sign-in */}
                <div className="space-y-2">
                  <Clerk.Connection name="google" asChild>
                    <Button variant="outline" className="w-full">
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Sign in with Google
                    </Button>
                  </Clerk.Connection>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-slate-500">or</span>
                  </div>
                </div>

                {/* Email Input */}
                <div className="space-y-2">
                  <Clerk.Field name="identifier" className="space-y-2">
                    <Clerk.Label asChild>
                      <Label>Email address</Label>
                    </Clerk.Label>
                    <Clerk.Input type="email" required asChild>
                      <Input placeholder="Enter your email address" />
                    </Clerk.Input>
                    <Clerk.FieldError className="text-sm text-red-600" />
                  </Clerk.Field>
                </div>

                <SignIn.Action submit asChild>
                  <Button className="w-full">
                    <Clerk.Loading>
                      {(isLoading) => 
                        isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Signing in...
                          </>
                        ) : (
                          'Continue'
                        )
                      }
                    </Clerk.Loading>
                  </Button>
                </SignIn.Action>
              </CardContent>
            </Card>
          </SignIn.Step>

          {/* Verification Step - Password */}
          <SignIn.Step name="verifications">
            <SignIn.Strategy name="password">
              <Card>
                <CardHeader className="text-center">
                  <CardTitle>Enter your password</CardTitle>
                  <p className="text-sm text-slate-600">
                    Welcome back <SignIn.SafeIdentifier />
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Clerk.Field name="password" className="space-y-2">
                      <Clerk.Label asChild>
                        <Label>Password</Label>
                      </Clerk.Label>
                      <div className="relative">
                        <Clerk.Input 
                          type={showPassword ? "text" : "password"} 
                          required 
                          asChild
                        >
                          <Input className="pr-10" placeholder="Enter your password" />
                        </Clerk.Input>
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <Clerk.FieldError className="text-sm text-red-600" />
                    </Clerk.Field>
                  </div>

                  <SignIn.Action submit asChild>
                    <Button className="w-full">
                      <Clerk.Loading>
                        {(isLoading) => 
                          isLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Signing in...
                            </>
                          ) : (
                            'Sign in'
                          )
                        }
                      </Clerk.Loading>
                    </Button>
                  </SignIn.Action>

                  <div className="text-center">
                    <SignIn.Action navigate="forgot-password" asChild>
                      <Button variant="link" size="sm">
                        Forgot password?
                      </Button>
                    </SignIn.Action>
                  </div>
                </CardContent>
              </Card>
            </SignIn.Strategy>

            {/* Email Code Strategy */}
            <SignIn.Strategy name="email_code">
              <Card>
                <CardHeader className="text-center">
                  <CardTitle className="flex items-center justify-center">
                    <Mail className="mr-2 h-5 w-5" />
                    Check your email
                  </CardTitle>
                  <p className="text-sm text-slate-600">
                    We sent a code to <SignIn.SafeIdentifier />
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Clerk.Field name="code" className="space-y-2">
                      <Clerk.Label asChild>
                        <Label>Email code</Label>
                      </Clerk.Label>
                      <Clerk.Input type="text" required asChild>
                        <Input placeholder="Enter verification code" />
                      </Clerk.Input>
                      <Clerk.FieldError className="text-sm text-red-600" />
                    </Clerk.Field>
                  </div>

                  <SignIn.Action submit asChild>
                    <Button className="w-full">
                      <Clerk.Loading>
                        {(isLoading) => 
                          isLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Verifying...
                            </>
                          ) : (
                            'Continue'
                          )
                        }
                      </Clerk.Loading>
                    </Button>
                  </SignIn.Action>
                </CardContent>
              </Card>
            </SignIn.Strategy>

            {/* Reset Password Email Code Strategy */}
            <SignIn.Strategy name="reset_password_email_code">
              <Card>
                <CardHeader className="text-center">
                  <CardTitle className="flex items-center justify-center">
                    <Mail className="mr-2 h-5 w-5" />
                    Check your email
                  </CardTitle>
                  <p className="text-sm text-slate-600">
                    We sent a password reset code to <SignIn.SafeIdentifier />
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Clerk.Field name="code" className="space-y-2">
                      <Clerk.Label asChild>
                        <Label>Verification code</Label>
                      </Clerk.Label>
                      <Clerk.Input type="text" required asChild>
                        <Input placeholder="Enter verification code" />
                      </Clerk.Input>
                      <Clerk.FieldError className="text-sm text-red-600" />
                    </Clerk.Field>
                  </div>

                  <SignIn.Action submit asChild>
                    <Button className="w-full">
                      <Clerk.Loading>
                        {(isLoading) => 
                          isLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Verifying...
                            </>
                          ) : (
                            'Continue'
                          )
                        }
                      </Clerk.Loading>
                    </Button>
                  </SignIn.Action>
                </CardContent>
              </Card>
            </SignIn.Strategy>
          </SignIn.Step>

          {/* Forgot Password Step */}
          <SignIn.Step name="forgot-password">
            <Card>
              <CardHeader>
                <Link
                  href="/sign-in"
                  className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900 transition-colors mb-4"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Sign In
                </Link>
                <CardTitle className="flex items-center justify-center">
                  <Mail className="mr-2 h-5 w-5" />
                  Forgot your password?
                </CardTitle>
                <p className="text-sm text-slate-600 text-center">
                  We'll send you a reset code to set a new password
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <SignIn.SupportedStrategy name="reset_password_email_code" asChild>
                  <Button className="w-full">
                    <Mail className="mr-2 h-4 w-4" />
                    Send reset code
                  </Button>
                </SignIn.SupportedStrategy>

                <div className="text-center">
                  <SignIn.Action navigate="previous" asChild>
                    <Button variant="link" size="sm">
                      Go back
                    </Button>
                  </SignIn.Action>
                </div>
              </CardContent>
            </Card>
          </SignIn.Step>

          {/* Reset Password Step */}
          <SignIn.Step name="reset-password">
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center">
                  <Shield className="mr-2 h-5 w-5" />
                  Reset your password
                </CardTitle>
                <p className="text-sm text-slate-600">
                  Create a new password for your account
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* New Password */}
                <div className="space-y-2">
                  <Clerk.Field name="password" className="space-y-2">
                    <Clerk.Label asChild>
                      <Label>New password</Label>
                    </Clerk.Label>
                    <div className="relative">
                      <Clerk.Input 
                        type={showNewPassword ? "text" : "password"} 
                        required 
                        asChild
                      >
                        <Input className="pr-10" placeholder="Enter new password" />
                      </Clerk.Input>
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <Clerk.FieldError className="text-sm text-red-600" />
                  </Clerk.Field>
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Clerk.Field name="confirmPassword" className="space-y-2">
                    <Clerk.Label asChild>
                      <Label>Confirm password</Label>
                    </Clerk.Label>
                    <div className="relative">
                      <Clerk.Input 
                        type={showConfirmPassword ? "text" : "password"} 
                        required 
                        asChild
                      >
                        <Input className="pr-10" placeholder="Confirm new password" />
                      </Clerk.Input>
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <Clerk.FieldError className="text-sm text-red-600" />
                  </Clerk.Field>
                </div>

                {/* Password Requirements */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <h4 className="text-sm font-medium text-slate-900 mb-2">Password Requirements:</h4>
                  <ul className="text-xs text-slate-600 space-y-1">
                    <li>• At least 8 characters long</li>
                    <li>• Contains uppercase and lowercase letters</li>
                    <li>• Contains at least one number</li>
                    <li>• Contains at least one special character</li>
                  </ul>
                </div>

                <SignIn.Action submit asChild>
                  <Button className="w-full">
                    <Clerk.Loading>
                      {(isLoading) => 
                        isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Resetting password...
                          </>
                        ) : (
                          <>
                            <Shield className="mr-2 h-4 w-4" />
                            Reset password
                          </>
                        )
                      }
                    </Clerk.Loading>
                  </Button>
                </SignIn.Action>
              </CardContent>
            </Card>
          </SignIn.Step>
        </SignIn.Root>

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
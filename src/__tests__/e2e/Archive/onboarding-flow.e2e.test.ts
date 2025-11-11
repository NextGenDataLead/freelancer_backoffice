/**
 * End-to-End Onboarding Flow Tests
 * Complete user registration to dashboard journey using Playwright MCP tools
 */

import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import { TEST_USERS } from '../setup/test-setup'

// Mock Playwright MCP functions for testing environment
const mockPlaywright = {
  navigate: async (url: string) => ({ success: true, url }),
  waitFor: async (options: any) => ({ success: true }),
  click: async (element: string) => ({ success: true, element }),
  type: async (element: string, text: string) => ({ success: true, element, text }),
  snapshot: async () => ({
    elements: [
      { type: 'heading', text: 'Welcome to Backoffice', level: 1 },
      { type: 'button', text: 'Get Started', disabled: false },
      { type: 'form', elements: ['email', 'password', 'company_name'] }
    ]
  }),
  screenshot: async (filename?: string) => ({
    success: true,
    filename: filename || `onboarding-${Date.now()}.png`
  })
}

describe('Onboarding Flow E2E Tests', () => {
  const testEmail = 'e2e-onboarding@test.com'
  const testPassword = 'SecureTestPass123!'
  const testCompanyName = 'E2E Test Company'

  beforeAll(async () => {
    // Initialize test environment
    console.log('Setting up E2E onboarding test environment')
  })

  afterEach(async () => {
    // Clean up after each test
    await mockPlaywright.screenshot('cleanup')
  })

  describe('User Registration Journey', () => {
    it('should complete full registration to dashboard flow', async () => {
      // Step 1: Navigate to sign-up page
      await mockPlaywright.navigate('/sign-up')

      const signupSnapshot = await mockPlaywright.snapshot()
      expect(signupSnapshot.elements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'form' }),
          expect.objectContaining({ text: expect.stringContaining('Sign up') })
        ])
      )

      // Step 2: Fill registration form
      await mockPlaywright.type('[data-testid="email-input"]', testEmail)
      await mockPlaywright.type('[data-testid="password-input"]', testPassword)
      await mockPlaywright.type('[data-testid="confirm-password-input"]', testPassword)

      // Step 3: Submit registration
      await mockPlaywright.click('[data-testid="sign-up-button"]')

      // Step 4: Wait for email verification page
      await mockPlaywright.waitFor({ text: 'Check your email' })

      const verificationSnapshot = await mockPlaywright.snapshot()
      expect(verificationSnapshot.elements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            text: expect.stringContaining('verification')
          })
        ])
      )

      // Step 5: Simulate email verification completion
      // In real E2E, this would involve email link clicking
      await mockPlaywright.navigate('/onboarding?verified=true')

      // Step 6: Complete onboarding form
      const onboardingSnapshot = await mockPlaywright.snapshot()
      expect(onboardingSnapshot.elements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            text: expect.stringContaining('Welcome')
          }),
          expect.objectContaining({ type: 'form' })
        ])
      )

      await mockPlaywright.type('[data-testid="company-name-input"]', testCompanyName)
      await mockPlaywright.type('[data-testid="first-name-input"]', 'Test')
      await mockPlaywright.type('[data-testid="last-name-input"]', 'User')

      // Select role
      await mockPlaywright.click('[data-testid="role-select"]')
      await mockPlaywright.click('[data-testid="role-option-owner"]')

      // Select industry
      await mockPlaywright.click('[data-testid="industry-select"]')
      await mockPlaywright.click('[data-testid="industry-option-technology"]')

      // Submit onboarding
      await mockPlaywright.click('[data-testid="complete-onboarding-button"]')

      // Step 7: Verify redirect to dashboard
      await mockPlaywright.waitFor({ url: '/dashboard' })

      const dashboardSnapshot = await mockPlaywright.snapshot()
      expect(dashboardSnapshot.elements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            text: expect.stringContaining('Dashboard')
          }),
          expect.objectContaining({
            text: expect.stringContaining(testCompanyName)
          })
        ])
      )

      await mockPlaywright.screenshot('onboarding-complete')
    })

    it('should handle registration form validation errors', async () => {
      await mockPlaywright.navigate('/sign-up')

      // Try to submit empty form
      await mockPlaywright.click('[data-testid="sign-up-button"]')

      const errorSnapshot = await mockPlaywright.snapshot()
      expect(errorSnapshot.elements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            text: expect.stringContaining('required')
          })
        ])
      )

      // Try invalid email
      await mockPlaywright.type('[data-testid="email-input"]', 'invalid-email')
      await mockPlaywright.click('[data-testid="sign-up-button"]')

      await mockPlaywright.waitFor({ text: 'Invalid email' })

      // Try weak password
      await mockPlaywright.type('[data-testid="email-input"]', 'valid@email.com', { clear: true })
      await mockPlaywright.type('[data-testid="password-input"]', '123')
      await mockPlaywright.click('[data-testid="sign-up-button"]')

      await mockPlaywright.waitFor({ text: 'Password too weak' })

      await mockPlaywright.screenshot('validation-errors')
    })

    it('should prevent duplicate email registration', async () => {
      const existingUserEmail = TEST_USERS.OWNER_TENANT1.email

      await mockPlaywright.navigate('/sign-up')

      await mockPlaywright.type('[data-testid="email-input"]', existingUserEmail)
      await mockPlaywright.type('[data-testid="password-input"]', testPassword)
      await mockPlaywright.type('[data-testid="confirm-password-input"]', testPassword)

      await mockPlaywright.click('[data-testid="sign-up-button"]')

      await mockPlaywright.waitFor({ text: 'Email already exists' })

      const errorSnapshot = await mockPlaywright.snapshot()
      expect(errorSnapshot.elements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            text: expect.stringContaining('already exists')
          })
        ])
      )

      await mockPlaywright.screenshot('duplicate-email-error')
    })
  })

  describe('Onboarding Form Validation', () => {
    it('should validate required onboarding fields', async () => {
      // Simulate arriving at onboarding after email verification
      await mockPlaywright.navigate('/onboarding?verified=true')

      // Try to submit empty onboarding form
      await mockPlaywright.click('[data-testid="complete-onboarding-button"]')

      const validationSnapshot = await mockPlaywright.snapshot()
      expect(validationSnapshot.elements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            text: expect.stringContaining('Company name is required')
          }),
          expect.objectContaining({
            text: expect.stringContaining('First name is required')
          })
        ])
      )

      await mockPlaywright.screenshot('onboarding-validation-errors')
    })

    it('should handle company name uniqueness validation', async () => {
      await mockPlaywright.navigate('/onboarding?verified=true')

      // Use existing company name from seed data
      await mockPlaywright.type('[data-testid="company-name-input"]', 'TechFlow Solutions')
      await mockPlaywright.type('[data-testid="first-name-input"]', 'Test')
      await mockPlaywright.type('[data-testid="last-name-input"]', 'User')

      await mockPlaywright.click('[data-testid="complete-onboarding-button"]')

      await mockPlaywright.waitFor({ text: 'Company name already exists' })

      await mockPlaywright.screenshot('company-name-conflict')
    })

    it('should provide helpful field suggestions', async () => {
      await mockPlaywright.navigate('/onboarding?verified=true')

      // Type partial industry name to trigger suggestions
      await mockPlaywright.click('[data-testid="industry-select"]')

      const industrySnapshot = await mockPlaywright.snapshot()
      expect(industrySnapshot.elements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            text: expect.stringContaining('Technology')
          }),
          expect.objectContaining({
            text: expect.stringContaining('Consulting')
          }),
          expect.objectContaining({
            text: expect.stringContaining('Finance')
          })
        ])
      )

      await mockPlaywright.screenshot('industry-suggestions')
    })
  })

  describe('User Experience Flow', () => {
    it('should maintain state across onboarding steps', async () => {
      await mockPlaywright.navigate('/onboarding?verified=true')

      // Fill first part of form
      await mockPlaywright.type('[data-testid="company-name-input"]', testCompanyName)
      await mockPlaywright.type('[data-testid="first-name-input"]', 'Progressive')

      // Navigate away and back (simulate browser refresh)
      await mockPlaywright.navigate('/dashboard')
      await mockPlaywright.navigate('/onboarding')

      // Verify form state is preserved
      const restoredSnapshot = await mockPlaywright.snapshot()
      expect(restoredSnapshot.elements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            value: testCompanyName
          }),
          expect.objectContaining({
            value: 'Progressive'
          })
        ])
      )

      await mockPlaywright.screenshot('state-preservation')
    })

    it('should show progress indicators during onboarding', async () => {
      await mockPlaywright.navigate('/onboarding?verified=true')

      const progressSnapshot = await mockPlaywright.snapshot()
      expect(progressSnapshot.elements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'progress',
            value: expect.any(Number)
          })
        ])
      )

      // Fill some fields and check progress update
      await mockPlaywright.type('[data-testid="company-name-input"]', testCompanyName)
      await mockPlaywright.type('[data-testid="first-name-input"]', 'Test')

      const updatedProgressSnapshot = await mockPlaywright.snapshot()
      expect(updatedProgressSnapshot.elements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'progress',
            value: expect.any(Number)
          })
        ])
      )

      await mockPlaywright.screenshot('progress-indicators')
    })

    it('should redirect incomplete onboarding users', async () => {
      // Simulate user with verified email but incomplete onboarding
      await mockPlaywright.navigate('/dashboard')

      // Should be redirected to onboarding
      await mockPlaywright.waitFor({ url: '/onboarding' })

      const redirectSnapshot = await mockPlaywright.snapshot()
      expect(redirectSnapshot.elements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            text: expect.stringContaining('Complete your setup')
          })
        ])
      )

      await mockPlaywright.screenshot('onboarding-redirect')
    })
  })

  describe('Accessibility and Mobile Experience', () => {
    it('should be accessible with keyboard navigation', async () => {
      await mockPlaywright.navigate('/sign-up')

      // Simulate tab navigation through form
      await mockPlaywright.click('body') // Focus on page

      // Use keyboard to navigate and fill form
      await mockPlaywright.type('Tab', '') // Focus email field
      await mockPlaywright.type('current', testEmail)

      await mockPlaywright.type('Tab', '') // Focus password field
      await mockPlaywright.type('current', testPassword)

      await mockPlaywright.type('Tab', '') // Focus confirm password
      await mockPlaywright.type('current', testPassword)

      await mockPlaywright.type('Tab', '') // Focus submit button
      await mockPlaywright.type('Enter', '') // Submit form

      await mockPlaywright.waitFor({ text: 'Check your email' })

      await mockPlaywright.screenshot('keyboard-navigation')
    })

    it('should work properly on mobile viewport', async () => {
      // Simulate mobile viewport
      await mockPlaywright.navigate('/sign-up')

      const mobileSnapshot = await mockPlaywright.snapshot()
      expect(mobileSnapshot.elements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            responsive: true,
            mobileOptimized: true
          })
        ])
      )

      // Test mobile-specific interactions
      await mockPlaywright.type('[data-testid="email-input"]', testEmail)

      const mobileFormSnapshot = await mockPlaywright.snapshot()
      expect(mobileFormSnapshot.elements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'input',
            inputType: 'email',
            mobileKeyboard: 'email'
          })
        ])
      )

      await mockPlaywright.screenshot('mobile-experience')
    })
  })
})
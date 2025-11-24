/**
 * Authentication Helpers for E2E Tests
 *
 * Provides utilities for logging in and checking authentication state
 */

import { Page } from '@playwright/test'

/**
 * Dismiss GDPR/Cookie consent modal if present
 */
export async function dismissCookieConsent(page: Page) {
  try {
    // Look for common cookie consent buttons (both English and Dutch)
    const consentButton = page.locator(
      'button:has-text("Approve"), button:has-text("Accept"), button:has-text("Akkoord"), button:has-text("Accepteren"), button:has-text("I Understand")'
    ).first()

    if (await consentButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await consentButton.click()
      console.log('✅ Cookie consent dismissed')
      await page.waitForTimeout(500) // Wait for modal to close
    }
  } catch (error) {
    // Cookie consent not present or already dismissed
  }
}

/**
 * Login to the application
 */
export async function loginToApplication(page: Page) {
  console.log('🔐 Logging in to application...')
  await page.context().clearCookies()
  console.log('🧹 Cleared previous session cookies')

  await page.goto('/sign-in')
  console.log('🏠 Navigated to sign-in page')

  await page.waitForSelector('text=Sign in', { timeout: 10000 })
  console.log('📋 Sign-in form title visible')

  const emailInput = page.locator('input[type="email"], input[name="identifier"]').first()
  await emailInput.waitFor({ state: 'visible', timeout: 10000 })
  console.log('📧 Email input field found')

  await emailInput.fill('imre.iddatasolutions@gmail.com')
  console.log('✉️  Email filled')

  const passwordInput = page.locator('input[type="password"], input[name="password"]').first()
  await passwordInput.waitFor({ state: 'visible', timeout: 10000 })
  console.log('🔑 Password field found on same page')

  await passwordInput.fill('Qy192837465!?')
  console.log('🔑 Password filled')

  const continueButton = page.locator('button:has-text("Continue")').first()
  await continueButton.click()
  console.log('➡️  Clicked Continue')

  await page.waitForURL(/\/dashboard/, { timeout: 15000 })
  console.log('🎯 Redirected to dashboard')

  // Dismiss cookie consent if present
  await dismissCookieConsent(page)

  console.log('✅ Login successful')
}

// No cached login – each test starts with a clean session

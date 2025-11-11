import { test, expect } from '@playwright/test'

/**
 * Time Entry Workflows E2E Tests
 * 
 * Tests all three ways to create time entries:
 * 1. "Nieuwe Tijdsregistratie" with manual input
 * 2. "Nieuwe Tijdsregistratie" with timer
 * 3. Main page "Start Timer" button
 * 
 * All tests verify that entries appear in the "Tijdsregistraties" table
 */

// Test data
const testClient = {
  name: 'Test Client B.V.',
  email: 'test@testclient.nl'
}

const testTimeEntry = {
  project: 'E2E Test Project',
  description: 'End-to-end test time entry',
  hours: '2.5'
}

test.describe('Time Entry Workflows', () => {
  test.beforeEach(async ({ page }) => {
    // First, log in to the application
    await loginToApplication(page)
    
    // Navigate to the time tracking page and wait for it to fully load
    console.log('🎯 Navigating to time tracking page...')
    await page.goto('/dashboard/financieel/tijd')
    
    // Wait for "Validating Access" step that may appear on navigation
    try {
      await page.waitForSelector('text=Validating Access', { timeout: 3000 })
      console.log('⏳ Validating access for time tracking page...')
      await page.waitForTimeout(3000) // Wait for validation to complete
    } catch {
      // Validation might be quick, continue
    }
    
    // Wait for the page to load with more flexible timeout
    await page.waitForLoadState('networkidle')
    
    // Wait specifically for the time tracking page title
    await expect(page.locator('h1')).toContainText('Tijdregistratie', { timeout: 15000 })
    console.log('📄 Time tracking page loaded')
    
    // Ensure we have a test client available
    await createTestClientIfNeeded(page)
    console.log('🏢 Test client setup complete')
  })

  test('Test 1: "Nieuwe Tijdsregistratie" with manual input', async ({ page }) => {
    console.log('🧪 Starting Test 1: Manual time entry')
    
    // Count existing entries before adding new one
    const initialCount = await getTimeEntriesCount(page)
    console.log(`Initial time entries count: ${initialCount}`)
    
    // Click "Nieuwe Tijdsregistratie" button
    await page.click('button:has-text("Nieuwe Tijdsregistratie")')
    
    // Wait for dialog to open
    await expect(page.locator('dialog')).toBeVisible()
    await expect(page.locator('text=Nieuwe tijdregistratie')).toBeVisible()
    
    // Select "Handmatig Invoeren" mode
    await page.click('button:has-text("Handmatig Invoeren")')
    
    // Verify timer card is hidden in manual mode
    await expect(page.locator('text=Tijdregistratie Timer')).not.toBeVisible()
    
    // Fill in the form
    await fillTimeEntryForm(page, {
      client: testClient.name,
      project: testTimeEntry.project + ' - Manual',
      description: testTimeEntry.description + ' (Manual input)',
      hours: testTimeEntry.hours
    })
    
    // Submit the form
    await page.click('button:has-text("Tijd registreren")')
    
    // Wait for success and dialog to close
    await expect(page.locator('dialog')).not.toBeVisible()
    
    // Verify new entry appears in the table
    const newCount = await getTimeEntriesCount(page)
    expect(newCount).toBe(initialCount + 1)
    
    // Verify the specific entry exists
    await expect(page.locator('table')).toContainText(testTimeEntry.project + ' - Manual')
    await expect(page.locator('table')).toContainText(testTimeEntry.description + ' (Manual input)')
    await expect(page.locator('table')).toContainText('2:30') // 2.5 hours formatted
    
    console.log('✅ Test 1 passed: Manual time entry created successfully')
  })

  test('Test 2: "Nieuwe Tijdsregistratie" with timer', async ({ page }) => {
    console.log('🧪 Starting Test 2: Timer time entry')
    
    // Count existing entries
    const initialCount = await getTimeEntriesCount(page)
    console.log(`Initial time entries count: ${initialCount}`)
    
    // Click "Nieuwe Tijdsregistratie" button
    await page.click('button:has-text("Nieuwe Tijdsregistratie")')
    
    // Wait for dialog to open
    await expect(page.locator('dialog')).toBeVisible()
    
    // Select "Met Timer" mode
    await page.click('button:has-text("Met Timer")')
    
    // Verify timer card is visible
    await expect(page.locator('text=Tijdregistratie Timer')).toBeVisible()
    
    // Fill in required fields for timer (client and project)
    await page.selectOption('select[name="client_id"]', { label: testClient.name })
    await page.fill('input[name="project_name"]', testTimeEntry.project + ' - Timer')
    await page.fill('textarea[name="description"]', testTimeEntry.description + ' (Timer)')
    
    // Start the timer
    await expect(page.locator('button:has-text("Start")')).toBeEnabled()
    await page.click('button:has-text("Start")')
    
    // Verify timer is running
    await expect(page.locator('button:has-text("Pauzeer")')).toBeVisible()
    await expect(page.locator('text=Actief bezig...')).toBeVisible()
    
    // Wait for some time to accumulate (2 seconds)
    await page.waitForTimeout(2000)
    
    // Pause the timer
    await page.click('button:has-text("Pauzeer")')
    
    // Verify timer is paused
    await expect(page.locator('button:has-text("Hervatten")')).toBeVisible()
    await expect(page.locator('text=Gepauzeerd')).toBeVisible()
    
    // Verify hours field has been populated with timer value
    const hoursValue = await page.inputValue('input[name="hours"]')
    expect(parseFloat(hoursValue)).toBeGreaterThan(0)
    console.log(`Timer recorded: ${hoursValue} hours`)
    
    // Submit the form
    await page.click('button:has-text("Tijd registreren")')
    
    // Wait for dialog to close
    await expect(page.locator('dialog')).not.toBeVisible()
    
    // Verify new entry appears
    const newCount = await getTimeEntriesCount(page)
    expect(newCount).toBe(initialCount + 1)
    
    // Verify the specific entry exists
    await expect(page.locator('table')).toContainText(testTimeEntry.project + ' - Timer')
    await expect(page.locator('table')).toContainText(testTimeEntry.description + ' (Timer)')
    
    console.log('✅ Test 2 passed: Timer time entry created successfully')
  })

  test('Test 3: Main page "Start Timer" button with auto-registration', async ({ page }) => {
    console.log('🧪 Starting Test 3: Main page timer with auto-registration')
    
    // Count existing entries
    const initialCount = await getTimeEntriesCount(page)
    console.log(`Initial time entries count: ${initialCount}`)
    
    // Click main "Start Timer" button
    await page.click('button:has-text("Start Timer")')
    
    // Wait for timer setup dialog
    await expect(page.locator('dialog:has-text("Timer Instellen")')).toBeVisible()
    
    // Fill in all required fields in setup dialog
    await page.selectOption('select', { label: testClient.name })
    await page.fill('input[id="project"]', testTimeEntry.project + ' - Main Timer')
    await page.fill('input[id="description"]', testTimeEntry.description + ' (Main timer auto-register)')
    
    // Start the timer
    await expect(page.locator('button:has-text("Start Timer")')).toBeEnabled()
    await page.click('button:has-text("Start Timer")')
    
    // Verify dialog closes and timer starts
    await expect(page.locator('dialog:has-text("Timer Instellen")')).not.toBeVisible()
    
    // Verify timer is running in main timer card
    await expect(page.locator('text=Actieve Timer')).toBeVisible()
    await expect(page.locator('button:has-text("Stop Timer")')).toBeVisible()
    await expect(page.locator(`text=${testTimeEntry.project + ' - Main Timer'}`)).toBeVisible()
    
    // Wait for some time to accumulate (3 seconds)
    await page.waitForTimeout(3000)
    
    // Stop the timer
    await page.click('button:has-text("Stop Timer")')
    
    // Handle the confirmation dialog
    page.on('dialog', async dialog => {
      console.log(`Confirmation dialog: ${dialog.message()}`)
      expect(dialog.message()).toContain('Timer gestopt!')
      expect(dialog.message()).toContain(testTimeEntry.project + ' - Main Timer')
      expect(dialog.message()).toContain(testClient.name)
      await dialog.accept() // Confirm auto-registration
    })
    
    // Wait for potential alert about successful registration
    page.on('dialog', async dialog => {
      console.log(`Success dialog: ${dialog.message()}`)
      expect(dialog.message()).toContain('succesvol geregistreerd')
      await dialog.accept()
    })
    
    // Wait a moment for registration to complete
    await page.waitForTimeout(1000)
    
    // Verify timer is reset
    await expect(page.locator('text=Geen actieve sessie')).toBeVisible()
    
    // Verify new entry appears in table
    const newCount = await getTimeEntriesCount(page)
    expect(newCount).toBe(initialCount + 1)
    
    // Verify the specific entry exists
    await expect(page.locator('table')).toContainText(testTimeEntry.project + ' - Main Timer')
    await expect(page.locator('table')).toContainText(testTimeEntry.description + ' (Main timer auto-register)')
    
    console.log('✅ Test 3 passed: Main timer auto-registration successful')
  })

  test('Cleanup: Verify all test entries are visible', async ({ page }) => {
    console.log('🧪 Running cleanup verification')
    
    // Refresh the page to ensure latest data
    await page.reload()
    await expect(page.locator('h1')).toContainText('Tijdregistratie')
    
    // Verify all three specific test entries are present (exact matches)
    await expect(page.locator('table')).toContainText(testTimeEntry.project + ' - Manual')
    await expect(page.locator('table')).toContainText(testTimeEntry.project + ' - Timer')
    await expect(page.locator('table')).toContainText(testTimeEntry.project + ' - Main Timer')
    
    // Count our specific test entries (exact project names)
    const manualEntries = await page.locator(`table tbody tr:has-text("${testTimeEntry.project} - Manual")`).count()
    const timerEntries = await page.locator(`table tbody tr:has-text("${testTimeEntry.project} - Timer")`).count()
    const mainTimerEntries = await page.locator(`table tbody tr:has-text("${testTimeEntry.project} - Main Timer")`).count()
    
    console.log(`Specific test entries found:`)
    console.log(`- "${testTimeEntry.project} - Manual": ${manualEntries}`)
    console.log(`- "${testTimeEntry.project} - Timer": ${timerEntries}`) 
    console.log(`- "${testTimeEntry.project} - Main Timer": ${mainTimerEntries}`)
    
    // Each test should have created exactly 1 entry
    expect(manualEntries).toBe(1)
    expect(timerEntries).toBe(1) 
    expect(mainTimerEntries).toBe(1)
    
    console.log('✅ Cleanup verification passed: All 3 test entries created successfully')
  })
})

/**
 * Helper function to log in to the application
 * Updated with Clerk loading state handling based on Context7 MCP research
 */
async function loginToApplication(page) {
  console.log('🔐 Logging in to application...')
  
  // Check if already logged in first
  try {
    await page.goto('/dashboard')
    
    // Wait for Clerk initialization and validation
    await waitForClerkToLoad(page)
    
    // Check if we're successfully on dashboard
    if (page.url().includes('/dashboard') && await page.locator('text=Welcome back!').isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('✅ Already logged in')
      return
    }
  } catch {
    console.log('🔄 Not logged in, proceeding with authentication...')
  }
  
  // Navigate to sign-in page
  await page.goto('/')
  console.log('🏠 Navigated to homepage')
  
  // Wait for Clerk to initialize on homepage
  await waitForClerkToLoad(page)
  
  // Click Sign In button
  await page.click('button:has-text("Sign In")')
  console.log('🔗 Clicked Sign In button')
  
  // Wait for navigation to sign-in page
  await page.waitForURL(/sign-in/, { timeout: 15000 })
  console.log('🔐 Navigated to sign-in page')
  
  // Wait for Clerk to fully initialize on sign-in page
  await waitForClerkToLoad(page)
  
  // Wait for the sign-in form to be fully ready
  await page.waitForSelector('text=Sign in to SaaS Template', { timeout: 15000 })
  console.log('📋 Sign-in form title visible')
  
  // Wait for email input field to be ready and interactive
  await page.waitForSelector('input[type="email"]', { timeout: 15000 })
  console.log('📧 Email input field found')
  
  // Additional wait to ensure form is fully interactive
  await page.waitForTimeout(2000)
  
  // Fill email field - using both Playwright native methods and JavaScript
  const emailField = page.locator('input[type="email"]')
  await emailField.waitFor({ state: 'visible', timeout: 10000 })
  
  // Clear any existing value first
  await emailField.clear()
  
  // Type email using Playwright's reliable typing method
  await emailField.type('nextgendatalead@gmail.com', { delay: 50 })
  console.log('✉️  Email typed using Playwright')
  
  // Verify email was filled
  const emailValue = await emailField.inputValue()
  if (!emailValue.includes('nextgendatalead@gmail.com')) {
    console.log('⚠️  Email not filled correctly, trying JavaScript method')
    await page.evaluate(() => {
      const field = document.querySelector('input[type="email"]') as HTMLInputElement
      if (field) {
        field.value = 'nextgendatalead@gmail.com'
        field.dispatchEvent(new Event('input', { bubbles: true }))
        field.dispatchEvent(new Event('change', { bubbles: true }))
      }
    })
  }
  
  console.log('✅ Email filled successfully')
  
  // Check if password field is on the same page
  const passwordField = page.locator('input[type="password"]')
  const passwordVisible = await passwordField.isVisible({ timeout: 2000 }).catch(() => false)
  
  if (passwordVisible) {
    console.log('🔑 Password field found on same page')
    await passwordField.clear()
    await passwordField.type('Q789123@!#!', { delay: 50 })
    console.log('🔑 Password filled')
  }
  
  // Click Continue button
  const continueButton = page.locator('button:has-text("Continue")')
  await continueButton.waitFor({ state: 'visible', timeout: 10000 })
  await continueButton.click()
  console.log('➡️  Clicked Continue')
  
  // If password was not on the same page, handle second step
  if (!passwordVisible) {
    console.log('🔐 Waiting for password page...')
    
    // Wait for password page to load
    await page.waitForSelector('text=Enter your password', { timeout: 15000 })
    console.log('🔐 Password page loaded')
    
    // Wait for Clerk to initialize on password page
    await waitForClerkToLoad(page)
    
    // Fill password
    const passwordFieldStep2 = page.locator('input[type="password"]')
    await passwordFieldStep2.waitFor({ state: 'visible', timeout: 10000 })
    await passwordFieldStep2.clear()
    await passwordFieldStep2.type('Q789123@!#!', { delay: 50 })
    console.log('🔑 Password filled on second step')
    
    // Click Continue on password page
    const continueButton2 = page.locator('button:has-text("Continue")')
    await continueButton2.click()
    console.log('➡️  Clicked Continue on password page')
  }
  
  // Wait for successful authentication and redirect
  await page.waitForURL('**/dashboard**', { timeout: 30000 })
  console.log('🎯 Redirected to dashboard')
  
  // Wait for Clerk to finish loading on dashboard
  await waitForClerkToLoad(page)
  
  // Wait for dashboard content to load
  await page.waitForSelector('text=Welcome back!', { timeout: 15000 })
  console.log('📊 Dashboard loaded')
  
  // Final wait for complete initialization
  await page.waitForTimeout(3000)
  console.log('✅ Login complete and ready for tests')
}

/**
 * Helper function to wait for Clerk to fully initialize
 * Based on Clerk documentation research from Context7 MCP
 */
async function waitForClerkToLoad(page) {
  console.log('⏳ Waiting for Clerk to initialize...')
  
  // Wait for any "Validating Access" or loading states to appear and complete
  try {
    // First, wait for any loading indicator to appear
    await page.waitForSelector('text=Validating Access', { timeout: 3000 })
    console.log('🔄 Found "Validating Access" - waiting for completion...')
    
    // Wait for the loading state to disappear
    await page.waitForSelector('text=Validating Access', { state: 'hidden', timeout: 10000 })
    console.log('✅ Validation completed')
  } catch {
    // If "Validating Access" doesn't appear, Clerk might load quickly
    console.log('🚀 No validation screen - Clerk loaded quickly')
  }
  
  // Additional check for Clerk's JavaScript readiness
  await page.evaluate(async () => {
    // Wait for Clerk's window object to be available
    let attempts = 0
    while (attempts < 50) { // Max 5 seconds
      if (window.Clerk && typeof window.Clerk.loaded !== 'undefined') {
        // If Clerk has an isLoaded property/method, wait for it
        if (typeof window.Clerk.loaded === 'boolean' && window.Clerk.loaded) {
          break
        } else if (typeof window.Clerk.loaded === 'function' && await window.Clerk.loaded()) {
          break
        }
      }
      await new Promise(resolve => setTimeout(resolve, 100))
      attempts++
    }
  })
  
  // Standard wait to ensure forms are interactive
  await page.waitForTimeout(2000)
  console.log('✅ Clerk initialization complete')
}

/**
 * Helper function to create a test client if it doesn't exist
 */
async function createTestClientIfNeeded(page) {
  // Check if client already exists in any dropdown
  const clientExists = await page.locator(`option:has-text("${testClient.name}")`).count() > 0
  
  if (!clientExists) {
    console.log('Creating test client...')
    
    // Navigate to clients or create via API call
    // For now, we'll assume the client exists or create via direct API
    await page.evaluate(async (client) => {
      await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: client.name,
          email: client.email,
          is_business: true,
          company_name: client.name,
          country_code: 'NL'
        })
      })
    }, testClient)
    
    // Refresh page to load new client
    await page.reload()
    await expect(page.locator('h1')).toContainText('Tijdregistratie')
  }
}

/**
 * Helper function to get current count of time entries
 */
async function getTimeEntriesCount(page): Promise<number> {
  // Wait for table to load
  await page.waitForSelector('table tbody', { timeout: 5000 })
  
  const rows = await page.locator('table tbody tr').count()
  return rows
}

/**
 * Helper function to fill time entry form
 */
async function fillTimeEntryForm(page, data: {
  client: string
  project: string
  description: string
  hours: string
}) {
  // Select client
  await page.selectOption('select[name="client_id"]', { label: data.client })
  
  // Fill project name
  await page.fill('input[name="project_name"]', data.project)
  
  // Fill description
  await page.fill('textarea[name="description"]', data.description)
  
  // Fill hours (only in manual mode)
  await page.fill('input[name="hours"]', data.hours)
  
  // Ensure billable is checked
  await page.check('input[name="billable"]')
}
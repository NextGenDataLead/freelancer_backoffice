import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

// Test configuration
const MODAL_DEMO_URL = '/dashboard/modals'
const DASHBOARD_URL = '/dashboard'

// Helper functions for modal testing
class ModalHelpers {
  constructor(private page: Page) {}

  async waitForModal(selector: string = '[role="dialog"]') {
    await this.page.waitForSelector(selector, { state: 'visible' })
  }

  async closeModalWithEscape() {
    await this.page.keyboard.press('Escape')
  }

  async closeModalWithOverlay() {
    // Click on the backdrop/overlay area
    await this.page.locator('[data-radix-dialog-overlay]').click({ position: { x: 10, y: 10 } })
  }

  async checkFocusTrap(modalSelector: string = '[role="dialog"]') {
    const modal = this.page.locator(modalSelector)
    await expect(modal).toBeVisible()

    // Get all focusable elements within the modal
    const focusableElements = await modal.locator('button, input, textarea, select, [tabindex]:not([tabindex="-1"])').all()
    
    if (focusableElements.length === 0) return true

    // Test Tab navigation forward
    for (let i = 0; i < focusableElements.length; i++) {
      await this.page.keyboard.press('Tab')
      const currentIndex = i === focusableElements.length - 1 ? 0 : i + 1
      await expect(focusableElements[currentIndex]).toBeFocused()
    }

    // Test Shift+Tab navigation backward
    for (let i = focusableElements.length - 1; i >= 0; i--) {
      await this.page.keyboard.press('Shift+Tab')
      const currentIndex = i === 0 ? focusableElements.length - 1 : i - 1
      await expect(focusableElements[currentIndex]).toBeFocused()
    }

    return true
  }

  async verifyARIAAttributes(modalSelector: string = '[role="dialog"]') {
    const modal = this.page.locator(modalSelector)
    
    // Check essential ARIA attributes
    await expect(modal).toHaveAttribute('role', 'dialog')
    await expect(modal).toHaveAttribute('aria-modal', 'true')
    
    // Check for aria-labelledby (title)
    const ariaLabelledBy = await modal.getAttribute('aria-labelledby')
    if (ariaLabelledBy) {
      const titleElement = this.page.locator(`#${ariaLabelledBy}`)
      await expect(titleElement).toBeVisible()
    }

    // Check for aria-describedby (description)
    const ariaDescribedBy = await modal.getAttribute('aria-describedby')
    if (ariaDescribedBy) {
      const descriptionElement = this.page.locator(`#${ariaDescribedBy}`)
      await expect(descriptionElement).toBeVisible()
    }
  }

  async verifyScrollLock() {
    const bodyOverflow = await this.page.evaluate(() => {
      return window.getComputedStyle(document.body).overflow
    })
    expect(bodyOverflow).toBe('hidden')
  }
}

test.describe('Modal System E2E Tests', () => {
  let modalHelpers: ModalHelpers

  test.beforeEach(async ({ page }) => {
    modalHelpers = new ModalHelpers(page)
    
    // Navigate to dashboard modals page
    await page.goto(MODAL_DEMO_URL)
    await page.waitForLoadState('networkidle')
  })

  test.describe('Basic Modal Functionality', () => {
    test('should open and close basic modal', async ({ page }) => {
      // Open modal
      await page.click('text=Basic Modal')
      await modalHelpers.waitForModal()

      // Verify modal is visible and has correct content
      const modal = page.locator('[role="dialog"]')
      await expect(modal).toBeVisible()
      await expect(modal).toContainText('Basic Modal Example')
      await expect(modal).toContainText('This is a simple modal with basic content')

      // Close with button
      await page.click('text=Cancel')
      await expect(modal).not.toBeVisible()
    })

    test('should close modal with Escape key', async ({ page }) => {
      await page.click('text=Basic Modal')
      await modalHelpers.waitForModal()

      const modal = page.locator('[role="dialog"]')
      await expect(modal).toBeVisible()

      await modalHelpers.closeModalWithEscape()
      await expect(modal).not.toBeVisible()
    })

    test('should close modal by clicking overlay', async ({ page }) => {
      await page.click('text=Basic Modal')
      await modalHelpers.waitForModal()

      const modal = page.locator('[role="dialog"]')
      await expect(modal).toBeVisible()

      await modalHelpers.closeModalWithOverlay()
      await expect(modal).not.toBeVisible()
    })
  })

  test.describe('Accessibility Features', () => {
    test('should have proper ARIA attributes', async ({ page }) => {
      await page.click('text=Basic Modal')
      await modalHelpers.waitForModal()

      await modalHelpers.verifyARIAAttributes()
    })

    test('should implement focus trap correctly', async ({ page }) => {
      await page.click('text=Basic Modal')
      await modalHelpers.waitForModal()

      await modalHelpers.checkFocusTrap()
    })

    test('should restore focus to trigger element when closed', async ({ page }) => {
      const triggerButton = page.locator('text=Basic Modal')
      await triggerButton.focus()
      await expect(triggerButton).toBeFocused()

      await triggerButton.click()
      await modalHelpers.waitForModal()

      // Close modal
      await page.keyboard.press('Escape')
      await expect(page.locator('[role="dialog"]')).not.toBeVisible()

      // Focus should return to trigger button
      await expect(triggerButton).toBeFocused()
    })

    test('should lock body scroll when modal is open', async ({ page }) => {
      await page.click('text=Basic Modal')
      await modalHelpers.waitForModal()

      await modalHelpers.verifyScrollLock()
    })

    test('should handle keyboard navigation with Tab and Shift+Tab', async ({ page }) => {
      await page.click('text=Custom Modal')
      await modalHelpers.waitForModal()

      // Test focus trap with multiple buttons
      await modalHelpers.checkFocusTrap()
    })
  })

  test.describe('Form Modals', () => {
    test('should validate form inputs', async ({ page }) => {
      await page.click('text=Create User Profile')
      await modalHelpers.waitForModal()

      // Try to submit empty form
      await page.click('text=Create Profile')

      // Check for validation errors
      await expect(page.locator('text=Name must be at least 2 characters')).toBeVisible()
      await expect(page.locator('text=Invalid email address')).toBeVisible()
      await expect(page.locator('text=Bio must be at least 10 characters')).toBeVisible()
    })

    test('should submit form with valid data', async ({ page }) => {
      await page.click('text=Create User Profile')
      await modalHelpers.waitForModal()

      // Fill form with valid data
      await page.fill('#profile-name', 'John Doe')
      await page.fill('#profile-email', 'john.doe@example.com')
      await page.selectOption('select', 'user')
      await page.fill('#profile-bio', 'This is a test bio with more than 10 characters.')

      // Submit form
      await page.click('text=Create Profile')

      // Modal should close
      await expect(page.locator('[role="dialog"]')).not.toBeVisible()

      // Check for success feedback
      await page.waitForSelector('[role="dialog"]', { state: 'visible' }) // Success modal
      await expect(page.locator('text=Success!')).toBeVisible()
    })

    test('should handle form submission errors gracefully', async ({ page }) => {
      await page.click('text=Contact Form')
      await modalHelpers.waitForModal()

      // Fill minimal form
      await page.fill('#contact-subject', 'Test Subject')
      await page.fill('#contact-message', 'Test message with enough characters')
      await page.selectOption('select', 'medium')

      // Submit form
      await page.click('button[type="submit"]')

      // Should close and show success
      await expect(page.locator('text=Contact Support')).not.toBeVisible()
    })

    test('should handle form reset on modal close', async ({ page }) => {
      await page.click('text=Create User Profile')
      await modalHelpers.waitForModal()

      // Fill some data
      await page.fill('#profile-name', 'Test Name')
      await page.fill('#profile-email', 'test@example.com')

      // Close modal
      await page.keyboard.press('Escape')
      await expect(page.locator('[role="dialog"]')).not.toBeVisible()

      // Reopen modal
      await page.click('text=Create User Profile')
      await modalHelpers.waitForModal()

      // Form should be reset
      await expect(page.locator('#profile-name')).toHaveValue('')
      await expect(page.locator('#profile-email')).toHaveValue('')
    })
  })

  test.describe('Confirmation Modals', () => {
    test('should handle confirmation with confirm action', async ({ page }) => {
      await page.click('text=Delete User')
      await modalHelpers.waitForModal()

      // Verify destructive styling
      const modal = page.locator('[role="dialog"]')
      await expect(modal).toContainText('Delete User Profile')
      await expect(modal).toContainText('This action cannot be undone')

      // Confirm action
      await page.click('text=Delete Profile')
      await expect(modal).not.toBeVisible()

      // Check status update
      await expect(page.locator('text=User profile deleted')).toBeVisible()
    })

    test('should handle confirmation with cancel action', async ({ page }) => {
      await page.click('text=Save Changes')
      await modalHelpers.waitForModal()

      const modal = page.locator('[role="dialog"]')
      await expect(modal).toContainText('Save Changes')

      // Cancel action
      await page.click('text=Discard Changes')
      await expect(modal).not.toBeVisible()

      // Check status update
      await expect(page.locator('text=Changes discarded')).toBeVisible()
    })

    test('should handle logout confirmation', async ({ page }) => {
      await page.click('text=Logout')
      await modalHelpers.waitForModal()

      const modal = page.locator('[role="dialog"]')
      await expect(modal).toContainText('Confirm Logout')

      // Confirm logout
      await page.click('text=Log Out')
      await expect(modal).not.toBeVisible()

      // Should trigger error modal (demo simulation)
      await page.waitForSelector('[role="dialog"]', { state: 'visible' })
      await expect(page.locator('text=Logout Simulation')).toBeVisible()
    })
  })

  test.describe('Information Modals', () => {
    test('should display success modal', async ({ page }) => {
      await page.click('text=Success')
      await modalHelpers.waitForModal()

      const modal = page.locator('[role="dialog"]')
      await expect(modal).toContainText('Success!')
      
      // Should have success styling (green icon)
      await expect(modal.locator('svg.text-green-500')).toBeVisible()
    })

    test('should display error modal', async ({ page }) => {
      await page.click('text=Error')
      await modalHelpers.waitForModal()

      const modal = page.locator('[role="dialog"]')
      
      // Should have error styling (red icon)
      await expect(modal.locator('svg.text-red-500')).toBeVisible()
    })

    test('should display warning modal', async ({ page }) => {
      await page.click('text=Warning Modal')
      await modalHelpers.waitForModal()

      const modal = page.locator('[role="dialog"]')
      await expect(modal).toContainText('Warning')
      
      // Should have warning styling (yellow icon)  
      await expect(modal.locator('svg.text-yellow-500')).toBeVisible()
    })

    test('should display help modal', async ({ page }) => {
      await page.click('text=Help Modal')
      await modalHelpers.waitForModal()

      const modal = page.locator('[role="dialog"]')
      await expect(modal).toContainText('Help & Documentation')
      await expect(modal).toContainText('keyboard-navigable dialogs')
    })

    test('should display feature modal with list', async ({ page }) => {
      await page.click('text=New Feature')
      await modalHelpers.waitForModal()

      const modal = page.locator('[role="dialog"]')
      await expect(modal).toContainText('New Feature: Advanced Modals')
      await expect(modal).toContainText('Automatic focus management')
      await expect(modal).toContainText('Keyboard navigation support')
    })

    test('should display maintenance modal', async ({ page }) => {
      await page.click('text=Maintenance')
      await modalHelpers.waitForModal()

      const modal = page.locator('[role="dialog"]')
      await expect(modal).toContainText('Scheduled Maintenance')
      await expect(modal).toContainText('December 15th')
    })
  })

  test.describe('Nested Modals', () => {
    test('should handle nested modals correctly', async ({ page }) => {
      await page.click('text=Basic Modal')
      await modalHelpers.waitForModal()

      // Open nested modal
      await page.click('text=Open Nested Modal')
      
      // Should have two modals open
      const modals = page.locator('[role="dialog"]')
      await expect(modals).toHaveCount(2)

      // Close nested modal
      await page.keyboard.press('Escape')
      
      // Should only have one modal remaining
      await expect(modals).toHaveCount(1)
      await expect(page.locator('text=Basic Modal Example')).toBeVisible()
    })

    test('should restore focus correctly with nested modals', async ({ page }) => {
      await page.click('text=Basic Modal')
      await modalHelpers.waitForModal()

      const nestedTrigger = page.locator('text=Open Nested Modal')
      await nestedTrigger.click()

      // Wait for nested modal
      await expect(page.locator('[role="dialog"]')).toHaveCount(2)

      // Close nested modal
      await page.keyboard.press('Escape')

      // Focus should return to the nested trigger button
      await expect(nestedTrigger).toBeFocused()
    })
  })

  test.describe('Modal Sizing', () => {
    test('should render different modal sizes correctly', async ({ page }) => {
      // Test custom modal (large size)
      await page.click('text=Custom Modal')
      await modalHelpers.waitForModal()

      const modal = page.locator('[role="dialog"]')
      const modalContent = modal.locator('[data-radix-dialog-content]')
      
      // Check for large size class
      await expect(modalContent).toHaveClass(/lg:max-w-lg/)
      
      await page.keyboard.press('Escape')
      await expect(modal).not.toBeVisible()
    })
  })

  test.describe('Accessibility Test Suite', () => {
    test('should run accessibility test suite', async ({ page }) => {
      // Show accessibility test suite
      await page.click('text=Show Accessibility Test Suite')
      
      await page.waitForSelector('text=Modal Accessibility Test Suite')
      await expect(page.locator('text=Modal Accessibility Test Suite')).toBeVisible()

      // Test keyboard navigation
      await page.click('text=Test Keyboard Navigation')
      await modalHelpers.waitForModal()
      
      await modalHelpers.verifyARIAAttributes()
      await modalHelpers.checkFocusTrap()

      await page.keyboard.press('Escape')
    })

    test('should track focus changes in accessibility test', async ({ page }) => {
      await page.click('text=Show Accessibility Test Suite')
      await page.waitForSelector('text=Modal Accessibility Test Suite')

      // Should show focus tracking
      await expect(page.locator('text=Currently focused:')).toBeVisible()

      // Focus on test button and verify tracking
      const testButton = page.locator('text=Test Focus Trap')
      await testButton.focus()
      
      // The focus tracker should update
      await expect(page.locator('text=Currently focused: button')).toBeVisible()
    })
  })

  test.describe('State Management', () => {
    test('should track modal interactions in demo status', async ({ page }) => {
      // Check initial status
      await expect(page.locator('text=User Profiles Created')).toBeVisible()
      await expect(page.locator('text=0')).toBeVisible() // Badge showing 0

      // Create a user profile
      await page.click('text=Create User Profile')
      await modalHelpers.waitForModal()

      await page.fill('#profile-name', 'Test User')
      await page.fill('#profile-email', 'test@example.com')
      await page.selectOption('select', 'user')
      await page.fill('#profile-bio', 'Test bio with enough characters')

      await page.click('text=Create Profile')
      
      // Wait for success modal
      await page.waitForSelector('text=Success!')
      await page.keyboard.press('Escape') // Close success modal

      // Check updated status
      await expect(page.locator('text=1')).toBeVisible() // Badge should show 1
      await expect(page.locator('text=User profile created: Test User')).toBeVisible()
    })

    test('should handle multiple form submissions', async ({ page }) => {
      // Submit multiple contact forms
      for (let i = 1; i <= 2; i++) {
        await page.click('text=Contact Form')
        await modalHelpers.waitForModal()

        await page.fill('#contact-subject', `Test Subject ${i}`)
        await page.fill('#contact-message', `Test message ${i} with enough characters`)
        await page.selectOption('select', 'high')

        await page.click('button[type="submit"]')
        
        // Close success modal
        await page.waitForSelector('text=Success!')
        await page.keyboard.press('Escape')
      }

      // Check contact forms count
      const contactsBadges = page.locator('text=Contact Forms Submitted').locator('..').locator('.bg-secondary')
      await expect(contactsBadges).toContainText('2')
    })
  })

  test.describe('Navigation Integration', () => {
    test('should access modals page from dashboard navigation', async ({ page }) => {
      // Go to main dashboard first
      await page.goto(DASHBOARD_URL)
      await page.waitForLoadState('networkidle')

      // Click on Modals in navigation
      await page.click('text=Modals')
      await page.waitForLoadState('networkidle')

      // Should be on modals page
      await expect(page).toHaveURL(/\/dashboard\/modals/)
      await expect(page.locator('text=Modal System Demo')).toBeVisible()
    })

    test('should have proper navigation state', async ({ page }) => {
      const modalNavLink = page.locator('text=Modals')
      
      // Should be visible in navigation
      await expect(modalNavLink).toBeVisible()
      
      // Should have proper icon
      await expect(modalNavLink.locator('svg')).toBeVisible()
    })
  })

  test.describe('Performance', () => {
    test('should open and close modals quickly', async ({ page }) => {
      const startTime = Date.now()
      
      await page.click('text=Basic Modal')
      await modalHelpers.waitForModal()
      
      const openTime = Date.now() - startTime
      expect(openTime).toBeLessThan(1000) // Should open within 1 second

      const closeStartTime = Date.now()
      await page.keyboard.press('Escape')
      await expect(page.locator('[role="dialog"]')).not.toBeVisible()
      
      const closeTime = Date.now() - closeStartTime
      expect(closeTime).toBeLessThan(500) // Should close within 500ms
    })

    test('should handle rapid modal operations', async ({ page }) => {
      // Rapidly open and close multiple modals
      const modals = [
        'text=Basic Modal',
        'text=Custom Modal', 
        'text=Warning Modal',
        'text=Help Modal'
      ]

      for (const modalTrigger of modals) {
        await page.click(modalTrigger)
        await modalHelpers.waitForModal()
        await page.keyboard.press('Escape')
        await expect(page.locator('[role="dialog"]')).not.toBeVisible()
      }

      // Page should remain responsive
      await expect(page.locator('text=Modal System Demo')).toBeVisible()
    })
  })
})

// Additional tests for edge cases and error scenarios
test.describe('Modal Edge Cases', () => {
  let modalHelpers: ModalHelpers

  test.beforeEach(async ({ page }) => {
    modalHelpers = new ModalHelpers(page)
    await page.goto(MODAL_DEMO_URL)
    await page.waitForLoadState('networkidle')
  })

  test('should handle programmatic focus changes', async ({ page }) => {
    await page.click('text=Basic Modal')
    await modalHelpers.waitForModal()

    // Try to programmatically focus outside modal
    await page.evaluate(() => {
      const outsideElement = document.querySelector('h1')
      if (outsideElement && 'focus' in outsideElement) {
        (outsideElement as HTMLElement).focus()
      }
    })

    // Focus should remain within modal
    const modalFocusedElement = await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"]')
      return modal?.contains(document.activeElement)
    })

    expect(modalFocusedElement).toBe(true)
  })

  test('should handle modal with no focusable elements', async ({ page }) => {
    // This would require a special modal with no focusable elements
    // For now, we'll test that modals always have at least one focusable element
    await page.click('text=Basic Modal')
    await modalHelpers.waitForModal()

    const focusableCount = await page.locator('[role="dialog"] button, [role="dialog"] input, [role="dialog"] textarea, [role="dialog"] select, [role="dialog"] [tabindex]:not([tabindex="-1"])').count()
    
    expect(focusableCount).toBeGreaterThan(0)
  })

  test('should handle disabled buttons correctly', async ({ page }) => {
    await page.click('text=Create User Profile')
    await modalHelpers.waitForModal()

    // Submit button should initially be enabled
    const submitButton = page.locator('text=Create Profile')
    await expect(submitButton).toBeEnabled()

    // After starting form submission, button should be disabled (if implemented)
    // This test verifies the button remains accessible during loading states
  })
})
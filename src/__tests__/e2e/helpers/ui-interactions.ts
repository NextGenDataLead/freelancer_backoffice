import { Page } from '@playwright/test'

/**
 * Click a dropdown option by text content, handling viewport scrolling issues
 * @param page - Playwright page object
 * @param optionText - Text content to search for in the option
 * @throws Error if option is not found
 */
export async function clickDropdownOption(page: Page, optionText: string): Promise<void> {
  const result = await page.evaluate((text) => {
    const options = Array.from(document.querySelectorAll('[role="option"]'))
    const option = options.find(opt => opt.textContent?.includes(text)) as HTMLElement
    if (option) {
      // Scroll the option into view within its container
      option.scrollIntoView({ block: 'center', behavior: 'instant' })
      // Click it directly
      option.click()
      return { success: true }
    } else {
      return { success: false, error: `Option with text "${text}" not found. Available options: ${options.map(o => o.textContent?.trim()).join(', ')}` }
    }
  }, optionText)

  if (!result.success) {
    throw new Error(result.error)
  }
}

/**
 * Click the Nth dropdown option (0-indexed), handling viewport scrolling issues
 * @param page - Playwright page object
 * @param index - Zero-based index of the option to click
 * @throws Error if option is not found
 */
export async function clickNthDropdownOption(page: Page, index: number): Promise<void> {
  const result = await page.evaluate((idx) => {
    const options = Array.from(document.querySelectorAll('[role="option"]'))
    const option = options[idx] as HTMLElement
    if (option) {
      // Scroll the option into view within its container
      option.scrollIntoView({ block: 'center', behavior: 'instant' })
      // Click it directly
      option.click()
      return { success: true }
    } else {
      return { success: false, error: `Option at index ${idx} not found. Total options available: ${options.length}` }
    }
  }, index)

  if (!result.success) {
    throw new Error(result.error)
  }
}

/**
 * Click a calendar date by day number, handling viewport scrolling issues
 * @param page - Playwright page object
 * @param dayNumber - The day number to click (as it appears in the calendar)
 * @throws Error if day is not found or disabled
 */
export async function clickCalendarDate(page: Page, dayNumber: number): Promise<void> {
  const result = await page.evaluate((day) => {
    // Find all calendar day buttons that are not disabled
    const availableDays = Array.from(
      document.querySelectorAll('[role="gridcell"]:not([aria-disabled="true"]) button')
    )
    // Find the day with matching text content
    const dayButton = availableDays.find(btn => {
      const text = btn.textContent?.trim()
      return text === day.toString()
    }) as HTMLElement

    if (dayButton) {
      // Scroll into view within calendar
      dayButton.scrollIntoView({ block: 'center', behavior: 'instant' })
      // Click it directly
      dayButton.click()
      return { success: true }
    } else {
      const availableDayNumbers = availableDays.map(btn => btn.textContent?.trim()).join(', ')
      return { success: false, error: `Calendar day ${day} not found or is disabled. Available days: ${availableDayNumbers}` }
    }
  }, dayNumber)

  if (!result.success) {
    throw new Error(result.error)
  }
}

/**
 * Click the Nth available calendar date (0-indexed), handling viewport scrolling issues
 * Useful when you don't care about the specific date, just need any available date
 * @param page - Playwright page object
 * @param index - Zero-based index of available dates (0 = first available, -1 for last)
 * @throws Error if index is out of bounds
 */
export async function clickNthCalendarDate(page: Page, index: number): Promise<void> {
  const result = await page.evaluate((idx) => {
    const availableDays = Array.from(
      document.querySelectorAll('[role="gridcell"]:not([aria-disabled="true"]) button')
    )

    // Handle negative index (last element)
    const actualIndex = idx < 0 ? availableDays.length + idx : idx
    const dayButton = availableDays[actualIndex] as HTMLElement

    if (dayButton) {
      // Scroll into view within calendar
      dayButton.scrollIntoView({ block: 'center', behavior: 'instant' })
      // Click it directly
      dayButton.click()
      return { success: true }
    } else {
      return { success: false, error: `Calendar date at index ${idx} not found. Total available dates: ${availableDays.length}` }
    }
  }, index)

  if (!result.success) {
    throw new Error(result.error)
  }
}

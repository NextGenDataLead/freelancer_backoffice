/**
 * Client E2E Test Helper Functions
 *
 * Provides reusable utilities for client testing including:
 * - Client creation via API
 * - Finding and interacting with clients
 * - Client management
 * - Cleanup utilities
 */

import { Page, Locator, expect } from '@playwright/test'

/**
 * Client data structure for API creation
 */
export interface ClientData {
  name: string
  email?: string
  phone?: string
  vat_number?: string
  country_code?: string
  is_business?: boolean
  default_hourly_rate?: number
  address?: string
  city?: string
  postal_code?: string
  website?: string
  notes?: string
}

/**
 * Create client via API for testing
 * @param page - Playwright page object
 * @param data - Client data
 * @returns Client ID
 */
export async function createClientViaAPI(
  page: Page,
  data: ClientData
): Promise<string> {
  const payload = {
    name: data.name,
    email: data.email || `${data.name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
    phone: data.phone || '',
    vat_number: data.vat_number || '',
    country_code: data.country_code || 'NL',
    is_business: data.is_business ?? true,
    default_hourly_rate: data.default_hourly_rate || 75,
    address: data.address || '',
    city: data.city || '',
    postal_code: data.postal_code || '',
    website: data.website || '',
    notes: data.notes || ''
  }

  const response = await page.request.post('/api/clients', {
    data: payload
  })

  if (!response.ok()) {
    const error = await response.text()
    throw new Error(`Failed to create client via API: ${response.status()} - ${error}`)
  }

  const result = await response.json()
  return result.client?.id || result.id
}

/**
 * Create multiple clients via API
 * @param page - Playwright page object
 * @param clients - Array of client data
 * @returns Array of client IDs
 */
export async function createMultipleClientsViaAPI(
  page: Page,
  clients: ClientData[]
): Promise<string[]> {
  const clientIds: string[] = []

  for (const clientData of clients) {
    const id = await createClientViaAPI(page, clientData)
    clientIds.push(id)
  }

  return clientIds
}

/**
 * Find client by name in the list
 * @param page - Playwright page object
 * @param name - Client name
 * @returns Locator for the client row
 */
export async function findClientByName(
  page: Page,
  name: string
): Promise<Locator> {
  const clientRow = page.locator(`tr:has-text("${name}")`)
  await expect(clientRow).toBeVisible({ timeout: 10000 })
  return clientRow
}

/**
 * Wait for client list to load
 * @param page - Playwright page object
 */
export async function waitForClientList(page: Page): Promise<void> {
  // Wait for table or empty state
  const hasTable = await page.locator('table tbody tr').count().then(count => count > 0)
  const hasEmptyState = await page.locator('text=/No clients found|Geen klanten gevonden/i').isVisible()

  if (!hasTable && !hasEmptyState) {
    await page.waitForSelector('table tbody tr, text=/No clients found|Geen klanten gevonden/i', { timeout: 10000 })
  }
}

/**
 * Search for client
 * @param page - Playwright page object
 * @param searchTerm - Search term
 */
export async function searchClient(
  page: Page,
  searchTerm: string
): Promise<void> {
  const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="Zoeken"]')
  await searchInput.fill(searchTerm)
  await page.waitForTimeout(500) // Wait for search to apply
}

/**
 * Open client detail/edit form
 * @param page - Playwright page object
 * @param clientName - Client name to open
 */
export async function openClientDetail(
  page: Page,
  clientName: string
): Promise<void> {
  const clientRow = await findClientByName(page, clientName)
  await clientRow.click()

  // Wait for detail modal/page to open
  await page.waitForSelector('[data-testid="client-detail"], [role="dialog"]', { timeout: 5000 })
}

/**
 * Delete client via API
 * @param page - Playwright page object
 * @param clientId - Client ID to delete
 */
export async function deleteClientViaAPI(
  page: Page,
  clientId: string
): Promise<void> {
  try {
    await page.request.delete(`/api/clients/${clientId}`)
  } catch (error) {
    console.warn(`Failed to delete client ${clientId}:`, error)
  }
}

/**
 * Delete client through UI
 * @param page - Playwright page object
 * @param clientName - Client name to delete
 */
export async function deleteClientUI(
  page: Page,
  clientName: string
): Promise<void> {
  // Open client detail
  await openClientDetail(page, clientName)

  // Click delete button
  await page.click('button:has-text("Delete"), button:has-text("Verwijderen")')

  // Wait for confirmation dialog
  await page.waitForSelector('[role="alertdialog"], [role="dialog"]', { timeout: 5000 })

  // Confirm deletion
  await page.click('button:has-text("Delete"), button:has-text("Verwijderen"), button:has-text("Confirm"), button:has-text("Bevestigen")')

  // Wait for dialog to close
  await page.waitForTimeout(1000)
}

/**
 * Cleanup clients via API
 * @param page - Playwright page object
 * @param clientIds - Array of client IDs to delete
 */
export async function cleanupClients(
  page: Page,
  clientIds: string[]
): Promise<void> {
  for (const id of clientIds) {
    await deleteClientViaAPI(page, id)
  }
}

/**
 * Get client details from API
 * @param page - Playwright page object
 * @param clientId - Client ID
 * @returns Client object
 */
export async function getClientDetails(
  page: Page,
  clientId: string
): Promise<any> {
  const response = await page.request.get(`/api/clients/${clientId}`)

  if (!response.ok()) {
    throw new Error(`Failed to get client details: ${response.status()}`)
  }

  return await response.json()
}

/**
 * Get client count from page
 * @param page - Playwright page object
 * @returns Number of visible clients
 */
export async function getClientCount(page: Page): Promise<number> {
  const rows = await page.locator('table tbody tr').count()
  return rows
}

/**
 * Create contact for client via API
 * @param page - Playwright page object
 * @param clientId - Client ID
 * @param contactData - Contact information
 * @returns Contact ID
 */
export async function createContactViaAPI(
  page: Page,
  clientId: string,
  contactData: {
    name: string
    email?: string
    phone?: string
    position?: string
    is_primary?: boolean
  }
): Promise<string> {
  const response = await page.request.post(`/api/clients/${clientId}/contacts`, {
    data: {
      name: contactData.name,
      email: contactData.email || '',
      phone: contactData.phone || '',
      position: contactData.position || '',
      is_primary: contactData.is_primary ?? false
    }
  })

  if (!response.ok()) {
    const error = await response.text()
    throw new Error(`Failed to create contact: ${response.status()} - ${error}`)
  }

  const result = await response.json()
  return result.contact?.id || result.id
}

/**
 * Create project for client via API
 * @param page - Playwright page object
 * @param clientId - Client ID
 * @param projectData - Project information
 * @returns Project ID
 */
export async function createProjectViaAPI(
  page: Page,
  clientId: string,
  projectData: {
    name: string
    description?: string
    status?: 'active' | 'completed' | 'on_hold'
    hourly_rate?: number
  }
): Promise<string> {
  const response = await page.request.post('/api/projects', {
    data: {
      client_id: clientId,
      name: projectData.name,
      description: projectData.description || '',
      status: projectData.status || 'active',
      hourly_rate: projectData.hourly_rate || 75
    }
  })

  if (!response.ok()) {
    const error = await response.text()
    throw new Error(`Failed to create project: ${response.status()} - ${error}`)
  }

  const result = await response.json()
  return result.project?.id || result.id
}

/**
 * Generate test client data with unique identifier
 * @param prefix - Optional prefix for client name
 * @returns ClientData object
 */
export function generateTestClientData(prefix: string = 'E2E Test Client'): ClientData {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 1000)

  return {
    name: `${prefix} ${timestamp}-${random}`,
    email: `test-${timestamp}-${random}@example.com`,
    phone: '+31612345678',
    vat_number: `NL${timestamp}B01`,
    country_code: 'NL',
    is_business: true,
    default_hourly_rate: 75,
    address: 'Test Street 123',
    city: 'Amsterdam',
    postal_code: '1012AB',
    website: `https://test-${timestamp}.example.com`,
    notes: 'E2E test client - safe to delete'
  }
}

/**
 * Generate multiple test clients with variations
 * @param count - Number of clients to generate
 * @param basePrefix - Base prefix for client names
 * @returns Array of ClientData objects
 */
export function generateMultipleTestClients(
  count: number,
  basePrefix: string = 'E2E Test Client'
): ClientData[] {
  const clients: ClientData[] = []

  for (let i = 0; i < count; i++) {
    clients.push(generateTestClientData(`${basePrefix} #${i + 1}`))
  }

  return clients
}

/**
 * Wait for client metrics to load (if on client page)
 * @param page - Playwright page object
 */
export async function waitForClientMetrics(page: Page): Promise<void> {
  // Wait for metric cards to appear
  await page.waitForSelector('[data-testid="metric-card"]', { timeout: 10000 }).catch(() => {
    // Metrics might not exist on all client pages
  })

  // Wait for skeleton loaders to disappear
  await page.waitForSelector('.animate-pulse', { state: 'hidden', timeout: 10000 }).catch(() => {
    // Skeleton might not exist
  })
}

/**
 * Filter clients by business type
 * @param page - Playwright page object
 * @param type - 'business' or 'individual'
 */
export async function filterByBusinessType(
  page: Page,
  type: 'business' | 'individual'
): Promise<void> {
  const typeMap = {
    business: ['Business', 'Bedrijf'],
    individual: ['Individual', 'Particulier', 'Private']
  }

  const typeTexts = typeMap[type] || []

  for (const text of typeTexts) {
    const button = page.locator(`button:has-text("${text}"), [role="tab"]:has-text("${text}")`)
    if (await button.isVisible({ timeout: 2000 }).catch(() => false)) {
      await button.click()
      await page.waitForTimeout(500)
      return
    }
  }

  throw new Error(`Business type filter "${type}" not found`)
}

/**
 * Sort clients by column
 * @param page - Playwright page object
 * @param column - Column name to sort by
 */
export async function sortByColumn(
  page: Page,
  column: string
): Promise<void> {
  const header = page.locator(`th:has-text("${column}")`)
  await header.click()
  await page.waitForTimeout(500)
}

/**
 * Get client list from page
 * @param page - Playwright page object
 * @returns Array of client names
 */
export async function getClientList(page: Page): Promise<string[]> {
  const rows = page.locator('table tbody tr')
  const count = await rows.count()
  const clients: string[] = []

  for (let i = 0; i < count; i++) {
    const nameCell = rows.nth(i).locator('td').first()
    const name = await nameCell.textContent()
    if (name) {
      clients.push(name.trim())
    }
  }

  return clients
}

/**
 * Clear client search
 * @param page - Playwright page object
 */
export async function clearClientSearch(page: Page): Promise<void> {
  const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="Zoeken"]')
  await searchInput.clear()
  await page.waitForTimeout(500)
}

/**
 * Navigate to clients page
 * @param page - Playwright page object
 */
export async function navigateToClientsPage(page: Page): Promise<void> {
  await page.goto('/dashboard/clients')
  await page.waitForLoadState('networkidle')
  await waitForClientList(page)
}

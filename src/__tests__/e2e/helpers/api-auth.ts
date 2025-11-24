import { Page } from '@playwright/test'

const DEFAULT_BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000'

function getCookieBaseDomain(): string {
  const baseUrl = process.env.COOKIE_DOMAIN ? `https://${process.env.COOKIE_DOMAIN}` : DEFAULT_BASE_URL
  try {
    return new URL(baseUrl).hostname
  } catch (error) {
    console.warn('Failed to parse cookie base domain, falling back to localhost:', error)
    return 'localhost'
  }
}

function getHostForPage(page: Page): string {
  try {
    const currentUrl = page.url()
    if (currentUrl && currentUrl.startsWith('http')) {
      return new URL(currentUrl).hostname
    }
  } catch (error) {
    console.warn('Failed to parse current page URL for cookie host:', error)
  }

  try {
    return new URL(DEFAULT_BASE_URL).hostname
  } catch (error) {
    console.warn('Failed to parse DEFAULT_BASE_URL, falling back to localhost:', error)
    return 'localhost'
  }
}

function doesCookieMatchHost(cookieDomain: string | undefined, host: string): boolean {
  if (!cookieDomain) {
    return true
  }

  const normalizedDomain = cookieDomain.startsWith('.')
    ? cookieDomain.slice(1)
    : cookieDomain

  if (host === normalizedDomain) {
    return true
  }

  return host.endsWith(`.${normalizedDomain}`)
}

export async function buildAuthHeaders(page: Page, includeContentType = true) {
  const cookies = await page.context().cookies()
  const host = getHostForPage(page)
  const fallbackDomain = getCookieBaseDomain()

  const filteredCookies = cookies
    .filter(cookie => doesCookieMatchHost(cookie.domain, host) || doesCookieMatchHost(cookie.domain, fallbackDomain))
    .map(cookie => `${cookie.name}=${cookie.value}`)

  const headers: Record<string, string> = {}

  if (includeContentType) {
    headers['Content-Type'] = 'application/json'
  }

  if (filteredCookies.length) {
    headers['Cookie'] = filteredCookies.join('; ')
  }

  return headers
}

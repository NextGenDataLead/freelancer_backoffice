
import { test, expect, Page } from '@playwright/test';
import { format } from 'date-fns';

test.describe('Uitgaven Page - E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', (msg) => {
      console.log(`[browser:${msg.type()}] ${msg.text()}`);
    });
    await loginToApplication(page);
    await page.goto('/dashboard/financieel-v2/uitgaven');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('text=All Expenses', { timeout: 15000 });
  });

  test('should create a new expense', async ({ page }) => {
    await page.click('button:has-text("New Expense")');

    const dialog = page.locator('[role="dialog"]');
    await dialog.waitFor({ state: 'visible' });
    await page.screenshot({ path: 'playwright-artifacts/new-expense-dialog.png' });
    // Take a snapshot to inspect the dialog content
    console.log(await page.content());

    await page.fill('input[name="supplier"]', 'Test Supplier');
    await page.fill('input[name="description"]', 'Test Expense Description');
    await page.fill('input[name="amount"]', '100');

    await page.click('button:has-text("Uitgave toevoegen")');

    await dialog.waitFor({ state: 'hidden' });

    await expect(page.locator('text=Test Supplier')).toBeVisible();
    await expect(page.locator('text=Test Expense Description')).toBeVisible();
  });
});

async function loginToApplication(page: Page) {
  console.log('🔐 Logging in to application...');

  const isLoggedIn = await checkIfLoggedIn(page);

  if (isLoggedIn) {
    console.log('✅ Already logged in');
    return;
  }

  console.log('🔄 Not logged in, proceeding with authentication...');

  await page.goto('/sign-in');
  console.log('🏠 Navigated to sign-in page');

  await page.waitForSelector('text=Sign in', { timeout: 10000 });
  console.log('📋 Sign-in form title visible');

  const emailInput = page.locator('input[type="email"], input[name="identifier"]').first();
  await emailInput.waitFor({ state: 'visible', timeout: 10000 });
  console.log('📧 Email input field found');

  await emailInput.fill('imre.iddatasolutions@gmail.com');
  console.log('✉️  Email filled');

  const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
  await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
  console.log('🔑 Password field found on same page');

  await passwordInput.fill('Qy192837465!?');
  console.log('🔑 Password filled');

  const continueButton = page.locator('button:has-text("Continue")').first();
  await continueButton.click();
  console.log('➡️  Clicked Continue');

  await page.waitForURL(/\/dashboard/, { timeout: 15000 });
  console.log('🎯 Redirected to dashboard');

  console.log('✅ Login complete and ready for tests');
}

async function checkIfLoggedIn(page: Page): Promise<boolean> {
  try {
    await page.goto('/dashboard', { timeout: 5000 });
    await page.waitForLoadState('networkidle', { timeout: 3000 });
    const url = page.url();
    return url.includes('/dashboard');
  } catch {
    return false;
  }
}

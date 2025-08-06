import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should allow a user to sign up', async ({ page }) => {
    await page.goto('/sign-up');
    await page.fill('input[name="email"]', 'imre.iddatasolutions@gmail.com');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/onboarding');
  });

  test('should allow a user to sign in', async ({ page }) => {
    await page.goto('/sign-in');
    await page.fill('input[name="email"]', 'imre.iddatasolutions@gmail.com');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should allow a user to sign out', async ({ page }) => {
    await page.goto('/dashboard');
    await page.click('button:has-text("Sign out")');
    await expect(page).toHaveURL('/');
  });
});

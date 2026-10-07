import { test, expect } from '@playwright/test';
test('Login to Dashboard', async ({ page }) => {
  await page.goto('https://example.com');
  await page.getByRole('textbox', { name: 'username' }).fill('admin');
  await page.getByRole('textbox', { name: 'password' }).fill('admin123');
  await page.getByRole('button', { name: 'login' }).click();
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});
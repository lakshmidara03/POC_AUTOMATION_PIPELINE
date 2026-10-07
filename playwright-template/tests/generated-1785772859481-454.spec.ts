import { test, expect } from '@playwright/test';
test('Login to Secure Area Dashboard', async ({ page }) => {
  await page.goto('https://the-internet.herokuapp.com/login');
  await page.getByLabel('Username').fill('tomsmith');
  await page.getByLabel('Password').fill('SuperSecretPassword!');
  await page.getByRole('button', { name: /login/i }).click();
  await page.waitForLoadState('networkidle');
  await expect(page.locator('h2')).toHaveText('Secure Area');
});
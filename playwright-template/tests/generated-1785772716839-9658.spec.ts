import { test, expect } from '@playwright/test';
test('Login to Secure Area Dashboard', async ({ page }) => {
  await page.goto('https://the-internet.herokuapp.com/login');
  await page.getByRole('textbox', { name: 'Username', exact: true }).fill('tomsmith');
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill('SuperSecretPassword!');
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { name: 'Secure Area', exact: true })).toBeVisible();
});
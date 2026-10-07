import { test, expect } from '@playwright/test';

test('description', async ({ page }) => {
  console.log('[STEP_START] Load the login page');
  await page.goto('https://the-internet.herokuapp.com/login', { waitUntil: 'networkidle' });
  console.log('[STEP_DONE] Load the login page');

  console.log('[STEP_START] Enter the username');
  await page.fill('input[id="username"]', 'tomsmith');
  console.log('[STEP_DONE] Enter the username');

  console.log('[STEP_START] Enter the password');
  await page.fill('input[id="password"]', 'SuperSecretPassword!');
  console.log('[STEP_DONE] Enter the password');

  console.log('[STEP_START] Click the login button');
  await page.click('button[type="submit"]');
  console.log('[STEP_DONE] Click the login button');

  console.log('[STEP_START] Verify the secure area dashboard is displayed');
  await expect(page.getByText('Secure Area')).toBeVisible();
  console.log('[STEP_DONE] Verify the secure area dashboard is displayed');
});
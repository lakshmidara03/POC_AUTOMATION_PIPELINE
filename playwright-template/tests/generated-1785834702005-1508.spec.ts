import { test, expect } from '@playwright/test';

test('login to the-internet.herokuapp.com', async ({ page }) => {
  console.log('[STEP_START] Load the login page');
  await page.goto('https://the-internet.herokuapp.com/login', { waitUntil: 'networkidle' });
  console.log('[STEP_DONE] Load the login page');

  console.log('[STEP_START] Enter the username');
  await page.locator('input[id="username"]').fill('tomsmith');
  console.log('[STEP_DONE] Enter the username');

  console.log('[STEP_START] Enter the password');
  await page.locator('input[id="password"]').fill('SuperSecretPassword!');
  console.log('[STEP_DONE] Enter the password');

  console.log('[STEP_START] Click the login button');
  await page.locator('button[type="submit"]').click();
  console.log('[STEP_DONE] Click the login button');

  console.log('[STEP_START] Verify the secure area dashboard is displayed');
  await expect(page.locator('h2')).toContainText('Secure Area');
  console.log('[STEP_DONE] Verify the secure area dashboard is displayed');
});
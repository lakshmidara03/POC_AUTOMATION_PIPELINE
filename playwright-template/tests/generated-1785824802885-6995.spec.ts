import { test, expect } from '@playwright/test';

test('login to the-internet.herokuapp.com', async ({ page }) => {
  console.log('[STEP_START] Load the login page');
  await page.goto('https://the-internet.herokuapp.com/login', { waitUntil: 'networkidle' });
  console.log('[STEP_DONE] Load the login page');

  console.log('[STEP_START] Enter username');
  await page.fill('input[id="username"]', 'tomsmith');
  console.log('[STEP_DONE] Enter username');

  console.log('[STEP_START] Enter password');
  await page.fill('input[id="password"]', 'SuperSecretPassword!');
  console.log('[STEP_DONE] Enter password');

  console.log('[STEP_START] Click the login button');
  await page.click('button[type="submit"]');
  console.log('[STEP_DONE] Click the login button');

  console.log('[STEP_START] Verify secure area dashboard is displayed');
  await expect(page.getByText('Secure Area')).toBeVisible();
  console.log('[STEP_DONE] Verify secure area dashboard is displayed');
});
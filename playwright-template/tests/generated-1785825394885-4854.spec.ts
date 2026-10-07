import { test, expect } from '@playwright/test';

test('Login to Swag Labs and verify inventory catalog header title', async ({ page }) => {
  console.log('[STEP_START] Open https://www.saucedemo.com/ in browser');
  await page.goto('https://www.saucedemo.com/', { waitUntil: 'networkidle' });
  console.log('[STEP_DONE] Open https://www.saucedemo.com/ in browser');

  console.log('[STEP_START] Enter username standard_user');
  await page.locator('input[id="user-name"]').fill('standard_user');
  console.log('[STEP_DONE] Enter username standard_user');

  console.log('[STEP_START] Enter password secret_sauce');
  await page.locator('input[id="password"]').fill('secret_sauce');
  console.log('[STEP_DONE] Enter password secret_sauce');

  console.log('[STEP_START] Click login button');
  await page.locator('input[id="login-button"]').click();
  console.log('[STEP_DONE] Click login button');

  console.log('[STEP_START] Verify Swag Labs inventory catalog header title is displayed');
  await expect(page.locator('div[class="header_secondary_container"]')).toContainText('Products');
  console.log('[STEP_DONE] Verify Swag Labs inventory catalog header title is displayed');
});
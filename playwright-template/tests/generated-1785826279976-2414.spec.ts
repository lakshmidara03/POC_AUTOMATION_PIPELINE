import { test, expect } from '@playwright/test';

test('Login to Swag Labs and verify inventory catalog header title', async ({ page }) => {
  console.log('[STEP_START] Load https://www.saucedemo.com/ URL in the browser');
  await page.goto('https://www.saucedemo.com/', { waitUntil: 'networkidle' });
  console.log('[STEP_DONE] Load https://www.saucedemo.com/ URL in the browser');

  console.log('[STEP_START] Enter username standard_user in the username field');
  await page.locator('input[id="user-name"]').fill('standard_user');
  console.log('[STEP_DONE] Enter username standard_user in the username field');

  console.log('[STEP_START] Enter password secret_sauce in the password field');
  await page.locator('input[id="password"]').fill('secret_sauce');
  console.log('[STEP_DONE] Enter password secret_sauce in the password field');

  console.log('[STEP_START] Click on the login button');
  await page.locator('input[id="login-button"]').click();
  console.log('[STEP_DONE] Click on the login button');

  console.log('[STEP_START] Verify Swag Labs inventory catalog header title is displayed');
  await expect(page.locator('div[class="header_secondary_container"]')).toContainText('Products');
  console.log('[STEP_DONE] Verify Swag Labs inventory catalog header title is displayed');
});
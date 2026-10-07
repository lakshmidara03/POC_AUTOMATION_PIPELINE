import { test, expect } from '@playwright/test';

test('Login to keka', async ({ page }) => {
  console.log('[STEP_START] Load https://app.keka.com/Account/MobileOTPLogin?returnUrl=%2F');
  await page.goto('https://app.keka.com/Account/MobileOTPLogin?returnUrl=%2F', { waitUntil: 'networkidle' });
  console.log('[STEP_DONE] Load https://app.keka.com/Account/MobileOTPLogin?returnUrl=%2F');

  console.log('[STEP_START] Enter number: 8555947924');
  await page.locator('input[id="mobileNumber"]').fill('8555947924');
  console.log('[STEP_DONE] Enter number: 8555947924');

  console.log('[STEP_START] Wait for user to enter OTP and captcha');
  // assuming user will manually enter otp and captcha
  console.log('[STEP_DONE] Wait for user to enter OTP and captcha');

  console.log('[STEP_START] Click on login');
  await page.locator('button[type="submit"]').click();
  console.log('[STEP_DONE] Click on login');

  console.log('[STEP_START] Verify secure area dashboard is displayed');
  await expect(page.locator('text="Secure Area"')).toBeVisible();
  console.log('[STEP_DONE] Verify secure area dashboard is displayed');
});
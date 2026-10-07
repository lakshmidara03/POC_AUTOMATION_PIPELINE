import { test, expect } from '@playwright/test';

test('description', async ({ page }) => {
  console.log('[STEP_START] go to https://app.keka.com/Account/MobileOTPLogin?returnUrl=%2F');
  await page.goto('https://app.keka.com/Account/MobileOTPLogin?returnUrl=%2F', { waitUntil: 'networkidle' });
  console.log('[STEP_DONE] go to https://app.keka.com/Account/MobileOTPLogin?returnUrl=%2F');

  console.log('[STEP_START] enter the mobile number: 8555947924');
  await page.locator('input[id="mobileNumber"]').fill('8555947924');
  console.log('[STEP_DONE] enter the mobile number: 8555947924');

  console.log('[STEP_START] click the send otp');
  await page.locator('button[id="sendOtp"]').click();
  console.log('[STEP_DONE] click the send otp');

  console.log('[STEP_START] wait till user enter the otp and the captcha');
  await page.waitForTimeout(30000);
  console.log('[STEP_DONE] wait till user enter the otp and the captcha');

  console.log('[STEP_START] click on the login');
  await page.locator('button[id="login"]').click();
  console.log('[STEP_DONE] click on the login');

  console.log('[STEP_START] wait for 1 minute on the home page');
  await page.waitForTimeout(60000);
  console.log('[STEP_DONE] wait for 1 minute on the home page');
});
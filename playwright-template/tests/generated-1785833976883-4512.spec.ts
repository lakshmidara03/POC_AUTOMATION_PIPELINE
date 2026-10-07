import { test, expect } from '@playwright/test';

test('Login to practice test automation', async ({ page }) => {
  console.log('[STEP_START] Open https://practicetestautomation.com/practice-test-login/');
  await page.goto('https://practicetestautomation.com/practice-test-login/', { waitUntil: 'networkidle' });
  console.log('[STEP_DONE] Open https://practicetestautomation.com/practice-test-login/');

  console.log('[STEP_START] Enter username');
  await page.locator('input#username').fill('student');
  console.log('[STEP_DONE] Enter username');

  console.log('[STEP_START] Enter password');
  await page.locator('input#password').fill('Password123');
  console.log('[STEP_DONE] Enter password');

  console.log('[STEP_START] Click login button');
  await page.locator('button#submit').click();
  console.log('[STEP_DONE] Click login button');

  console.log('[STEP_START] Verify page redirects to successfully logged in page');
  await expect(page.locator('h2')).toContainText('You are logged in');
  console.log('[STEP_DONE] Verify page redirects to successfully logged in page');
});
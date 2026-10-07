import { test, expect } from '@playwright/test';

test('Login to practice test automation', async ({ page }) => {
  console.log('[STEP_START] Open https://practicetestautomation.com/practice-test-login/');
  await page.goto('https://practicetestautomation.com/practice-test-login/', { waitUntil: 'networkidle' });
  console.log('[STEP_DONE] Open https://practicetestautomation.com/practice-test-login/');

  console.log('[STEP_START] Enter username: student');
  await page.fill('input[name="username"]', 'student');
  console.log('[STEP_DONE] Enter username: student');

  console.log('[STEP_START] Enter password: Password123');
  await page.fill('input[name="password"]', 'Password123');
  console.log('[STEP_DONE] Enter password: Password123');

  console.log('[STEP_START] Click login button');
  await page.click('button[type="submit"]');
  console.log('[STEP_DONE] Click login button');

  console.log('[STEP_START] Verify page redirects to successfully logged in page');
  await expect(page).toContainText('You are logged in');
  console.log('[STEP_DONE] Verify page redirects to successfully logged in page');
});
import { test, expect } from '@playwright/test';
test('screenshot test', async ({ page }) => { await page.goto('https://example.com'); expect(true).toBe(false); });
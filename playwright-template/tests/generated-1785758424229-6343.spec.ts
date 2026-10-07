import { test, expect } from '@playwright/test';
test('failing spec', async () => { expect(true).toBe(false); });
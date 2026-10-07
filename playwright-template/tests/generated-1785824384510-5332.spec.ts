
   import { chromium } from 'playwright';

   (async () => {

      console.log('[STEP_START] Launch browser');

      const browser = await chromium.launch({ headless: false, slowMo: 250 });

      console.log('[STEP_DONE] Launch browser');

      

      console.log('[STEP_START] Navigate to login page');

      const page = await browser.newPage();

      await page.goto('https://the-internet.herokuapp.com/login');

      console.log('[STEP_DONE] Navigate to login page');

      

      console.log('[STEP_START] Enter username');

      await page.fill('input[id="username"]', 'tomsmith');

      console.log('[STEP_DONE] Enter username');

      

      console.log('[STEP_START] Enter password');

      await page.fill('input[id="password"]', 'SuperSecretPassword!');

      console.log('[STEP_DONE] Enter password');

      

      console.log('[STEP_START] Click login button');

      await page.click('button[type="submit"]');

      console.log('[STEP_DONE] Click login button');

      

      console.log('[STEP_START] Verify secure area dashboard');

      await page.waitForSelector('h2', { timeout: 10000 });

      const heading = await page.textContent('h2');

      if (heading === 'Secure Area') {

         console.log('Secure area dashboard is displayed');

      } else {

         console.log('Secure area dashboard is not displayed');

      }

      console.log('[STEP_DONE] Verify secure area dashboard');

      

      await browser.close();

   })();

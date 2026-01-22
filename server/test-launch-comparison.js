const { chromium } = require('playwright');
const settingsService = require('./settings-service');

async function testLaunchComparison() {
  const sessionCookie = settingsService.getSpotifySessionCookie();
  const trackId = '3n3Ppam7vgaVa1iaRUc9Lp';

  // Test 1: Simple launch (like working test)
  console.log('===TEST 1: Simple launch ===');
  let browser1 = await chromium.launch({ headless: true });
  let context1 = await browser1.newContext({
    locale: 'en-US',
    timezoneId: 'America/New_York',
  });
  await context1.addCookies([{
    name: 'sp_dc',
    value: sessionCookie,
    domain: '.spotify.com',
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'Lax'
  }]);
  let page1 = await context1.newPage();
  await page1.goto(`https://open.spotify.com/track/${trackId}`, { waitUntil: 'networkidle', timeout: 15000 });
  await page1.waitForTimeout(3000);
  const buttons1 = await page1.$$('button');
  console.log(`Buttons found: ${buttons1.length}`);
  await browser1.close();

  // Test 2: With extra args (like failing scraper)
  console.log('\n=== TEST 2: With extra args ===');
  let browser2 = await chromium.launch({
    headless: true,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--no-sandbox',
    ]
  });
  let context2 = await browser2.newContext({
    locale: 'en-US',
    timezoneId: 'America/New_York',
  });
  await context2.addCookies([{
    name: 'sp_dc',
    value: sessionCookie,
    domain: '.spotify.com',
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'Lax'
  }]);
  let page2 = await context2.newPage();
  await page2.goto(`https://open.spotify.com/track/${trackId}`, { waitUntil: 'networkidle', timeout: 15000 });
  await page2.waitForTimeout(3000);
  const buttons2 = await page2.$$('button');
  console.log(`Buttons found: ${buttons2.length}`);
  await page2.screenshot({ path: 'test2-page.png' });
  await browser2.close();
}

testLaunchComparison();

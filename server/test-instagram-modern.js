const { chromium } = require('playwright');

async function testModernInstagramScraping(username) {
  console.log(`\n=== Testing Modern Instagram Scraping ===`);
  console.log(`Username: ${username}\n`);

  const browser = await chromium.launch({ headless: false });

  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 720 }
    });

    const page = await context.newPage();

    console.log('Loading page...');
    await page.goto(`https://www.instagram.com/${username}/`, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Wait for content to load
    await page.waitForTimeout(3000);

    console.log('\n--- Method 1: Using page.evaluate to access window data ---');

    const windowData = await page.evaluate(() => {
      // Try to find any global data objects
      const result = {
        hasRequire: typeof window.require !== 'undefined',
        hasDefine: typeof window.__d !== 'undefined',
      };

      // Try to extract data from require cache if it exists
      if (window.require && window.require.s) {
        try {
          const moduleIds = Object.keys(window.require.s);
          result.moduleCount = moduleIds.length;

          // Look for data in modules
          for (const moduleId of moduleIds) {
            try {
              const mod = window.require(moduleId);
              const modStr = JSON.stringify(mod);
              if (modStr && modStr.includes('taken_at') && modStr.includes('code')) {
                result.foundInModule = moduleId;
                result.moduleData = mod;
                break;
              }
            } catch (e) {
              // Module not available
            }
          }
        } catch (e) {
          result.requireError = e.message;
        }
      }

      return result;
    });

    console.log('Window data check:', JSON.stringify(windowData, null, 2).substring(0, 500));

    console.log('\n--- Method 2: Intercepting GraphQL responses ---');

    // Try clicking on a post to see if it loads more data
    const firstPostLink = await page.$('a[href*="/p/"], a[href*="/reel/"]');

    if (firstPostLink) {
      console.log('✅ Found post link');

      const href = await firstPostLink.getAttribute('href');
      console.log(`Post URL: https://www.instagram.com${href}`);

      // Extract shortcode from URL
      const shortcodeMatch = href.match(/\/(p|reel)\/([^\/]+)/);
      if (shortcodeMatch) {
        const shortcode = shortcodeMatch[2];
        console.log(`Shortcode: ${shortcode}`);

        // The post exists, so Instagram must be sending this data somehow
        console.log('\n✅ We can see posts in the DOM, which means Instagram IS sending the data');
        console.log('But the data structure has changed from the old embedded JSON format');
      }
    } else {
      console.log('❌ No post links found in DOM');
    }

    console.log('\n--- Method 3: Check for any article/post containers ---');

    const articles = await page.$$('article');
    console.log(`Found ${articles.length} <article> elements`);

    // Try to find any time elements or timestamps in the DOM
    const allText = await page.evaluate(() => {
      return document.body.innerText;
    });

    // Look for relative time indicators
    const relativeTimeRegex = /(\\d+)\\s*(second|minute|hour|day|week|month|year)s?\\s*ago/gi;
    const matches = allText.match(relativeTimeRegex);

    if (matches) {
      console.log(`\nFound relative time indicators: ${matches.slice(0, 3).join(', ')}`);
    }

    console.log('\n--- Method 4: Try GraphQL query approach ---');
    console.log('Instagram now requires either:');
    console.log('  1. Being logged in (cookies)');
    console.log('  2. Using their official API');
    console.log('  3. Using mobile app endpoints (requires auth)');
    console.log('  4. Scraping visible post links and checking each individually');

    console.log('\n--- Conclusion ---');
    console.log('Instagram has likely moved away from embedding full post data');
    console.log('for logged-out users. Possible next steps:');
    console.log('  1. ✅ Check if logged-IN scraping works (requires cookies)');
    console.log('  2. ❌ Use official API (requires app review)');
    console.log('  3. ⚠️  Scrape post links and check latest post individually');
    console.log('  4. ⚠️  Accept "activity detected" as boolean only (posts exist/don\'t exist)');

    await browser.close();

  } catch (error) {
    console.error('Error:', error.message);
    await browser.close();
  }
}

// Test with both accounts
async function testBoth() {
  await testModernInstagramScraping('officialstellus');
  console.log('\n\n' + '='.repeat(80) + '\n\n');
  await testModernInstagramScraping('radiohead');
}

testBoth();

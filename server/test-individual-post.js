const { chromium } = require('playwright');

async function getLatestPostDate(username) {
  console.log(`\n=== Getting Latest Post Date for @${username} ===\n`);

  const browser = await chromium.launch({ headless: false });

  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 720 }
    });

    const page = await context.newPage();

    // Step 1: Load profile and get first post URL
    console.log('Step 1: Loading profile...');
    await page.goto(`https://www.instagram.com/${username}/`, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    await page.waitForTimeout(2000);

    // Find first post link
    const firstPostLink = await page.$('a[href*="/p/"], a[href*="/reel/"]');

    if (!firstPostLink) {
      console.log('❌ No posts found on profile');
      await browser.close();
      return { status: 'no_posts' };
    }

    const href = await firstPostLink.getAttribute('href');
    const fullUrl = `https://www.instagram.com${href}`;
    console.log(`✅ Found latest post: ${fullUrl}`);

    // Step 2: Navigate to the post page
    console.log('\nStep 2: Loading post page...');
    await page.goto(fullUrl, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    await page.waitForTimeout(2000);

    // Step 3: Try to find timestamp on post page
    console.log('\nStep 3: Searching for timestamp...\n');

    // Method 1: Look for <time> element
    const timeElement = await page.$('time');
    if (timeElement) {
      const datetime = await timeElement.getAttribute('datetime');
      if (datetime) {
        const date = new Date(datetime);
        console.log('✅ Found timestamp in <time> element!');
        console.log(`  datetime attribute: ${datetime}`);
        console.log(`  Parsed date: ${date.toISOString()}`);
        console.log(`  Human readable: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`);

        await browser.close();
        return {
          status: 'found',
          latestPostDate: date.toISOString(),
          postUrl: fullUrl,
          method: 'time_element'
        };
      }
    }

    // Method 2: Look in meta tags
    const metaTimestamp = await page.$eval('meta[property="article:published_time"]',
      el => el.getAttribute('content')
    ).catch(() => null);

    if (metaTimestamp) {
      const date = new Date(metaTimestamp);
      console.log('✅ Found timestamp in meta tag!');
      console.log(`  Meta content: ${metaTimestamp}`);
      console.log(`  Parsed date: ${date.toISOString()}`);

      await browser.close();
      return {
        status: 'found',
        latestPostDate: date.toISOString(),
        postUrl: fullUrl,
        method: 'meta_tag'
      };
    }

    // Method 3: Look in JSON-LD structured data
    const jsonLd = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
      return scripts.map(s => {
        try {
          return JSON.parse(s.textContent);
        } catch (e) {
          return null;
        }
      }).filter(Boolean);
    });

    if (jsonLd.length > 0) {
      console.log(`Found ${jsonLd.length} JSON-LD blocks`);
      for (const data of jsonLd) {
        if (data.datePublished || data.uploadDate) {
          const dateStr = data.datePublished || data.uploadDate;
          const date = new Date(dateStr);
          console.log('✅ Found timestamp in JSON-LD!');
          console.log(`  Date: ${date.toISOString()}`);

          await browser.close();
          return {
            status: 'found',
            latestPostDate: date.toISOString(),
            postUrl: fullUrl,
            method: 'json_ld'
          };
        }
      }
    }

    // Method 4: Look in page scripts for embedded data
    const pageData = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script:not([src])'));
      for (const script of scripts) {
        const text = script.textContent;
        if (text.includes('taken_at_timestamp') || text.includes('taken_at')) {
          // Try to extract timestamp
          const match = text.match(/taken_at[\"']?\s*:\s*(\d{10})/);
          if (match) {
            return { timestamp: parseInt(match[1]), raw: text.substring(0, 200) };
          }
        }
      }
      return null;
    });

    if (pageData) {
      const date = new Date(pageData.timestamp * 1000);
      console.log('✅ Found timestamp in page script!');
      console.log(`  Unix timestamp: ${pageData.timestamp}`);
      console.log(`  Date: ${date.toISOString()}`);
      console.log(`  Preview: ${pageData.raw}...`);

      await browser.close();
      return {
        status: 'found',
        latestPostDate: date.toISOString(),
        postUrl: fullUrl,
        method: 'page_script'
      };
    }

    console.log('❌ Could not find timestamp in post page');
    await browser.close();
    return { status: 'not_found', postUrl: fullUrl };

  } catch (error) {
    console.error('Error:', error.message);
    await browser.close();
    return { status: 'error', error: error.message };
  }
}

// Test both accounts
async function testBoth() {
  const result1 = await getLatestPostDate('officialstellus');
  console.log('\n📊 Result for officialstellus:');
  console.log(JSON.stringify(result1, null, 2));

  console.log('\n' + '='.repeat(80) + '\n');

  const result2 = await getLatestPostDate('radiohead');
  console.log('\n📊 Result for radiohead:');
  console.log(JSON.stringify(result2, null, 2));
}

testBoth();

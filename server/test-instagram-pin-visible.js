const { chromium } = require('playwright');

async function getLatestInstagramPost(username) {
  console.log(`\n=== Getting Latest Instagram Post for @${username} ===\n`);

  const browser = await chromium.launch({ headless: false });

  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 720 }
    });

    const page = await context.newPage();

    // Step 1: Load profile
    console.log('Step 1: Loading profile...');
    await page.goto(`https://www.instagram.com/${username}/`, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    await page.waitForTimeout(2000);

    // Step 2: Find posts and check which are actually pinned (visible pin icon)
    console.log('\nStep 2: Analyzing posts for pin icons...');

    const postAnalysis = await page.evaluate(() => {
      const allLinks = Array.from(document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]'));

      return allLinks.map((link, index) => {
        const href = link.getAttribute('href');

        // Find the container for this post
        const container = link.closest('article') || link.closest('div[class]');

        // Look for the pin icon SVG
        const pinIcon = container?.querySelector('svg[aria-label="Pinned post icon"]');

        // Check if pin icon exists AND is visible (not display:none, not opacity:0, etc.)
        let isPinned = false;
        if (pinIcon) {
          const style = window.getComputedStyle(pinIcon);
          const isVisible =
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            parseFloat(style.opacity) > 0 &&
            pinIcon.offsetWidth > 0 &&
            pinIcon.offsetHeight > 0;

          isPinned = isVisible;
        }

        return {
          index,
          href,
          isPinned,
          hasPinIconInDOM: !!pinIcon
        };
      });
    });

    console.log(`Found ${postAnalysis.length} total posts\n`);

    const pinnedPosts = postAnalysis.filter(p => p.isPinned);
    const unpinnedPosts = postAnalysis.filter(p => !p.isPinned);

    console.log(`📌 ${pinnedPosts.length} pinned posts`);
    console.log(`✅ ${unpinnedPosts.length} unpinned posts\n`);

    // Show first 6 posts with their status
    postAnalysis.slice(0, 6).forEach(post => {
      const marker = post.isPinned ? '📌 PINNED' : '   Regular';
      console.log(`${marker} - Post ${post.index + 1}: ${post.href}`);
    });

    // Find first unpinned post
    const firstUnpinned = unpinnedPosts[0];

    if (!firstUnpinned) {
      console.log('\n❌ No unpinned posts found');
      await browser.close();
      return {
        status: 'no_unpinned_posts',
        totalPosts: postAnalysis.length,
        pinnedCount: pinnedPosts.length
      };
    }

    const postUrl = `https://www.instagram.com${firstUnpinned.href}`;
    console.log(`\n✅ First unpinned post: ${postUrl}`);

    // Step 3: Get timestamp from the unpinned post
    console.log('\nStep 3: Getting timestamp...');
    await page.goto(postUrl, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    await page.waitForTimeout(1500);

    const timeElement = await page.$('time');
    if (!timeElement) {
      console.log('❌ No time element found');
      await browser.close();
      return { status: 'no_timestamp_found', postUrl };
    }

    const datetime = await timeElement.getAttribute('datetime');
    if (!datetime) {
      console.log('❌ Time element has no datetime attribute');
      await browser.close();
      return { status: 'no_datetime_attribute', postUrl };
    }

    const date = new Date(datetime);

    console.log(`\n✅ SUCCESS!`);
    console.log(`  Timestamp: ${datetime}`);
    console.log(`  Date: ${date.toISOString()}`);
    console.log(`  Human: ${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`);
    console.log(`  Post URL: ${postUrl}`);

    await browser.close();

    return {
      status: 'found',
      latestPostDate: date.toISOString(),
      latestPostUrl: postUrl,
      pinnedPostsSkipped: pinnedPosts.length,
      totalPosts: postAnalysis.length,
      postPosition: firstUnpinned.index + 1
    };

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    await browser.close();
    return { status: 'error', error: error.message };
  }
}

// Test both accounts
async function testBoth() {
  const result1 = await getLatestInstagramPost('officialstellus');
  console.log('\n' + '='.repeat(80));
  console.log('📊 Final Result for officialstellus:');
  console.log(JSON.stringify(result1, null, 2));

  console.log('\n\n' + '='.repeat(80) + '\n');

  const result2 = await getLatestInstagramPost('radiohead');
  console.log('\n' + '='.repeat(80));
  console.log('📊 Final Result for radiohead:');
  console.log(JSON.stringify(result2, null, 2));
}

testBoth();

const { chromium } = require('playwright');

async function getLatestPostDate(username) {
  console.log(`\n=== Getting Latest Post Date for @${username} (Skipping Pinned) ===\n`);

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

    await page.waitForTimeout(3000);

    // Step 2: Find all post links and identify pinned posts
    console.log('\nStep 2: Finding posts and checking for pinned...');

    const postData = await page.evaluate(() => {
      // Find all post/reel links
      const links = Array.from(document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]'));

      return links.map((link, index) => {
        // Check if this post has a "pinned" indicator
        // Instagram typically shows a pin icon or label near pinned posts
        const parent = link.closest('article') || link.closest('div[role="button"]') || link.parentElement;

        // Look for pin indicators (SVG, text, aria-label, etc.)
        const hasPinIcon = parent?.querySelector('svg[aria-label*="Pinned"], svg[aria-label*="pinned"]') !== null;
        const hasPinText = parent?.innerText?.toLowerCase().includes('pinned') || false;
        const hasPinAria = parent?.querySelector('[aria-label*="Pinned"], [aria-label*="pinned"]') !== null;

        const isPinned = hasPinIcon || hasPinText || hasPinAria;

        return {
          href: link.getAttribute('href'),
          index,
          isPinned,
          // Debug info
          parentHTML: parent?.outerHTML?.substring(0, 200) || 'N/A'
        };
      });
    });

    console.log(`Found ${postData.length} posts total`);

    // Show pinned status
    postData.slice(0, 5).forEach(post => {
      console.log(`\nPost ${post.index + 1}:`);
      console.log(`  URL: ${post.href}`);
      console.log(`  Pinned: ${post.isPinned ? '📌 YES' : '❌ NO'}`);
    });

    // Filter out pinned posts
    const unpinnedPosts = postData.filter(p => !p.isPinned);
    console.log(`\n✅ ${unpinnedPosts.length} unpinned posts`);
    console.log(`📌 ${postData.length - unpinnedPosts.length} pinned posts (skipped)`);

    if (unpinnedPosts.length === 0) {
      console.log('\n❌ No unpinned posts found');
      await browser.close();
      return { status: 'no_unpinned_posts' };
    }

    // Get the first unpinned post
    const firstUnpinnedPost = unpinnedPosts[0];
    const fullUrl = `https://www.instagram.com${firstUnpinnedPost.href}`;
    console.log(`\n✅ Latest chronological post: ${fullUrl}`);

    // Step 3: Navigate to the post
    console.log('\nStep 3: Loading post page...');
    await page.goto(fullUrl, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    await page.waitForTimeout(2000);

    // Step 4: Extract timestamp
    console.log('\nStep 4: Extracting timestamp...\n');

    const timeElement = await page.$('time');
    if (timeElement) {
      const datetime = await timeElement.getAttribute('datetime');
      if (datetime) {
        const date = new Date(datetime);
        console.log('✅ SUCCESS!');
        console.log(`  ISO timestamp: ${datetime}`);
        console.log(`  Parsed date: ${date.toISOString()}`);
        console.log(`  Human readable: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`);

        await browser.close();
        return {
          status: 'found',
          latestPostDate: date.toISOString(),
          postUrl: fullUrl,
          skippedPinnedCount: postData.length - unpinnedPosts.length,
          method: 'time_element_unpinned'
        };
      }
    }

    console.log('❌ Could not find timestamp');
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
  console.log('\n📊 Final Result for officialstellus:');
  console.log(JSON.stringify(result1, null, 2));

  console.log('\n' + '='.repeat(80) + '\n');

  const result2 = await getLatestPostDate('radiohead');
  console.log('\n📊 Final Result for radiohead:');
  console.log(JSON.stringify(result2, null, 2));
}

testBoth();

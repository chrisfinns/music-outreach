const { chromium } = require('playwright');

async function getLatestInstagramPost(username) {
  console.log(`\n=== Getting Latest Instagram Post for @${username} (Optimized) ===\n`);

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

    // Step 2: Get post links
    console.log('\nStep 2: Finding posts...');

    const postLinks = await page.evaluate(() => {
      const allLinks = Array.from(document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]'));
      return allLinks.map(link => link.getAttribute('href'));
    });

    if (postLinks.length === 0) {
      console.log('❌ No posts found');
      await browser.close();
      return { status: 'no_posts' };
    }

    console.log(`Found ${postLinks.length} posts`);

    // Strategy: Check up to 4 posts maximum
    // - If post 1, 2, or 3 are within date filter → use that (handles 0-2 pins)
    // - If none match, check post 4 (guaranteed unpinned, handles 3 pins)
    // This way we NEVER check more than 4 posts

    const MAX_POSTS_TO_CHECK = 4;
    const postsToCheck = postLinks.slice(0, MAX_POSTS_TO_CHECK);

    console.log(`\nChecking up to ${postsToCheck.length} posts...`);

    for (let i = 0; i < postsToCheck.length; i++) {
      const postHref = postsToCheck[i];
      const postUrl = `https://www.instagram.com${postHref}`;

      console.log(`\nPost ${i + 1}: ${postHref}`);

      // Navigate to post
      await page.goto(postUrl, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      await page.waitForTimeout(1000);

      // Get timestamp
      const timeElement = await page.$('time');
      if (!timeElement) {
        console.log('  ⚠️  No time element');
        continue;
      }

      const datetime = await timeElement.getAttribute('datetime');
      if (!datetime) {
        console.log('  ⚠️  No datetime attribute');
        continue;
      }

      const date = new Date(datetime);
      console.log(`  📅 Date: ${date.toISOString()}`);
      console.log(`  📅 Human: ${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`);

      // TODO: Check if date is within filter parameters here
      // For now, we'll just accept the first valid timestamp from the first 4 posts

      // If this is the 4th post, it's guaranteed unpinned, so use it
      if (i === 3) {
        console.log(`\n✅ Using post ${i + 1} (4th post = guaranteed unpinned)`);

        await browser.close();
        return {
          status: 'found',
          latestPostDate: date.toISOString(),
          latestPostUrl: postUrl,
          postPosition: i + 1,
          note: '4th post checked (guaranteed unpinned)'
        };
      }

      // For posts 1-3, we could be checking pinned or unpinned posts
      // If date matches filter (TODO), use it
      // For this test, we'll just use the first one
      console.log(`\n✅ Using post ${i + 1} (assuming no date filter applied)`);

      await browser.close();
      return {
        status: 'found',
        latestPostDate: date.toISOString(),
        latestPostUrl: postUrl,
        postPosition: i + 1,
        note: `Post ${i + 1} used (may be pinned)`
      };
    }

    console.log('\n❌ No valid timestamps found in first 4 posts');
    await browser.close();
    return { status: 'no_timestamps_found' };

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

const { chromium } = require('playwright');

async function getLatestPostDateReliable(username, maxPostsToCheck = 5) {
  console.log(`\n=== Getting Latest Post Date for @${username} (Reliable Method) ===\n`);
  console.log(`Strategy: Check first ${maxPostsToCheck} posts and find the most recent by timestamp\n`);

  const browser = await chromium.launch({ headless: false });

  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 720 }
    });

    const page = await context.newPage();

    // Step 1: Load profile and get post links
    console.log('Step 1: Loading profile...');
    await page.goto(`https://www.instagram.com/${username}/`, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    await page.waitForTimeout(2000);

    const postLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]'));
      return links.map(link => link.getAttribute('href'));
    });

    if (postLinks.length === 0) {
      console.log('❌ No posts found');
      await browser.close();
      return { status: 'no_posts' };
    }

    console.log(`✅ Found ${postLinks.length} posts on profile`);
    console.log(`Will check first ${Math.min(maxPostsToCheck, postLinks.length)} posts\n`);

    // Step 2: Visit each post and extract timestamp
    const postsWithTimestamps = [];

    for (let i = 0; i < Math.min(maxPostsToCheck, postLinks.length); i++) {
      const postHref = postLinks[i];
      const fullUrl = `https://www.instagram.com${postHref}`;

      console.log(`Checking post ${i + 1}/${Math.min(maxPostsToCheck, postLinks.length)}: ${postHref}`);

      try {
        await page.goto(fullUrl, {
          waitUntil: 'networkidle',
          timeout: 30000
        });

        await page.waitForTimeout(1500);

        // Extract timestamp
        const timeElement = await page.$('time');
        if (timeElement) {
          const datetime = await timeElement.getAttribute('datetime');
          if (datetime) {
            const date = new Date(datetime);
            console.log(`  ✅ Timestamp: ${datetime} (${date.toLocaleDateString()})`);

            postsWithTimestamps.push({
              url: fullUrl,
              href: postHref,
              datetime: datetime,
              timestamp: date.getTime(),
              date: date
            });
          } else {
            console.log(`  ⚠️  Time element found but no datetime attribute`);
          }
        } else {
          console.log(`  ⚠️  No time element found`);
        }
      } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
      }
    }

    if (postsWithTimestamps.length === 0) {
      console.log('\n❌ Could not extract any timestamps');
      await browser.close();
      return { status: 'no_timestamps_found' };
    }

    // Step 3: Sort by timestamp and get the latest
    postsWithTimestamps.sort((a, b) => b.timestamp - a.timestamp);

    const latestPost = postsWithTimestamps[0];

    console.log(`\n=== Results ===`);
    console.log(`Checked ${postsWithTimestamps.length} posts with timestamps`);
    console.log(`\nAll posts sorted by date (newest first):`);

    postsWithTimestamps.forEach((post, idx) => {
      const marker = idx === 0 ? '🏆 LATEST' : `  ${idx + 1}.`;
      console.log(`${marker} ${post.date.toISOString()} - ${post.href}`);
    });

    console.log(`\n✅ Latest chronological post:`);
    console.log(`  Date: ${latestPost.date.toISOString()}`);
    console.log(`  Human: ${latestPost.date.toLocaleDateString()} ${latestPost.date.toLocaleTimeString()}`);
    console.log(`  URL: ${latestPost.url}`);

    await browser.close();

    return {
      status: 'found',
      latestPostDate: latestPost.date.toISOString(),
      latestPostUrl: latestPost.url,
      postsChecked: postsWithTimestamps.length,
      allPosts: postsWithTimestamps.map(p => ({
        date: p.date.toISOString(),
        url: p.url
      })),
      method: 'multi_post_timestamp_sort'
    };

  } catch (error) {
    console.error('Error:', error.message);
    await browser.close();
    return { status: 'error', error: error.message };
  }
}

// Test both accounts
async function testBoth() {
  const result1 = await getLatestPostDateReliable('officialstellus', 5);
  console.log('\n📊 Final Result for officialstellus:');
  console.log(JSON.stringify(result1, null, 2));

  console.log('\n' + '='.repeat(80) + '\n');

  const result2 = await getLatestPostDateReliable('radiohead', 5);
  console.log('\n📊 Final Result for radiohead:');
  console.log(JSON.stringify(result2, null, 2));
}

testBoth();

const { chromium } = require('playwright');

async function testInstagramTimestamps(username) {
  console.log(`\n=== Testing Instagram Timestamp Extraction ===`);
  console.log(`Target: https://www.instagram.com/${username}/\n`);

  const browser = await chromium.launch({
    headless: false // Set to true for production
  });

  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 720 }
    });

    const page = await context.newPage();

    // Navigate to profile
    console.log('Loading page...');
    await page.goto(`https://www.instagram.com/${username}/`, {
      waitUntil: "domcontentloaded",
      timeout: 30000
    });

    // Wait a bit for any dynamic content
    await page.waitForTimeout(2000);

    // Get the full HTML
    console.log('Extracting HTML...');
    const html = await page.content();

    // Method 1: Try to find the embedded JSON in script tags
    console.log('\n--- Method 1: Script Tag JSON ---');
    const scriptMatches = html.match(/<script type="application\/json"[^>]*>([\s\S]*?)<\/script>/g);

    if (scriptMatches) {
      console.log(`Found ${scriptMatches.length} JSON script tags`);

      for (let i = 0; i < scriptMatches.length; i++) {
        const scriptContent = scriptMatches[i].replace(/<script[^>]*>/, '').replace(/<\/script>/, '');

        try {
          const data = JSON.parse(scriptContent);

          // Look for timeline media data
          if (JSON.stringify(data).includes('edge_owner_to_timeline_media')) {
            console.log(`\n✅ Found timeline data in script tag ${i + 1}`);

            // Navigate the structure to find posts
            let posts = null;

            // Try different possible paths
            if (data.graphql?.user?.edge_owner_to_timeline_media?.edges) {
              posts = data.graphql.user.edge_owner_to_timeline_media.edges;
            } else if (data.entry_data?.ProfilePage?.[0]?.graphql?.user?.edge_owner_to_timeline_media?.edges) {
              posts = data.entry_data.ProfilePage[0].graphql.user.edge_owner_to_timeline_media.edges;
            }

            if (posts && posts.length > 0) {
              console.log(`\nFound ${posts.length} posts:`);

              posts.slice(0, 5).forEach((edge, idx) => {
                const timestamp = edge.node.taken_at_timestamp;
                const date = new Date(timestamp * 1000);
                const shortcode = edge.node.shortcode;

                console.log(`\nPost ${idx + 1}:`);
                console.log(`  Shortcode: ${shortcode}`);
                console.log(`  Timestamp: ${timestamp}`);
                console.log(`  Date: ${date.toISOString()}`);
                console.log(`  Human: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`);
              });

              // Return result
              const latestPost = posts[0];
              const latestTimestamp = latestPost.node.taken_at_timestamp;
              const latestDate = new Date(latestTimestamp * 1000);

              console.log(`\n✅ SUCCESS - Latest post date: ${latestDate.toISOString()}`);

              await browser.close();
              return {
                latestPostDate: latestDate.toISOString(),
                postCountSampled: posts.length,
                status: "found"
              };
            }
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }

    // Method 2: Try window._sharedData pattern
    console.log('\n--- Method 2: window._sharedData Pattern ---');
    const sharedDataMatch = html.match(/window\._sharedData\s*=\s*({.*?});<\/script>/);

    if (sharedDataMatch) {
      console.log('Found window._sharedData');
      try {
        const data = JSON.parse(sharedDataMatch[1]);
        console.log('Keys:', Object.keys(data));

        if (data.entry_data?.ProfilePage?.[0]?.graphql?.user?.edge_owner_to_timeline_media?.edges) {
          const posts = data.entry_data.ProfilePage[0].graphql.user.edge_owner_to_timeline_media.edges;
          console.log(`✅ Found ${posts.length} posts via _sharedData`);

          const latestPost = posts[0];
          const latestTimestamp = latestPost.node.taken_at_timestamp;
          const latestDate = new Date(latestTimestamp * 1000);

          console.log(`\n✅ SUCCESS - Latest post date: ${latestDate.toISOString()}`);

          await browser.close();
          return {
            latestPostDate: latestDate.toISOString(),
            postCountSampled: posts.length,
            status: "found"
          };
        }
      } catch (e) {
        console.log('Failed to parse _sharedData:', e.message);
      }
    }

    // Method 3: Check for login wall
    console.log('\n--- Method 3: Checking for Blocks ---');
    const bodyText = await page.textContent('body');

    if (bodyText.includes('Log in') || bodyText.includes('Sign up')) {
      console.log('⚠️  Possible login wall detected');
    }

    console.log('\n❌ FAILED - Could not extract timestamp data');
    console.log('This could mean:');
    console.log('  1. Instagram changed their JSON structure');
    console.log('  2. Account is private or doesn\'t exist');
    console.log('  3. Login wall is blocking access');
    console.log('  4. Rate limiting in effect');

    await browser.close();
    return {
      latestPostDate: null,
      postCountSampled: 0,
      status: "not_found"
    };

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    await browser.close();
    return {
      latestPostDate: null,
      postCountSampled: 0,
      status: "blocked"
    };
  }
}

// Test with the example account
testInstagramTimestamps('officialstellus')
  .then(result => {
    console.log('\n=== Final Result ===');
    console.log(JSON.stringify(result, null, 2));
  })
  .catch(err => {
    console.error('Test failed:', err);
  });

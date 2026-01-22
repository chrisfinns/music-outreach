const { chromium } = require('playwright');
const fs = require('fs');

async function diagnosticInstagram(username) {
  console.log(`\n=== Instagram Data Diagnostics ===`);
  console.log(`Target: https://www.instagram.com/${username}/\n`);

  const browser = await chromium.launch({
    headless: false
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

    await page.waitForTimeout(3000);

    // Save screenshot
    await page.screenshot({ path: 'instagram-diagnostic.png' });
    console.log('✅ Screenshot saved: instagram-diagnostic.png');

    // Get HTML and save it
    const html = await page.content();
    fs.writeFileSync('instagram-page.html', html);
    console.log('✅ HTML saved: instagram-page.html');

    // Check for script tags with interesting content
    console.log('\n--- Analyzing Script Tags ---');
    const scripts = await page.evaluate(() => {
      const scriptTags = Array.from(document.querySelectorAll('script'));
      return scriptTags.map((script, idx) => ({
        index: idx,
        type: script.type,
        hasContent: script.textContent.length > 0,
        contentLength: script.textContent.length,
        hasTimestamp: script.textContent.includes('timestamp'),
        hasEdge: script.textContent.includes('edge_'),
        hasMedia: script.textContent.includes('media'),
        preview: script.textContent.substring(0, 200)
      }));
    });

    console.log(`Found ${scripts.length} script tags\n`);

    // Show interesting scripts
    const interestingScripts = scripts.filter(s =>
      s.hasTimestamp || s.hasEdge || (s.type === 'application/json' && s.hasContent)
    );

    console.log(`Interesting scripts: ${interestingScripts.length}`);
    interestingScripts.forEach(s => {
      console.log(`\nScript ${s.index}:`);
      console.log(`  Type: ${s.type}`);
      console.log(`  Length: ${s.contentLength}`);
      console.log(`  Has timestamp: ${s.hasTimestamp}`);
      console.log(`  Has edge_: ${s.hasEdge}`);
      console.log(`  Has media: ${s.hasMedia}`);
      console.log(`  Preview: ${s.preview.substring(0, 100)}...`);
    });

    // Try to find any date/time elements in the DOM
    console.log('\n--- Looking for Time Elements ---');
    const timeElements = await page.evaluate(() => {
      const times = Array.from(document.querySelectorAll('time'));
      return times.map(t => ({
        datetime: t.getAttribute('datetime'),
        text: t.textContent,
        classes: t.className
      }));
    });

    if (timeElements.length > 0) {
      console.log(`Found ${timeElements.length} <time> elements:`);
      timeElements.forEach((t, idx) => {
        console.log(`\nTime ${idx + 1}:`);
        console.log(`  datetime: ${t.datetime}`);
        console.log(`  text: ${t.text}`);
        console.log(`  classes: ${t.classes}`);
      });
    } else {
      console.log('No <time> elements found');
    }

    // Check for meta tags
    console.log('\n--- Meta Tags ---');
    const metaTags = await page.evaluate(() => {
      const metas = Array.from(document.querySelectorAll('meta[property^="og:"], meta[name^="twitter:"]'));
      return metas.map(m => ({
        property: m.getAttribute('property') || m.getAttribute('name'),
        content: m.getAttribute('content')
      }));
    });

    metaTags.forEach(m => {
      console.log(`  ${m.property}: ${m.content?.substring(0, 100)}`);
    });

    // Try to execute JavaScript to find window objects
    console.log('\n--- Window Objects ---');
    const windowData = await page.evaluate(() => {
      const result = {
        hasSharedData: typeof window._sharedData !== 'undefined',
        hasAdditionalData: typeof window.__additionalDataLoaded !== 'undefined',
        windowKeys: Object.keys(window).filter(k => k.startsWith('_') || k.includes('instagram') || k.includes('ig')).slice(0, 20)
      };

      if (window._sharedData) {
        result.sharedDataKeys = Object.keys(window._sharedData);
      }

      return result;
    });

    console.log('Window analysis:', JSON.stringify(windowData, null, 2));

    // Look for article/post elements
    console.log('\n--- Post Elements ---');
    const postElements = await page.evaluate(() => {
      const articles = Array.from(document.querySelectorAll('article, [role="presentation"]'));
      return {
        articleCount: articles.length,
        hasLinks: document.querySelectorAll('a[href*="/p/"]').length,
        linkSample: Array.from(document.querySelectorAll('a[href*="/p/"]')).slice(0, 3).map(a => a.href)
      };
    });

    console.log('Post elements:', JSON.stringify(postElements, null, 2));

    console.log('\n✅ Diagnostic complete. Check the saved files for more details.');
    console.log('Press Enter to close browser...');

    await new Promise(resolve => {
      process.stdin.once('data', () => resolve());
    });

    await browser.close();

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    await browser.close();
  }
}

// Test
diagnosticInstagram('officialstellus');

const { chromium } = require('playwright');

async function debugPinnedDetection(username) {
  console.log(`\n=== Debugging Pinned Post Detection for @${username} ===\n`);

  const browser = await chromium.launch({ headless: false });

  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 720 }
    });

    const page = await context.newPage();

    await page.goto(`https://www.instagram.com/${username}/`, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    await page.waitForTimeout(3000);

    // Take screenshot for reference
    await page.screenshot({ path: `pinned-debug-${username}.png` });
    console.log(`Screenshot saved: pinned-debug-${username}.png`);

    // Detailed analysis of post structure
    const analysis = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]'));

      return links.slice(0, 5).map((link, index) => {
        const href = link.getAttribute('href');

        // Get various ancestor elements
        const article = link.closest('article');
        const directParent = link.parentElement;
        const grandparent = directParent?.parentElement;

        // Look for any SVG icons nearby
        const svgs = Array.from(article?.querySelectorAll('svg') || []).map(svg => ({
          ariaLabel: svg.getAttribute('aria-label'),
          innerHTML: svg.innerHTML.substring(0, 100)
        }));

        // Look for specific text content
        const textContent = article?.innerText || '';

        // Check for specific class patterns
        const classes = {
          link: link.className,
          parent: directParent?.className || '',
          grandparent: grandparent?.className || ''
        };

        // Look for data attributes
        const dataAttrs = {};
        if (article) {
          for (const attr of article.attributes) {
            if (attr.name.startsWith('data-')) {
              dataAttrs[attr.name] = attr.value;
            }
          }
        }

        return {
          index: index + 1,
          href,
          svgs,
          textContent: textContent.substring(0, 200),
          classes,
          dataAttrs,
          hasArticle: !!article
        };
      });
    });

    console.log('\n=== Post Structure Analysis ===\n');

    analysis.forEach(post => {
      console.log(`\n--- Post ${post.index}: ${post.href} ---`);
      console.log(`Has article wrapper: ${post.hasArticle}`);

      console.log('\nSVG icons found:');
      if (post.svgs.length > 0) {
        post.svgs.forEach((svg, i) => {
          console.log(`  SVG ${i + 1}:`);
          console.log(`    aria-label: ${svg.ariaLabel || 'none'}`);
          console.log(`    innerHTML preview: ${svg.innerHTML.substring(0, 80)}...`);
        });
      } else {
        console.log('  None');
      }

      console.log('\nText content:');
      console.log(`  ${post.textContent.substring(0, 150)}...`);

      console.log('\nData attributes:');
      console.log(`  ${JSON.stringify(post.dataAttrs, null, 2)}`);
    });

    console.log('\n\n=== Instructions ===');
    console.log('Look at the screenshot and the debug output above.');
    console.log('Identify which posts are pinned (look for pin icons in the screenshot).');
    console.log('Then check the SVG aria-labels or text content to find the pattern.');

    await new Promise(resolve => {
      console.log('\nPress Enter to close...');
      process.stdin.once('data', () => resolve());
    });

    await browser.close();

  } catch (error) {
    console.error('Error:', error.message);
    await browser.close();
  }
}

// Test both accounts
async function testBoth() {
  await debugPinnedDetection('officialstellus');
  console.log('\n' + '='.repeat(80) + '\n');
  await debugPinnedDetection('radiohead');
}

testBoth();

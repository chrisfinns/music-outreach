const fs = require('fs');

console.log('=== Extracting Instagram Post Dates ===\n');

const html = fs.readFileSync('instagram-page.html', 'utf8');

// Find all script tags
const scriptRegex = /<script type="application\/json"[^>]*>(.*?)<\/script>/gs;
let match;
let scriptIndex = 0;

function recursiveSearch(obj, visited = new WeakSet()) {
  if (!obj || typeof obj !== 'object') return null;
  if (visited.has(obj)) return null;
  visited.add(obj);

  // Check if this looks like a post node
  if (obj.taken_at && obj.code && obj.id) {
    return { type: 'single', data: obj };
  }

  // Check if this is an edges array
  if (Array.isArray(obj) && obj.length > 0 && obj[0].node) {
    const firstNode = obj[0].node;
    if (firstNode.taken_at && firstNode.code) {
      return { type: 'edges', data: obj };
    }
  }

  // Recurse
  for (const key in obj) {
    try {
      const result = recursiveSearch(obj[key], visited);
      if (result) return result;
    } catch (e) {
      // Skip circular references
    }
  }

  return null;
}

while ((match = scriptRegex.exec(html)) !== null) {
  const content = match[1];
  scriptIndex++;

  if (content.length > 50000) {
    console.log(`Checking script ${scriptIndex} (${content.length} bytes)...`);

    try {
      const data = JSON.parse(content);
      const result = recursiveSearch(data);

      if (result) {
        console.log(`\n✅ FOUND POST DATA in script ${scriptIndex}!\n`);

        let posts;
        if (result.type === 'edges') {
          posts = result.data;
          console.log(`Found ${posts.length} posts in edges format\n`);
        } else {
          posts = [{ node: result.data }];
          console.log(`Found single post\n`);
        }

        // Display posts
        posts.slice(0, 5).forEach((edge, idx) => {
          const node = edge.node;
          const timestamp = node.taken_at;
          const date = new Date(timestamp * 1000);

          console.log(`Post ${idx + 1}:`);
          console.log(`  Code: ${node.code}`);
          console.log(`  Timestamp: ${timestamp}`);
          console.log(`  Date: ${date.toISOString()}`);
          console.log(`  Human: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`);
          console.log(`  Caption: ${node.caption?.text?.substring(0, 60) || 'N/A'}...`);
          console.log();
        });

        // Save result
        const latestPost = posts[0].node;
        const latestDate = new Date(latestPost.taken_at * 1000);

        const finalResult = {
          latestPostDate: latestDate.toISOString(),
          latestPostTimestamp: latestPost.taken_at,
          postCountSampled: posts.length,
          status: 'found'
        };

        console.log('\n✅✅✅ SUCCESS ✅✅✅');
        console.log(JSON.stringify(finalResult, null, 2));

        fs.writeFileSync('instagram-result.json', JSON.stringify(finalResult, null, 2));
        console.log('\nResult saved to instagram-result.json');

        process.exit(0);
      }
    } catch (e) {
      // Skip
    }
  }
}

console.log('\n❌ No post data found');

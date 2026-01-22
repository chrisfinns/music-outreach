const fs = require('fs');

console.log('=== Parsing Instagram HTML for JSON ===\n');

// Read the saved HTML
const html = fs.readFileSync('instagram-page.html', 'utf8');

// Find all script tags with type="application/json"
const scriptRegex = /<script type="application\/json" data-content-len="(\d+)"[^>]*>(.*?)<\/script>/gs;
let match;
let scriptIndex = 0;

const interestingScripts = [];

while ((match = scriptRegex.exec(html)) !== null) {
  const contentLength = parseInt(match[1]);
  const content = match[2];

  scriptIndex++;

  // Check if this contains interesting data
  if (content.includes('timestamp') || content.includes('edge_') || contentLength > 50000) {
    console.log(`\n--- Script ${scriptIndex} (${contentLength} bytes) ---`);

    try {
      const data = JSON.parse(content);

      // Try to find user profile data
      const dataStr = JSON.stringify(data);

      if (dataStr.includes('xdt_api__v1__feed__user_timeline_graphql_connection')) {
        console.log('✅ Found timeline connection data!');

        // Deep search for the actual timeline data
        function findTimeline(obj, path = '') {
          if (!obj || typeof obj !== 'object') return null;

          // Check if this object has edges array
          if (obj.edges && Array.isArray(obj.edges) && obj.edges.length > 0) {
            const firstEdge = obj.edges[0];
            if (firstEdge.node && firstEdge.node.taken_at) {
              console.log(`\n✅✅ FOUND POSTS at path: ${path}`);
              console.log(`Number of posts: ${obj.edges.length}`);
              return obj.edges;
            }
          }

          // Recurse through object
          for (const key in obj) {
            const result = findTimeline(obj[key], path ? `${path}.${key}` : key);
            if (result) return result;
          }

          return null;
        }

        const posts = findTimeline(data);

        if (posts) {
          console.log('\n=== POST DATA ===');
          posts.slice(0, 5).forEach((edge, idx) => {
            const node = edge.node;
            console.log(`\nPost ${idx + 1}:`);
            console.log(`  ID: ${node.id}`);
            console.log(`  Code: ${node.code}`);
            console.log(`  Taken at: ${node.taken_at}`);

            if (node.taken_at) {
              const date = new Date(node.taken_at * 1000);
              console.log(`  Date: ${date.toISOString()}`);
              console.log(`  Human: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`);
            }

            console.log(`  Caption preview: ${node.caption?.text?.substring(0, 50) || 'N/A'}...`);
          });

          // Return the result
          const latestPost = posts[0];
          const latestTimestamp = latestPost.node.taken_at;
          const latestDate = new Date(latestTimestamp * 1000);

          console.log('\n\n✅✅✅ SUCCESS ✅✅✅');
          console.log('Latest post date:', latestDate.toISOString());
          console.log('Sample size:', posts.length, 'posts');

          const result = {
            latestPostDate: latestDate.toISOString(),
            postCountSampled: posts.length,
            status: 'found',
            method: 'xdt_api__v1__feed__user_timeline_graphql_connection'
          };

          fs.writeFileSync('instagram-result.json', JSON.stringify(result, null, 2));
          console.log('\n✅ Result saved to instagram-result.json');

          process.exit(0);
        }
      }
    } catch (e) {
      console.log('Failed to parse:', e.message);
    }
  }
}

console.log('\n\n❌ No timeline data found in any script');

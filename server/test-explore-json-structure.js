const fs = require('fs');

console.log('=== Exploring Instagram JSON Structure ===\n');

const html = fs.readFileSync('instagram-page.html', 'utf8');

// Find all script tags with type="application/json"
const scriptRegex = /<script type="application\/json" data-content-len="(\d+)"[^>]*>(.*?)<\/script>/gs;
let match;
let scriptIndex = 0;

function exploreObject(obj, depth = 0, maxDepth = 5, path = 'root') {
  if (depth > maxDepth || !obj || typeof obj !== 'object') return;

  const indent = '  '.repeat(depth);

  if (Array.isArray(obj)) {
    if (obj.length > 0) {
      console.log(`${indent}${path}: Array[${obj.length}]`);
      if (depth < maxDepth) {
        exploreObject(obj[0], depth + 1, maxDepth, `${path}[0]`);
      }
    }
  } else {
    const keys = Object.keys(obj).slice(0, 20); // Limit keys shown
    for (const key of keys) {
      const value = obj[key];
      const newPath = `${path}.${key}`;

      if (value === null) {
        console.log(`${indent}${key}: null`);
      } else if (typeof value === 'object') {
        if (Array.isArray(value)) {
          console.log(`${indent}${key}: Array[${value.length}]`);
          if (value.length > 0 && depth < maxDepth) {
            exploreObject(value[0], depth + 1, maxDepth, `${newPath}[0]`);
          }
        } else {
          console.log(`${indent}${key}: Object`);
          if (depth < maxDepth) {
            exploreObject(value, depth + 1, maxDepth, newPath);
          }
        }
      } else if (typeof value === 'string') {
        const preview = value.length > 50 ? value.substring(0, 50) + '...' : value;
        console.log(`${indent}${key}: "${preview}"`);
      } else {
        console.log(`${indent}${key}: ${value}`);
      }
    }

    if (Object.keys(obj).length > 20) {
      console.log(`${indent}... (${Object.keys(obj).length - 20} more keys)`);
    }
  }
}

while ((match = scriptRegex.exec(html)) !== null) {
  const contentLength = parseInt(match[1]);
  const content = match[2];

  scriptIndex++;

  // Only look at large scripts
  if (contentLength > 50000) {
    console.log(`\n\n===== Script ${scriptIndex} (${contentLength} bytes) =====`);

    try {
      const data = JSON.parse(content);
      exploreObject(data, 0, 4);

      // Also search for key strings
      const dataStr = JSON.stringify(data);
      const hasTimestamp = dataStr.includes('"taken_at"') || dataStr.includes('timestamp');
      const hasEdge = dataStr.includes('edge_');
      const hasTimeline = dataStr.includes('timeline');
      const hasUser = dataStr.includes('xdt_api__v1__feed__user');

      console.log('\n--- Contains ---');
      console.log(`  taken_at: ${hasTimestamp}`);
      console.log(`  edge_: ${hasEdge}`);
      console.log(`  timeline: ${hasTimeline}`);
      console.log(`  xdt_api__v1__feed__user: ${hasUser}`);

      // Search for the actual data
      if (hasUser) {
        console.log('\n🔍 Searching for user data structure...');

        function deepSearch(obj, searchKey, currentPath = '') {
          if (!obj || typeof obj !== 'object') return [];

          const results = [];

          if (obj[searchKey]) {
            results.push({ path: currentPath, data: obj[searchKey] });
          }

          for (const key in obj) {
            const newPath = currentPath ? `${currentPath}.${key}` : key;
            results.push(...deepSearch(obj[key], searchKey, newPath));
          }

          return results;
        }

        // Search for key patterns
        const userResults = deepSearch(data, 'xdt_api__v1__feed__user_timeline_graphql_connection');
        console.log(`Found ${userResults.length} instances of user timeline key`);

        if (userResults.length > 0) {
          console.log('\n✅ Found user timeline data at:');
          userResults.forEach(r => {
            console.log(`  Path: ${r.path}`);
            console.log(`  Keys in data:`, Object.keys(r.data).slice(0, 10));

            // Explore this data
            console.log('\n  Exploring structure:');
            exploreObject(r.data, 1, 6, '  data');
          });
        }
      }

    } catch (e) {
      console.log('Parse error:', e.message);
    }
  }
}

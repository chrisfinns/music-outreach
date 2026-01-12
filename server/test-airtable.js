const Airtable = require('airtable');
require('dotenv').config();

console.log('Testing Airtable connection...\n');
console.log('Base ID:', process.env.AIRTABLE_BASE_ID);
console.log('Token exists:', !!process.env.AIRTABLE_ACCESS_TOKEN);

const base = new Airtable({
  apiKey: process.env.AIRTABLE_ACCESS_TOKEN
}).base(process.env.AIRTABLE_BASE_ID);

const tableName = 'Outreach';

async function testConnection() {
  try {
    console.log(`\nTrying to read from table: "${tableName}"...`);
    const records = await base(tableName).select({ maxRecords: 3 }).firstPage();

    console.log(`✓ SUCCESS! Connected to table: "${tableName}"`);
    console.log(`Records found: ${records.length}\n`);

    if (records.length > 0) {
      console.log('Field names in this table:');
      const fields = records[0].fields;
      Object.keys(fields).forEach(key => {
        console.log(`  - "${key}" (${typeof fields[key]})`);
      });

      console.log('\nFirst record data:');
      console.log(JSON.stringify(records[0].fields, null, 2));
    } else {
      console.log('No records in table yet.');
    }

  } catch (error) {
    console.log(`✗ Failed: ${error.message}`);
    console.log('Error details:', error);
  }
}

testConnection();

const Airtable = require('airtable');
require('dotenv').config();

const base = new Airtable({
  apiKey: process.env.AIRTABLE_ACCESS_TOKEN
}).base(process.env.AIRTABLE_BASE_ID);

async function testWrite() {
  console.log('Testing write to Airtable...\n');

  try {
    // Try to create a test record with correct field names
    const testData = {
      'Artist. Name': 'Test Band', // Field name has a period!
      'Song': 'Test Song',
      'Assignee': '@testband',
      'Original Notes': 'This is a test',
      'Status': 'Talking To',
      'Generated Message': 'Test message',
      'Date Added': new Date().toISOString()
    };

    console.log('Attempting to create record with fields:');
    console.log(JSON.stringify(testData, null, 2));
    console.log('');

    const records = await base('Outreach').create([
      { fields: testData }
    ]);

    console.log('✓ SUCCESS! Record created:');
    console.log('Record ID:', records[0].id);
    console.log('Fields saved:', JSON.stringify(records[0].fields, null, 2));

    // Clean up - delete the test record
    console.log('\nCleaning up test record...');
    await base('Outreach').destroy([records[0].id]);
    console.log('✓ Test record deleted');

  } catch (error) {
    console.log('✗ Failed to write:', error.message);

    if (error.statusCode === 422) {
      console.log('\nThis usually means field names don\'t match.');
      console.log('Please provide the EXACT field names from your Airtable table.');
    }
  }
}

testWrite();

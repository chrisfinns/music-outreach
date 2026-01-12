const fs = require('fs');
const path = require('path');
require('dotenv').config();
const airtableService = require('./airtable-service');

async function migrate() {
  console.log('Starting migration from crm-data.json to Airtable...\n');

  // Read existing JSON data
  const DB_FILE = path.join(__dirname, '..', 'crm-data.json');

  if (!fs.existsSync(DB_FILE)) {
    console.log('No crm-data.json file found. Nothing to migrate.');
    return;
  }

  const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  const bands = data.bands || [];

  if (bands.length === 0) {
    console.log('No bands found in crm-data.json. Nothing to migrate.');
    return;
  }

  console.log(`Found ${bands.length} bands to migrate:\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const band of bands) {
    try {
      console.log(`Migrating: ${band.bandName} - "${band.song}"...`);

      await airtableService.createBand({
        bandName: band.bandName,
        members: band.members || '',
        song: band.song,
        instagram: band.instagram,
        notes: band.notes,
        generatedMessage: band.generatedMessage || '',
        followUpNotes: band.followUpNotes || '',
        status: band.status || 'not_messaged',
        messageStatus: band.messageStatus || 'ready',
        dateAdded: band.dateAdded,
        lastUpdated: band.lastUpdated
      });

      console.log(`✓ Successfully migrated: ${band.bandName}\n`);
      successCount++;
    } catch (error) {
      console.error(`✗ Failed to migrate ${band.bandName}:`, error.message, '\n');
      errorCount++;
    }
  }

  console.log('\n=== Migration Summary ===');
  console.log(`Total bands: ${bands.length}`);
  console.log(`Successfully migrated: ${successCount}`);
  console.log(`Failed: ${errorCount}`);
  console.log('\nMigration complete!');

  if (successCount === bands.length) {
    console.log('\n✓ All bands migrated successfully!');
    console.log('You can now safely use Airtable as your database.');
    console.log('The crm-data.json file will remain for system settings (prompt, daily count).');
  }
}

migrate().catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});

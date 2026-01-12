const Airtable = require('airtable');
require('dotenv').config();

// Initialize Airtable
const base = new Airtable({ apiKey: process.env.AIRTABLE_ACCESS_TOKEN }).base(process.env.AIRTABLE_BASE_ID);

// Table names
const BANDS_TABLE = 'Outreach';
const SETTINGS_TABLE = 'Settings'; // We'll create this for system prompt and daily count

// Helper to convert Airtable record to our app format
const formatBandRecord = (record) => {
  return {
    id: record.id,
    bandName: record.get('Artist Name') || '',
    members: record.get('Members') || '',
    song: record.get('Song') || '',
    instagram: record.get('Assignee') || '', // Using Assignee field temporarily for Instagram handle
    notes: record.get('Original Notes') || '',
    generatedMessage: record.get('Generated Message') || '',
    followUpNotes: record.get('Follow-up Notes') || '',
    status: record.get('Status') || 'not_messaged',
    messageStatus: 'ready', // Not stored in Airtable, using default
    dateAdded: record.get('Date Added') || new Date().toISOString(),
    lastUpdated: record.get('Last Updated') || new Date().toISOString(),
  };
};

// Helper to convert our app format to Airtable fields
const formatBandForAirtable = (band) => {
  const fields = {
    'Artist Name': band.bandName,
    'Song': band.song || '',
    'Assignee': band.instagram || '', // Using Assignee field temporarily for Instagram handle
    'Original Notes': band.notes || '',
    // Status: skip for now, let Airtable use default or we'll set it manually
    'Generated Message': band.generatedMessage || '',
    'Date Added': band.dateAdded || new Date().toISOString(),
  };

  // Only set status if it's provided and we have a valid mapping
  if (band.status) {
    const airtableStatus = mapStatusToAirtable(band.status);
    if (airtableStatus) fields['Status'] = airtableStatus;
  }

  // Add optional fields if they exist
  if (band.members) fields['Members'] = band.members;
  if (band.followUpNotes) fields['Follow-up Notes'] = band.followUpNotes;
  // Note: "Last Updated" is auto-computed by Airtable, don't set it manually

  return fields;
};

// Map our internal status to Airtable status values
// Based on Airtable field schema, the Status field likely has these options
const mapStatusToAirtable = (status) => {
  const statusMap = {
    'not_messaged': 'Talking To', // Default to "Talking To" since "Not Messaged" doesn't exist
    'messaged': 'Talking To',
    'talking_to': 'Talking To',
    'won': 'Talking To', // Using existing option until we know all options
    'closed': 'Talking To'
  };
  return statusMap[status] || 'Talking To';
};

// Map Airtable status to our internal format
const mapStatusFromAirtable = (status) => {
  const statusMap = {
    'Talking To': 'talking_to'
  };
  return statusMap[status] || status.toLowerCase().replace(/ /g, '_');
};

class AirtableService {
  // Get all bands
  async getAllBands() {
    try {
      const records = await base(BANDS_TABLE).select({
        sort: [{ field: 'Date Added', direction: 'desc' }]
      }).all();

      return records.map(record => {
        const band = formatBandRecord(record);
        // Convert Airtable status format to our internal format
        band.status = mapStatusFromAirtable(band.status);
        return band;
      });
    } catch (error) {
      console.error('Error fetching bands from Airtable:', error);
      throw error;
    }
  }

  // Create a new band
  async createBand(bandData) {
    try {
      const fields = formatBandForAirtable({
        ...bandData,
        status: mapStatusToAirtable(bandData.status || 'not_messaged'),
        dateAdded: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      });

      const records = await base(BANDS_TABLE).create([{ fields }]);
      const band = formatBandRecord(records[0]);
      band.status = mapStatusFromAirtable(band.status);
      return band;
    } catch (error) {
      console.error('Error creating band in Airtable:', error);
      throw error;
    }
  }

  // Update a band
  async updateBand(id, updates) {
    try {
      const fields = {};

      // Map updates to Airtable field names
      if (updates.bandName !== undefined) fields['Artist Name'] = updates.bandName;
      if (updates.members !== undefined) fields['Members'] = updates.members;
      if (updates.song !== undefined) fields['Song'] = updates.song;
      if (updates.instagram !== undefined) fields['Assignee'] = updates.instagram; // Using Assignee for Instagram
      if (updates.notes !== undefined) fields['Original Notes'] = updates.notes;
      if (updates.generatedMessage !== undefined) fields['Generated Message'] = updates.generatedMessage;
      if (updates.followUpNotes !== undefined) fields['Follow-up Notes'] = updates.followUpNotes;
      if (updates.status !== undefined) fields['Status'] = mapStatusToAirtable(updates.status);

      // Note: "Last Updated" is auto-computed by Airtable, don't set it manually

      const records = await base(BANDS_TABLE).update([{ id, fields }]);
      const band = formatBandRecord(records[0]);
      band.status = mapStatusFromAirtable(band.status);
      return band;
    } catch (error) {
      console.error('Error updating band in Airtable:', error);
      throw error;
    }
  }

  // Delete a band
  async deleteBand(id) {
    try {
      await base(BANDS_TABLE).destroy([id]);
      return { success: true };
    } catch (error) {
      console.error('Error deleting band from Airtable:', error);
      throw error;
    }
  }

  // Get a single band by ID
  async getBandById(id) {
    try {
      const record = await base(BANDS_TABLE).find(id);
      const band = formatBandRecord(record);
      band.status = mapStatusFromAirtable(band.status);
      return band;
    } catch (error) {
      console.error('Error fetching band from Airtable:', error);
      throw error;
    }
  }

  // System prompt and daily count methods
  // Note: We'll store these in a separate Settings table or use a local cache
  // For now, keeping them in memory/JSON as a hybrid approach
  async getSettings() {
    // This would query a Settings table in Airtable
    // For now, return defaults
    return {
      systemPrompt: "You are a friendly music enthusiast reaching out to bands on Instagram. Write a personalized, genuine message that shows you've actually listened to their music. Be concise (2-3 sentences), enthusiastic but not over-the-top, and mention specific details from the user's notes. End with a clear call-to-action or question about their music.",
      dailyCount: 0,
      lastReset: new Date().toDateString()
    };
  }

  async updateSettings(settings) {
    // This would update a Settings table in Airtable
    // For now, we'll handle this separately
    return settings;
  }
}

module.exports = new AirtableService();

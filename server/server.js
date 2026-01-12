const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const airtableService = require('./airtable-service');

const app = express();
app.use(express.json());
app.use(cors());

let anthropic;
try {
  if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_api_key_here') {
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
} catch (error) {
  console.warn('Anthropic API not initialized. Add your API key to .env file.');
}

// Keep JSON file as backup/fallback for settings (system prompt, daily count)
const DB_FILE = path.join(__dirname, '..', 'crm-data.json');

// Helper to read/write settings data (not bands - those are in Airtable now)
const getSettings = () => {
  if (!fs.existsSync(DB_FILE)) {
    return {
      systemPrompt: "You are a friendly music enthusiast reaching out to bands on Instagram. Write a personalized, genuine message that shows you've actually listened to their music. Be concise (2-3 sentences), enthusiastic but not over-the-top, and mention specific details from the user's notes. End with a clear call-to-action or question about their music.",
      dailyCount: 0,
      lastReset: new Date().toDateString()
    };
  }
  const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  return {
    systemPrompt: data.systemPrompt,
    dailyCount: data.dailyCount,
    lastReset: data.lastReset
  };
};

const saveSettings = (settings) => {
  let data = {};
  if (fs.existsSync(DB_FILE)) {
    data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  }
  data.systemPrompt = settings.systemPrompt;
  data.dailyCount = settings.dailyCount;
  data.lastReset = settings.lastReset;
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
};

// Endpoint to generate outreach message
app.post('/api/generate-message', async (req, res) => {
  try {
    const { bandName, members, song, notes, systemPrompt } = req.body;

    if (!anthropic) {
      return res.status(500).json({ error: 'Anthropic API not configured. Please add your API key to the .env file.' });
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Generate an Instagram outreach message for this band:

Band Name: ${bandName}
Members: ${members}
Song I Liked: ${song}
My Notes: ${notes}

Please create a personalized, engaging outreach message.`
        }
      ],
    });

    const generatedMessage = message.content[0].text;
    res.json({ message: generatedMessage });

  } catch (error) {
    console.error('Error calling Claude API:', error);
    res.status(500).json({ error: 'Failed to generate message' });
  }
});

// Create new band
app.post('/api/bands', async (req, res) => {
  try {
    const newBand = await airtableService.createBand({
      ...req.body,
      status: 'not_messaged',
      generatedMessage: '',
      followUpNotes: '',
      messageStatus: 'generating'
    });
    res.json(newBand);
  } catch (error) {
    console.error('Error creating band:', error);
    res.status(500).json({ error: 'Failed to create band' });
  }
});

// Update band (status change, edit info, add notes)
app.patch('/api/bands/:id', async (req, res) => {
  try {
    // Get the band before update to check status change
    const oldBand = await airtableService.getBandById(req.params.id);

    // Update the band
    const updatedBand = await airtableService.updateBand(req.params.id, req.body);

    // Increment daily counter if status changed to 'messaged'
    if (req.body.status === 'messaged' && oldBand.status !== 'messaged') {
      const settings = getSettings();
      const today = new Date().toDateString();
      if (settings.lastReset !== today) {
        settings.dailyCount = 0;
        settings.lastReset = today;
      }
      settings.dailyCount++;
      saveSettings(settings);
    }

    res.json(updatedBand);
  } catch (error) {
    console.error('Error updating band:', error);
    res.status(500).json({ error: 'Failed to update band' });
  }
});

// Delete band
app.delete('/api/bands/:id', async (req, res) => {
  try {
    await airtableService.deleteBand(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting band:', error);
    res.status(500).json({ error: 'Failed to delete band' });
  }
});

// Get all bands
app.get('/api/bands', async (req, res) => {
  try {
    const bands = await airtableService.getAllBands();
    res.json(bands);
  } catch (error) {
    console.error('Error fetching bands:', error);
    res.status(500).json({ error: 'Failed to fetch bands' });
  }
});

// Get daily count
app.get('/api/daily-count', (req, res) => {
  const settings = getSettings();
  const today = new Date().toDateString();
  if (settings.lastReset !== today) {
    settings.dailyCount = 0;
    settings.lastReset = today;
    saveSettings(settings);
  }
  res.json({ count: settings.dailyCount, limit: 20 });
});

// Update system prompt
app.post('/api/system-prompt', (req, res) => {
  const settings = getSettings();
  settings.systemPrompt = req.body.prompt;
  saveSettings(settings);
  res.json({ success: true });
});

// Get system prompt
app.get('/api/system-prompt', (req, res) => {
  const settings = getSettings();
  res.json({ prompt: settings.systemPrompt });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

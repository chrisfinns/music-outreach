const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

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

const DB_FILE = path.join(__dirname, '..', 'crm-data.json');

// Helper to read/write data
const getDb = () => {
  if (!fs.existsSync(DB_FILE)) {
    return {
      bands: [],
      systemPrompt: "You are a friendly music enthusiast reaching out to bands on Instagram. Write a personalized, genuine message that shows you've actually listened to their music. Be concise (2-3 sentences), enthusiastic but not over-the-top, and mention specific details from the user's notes. End with a clear call-to-action or question about their music.",
      dailyCount: 0,
      lastReset: new Date().toDateString()
    };
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
};

const saveDb = (data) => {
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
app.post('/api/bands', (req, res) => {
  const db = getDb();
  const newBand = {
    ...req.body,
    id: Date.now().toString(),
    status: 'not_messaged',
    dateAdded: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    generatedMessage: '',
    followUpNotes: '',
    messageStatus: 'generating'
  };
  db.bands.push(newBand);
  saveDb(db);
  res.json(newBand);
});

// Update band (status change, edit info, add notes)
app.patch('/api/bands/:id', (req, res) => {
  const db = getDb();
  const index = db.bands.findIndex(b => b.id === req.params.id);
  if (index > -1) {
    db.bands[index] = {
      ...db.bands[index],
      ...req.body,
      lastUpdated: new Date().toISOString()
    };

    // Increment daily counter if status changed to 'messaged'
    if (req.body.status === 'messaged' && db.bands[index].status !== 'messaged') {
      const today = new Date().toDateString();
      if (db.lastReset !== today) {
        db.dailyCount = 0;
        db.lastReset = today;
      }
      db.dailyCount++;
    }

    saveDb(db);
    res.json(db.bands[index]);
  } else {
    res.status(404).json({ error: 'Band not found' });
  }
});

// Delete band
app.delete('/api/bands/:id', (req, res) => {
  const db = getDb();
  db.bands = db.bands.filter(b => b.id !== req.params.id);
  saveDb(db);
  res.json({ success: true });
});

// Get all bands
app.get('/api/bands', (req, res) => {
  const db = getDb();
  res.json(db.bands);
});

// Get daily count
app.get('/api/daily-count', (req, res) => {
  const db = getDb();
  const today = new Date().toDateString();
  if (db.lastReset !== today) {
    db.dailyCount = 0;
    db.lastReset = today;
    saveDb(db);
  }
  res.json({ count: db.dailyCount, limit: 20 });
});

// Update system prompt
app.post('/api/system-prompt', (req, res) => {
  const db = getDb();
  db.systemPrompt = req.body.prompt;
  saveDb(db);
  res.json({ success: true });
});

// Get system prompt
app.get('/api/system-prompt', (req, res) => {
  const db = getDb();
  res.json({ prompt: db.systemPrompt });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

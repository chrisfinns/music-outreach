import { useState, useEffect } from 'react';
import AddBandForm from '../components/AddBandForm';
import KanbanBoard from '../components/KanbanBoard';
import DailyCounter from '../components/DailyCounter';
import SearchBar from '../components/SearchBar';

const API_URL = 'http://localhost:3000/api';

function Dashboard() {
  const [bands, setBands] = useState([]);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBands();
    fetchSystemPrompt();
  }, []);

  const fetchBands = async () => {
    try {
      const response = await fetch(`${API_URL}/bands`);
      const data = await response.json();
      setBands(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching bands:', error);
      setLoading(false);
    }
  };

  const fetchSystemPrompt = async () => {
    try {
      const response = await fetch(`${API_URL}/system-prompt`);
      const data = await response.json();
      setSystemPrompt(data.prompt);
    } catch (error) {
      console.error('Error fetching system prompt:', error);
    }
  };

  const handleAddBand = async (bandData) => {
    try {
      // First, create the band entry
      const response = await fetch(`${API_URL}/bands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bandData),
      });
      const newBand = await response.json();

      // Add to state immediately with "generating" status
      setBands([...bands, newBand]);

      // Then generate the message in the background
      try {
        const messageResponse = await fetch(`${API_URL}/generate-message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...bandData,
            systemPrompt,
          }),
        });
        const { message } = await messageResponse.json();

        // Update the band with the generated message
        const updateResponse = await fetch(`${API_URL}/bands/${newBand.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            generatedMessage: message,
            messageStatus: 'ready',
          }),
        });
        const updatedBand = await updateResponse.json();

        // Update state with the complete band
        setBands(bands.map(b => b.id === newBand.id ? updatedBand : b));
      } catch (error) {
        console.error('Error generating message:', error);
        // Update band to show generation failed
        const updateResponse = await fetch(`${API_URL}/bands/${newBand.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messageStatus: 'failed',
          }),
        });
        const updatedBand = await updateResponse.json();
        setBands(bands.map(b => b.id === newBand.id ? updatedBand : b));
      }
    } catch (error) {
      console.error('Error adding band:', error);
    }
  };

  const handleUpdateBand = async (id, updates) => {
    try {
      const response = await fetch(`${API_URL}/bands/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const updatedBand = await response.json();
      setBands(bands.map(b => b.id === id ? updatedBand : b));
    } catch (error) {
      console.error('Error updating band:', error);
    }
  };

  const handleDeleteBand = async (id) => {
    try {
      await fetch(`${API_URL}/bands/${id}`, {
        method: 'DELETE',
      });
      setBands(bands.filter(b => b.id !== id));
    } catch (error) {
      console.error('Error deleting band:', error);
    }
  };

  const handleRegenerateMessage = async (band) => {
    try {
      // Update status to generating
      await handleUpdateBand(band.id, { messageStatus: 'generating' });

      const response = await fetch(`${API_URL}/generate-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bandName: band.bandName,
          members: band.members,
          song: band.song,
          notes: band.notes,
          systemPrompt,
        }),
      });
      const { message } = await response.json();

      await handleUpdateBand(band.id, {
        generatedMessage: message,
        messageStatus: 'ready',
      });
    } catch (error) {
      console.error('Error regenerating message:', error);
      await handleUpdateBand(band.id, { messageStatus: 'failed' });
    }
  };

  const filteredBands = bands.filter(band =>
    band.bandName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    band.members.toLowerCase().includes(searchQuery.toLowerCase()) ||
    band.song.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Band Outreach CRM</h1>
        <DailyCounter />
      </div>

      <div className="mb-8">
        <AddBandForm onSubmit={handleAddBand} />
      </div>

      <div className="mb-6">
        <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      </div>

      <KanbanBoard
        bands={filteredBands}
        onUpdateBand={handleUpdateBand}
        onDeleteBand={handleDeleteBand}
        onRegenerateMessage={handleRegenerateMessage}
      />
    </div>
  );
}

export default Dashboard;

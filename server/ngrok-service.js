const ngrok = require('@ngrok/ngrok');

let listener = null;
let ngrokUrl = null;
let ngrokConnected = false;

async function startNgrok(port) {
  try {
    // Check if ngrok is configured
    const authtoken = process.env.NGROK_AUTHTOKEN;

    if (!authtoken || authtoken === 'your_ngrok_authtoken_here') {
      console.log('⚠️  NGROK_AUTHTOKEN not found in .env');
      console.log('   Add your ngrok authtoken to .env to use ngrok features');
      return null;
    }

    console.log('🚇 Starting ngrok tunnel...');

    // Create ngrok listener
    listener = await ngrok.forward({
      addr: port,
      authtoken: authtoken
    });

    ngrokUrl = listener.url();
    ngrokConnected = true;

    console.log('✅ Ngrok tunnel established!');
    console.log('🌐 Public URL:', ngrokUrl);
    console.log('📋 Spotify Redirect URI:', `${ngrokUrl}/api/spotify/callback`);
    console.log('');
    console.log('👉 Copy the redirect URI above and add it to:');
    console.log('   https://developer.spotify.com/dashboard');
    console.log('');

    return ngrokUrl;
  } catch (error) {
    console.error('❌ Failed to start ngrok:', error.message);
    return null;
  }
}

async function stopNgrok() {
  try {
    if (listener) {
      await listener.close();
      listener = null;
      ngrokConnected = false;
      ngrokUrl = null;
      console.log('🛑 Ngrok tunnel closed');
    }
  } catch (error) {
    console.error('Error stopping ngrok:', error);
  }
}

function getNgrokUrl() {
  return ngrokUrl;
}

function isNgrokConnected() {
  return ngrokConnected;
}

// Clean up on process exit
process.on('exit', () => {
  stopNgrok();
});

process.on('SIGINT', async () => {
  await stopNgrok();
  process.exit();
});

module.exports = {
  startNgrok,
  stopNgrok,
  getNgrokUrl,
  isNgrokConnected
};

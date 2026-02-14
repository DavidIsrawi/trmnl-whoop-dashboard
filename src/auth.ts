import http from 'http';
import url from 'url';
import axios from 'axios';
import qs from 'qs';
import dotenv from 'dotenv';
import { updateEnvVariable } from './utils.js';

dotenv.config();

const { WHOOP_CLIENT_ID, WHOOP_CLIENT_SECRET } = process.env;

if (!WHOOP_CLIENT_ID || !WHOOP_CLIENT_SECRET) {
  console.error('Please set WHOOP_CLIENT_ID and WHOOP_CLIENT_SECRET in your .env file.');
  process.exit(1);
}

const REDIRECT_URI = 'http://localhost:3000/callback';
const SCOPES = [
  'offline',
  'read:recovery',
  'read:cycles',
  'read:sleep',
  'read:workout',
  'read:profile',
  'read:body_measurement'
].join(' ');

const authUrl = `https://api.prod.whoop.com/oauth/oauth2/auth?client_id=${WHOOP_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(SCOPES)}&state=somestate`;

console.log('1. Go to your Whoop Developer Dashboard and set the Redirect URI to:', REDIRECT_URI);
console.log(`2. Open this URL in your browser:

${authUrl}
`);

const server = http.createServer(async (req, res) => {
  console.log(`Incoming request: ${req.method} ${req.url}`);
  const parsedUrl = url.parse(req.url || '', true);

  if (parsedUrl.pathname === '/callback') {
    console.log('Received callback request:', req.url);
    console.log('Query parameters:', parsedUrl.query);

    const code = parsedUrl.query.code as string;

    if (!code) {
      if (parsedUrl.query.error) {
        console.error('OAuth Error:', parsedUrl.query.error, parsedUrl.query.error_description);
        res.end(`OAuth Error: ${parsedUrl.query.error}. Check terminal for details.`);
      } else {
        res.end('No code found in callback');
      }
      return;
    }

    try {
      const response = await axios.post('https://api.prod.whoop.com/oauth/oauth2/token', qs.stringify({
        grant_type: 'authorization_code',
        code,
        client_id: WHOOP_CLIENT_ID,
        client_secret: WHOOP_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
      }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const { refresh_token } = response.data;
      console.log(`
Success! Refresh token received.`);
      
      // Automatically update .env file
      updateEnvVariable('WHOOP_REFRESH_TOKEN', refresh_token);
      console.log('Successfully updated WHOOP_REFRESH_TOKEN in your .env file.');

      res.end('Success! You can close this tab and check your terminal.');
      setTimeout(() => process.exit(0), 1000);
    } catch (error: any) {
      console.error('Error exchanging code for token:', error.response?.data || error.message);
      res.end('Error exchanging code for token. Check terminal.');
    }
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Server is running. Please use the auth URL provided in the terminal.');
  }
});

server.listen(3000, () => {
  console.log('Listening for callback on http://localhost:3000/callback...');
});

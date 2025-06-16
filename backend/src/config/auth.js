const { google } = require('googleapis');
const config = require('./config');

// YouTube API configuration
const youtube = google.youtube({
    version: 'v3',
    auth: config.youtubeApiKey
});

// OAuth2 configuration
const oauth2Client = new google.auth.OAuth2(
    config.clientId,
    config.clientSecret,
    config.redirectUri
);

// Scopes required for YouTube API
const SCOPES = [
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/youtube.force-ssl'
];

// Generate OAuth URL
const getAuthUrl = () => {
    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        include_granted_scopes: true
    });
};

// Get tokens from code
const getTokens = async (code) => {
    try {
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);
        return tokens;
    } catch (error) {
        console.error('Error getting tokens:', error);
        throw error;
    }
};

// Verify API credentials
const verifyCredentials = async () => {
    try {
        // Verify YouTube API key
        await youtube.search.list({
            part: 'snippet',
            q: 'test',
            maxResults: 1
        });

        // Verify OAuth credentials
        if (!config.clientId || !config.clientSecret) {
            throw new Error('OAuth credentials not configured');
        }

        // Verify MongoDB connection
        if (!config.mongoUri) {
            throw new Error('MongoDB URI not configured');
        }

        // Verify Gemini API key
        if (!config.geminiApiKey) {
            throw new Error('Gemini API key not configured');
        }

        return true;
    } catch (error) {
        console.error('Credential verification failed:', error);
        return false;
    }
};

module.exports = {
    youtube,
    oauth2Client,
    getAuthUrl,
    getTokens,
    verifyCredentials,
    SCOPES
}; 
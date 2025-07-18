/**
 * Credentials Configuration
 * 
 * This is the single source of truth for all API keys and credentials.
 * Users only need to modify this file to add their credentials.
 * 
 * IMPORTANT: Never commit this file to version control.
 * Instead, commit the .env file with placeholder values.
 */

require('dotenv').config();

// Debug logging
console.log('Environment Variables:');
console.log('YOUTUBE_CLIENT_ID:', process.env.YOUTUBE_CLIENT_ID ? 'Present' : 'Missing');
console.log('YOUTUBE_CLIENT_SECRET:', process.env.YOUTUBE_CLIENT_SECRET ? 'Present' : 'Missing');
console.log('YOUTUBE_API_KEY:', process.env.YOUTUBE_API_KEY ? 'Present' : 'Missing');

const credentials = {
    // YouTube API Credentials
    youtube: {
        apiKey: process.env.YOUTUBE_API_KEY,
        clientId: process.env.YOUTUBE_CLIENT_ID,
        clientSecret: process.env.YOUTUBE_CLIENT_SECRET,
        redirectUri: process.env.YOUTUBE_REDIRECT_URI || 'https://ytbotbackend.onrender.com/auth/youtube/callback'
    },

    // Database Credentials
    database: {
        uri: process.env.MONGODB_URI
    },

    // AI Integration
    ai: {
        geminiApiKey: process.env.GEMINI_API_KEY
    },

    // Authentication
    auth: {
        jwtSecret: process.env.JWT_SECRET
    },

    // Application URLs
    urls: {
        client: process.env.CLIENT_URL || 'http://localhost:3000',
        api: process.env.API_URL || 'http://localhost:5000'
    }
};

// Validate required credentials
const validateCredentials = () => {
    const required = {
        'YouTube API Key': credentials.youtube.apiKey,
        'YouTube Client ID': credentials.youtube.clientId,
        'YouTube Client Secret': credentials.youtube.clientSecret,
        'MongoDB URI': credentials.database.uri,
        'Gemini API Key': credentials.ai.geminiApiKey,
        'JWT Secret': credentials.auth.jwtSecret
    };

    const missing = Object.entries(required)
        .filter(([_, value]) => !value)
        .map(([key]) => key);

    if (missing.length > 0) {
        console.error('\n❌ Missing required credentials:');
        missing.forEach(cred => console.error(`   - ${cred}`));
        console.error('\nPlease add the missing credentials to your .env file.');
        process.exit(1);
    }

    console.log('✅ All required credentials are present.');
};

// Export credentials and validation function
module.exports = {
    credentials,
    validateCredentials
}; 
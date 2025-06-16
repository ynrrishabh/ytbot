require('dotenv').config();

const config = {
    // Server configuration
    port: process.env.PORT || 5000,
    nodeEnv: process.env.NODE_ENV || 'development',
    
    // MongoDB configuration
    mongoUri: process.env.MONGODB_URI,
    
    // YouTube API configuration
    youtubeApiKey: process.env.YOUTUBE_API_KEY,
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.REDIRECT_URI,
    
    // Gemini AI configuration
    geminiApiKey: process.env.GEMINI_API_KEY,
    
    // JWT configuration
    jwtSecret: process.env.JWT_SECRET,
    
    // Client URL
    clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
    
    // Rate limiting
    rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100 // limit each IP to 100 requests per windowMs
    },
    
    // Points configuration
    points: {
        messageInterval: 5 * 60 * 1000, // 5 minutes
        pointsPerMessage: 1,
        maxPointsPerDay: 1000
    },
    
    // Stream configuration
    stream: {
        pollInterval: 5000, // 5 seconds
        maxRetries: 3,
        retryDelay: 1000 // 1 second
    }
};

// Validate required environment variables
const requiredEnvVars = [
    'MONGODB_URI',
    'YOUTUBE_API_KEY',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GEMINI_API_KEY',
    'JWT_SECRET'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
    console.error('Missing required environment variables:', missingEnvVars);
    process.exit(1);
}

module.exports = config; 
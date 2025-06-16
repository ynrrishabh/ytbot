const { google } = require('googleapis');
const jwt = require('jsonwebtoken');
const { credentials } = require('./credentials');
const User = require('../models/User');

/**
 * Authentication Configuration
 * 
 * This file centralizes all authentication-related functionality:
 * - Google OAuth2
 * - JWT token management
 * - YouTube API authentication
 * - Session management
 */

// Google OAuth2 Configuration
const oauth2Client = new google.auth.OAuth2(
    credentials.youtube.clientId,
    credentials.youtube.clientSecret,
    credentials.youtube.redirectUri
);

// Set API key for initial verification
oauth2Client.setCredentials({
    api_key: credentials.youtube.apiKey
});

// Required OAuth2 scopes
const SCOPES = [
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/youtube.force-ssl',
    'https://www.googleapis.com/auth/youtube'
];

// YouTube API client
const youtube = google.youtube({
    version: 'v3',
    auth: oauth2Client
});

// JWT Configuration
const JWT_CONFIG = {
    secret: credentials.auth.jwtSecret,
    expiresIn: '7d', // Token expires in 7 days
    refreshExpiresIn: '30d' // Refresh token expires in 30 days
};

// Authentication Methods
const auth = {
    // Generate OAuth URL
    getAuthUrl: () => {
        return oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
            include_granted_scopes: true,
            prompt: 'consent' // Force to get refresh token
        });
    },

    // Get tokens from code
    getTokens: async (code) => {
        try {
            const { tokens } = await oauth2Client.getToken(code);
            oauth2Client.setCredentials(tokens);
            return tokens;
        } catch (error) {
            console.error('Error getting tokens:', error);
            throw error;
        }
    },

    // Generate JWT token
    generateToken: (user) => {
        return jwt.sign(
            {
                id: user._id,
                youtubeId: user.youtubeId,
                channelId: user.channelId,
                isAdmin: user.isAdmin
            },
            JWT_CONFIG.secret,
            { expiresIn: JWT_CONFIG.expiresIn }
        );
    },

    // Generate refresh token
    generateRefreshToken: (user) => {
        return jwt.sign(
            { id: user._id },
            JWT_CONFIG.secret,
            { expiresIn: JWT_CONFIG.refreshExpiresIn }
        );
    },

    // Verify JWT token
    verifyToken: (token) => {
        try {
            return jwt.verify(token, JWT_CONFIG.secret);
        } catch (error) {
            throw new Error('Invalid token');
        }
    },

    // Refresh access token
    refreshAccessToken: async (refreshToken) => {
        try {
            oauth2Client.setCredentials({ refresh_token: refreshToken });
            const { credentials } = await oauth2Client.refreshAccessToken();
            return credentials;
        } catch (error) {
            throw new Error('Failed to refresh token');
        }
    },

    // Verify YouTube API credentials
    verifyYouTubeCredentials: async () => {
        try {
            await youtube.search.list({
                part: 'snippet',
                q: 'test',
                maxResults: 1
            });
            return true;
        } catch (error) {
            console.error('YouTube API verification failed:', error);
            return false;
        }
    },

    // Get user profile from YouTube
    getYouTubeProfile: async (accessToken) => {
        try {
            oauth2Client.setCredentials({ access_token: accessToken });
            const response = await youtube.channels.list({
                part: 'snippet,statistics',
                mine: true
            });
            return response.data.items[0];
        } catch (error) {
            console.error('Error fetching YouTube profile:', error);
            throw error;
        }
    },

    // Check if user has required permissions
    hasPermission: (user, requiredPermission) => {
        const permissions = {
            admin: user.isAdmin,
            moderator: user.isAdmin || user.isModerator,
            user: true
        };
        return permissions[requiredPermission] || false;
    },

    verifyChannelOwnership: async (accessToken, channelId) => {
        oauth2Client.setCredentials({ access_token: accessToken });
        
        try {
            const response = await youtube.channels.list({
                auth: oauth2Client,
                part: 'snippet',
                id: channelId
            });

            const channel = response.data.items[0];
            if (!channel) {
                return { isOwner: false };
            }

            // Verify the user has the necessary permissions
            const permissions = await youtube.channels.list({
                auth: oauth2Client,
                part: 'status',
                mine: true
            });

            return {
                isOwner: true,
                channel: channel
            };
        } catch (error) {
            console.error('Error verifying channel ownership:', error);
            return { isOwner: false };
        }
    }
};

// Middleware for protecting routes
const authMiddleware = {
    // Verify JWT token
    verifyToken: async (req, res, next) => {
        try {
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) {
                return res.status(401).json({ error: 'No token provided' });
            }

            const decoded = auth.verifyToken(token);
            const user = await User.findById(decoded.id);

            if (!user) {
                return res.status(401).json({ error: 'User not found' });
            }

            req.user = user;
            next();
        } catch (error) {
            res.status(401).json({ error: 'Invalid token' });
        }
    },

    // Check if user is admin
    requireAdmin: async (req, res, next) => {
        if (!req.user.isAdmin) {
            return res.status(403).json({ error: 'Admin access required' });
        }
        next();
    },

    // Check if user is moderator
    requireModerator: (req, res, next) => {
        if (!auth.hasPermission(req.user, 'moderator')) {
            return res.status(403).json({ error: 'Moderator access required' });
        }
        next();
    }
};

module.exports = {
    auth,
    authMiddleware,
    youtube,
    oauth2Client,
    SCOPES
}; 
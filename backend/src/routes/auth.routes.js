const express = require('express');
const router = express.Router();
const { auth, authMiddleware } = require('../config/auth.config');
const User = require('../models/User');

// Google OAuth login
router.get('/google', (req, res) => {
    const authUrl = auth.getAuthUrl();
    res.json({ authUrl });
});

// Google OAuth callback
router.get('/google/callback', async (req, res) => {
    try {
        const { code } = req.query;
        if (!code) {
            return res.status(400).json({ error: 'No code provided' });
        }

        // Get tokens from Google
        const tokens = await auth.getTokens(code);

        // Get user profile from YouTube
        const profile = await auth.getYouTubeProfile(tokens.access_token);

        // Verify channel ownership
        const channelDetails = await auth.verifyChannelOwnership(tokens.access_token, profile.id);
        if (!channelDetails.isOwner) {
            return res.status(403).json({ error: 'You must be the channel owner to use this bot' });
        }

        // Find or create user
        let user = await User.findOne({ youtubeId: profile.id });
        
        if (!user) {
            user = await User.create({
                youtubeId: profile.id,
                channelId: profile.id,
                displayName: profile.snippet.title,
                profilePicture: profile.snippet.thumbnails.default.url,
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                tokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
                settings: {
                    points: {
                        enabled: true,
                        pointsPerMessage: 1
                    }
                }
            });
        } else {
            // Update existing user's tokens and info
            user.accessToken = tokens.access_token;
            user.refreshToken = tokens.refresh_token;
            user.tokenExpiry = new Date(Date.now() + tokens.expires_in * 1000);
            user.displayName = profile.snippet.title;
            user.profilePicture = profile.snippet.thumbnails.default.url;
            await user.save();
        }

        // Generate JWT tokens
        const accessToken = auth.generateToken(user);
        const refreshToken = auth.generateRefreshToken(user);

        // Update user's tokens
        user.refreshToken = refreshToken;
        await user.save();

        // Redirect to frontend with tokens
        res.redirect(`${process.env.CLIENT_URL}/auth/callback?access_token=${accessToken}&refresh_token=${refreshToken}`);
    } catch (error) {
        console.error('Auth callback error:', error);
        res.redirect(`${process.env.CLIENT_URL}/auth/error`);
    }
});

// Refresh token
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ error: 'No refresh token provided' });
        }

        // Verify refresh token
        const decoded = auth.verifyToken(refreshToken);
        const user = await User.findById(decoded.id);

        if (!user || user.refreshToken !== refreshToken) {
            return res.status(401).json({ error: 'Invalid refresh token' });
        }

        // Generate new tokens
        const newAccessToken = auth.generateToken(user);
        const newRefreshToken = auth.generateRefreshToken(user);

        // Update user's refresh token
        user.refreshToken = newRefreshToken;
        await user.save();

        res.json({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken
        });
    } catch (error) {
        res.status(401).json({ error: 'Invalid refresh token' });
    }
});

// Get current user
router.get('/me', authMiddleware.verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-refreshToken');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Logout
router.post('/logout', authMiddleware.verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (user) {
            user.refreshToken = null;
            await user.save();
        }
        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router; 
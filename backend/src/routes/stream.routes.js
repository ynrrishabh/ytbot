const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../config/auth.config');
const youtubeService = require('../services/youtube.service');
const StreamSettings = require('../models/StreamSettings');

// Get stream status
router.get('/status/:channelId', authMiddleware.verifyToken, async (req, res) => {
    try {
        const { channelId } = req.params;
        const settings = await StreamSettings.findOne({ channelId });
        
        if (!settings) {
            return res.status(404).json({ error: 'Stream settings not found' });
        }

        const status = await youtubeService.checkLiveStatus(channelId);
        res.json({
            ...status,
            settings: {
                points: settings.points,
                commands: settings.commands,
                autoMessages: settings.autoMessages
            }
        });
    } catch (error) {
        console.error('Error getting stream status:', error);
        res.status(500).json({ error: 'Failed to get stream status' });
    }
});

// Start chat polling
router.post('/start/:channelId', authMiddleware.verifyToken, async (req, res) => {
    try {
        const { channelId } = req.params;
        const result = await youtubeService.startChatPolling(channelId, req.app.get('io'));
        res.json(result);
    } catch (error) {
        console.error('Error starting chat polling:', error);
        res.status(500).json({ error: 'Failed to start chat polling' });
    }
});

// Stop chat polling
router.post('/stop/:channelId', authMiddleware.verifyToken, async (req, res) => {
    try {
        const { channelId } = req.params;
        youtubeService.stopChatPolling(channelId);
        
        // Update stream settings
        await StreamSettings.findOneAndUpdate(
            { channelId },
            { 
                isLive: false,
                liveChatId: null,
                streamStartTime: null,
                videoId: null
            }
        );

        res.json({ message: 'Chat polling stopped' });
    } catch (error) {
        console.error('Error stopping chat polling:', error);
        res.status(500).json({ error: 'Failed to stop chat polling' });
    }
});

// Update stream settings
router.put('/settings/:channelId', authMiddleware.verifyToken, async (req, res) => {
    try {
        const { channelId } = req.params;
        const updates = req.body;

        const settings = await StreamSettings.findOneAndUpdate(
            { channelId },
            { $set: updates },
            { new: true }
        );

        if (!settings) {
            return res.status(404).json({ error: 'Stream settings not found' });
        }

        res.json(settings);
    } catch (error) {
        console.error('Error updating stream settings:', error);
        res.status(500).json({ error: 'Failed to update stream settings' });
    }
});

// Get stream settings
router.get('/settings/:channelId', authMiddleware.verifyToken, async (req, res) => {
    try {
        const { channelId } = req.params;
        const settings = await StreamSettings.findOne({ channelId });

        if (!settings) {
            return res.status(404).json({ error: 'Stream settings not found' });
        }

        res.json(settings);
    } catch (error) {
        console.error('Error getting stream settings:', error);
        res.status(500).json({ error: 'Failed to get stream settings' });
    }
});

// Get active viewers
router.get('/viewers/:channelId', authMiddleware.verifyToken, async (req, res) => {
    try {
        const { channelId } = req.params;
        const streamData = youtubeService.activeStreams.get(channelId);

        if (!streamData) {
            return res.json({ viewers: 0 });
        }

        // Get viewer count from YouTube API
        const response = await youtubeService.youtube.videos.list({
            part: 'liveStreamingDetails',
            id: streamData.videoId
        });

        const viewerCount = response.data.items[0]?.liveStreamingDetails?.concurrentViewers || 0;
        res.json({ viewers: viewerCount });
    } catch (error) {
        console.error('Error getting viewer count:', error);
        res.status(500).json({ error: 'Failed to get viewer count' });
    }
});

module.exports = router; 
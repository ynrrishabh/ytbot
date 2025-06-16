const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../config/auth.config');
const pointsService = require('../services/points.service');
const User = require('../models/user.model');

// Get user points
router.get('/:userId', authMiddleware.verifyToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const points = await pointsService.getUserPoints(userId);
        res.json({ points });
    } catch (error) {
        console.error('Error getting user points:', error);
        res.status(500).json({ error: 'Failed to get user points' });
    }
});

// Get channel leaderboard (now returns only current user's points and rank)
router.get('/leaderboard/:channelId', authMiddleware.verifyToken, async (req, res) => {
    try {
        const { channelId } = req.params;
        const userId = req.user.id;

        // Get all users in the channel, sorted by points
        const users = await User.find({ channelId }).sort({ points: -1 }).select('displayName points _id');

        // Find the current user and their rank
        const rank = users.findIndex(u => u._id.toString() === userId) + 1;
        const user = users.find(u => u._id.toString() === userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found in this channel' });
        }

        res.json({
            user: {
                displayName: user.displayName,
                points: user.points,
                rank: rank
            }
        });
    } catch (error) {
        console.error('Error getting leaderboard:', error);
        res.status(500).json({ error: 'Failed to get leaderboard' });
    }
});

// Process a gamble
router.post('/gamble/:channelId', authMiddleware.verifyToken, async (req, res) => {
    try {
        const { channelId } = req.params;
        const { amount } = req.body;
        const userId = req.user.id;

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid bet amount' });
        }

        const result = await pointsService.processGamble(userId, channelId, amount);
        
        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }

        res.json(result);
    } catch (error) {
        console.error('Error processing gamble:', error);
        res.status(500).json({ error: 'Failed to process gamble' });
    }
});

// Get user gamble history
router.get('/gamble/history/:userId', authMiddleware.verifyToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const history = await pointsService.getGambleHistory(userId);
        res.json(history);
    } catch (error) {
        console.error('Error getting gamble history:', error);
        res.status(500).json({ error: 'Failed to get gamble history' });
    }
});

// Get channel gambling statistics
router.get('/gamble/stats/:channelId', authMiddleware.verifyToken, async (req, res) => {
    try {
        const { channelId } = req.params;
        const stats = await pointsService.getGamblingStats(channelId);
        res.json(stats);
    } catch (error) {
        console.error('Error getting gambling stats:', error);
        res.status(500).json({ error: 'Failed to get gambling stats' });
    }
});

// Reset user points (admin only)
router.post('/reset/:userId', authMiddleware.verifyToken, authMiddleware.requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { channelId } = req.body;

        if (!channelId) {
            return res.status(400).json({ error: 'Channel ID is required' });
        }

        const user = await pointsService.resetPoints(userId, channelId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: 'Points reset successfully', user });
    } catch (error) {
        console.error('Error resetting points:', error);
        res.status(500).json({ error: 'Failed to reset points' });
    }
});

// Update user points (admin only)
router.post('/update/:userId', authMiddleware.verifyToken, authMiddleware.requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { channelId, points } = req.body;

        if (!channelId || points === undefined) {
            return res.status(400).json({ 
                error: 'Channel ID and points are required' 
            });
        }

        const newPoints = await pointsService.updatePoints(userId, channelId, points);
        
        if (newPoints === null) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ points: newPoints });
    } catch (error) {
        console.error('Error updating points:', error);
        res.status(500).json({ error: 'Failed to update points' });
    }
});

module.exports = router; 
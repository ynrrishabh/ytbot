const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../config/auth.config');
const autoMessageService = require('../services/autoMessage.service');

// Get all auto messages for a channel
router.get('/:channelId', authMiddleware.verifyToken, async (req, res) => {
    try {
        const { channelId } = req.params;
        const messages = await autoMessageService.getAutoMessages(channelId);
        res.json(messages);
    } catch (error) {
        console.error('Error getting auto messages:', error);
        res.status(500).json({ error: 'Failed to get auto messages' });
    }
});

// Get a specific auto message
router.get('/:channelId/:messageId', authMiddleware.verifyToken, async (req, res) => {
    try {
        const { channelId, messageId } = req.params;
        const message = await autoMessageService.getAutoMessage(channelId, messageId);
        
        if (!message) {
            return res.status(404).json({ error: 'Auto message not found' });
        }

        res.json(message);
    } catch (error) {
        console.error('Error getting auto message:', error);
        res.status(500).json({ error: 'Failed to get auto message' });
    }
});

// Create a new auto message
router.post('/:channelId', authMiddleware.verifyToken, async (req, res) => {
    try {
        const { channelId } = req.params;
        const messageData = req.body;

        // Validate required fields
        if (!messageData.message || !messageData.interval) {
            return res.status(400).json({ 
                error: 'Message content and interval are required' 
            });
        }

        const message = await autoMessageService.createAutoMessage(channelId, messageData);
        res.status(201).json(message);
    } catch (error) {
        console.error('Error creating auto message:', error);
        res.status(500).json({ error: 'Failed to create auto message' });
    }
});

// Update an auto message
router.put('/:channelId/:messageId', authMiddleware.verifyToken, async (req, res) => {
    try {
        const { channelId, messageId } = req.params;
        const updates = req.body;

        const message = await autoMessageService.updateAutoMessage(
            channelId,
            messageId,
            updates
        );

        if (!message) {
            return res.status(404).json({ error: 'Auto message not found' });
        }

        res.json(message);
    } catch (error) {
        console.error('Error updating auto message:', error);
        res.status(500).json({ error: 'Failed to update auto message' });
    }
});

// Delete an auto message
router.delete('/:channelId/:messageId', authMiddleware.verifyToken, async (req, res) => {
    try {
        const { channelId, messageId } = req.params;
        const message = await autoMessageService.deleteAutoMessage(channelId, messageId);
        
        if (!message) {
            return res.status(404).json({ error: 'Auto message not found' });
        }

        res.json({ message: 'Auto message deleted successfully', data: message });
    } catch (error) {
        console.error('Error deleting auto message:', error);
        res.status(500).json({ error: 'Failed to delete auto message' });
    }
});

// Toggle auto message status
router.patch('/:channelId/:messageId/toggle', authMiddleware.verifyToken, async (req, res) => {
    try {
        const { channelId, messageId } = req.params;
        const message = await autoMessageService.toggleAutoMessage(channelId, messageId);
        
        if (!message) {
            return res.status(404).json({ error: 'Auto message not found' });
        }

        res.json(message);
    } catch (error) {
        console.error('Error toggling auto message:', error);
        res.status(500).json({ error: 'Failed to toggle auto message' });
    }
});

// Get auto message statistics
router.get('/:channelId/stats', authMiddleware.verifyToken, async (req, res) => {
    try {
        const { channelId } = req.params;
        const stats = await autoMessageService.getAutoMessageStats(channelId);
        res.json(stats);
    } catch (error) {
        console.error('Error getting auto message stats:', error);
        res.status(500).json({ error: 'Failed to get auto message stats' });
    }
});

// Test an auto message
router.post('/:channelId/:messageId/test', authMiddleware.verifyToken, async (req, res) => {
    try {
        const { channelId, messageId } = req.params;
        const message = await autoMessageService.getAutoMessage(channelId, messageId);
        
        if (!message) {
            return res.status(404).json({ error: 'Auto message not found' });
        }

        await autoMessageService.sendMessage(channelId, message);
        res.json({ message: 'Test message sent successfully' });
    } catch (error) {
        console.error('Error testing auto message:', error);
        res.status(500).json({ error: 'Failed to test auto message' });
    }
});

module.exports = router; 
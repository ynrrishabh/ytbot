const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../config/auth.config');
const commandService = require('../services/command.service');

// Get all commands for a channel
router.get('/:channelId', authMiddleware.verifyToken, async (req, res) => {
    try {
        const { channelId } = req.params;
        const commands = await commandService.getCommands(channelId);
        res.json(commands);
    } catch (error) {
        console.error('Error getting commands:', error);
        res.status(500).json({ error: 'Failed to get commands' });
    }
});

// Get a specific command
router.get('/:channelId/:commandName', authMiddleware.verifyToken, async (req, res) => {
    try {
        const { channelId, commandName } = req.params;
        const command = await commandService.getCommand(channelId, commandName);
        
        if (!command) {
            return res.status(404).json({ error: 'Command not found' });
        }

        res.json(command);
    } catch (error) {
        console.error('Error getting command:', error);
        res.status(500).json({ error: 'Failed to get command' });
    }
});

// Create a new command
router.post('/:channelId', authMiddleware.verifyToken, async (req, res) => {
    try {
        const { channelId } = req.params;
        const commandData = req.body;

        // Validate required fields
        if (!commandData.name || !commandData.response) {
            return res.status(400).json({ error: 'Name and response are required' });
        }

        const command = await commandService.createCommand(channelId, commandData);
        res.status(201).json(command);
    } catch (error) {
        console.error('Error creating command:', error);
        res.status(500).json({ error: 'Failed to create command' });
    }
});

// Update a command
router.put('/:channelId/:commandName', authMiddleware.verifyToken, async (req, res) => {
    try {
        const { channelId, commandName } = req.params;
        const updates = req.body;

        const command = await commandService.updateCommand(channelId, commandName, updates);
        res.json(command);
    } catch (error) {
        console.error('Error updating command:', error);
        res.status(500).json({ error: 'Failed to update command' });
    }
});

// Delete a command
router.delete('/:channelId/:commandName', authMiddleware.verifyToken, async (req, res) => {
    try {
        const { channelId, commandName } = req.params;
        const command = await commandService.deleteCommand(channelId, commandName);
        res.json({ message: 'Command deleted successfully', command });
    } catch (error) {
        console.error('Error deleting command:', error);
        res.status(500).json({ error: 'Failed to delete command' });
    }
});

// Toggle command status
router.patch('/:channelId/:commandName/toggle', authMiddleware.verifyToken, async (req, res) => {
    try {
        const { channelId, commandName } = req.params;
        const command = await commandService.toggleCommand(channelId, commandName);
        res.json(command);
    } catch (error) {
        console.error('Error toggling command:', error);
        res.status(500).json({ error: 'Failed to toggle command' });
    }
});

// Get command statistics
router.get('/:channelId/stats', authMiddleware.verifyToken, async (req, res) => {
    try {
        const { channelId } = req.params;
        const stats = await commandService.getCommandStats(channelId);
        res.json(stats);
    } catch (error) {
        console.error('Error getting command stats:', error);
        res.status(500).json({ error: 'Failed to get command stats' });
    }
});

// Get most used commands
router.get('/:channelId/most-used', authMiddleware.verifyToken, async (req, res) => {
    try {
        const { channelId } = req.params;
        const { limit } = req.query;
        const commands = await commandService.getMostUsedCommands(channelId, parseInt(limit));
        res.json(commands);
    } catch (error) {
        console.error('Error getting most used commands:', error);
        res.status(500).json({ error: 'Failed to get most used commands' });
    }
});

// Test a command
router.post('/:channelId/:commandName/test', authMiddleware.verifyToken, async (req, res) => {
    try {
        const { channelId, commandName } = req.params;
        const { args = [] } = req.body;
        
        const result = await commandService.processCommand(
            channelId,
            req.user.id,
            commandName,
            args
        );

        if (!result) {
            return res.status(404).json({ error: 'Command not found or inactive' });
        }

        if (result.error) {
            return res.status(400).json({ error: result.error });
        }

        res.json(result);
    } catch (error) {
        console.error('Error testing command:', error);
        res.status(500).json({ error: 'Failed to test command' });
    }
});

module.exports = router; 
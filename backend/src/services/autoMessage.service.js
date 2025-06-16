const AutoMessage = require('../models/AutoMessage');
const StreamSettings = require('../models/StreamSettings');
const { getIO } = require('../config/socket.config');

class AutoMessageService {
    constructor() {
        this.schedulers = new Map(); // Map of channelId -> scheduler
    }

    // Create a new auto message
    async createAutoMessage(channelId, messageData) {
        try {
            const autoMessage = new AutoMessage({
                channelId,
                ...messageData,
                nextSend: this.calculateNextSend(messageData.interval)
            });

            await autoMessage.save();
            this.startScheduler(channelId);
            return autoMessage;
        } catch (error) {
            console.error('Error creating auto message:', error);
            throw error;
        }
    }

    // Get all auto messages for a channel
    async getAutoMessages(channelId) {
        try {
            return await AutoMessage.find({ channelId });
        } catch (error) {
            console.error('Error getting auto messages:', error);
            throw error;
        }
    }

    // Get a specific auto message
    async getAutoMessage(channelId, messageId) {
        try {
            return await AutoMessage.findOne({ channelId, _id: messageId });
        } catch (error) {
            console.error('Error getting auto message:', error);
            throw error;
        }
    }

    // Update an auto message
    async updateAutoMessage(channelId, messageId, updates) {
        try {
            const autoMessage = await AutoMessage.findOneAndUpdate(
                { channelId, _id: messageId },
                { 
                    ...updates,
                    nextSend: updates.interval ? this.calculateNextSend(updates.interval) : undefined
                },
                { new: true }
            );

            if (autoMessage) {
                this.startScheduler(channelId);
            }

            return autoMessage;
        } catch (error) {
            console.error('Error updating auto message:', error);
            throw error;
        }
    }

    // Delete an auto message
    async deleteAutoMessage(channelId, messageId) {
        try {
            const autoMessage = await AutoMessage.findOneAndDelete({ channelId, _id: messageId });
            
            if (autoMessage) {
                const remainingMessages = await AutoMessage.countDocuments({ channelId });
                if (remainingMessages === 0) {
                    this.stopScheduler(channelId);
                }
            }

            return autoMessage;
        } catch (error) {
            console.error('Error deleting auto message:', error);
            throw error;
        }
    }

    // Toggle auto message status
    async toggleAutoMessage(channelId, messageId) {
        try {
            const autoMessage = await AutoMessage.findOne({ channelId, _id: messageId });
            if (!autoMessage) return null;

            autoMessage.isActive = !autoMessage.isActive;
            await autoMessage.save();

            if (autoMessage.isActive) {
                this.startScheduler(channelId);
            } else {
                const activeMessages = await AutoMessage.countDocuments({ 
                    channelId, 
                    isActive: true 
                });
                if (activeMessages === 0) {
                    this.stopScheduler(channelId);
                }
            }

            return autoMessage;
        } catch (error) {
            console.error('Error toggling auto message:', error);
            throw error;
        }
    }

    // Start scheduler for a channel
    async startScheduler(channelId) {
        try {
            // Stop existing scheduler if any
            this.stopScheduler(channelId);

            // Get all active auto messages for the channel
            const autoMessages = await AutoMessage.find({ 
                channelId, 
                isActive: true 
            });

            if (autoMessages.length === 0) return;

            // Create new scheduler
            const scheduler = setInterval(async () => {
                try {
                    const streamSettings = await StreamSettings.findOne({ channelId });
                    if (!streamSettings || !streamSettings.isLive) return;

                    const messages = await AutoMessage.find({
                        channelId,
                        isActive: true,
                        nextSend: { $lte: new Date() }
                    });

                    for (const message of messages) {
                        if (this.checkConditions(message, streamSettings)) {
                            await this.sendMessage(channelId, message);
                            message.lastSent = new Date();
                            message.nextSend = this.calculateNextSend(message.interval);
                            await message.save();
                        }
                    }
                } catch (error) {
                    console.error('Error in auto message scheduler:', error);
                }
            }, 60000); // Check every minute

            this.schedulers.set(channelId, scheduler);
        } catch (error) {
            console.error('Error starting scheduler:', error);
            throw error;
        }
    }

    // Stop scheduler for a channel
    stopScheduler(channelId) {
        const scheduler = this.schedulers.get(channelId);
        if (scheduler) {
            clearInterval(scheduler);
            this.schedulers.delete(channelId);
        }
    }

    // Check if conditions are met for sending a message
    checkConditions(message, streamSettings) {
        if (!message.conditions) return true;

        const { minViewers, maxViewers, streamDuration } = message.conditions;
        const currentViewers = streamSettings.viewerCount;
        const currentDuration = (Date.now() - streamSettings.streamStartTime) / 1000;

        if (minViewers && currentViewers < minViewers) return false;
        if (maxViewers && currentViewers > maxViewers) return false;
        if (streamDuration && currentDuration < streamDuration) return false;

        return true;
    }

    // Send a message to the chat
    async sendMessage(channelId, message) {
        try {
            const io = getIO();
            if (io) {
                io.to(channelId).emit('chat-message', {
                    type: 'auto-message',
                    message: message.message,
                    priority: message.priority
                });
            }
        } catch (error) {
            console.error('Error sending auto message:', error);
            throw error;
        }
    }

    // Calculate next send time based on interval
    calculateNextSend(interval) {
        const now = new Date();
        return new Date(now.getTime() + interval * 1000);
    }

    // Get auto message statistics
    async getAutoMessageStats(channelId) {
        try {
            const stats = await AutoMessage.aggregate([
                { $match: { channelId } },
                {
                    $group: {
                        _id: null,
                        totalMessages: { $sum: 1 },
                        activeMessages: {
                            $sum: { $cond: ['$isActive', 1, 0] }
                        },
                        totalSent: { $sum: '$usageCount' }
                    }
                }
            ]);

            return stats[0] || {
                totalMessages: 0,
                activeMessages: 0,
                totalSent: 0
            };
        } catch (error) {
            console.error('Error getting auto message stats:', error);
            throw error;
        }
    }
}

module.exports = new AutoMessageService(); 
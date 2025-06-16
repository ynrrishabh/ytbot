const { youtube } = require('../config/auth.config');
const StreamSettings = require('../models/StreamSettings');
const User = require('../models/User');
const Command = require('../models/Command');
const AutoMessage = require('../models/AutoMessage');

class YouTubeService {
    constructor() {
        this.activeStreams = new Map(); // Map of channelId -> stream data
        this.chatPollingIntervals = new Map(); // Map of channelId -> interval
    }

    // Check if a channel is live
    async checkLiveStatus(channelId) {
        try {
            const response = await youtube.search.list({
                part: 'snippet',
                channelId: channelId,
                type: 'video',
                eventType: 'live',
                maxResults: 1
            });

            const isLive = response.data.items.length > 0;
            if (isLive) {
                const liveStream = response.data.items[0];
                return {
                    isLive: true,
                    videoId: liveStream.id.videoId,
                    title: liveStream.snippet.title,
                    thumbnail: liveStream.snippet.thumbnails.high.url,
                    startTime: liveStream.snippet.publishedAt
                };
            }

            return { isLive: false };
        } catch (error) {
            console.error('Error checking live status:', error);
            throw error;
        }
    }

    // Get live chat ID for a video
    async getLiveChatId(videoId) {
        try {
            const response = await youtube.videos.list({
                part: 'liveStreamingDetails',
                id: videoId
            });

            return response.data.items[0]?.liveStreamingDetails?.activeLiveChatId;
        } catch (error) {
            console.error('Error getting live chat ID:', error);
            throw error;
        }
    }

    // Start polling chat messages for a channel
    async startChatPolling(channelId, io) {
        try {
            // Check if already polling
            if (this.chatPollingIntervals.has(channelId)) {
                return;
            }

            // Get stream settings
            const settings = await StreamSettings.findOne({ channelId });
            if (!settings) {
                throw new Error('Stream settings not found');
            }

            // Get live status
            const liveStatus = await this.checkLiveStatus(channelId);
            if (!liveStatus.isLive) {
                throw new Error('Channel is not live');
            }

            // Get live chat ID
            const liveChatId = await this.getLiveChatId(liveStatus.videoId);
            if (!liveChatId) {
                throw new Error('Live chat not found');
            }

            // Update stream settings
            settings.isLive = true;
            settings.liveChatId = liveChatId;
            settings.streamStartTime = liveStatus.startTime;
            settings.videoId = liveStatus.videoId;
            await settings.save();

            // Store stream data
            this.activeStreams.set(channelId, {
                liveChatId,
                videoId: liveStatus.videoId,
                startTime: liveStatus.startTime,
                lastPollTime: new Date().toISOString()
            });

            // Start polling
            const interval = setInterval(async () => {
                try {
                    await this.pollChatMessages(channelId, liveChatId, io);
                } catch (error) {
                    console.error('Error polling chat messages:', error);
                }
            }, 5000); // Poll every 5 seconds

            this.chatPollingIntervals.set(channelId, interval);
            console.log(`Started polling chat for channel ${channelId}`);

            return {
                isLive: true,
                videoId: liveStatus.videoId,
                title: liveStatus.title,
                thumbnail: liveStatus.thumbnail
            };
        } catch (error) {
            console.error('Error starting chat polling:', error);
            throw error;
        }
    }

    // Stop polling chat messages
    stopChatPolling(channelId) {
        const interval = this.chatPollingIntervals.get(channelId);
        if (interval) {
            clearInterval(interval);
            this.chatPollingIntervals.delete(channelId);
            this.activeStreams.delete(channelId);
            console.log(`Stopped polling chat for channel ${channelId}`);
        }
    }

    // Poll chat messages
    async pollChatMessages(channelId, liveChatId, io) {
        try {
            const streamData = this.activeStreams.get(channelId);
            if (!streamData) {
                throw new Error('Stream data not found');
            }

            const response = await youtube.liveChatMessages.list({
                liveChatId: liveChatId,
                part: 'snippet,authorDetails'
            });

            const messages = response.data.items;
            const settings = await StreamSettings.findOne({ channelId });

            // Process each message
            for (const message of messages) {
                const { authorDetails, snippet } = message;
                
                // Update or create user
                let user = await User.findOne({ youtubeId: authorDetails.channelId });
                if (!user) {
                    user = await User.create({
                        youtubeId: authorDetails.channelId,
                        displayName: authorDetails.displayName,
                        profilePicture: authorDetails.profileImageUrl,
                        points: 0
                    });
                }

                // Process points
                if (settings.points.enabled) {
                    const lastMessageTime = user.lastMessageTime || new Date(0);
                    const timeSinceLastMessage = Date.now() - lastMessageTime.getTime();
                    
                    if (timeSinceLastMessage >= settings.points.messageInterval) {
                        user.points += settings.points.pointsPerMessage;
                        user.lastMessageTime = new Date();
                        await user.save();
                    }
                }

                // Process commands
                if (snippet.displayMessage.startsWith('!')) {
                    await this.processCommand(channelId, user, snippet.displayMessage, io);
                }

                // Emit message to connected clients
                io.to(`channel:${channelId}`).emit('chat-message', {
                    id: message.id,
                    author: {
                        id: authorDetails.channelId,
                        name: authorDetails.displayName,
                        image: authorDetails.profileImageUrl,
                        isModerator: authorDetails.isChatModerator,
                        isOwner: authorDetails.isChatOwner
                    },
                    message: snippet.displayMessage,
                    timestamp: snippet.publishedAt
                });
            }

            // Update last poll time
            streamData.lastPollTime = new Date().toISOString();
            this.activeStreams.set(channelId, streamData);

            // Check auto messages
            await this.checkAutoMessages(channelId, io);

        } catch (error) {
            console.error('Error polling chat messages:', error);
            throw error;
        }
    }

    // Process bot commands
    async processCommand(channelId, user, message, io) {
        try {
            const [commandName, ...args] = message.slice(1).split(' ');
            const command = await Command.findOne({
                channelId,
                name: commandName.toLowerCase(),
                isActive: true
            });

            if (!command) return;

            // Check cooldown
            const now = Date.now();
            if (command.lastUsed && now - command.lastUsed < command.cooldown) {
                return;
            }

            // Check permissions
            if (command.permissions === 'moderator' && !user.isModerator) {
                return;
            }

            // Check cost
            if (command.cost > 0 && user.points < command.cost) {
                return;
            }

            // Process command
            let response = command.response;
            
            // Replace variables
            response = response
                .replace('{user}', user.displayName)
                .replace('{points}', user.points)
                .replace('{args}', args.join(' '));

            // Update command usage
            command.lastUsed = now;
            command.usage += 1;
            await command.save();

            // Deduct points if command has cost
            if (command.cost > 0) {
                user.points -= command.cost;
                await user.save();
            }

            // Emit command response
            io.to(`channel:${channelId}`).emit('bot-response', {
                command: commandName,
                response,
                user: user.displayName
            });

        } catch (error) {
            console.error('Error processing command:', error);
        }
    }

    // Check and send auto messages
    async checkAutoMessages(channelId, io) {
        try {
            const now = Date.now();
            const autoMessages = await AutoMessage.find({
                channelId,
                isActive: true,
                nextSend: { $lte: now }
            });

            for (const message of autoMessages) {
                // Check conditions
                const streamData = this.activeStreams.get(channelId);
                if (!streamData) continue;

                const conditions = message.conditions;
                if (conditions) {
                    // Add condition checks here (viewers, stream duration, etc.)
                }

                // Send message
                io.to(`channel:${channelId}`).emit('bot-message', {
                    message: message.message,
                    priority: message.priority
                });

                // Update next send time
                message.lastSent = now;
                message.nextSend = now + message.interval;
                await message.save();
            }
        } catch (error) {
            console.error('Error checking auto messages:', error);
        }
    }
}

module.exports = new YouTubeService(); 
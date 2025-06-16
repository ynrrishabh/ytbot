const User = require('../models/User');
const StreamSettings = require('../models/StreamSettings');

class PointsService {
    // Calculate points for a user based on watch time and chat activity
    async calculatePoints(userId, channelId, watchTime, messageCount) {
        try {
            const streamSettings = await StreamSettings.findOne({ channelId });
            if (!streamSettings) return 0;

            const { pointsPerMinute, pointsPerMessage } = streamSettings.settings.points;
            const watchTimePoints = Math.floor(watchTime / 60) * pointsPerMinute;
            const messagePoints = messageCount * pointsPerMessage;

            return watchTimePoints + messagePoints;
        } catch (error) {
            console.error('Error calculating points:', error);
            throw error;
        }
    }

    // Update user points
    async updatePoints(userId, channelId, points) {
        try {
            const user = await User.findOne({ youtubeId: userId });
            if (!user) return null;

            user.points += points;
            await user.save();

            return user.points;
        } catch (error) {
            console.error('Error updating points:', error);
            throw error;
        }
    }

    // Get user points
    async getUserPoints(userId) {
        try {
            const user = await User.findOne({ youtubeId: userId });
            return user ? user.points : 0;
        } catch (error) {
            console.error('Error getting user points:', error);
            throw error;
        }
    }

    // Get channel leaderboard
    async getLeaderboard(channelId, limit = 10) {
        try {
            const users = await User.find({ channelId })
                .sort({ points: -1 })
                .limit(limit)
                .select('youtubeId displayName profilePicture points');

            return users;
        } catch (error) {
            console.error('Error getting leaderboard:', error);
            throw error;
        }
    }

    // Process a gamble
    async processGamble(userId, channelId, amount) {
        try {
            const user = await User.findOne({ youtubeId: userId });
            if (!user || user.points < amount) {
                return {
                    success: false,
                    error: 'Insufficient points'
                };
            }

            const streamSettings = await StreamSettings.findOne({ channelId });
            if (!streamSettings) {
                return {
                    success: false,
                    error: 'Stream settings not found'
                };
            }

            const { minBet, maxBet, winChance, winMultiplier } = streamSettings.settings.gambling;

            // Validate bet amount
            if (amount < minBet || amount > maxBet) {
                return {
                    success: false,
                    error: `Bet amount must be between ${minBet} and ${maxBet} points`
                };
            }

            // Process gamble
            const win = Math.random() < winChance;
            const pointsChange = win ? amount * winMultiplier : -amount;

            // Update user points
            user.points += pointsChange;
            
            // Record gamble history
            user.gambleHistory.push({
                amount,
                result: win ? 'win' : 'loss',
                pointsChange,
                timestamp: new Date()
            });

            // Keep only last 10 gambles
            if (user.gambleHistory.length > 10) {
                user.gambleHistory = user.gambleHistory.slice(-10);
            }

            await user.save();

            return {
                success: true,
                win,
                pointsChange,
                newBalance: user.points
            };
        } catch (error) {
            console.error('Error processing gamble:', error);
            throw error;
        }
    }

    // Get user gamble history
    async getGambleHistory(userId) {
        try {
            const user = await User.findOne({ youtubeId: userId });
            return user ? user.gambleHistory : [];
        } catch (error) {
            console.error('Error getting gamble history:', error);
            throw error;
        }
    }

    // Get channel gambling statistics
    async getGamblingStats(channelId) {
        try {
            const stats = await User.aggregate([
                { $match: { channelId } },
                {
                    $group: {
                        _id: null,
                        totalGambles: { $sum: { $size: '$gambleHistory' } },
                        totalWins: {
                            $sum: {
                                $size: {
                                    $filter: {
                                        input: '$gambleHistory',
                                        as: 'gamble',
                                        cond: { $eq: ['$$gamble.result', 'win'] }
                                    }
                                }
                            }
                        },
                        totalLosses: {
                            $sum: {
                                $size: {
                                    $filter: {
                                        input: '$gambleHistory',
                                        as: 'gamble',
                                        cond: { $eq: ['$$gamble.result', 'loss'] }
                                    }
                                }
                            }
                        },
                        totalPointsWon: {
                            $sum: {
                                $sum: {
                                    $map: {
                                        input: '$gambleHistory',
                                        as: 'gamble',
                                        in: {
                                            $cond: [
                                                { $eq: ['$$gamble.result', 'win'] },
                                                '$$gamble.pointsChange',
                                                0
                                            ]
                                        }
                                    }
                                }
                            }
                        },
                        totalPointsLost: {
                            $sum: {
                                $sum: {
                                    $map: {
                                        input: '$gambleHistory',
                                        as: 'gamble',
                                        in: {
                                            $cond: [
                                                { $eq: ['$$gamble.result', 'loss'] },
                                                { $abs: '$$gamble.pointsChange' },
                                                0
                                            ]
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            ]);

            return stats[0] || {
                totalGambles: 0,
                totalWins: 0,
                totalLosses: 0,
                totalPointsWon: 0,
                totalPointsLost: 0
            };
        } catch (error) {
            console.error('Error getting gambling stats:', error);
            throw error;
        }
    }

    // Reset user points (admin only)
    async resetPoints(userId, channelId) {
        try {
            const user = await User.findOne({ youtubeId: userId });
            if (!user) return null;

            user.points = 0;
            user.gambleHistory = [];
            await user.save();

            return user;
        } catch (error) {
            console.error('Error resetting points:', error);
            throw error;
        }
    }
}

module.exports = new PointsService(); 
const Command = require('../models/Command');
const User = require('../models/User');

class CommandService {
    // Create a new command
    async createCommand(channelId, commandData) {
        try {
            const command = await Command.create({
                channelId,
                ...commandData,
                usage: 0,
                lastUsed: null
            });
            return command;
        } catch (error) {
            console.error('Error creating command:', error);
            throw error;
        }
    }

    // Get all commands for a channel
    async getCommands(channelId) {
        try {
            return await Command.find({ channelId });
        } catch (error) {
            console.error('Error getting commands:', error);
            throw error;
        }
    }

    // Get a specific command
    async getCommand(channelId, commandName) {
        try {
            return await Command.findOne({
                channelId,
                name: commandName.toLowerCase()
            });
        } catch (error) {
            console.error('Error getting command:', error);
            throw error;
        }
    }

    // Update a command
    async updateCommand(channelId, commandName, updates) {
        try {
            const command = await Command.findOneAndUpdate(
                {
                    channelId,
                    name: commandName.toLowerCase()
                },
                { $set: updates },
                { new: true }
            );

            if (!command) {
                throw new Error('Command not found');
            }

            return command;
        } catch (error) {
            console.error('Error updating command:', error);
            throw error;
        }
    }

    // Delete a command
    async deleteCommand(channelId, commandName) {
        try {
            const command = await Command.findOneAndDelete({
                channelId,
                name: commandName.toLowerCase()
            });

            if (!command) {
                throw new Error('Command not found');
            }

            return command;
        } catch (error) {
            console.error('Error deleting command:', error);
            throw error;
        }
    }

    // Process a command
    async processCommand(channelId, userId, commandName, args = []) {
        try {
            const command = await this.getCommand(channelId, commandName);
            if (!command || !command.isActive) {
                return null;
            }

            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Check cooldown
            const now = Date.now();
            if (command.lastUsed && now - command.lastUsed < command.cooldown) {
                const remainingTime = Math.ceil((command.cooldown - (now - command.lastUsed)) / 1000);
                return {
                    error: `Command on cooldown. Try again in ${remainingTime} seconds.`
                };
            }

            // Check permissions
            if (command.permissions === 'moderator' && !user.isModerator) {
                return {
                    error: 'You need moderator permissions to use this command.'
                };
            }

            // Check cost
            if (command.cost > 0 && user.points < command.cost) {
                return {
                    error: `You need ${command.cost} points to use this command.`
                };
            }

            // Process command response
            let response = command.response;
            
            // Replace variables
            response = response
                .replace(/{user}/g, user.displayName)
                .replace(/{points}/g, user.points)
                .replace(/{args}/g, args.join(' '))
                .replace(/{channel}/g, user.channelId);

            // Update command usage
            command.lastUsed = now;
            command.usage += 1;
            await command.save();

            // Deduct points if command has cost
            if (command.cost > 0) {
                user.points -= command.cost;
                await user.save();
            }

            return {
                response,
                command: commandName,
                user: user.displayName
            };
        } catch (error) {
            console.error('Error processing command:', error);
            throw error;
        }
    }

    // Get command usage statistics
    async getCommandStats(channelId) {
        try {
            const stats = await Command.aggregate([
                { $match: { channelId } },
                {
                    $group: {
                        _id: null,
                        totalCommands: { $sum: 1 },
                        totalUsage: { $sum: '$usage' },
                        activeCommands: {
                            $sum: { $cond: ['$isActive', 1, 0] }
                        }
                    }
                }
            ]);

            return stats[0] || {
                totalCommands: 0,
                totalUsage: 0,
                activeCommands: 0
            };
        } catch (error) {
            console.error('Error getting command stats:', error);
            throw error;
        }
    }

    // Get most used commands
    async getMostUsedCommands(channelId, limit = 5) {
        try {
            return await Command.find({ channelId })
                .sort({ usage: -1 })
                .limit(limit);
        } catch (error) {
            console.error('Error getting most used commands:', error);
            throw error;
        }
    }

    // Toggle command status
    async toggleCommand(channelId, commandName) {
        try {
            const command = await Command.findOne({
                channelId,
                name: commandName.toLowerCase()
            });

            if (!command) {
                throw new Error('Command not found');
            }

            command.isActive = !command.isActive;
            await command.save();

            return command;
        } catch (error) {
            console.error('Error toggling command:', error);
            throw error;
        }
    }
}

module.exports = new CommandService(); 
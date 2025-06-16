const mongoose = require('mongoose');

const streamSettingsSchema = new mongoose.Schema({
    channelId: {
        type: String,
        required: true,
        unique: true
    },
    isLive: {
        type: Boolean,
        default: false
    },
    liveChatId: {
        type: String,
        default: null
    },
    streamStartTime: {
        type: Date,
        default: null
    },
    settings: {
        pointsPerMinute: {
            type: Number,
            default: 1
        },
        gambleEnabled: {
            type: Boolean,
            default: true
        },
        minGambleAmount: {
            type: Number,
            default: 10
        },
        maxGambleAmount: {
            type: Number,
            default: 1000
        },
        aiEnabled: {
            type: Boolean,
            default: true
        },
        welcomeMessage: {
            type: String,
            default: "Welcome to the stream!"
        },
        autoMessagesEnabled: {
            type: Boolean,
            default: true
        },
        commandsEnabled: {
            type: Boolean,
            default: true
        }
    },
    activeCommands: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Command'
    }],
    activeAutoMessages: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AutoMessage'
    }],
    lastPollTime: {
        type: Date,
        default: null
    },
    viewerCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Indexes for better query performance
streamSettingsSchema.index({ channelId: 1 });
streamSettingsSchema.index({ isLive: 1 });
streamSettingsSchema.index({ lastPollTime: 1 });

module.exports = mongoose.model('StreamSettings', streamSettingsSchema); 
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    youtubeId: {
        type: String,
        required: true,
        unique: true
    },
    channelId: {
        type: String,
        required: true
    },
    displayName: {
        type: String,
        required: true
    },
    profilePicture: String,
    points: {
        type: Number,
        default: 0
    },
    watchTime: {
        type: Number,
        default: 0 // in seconds
    },
    lastSeen: {
        type: Date,
        default: Date.now
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    settings: {
        autoMessages: [{
            message: String,
            interval: Number, // in minutes
            isActive: Boolean
        }],
        commands: [{
            name: String,
            response: String,
            cooldown: Number, // in seconds
            isActive: Boolean
        }]
    },
    gambleHistory: [{
        amount: Number,
        result: Boolean,
        timestamp: Date
    }]
}, {
    timestamps: true
});

// Indexes for better query performance
userSchema.index({ youtubeId: 1 });
userSchema.index({ channelId: 1 });
userSchema.index({ points: -1 }); // For leaderboard queries

module.exports = mongoose.model('User', userSchema); 
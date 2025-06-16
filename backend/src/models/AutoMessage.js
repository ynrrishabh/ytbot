const mongoose = require('mongoose');

const autoMessageSchema = new mongoose.Schema({
    channelId: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    interval: {
        type: Number,
        required: true // in minutes
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastSent: {
        type: Date,
        default: null
    },
    nextSend: {
        type: Date,
        default: null
    },
    priority: {
        type: Number,
        default: 0 // higher number = higher priority
    },
    conditions: {
        minViewers: {
            type: Number,
            default: 0
        },
        maxViewers: {
            type: Number,
            default: null
        },
        streamDuration: {
            type: Number,
            default: 0 // minimum stream duration in minutes
        }
    }
}, {
    timestamps: true
});

// Indexes for better query performance
autoMessageSchema.index({ channelId: 1 });
autoMessageSchema.index({ isActive: 1 });
autoMessageSchema.index({ nextSend: 1 });

module.exports = mongoose.model('AutoMessage', autoMessageSchema); 
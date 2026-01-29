// backend/src/models/Video.js

const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
    originalName: { type: String, required: true },
    fileName: { type: String, required: true },
    filePath: { type: String, required: true },
    processedPath: { type: String, default: null },
    subtitlePath: { type: String, default: null },
    transcription: { type: String, default: '' },
    status: {
        type: String,
        enum: ['uploaded', 'processing', 'completed', 'failed'],
        default: 'uploaded'
    },
    subtitleSettings: {
        style: { type: String, default: 'classic' },
        fontSize: { type: Number, default: 24 },
        fontColor: { type: String, default: '#FFFFFF' },
        bgColor: { type: String, default: 'transparent' },
        position: { type: String, default: 'bottom' },
        fontFamily: { type: String, default: 'Arial' }
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Video', videoSchema);
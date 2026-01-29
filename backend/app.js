// backend/app.js

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const ffmpegInstaller = require('fluent-ffmpeg');

// Load environment variables
dotenv.config();

// ✅ SET FFMPEG & FFPROBE PATH (Forward slashes use karo)
ffmpegInstaller.setFfmpegPath('C:/ffmpeg/bin/ffmpeg.exe');
ffmpegInstaller.setFfprobePath('C:/ffmpeg/bin/ffprobe.exe');

console.log('🎬 FFmpeg configured');

const videoRoutes = require('./src/routes/videoRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static folders
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/processed', express.static(path.join(__dirname, 'processed')));

// Routes
app.use('/api/videos', videoRoutes);

// Basic route
app.get('/', (req, res) => {
    res.json({ 
        message: 'Video Subtitle Tool API is running!',
        status: 'OK' 
    });
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        error: 'Something went wrong!',
        message: err.message 
    });
});

// Database Connection
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB Connected Successfully');
    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error.message);
        process.exit(1);
    }
};

// Start Server
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
});

module.exports = app;
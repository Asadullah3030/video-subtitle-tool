// backend/src/controllers/videoController.js

const Video = require('../models/Video');
const speechToTextService = require('../services/speechToText');
const subtitleService = require('../services/subtitleService');
const path = require('path');
const fs = require('fs');

// Upload
exports.uploadVideo = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No video uploaded' });
        }

        const video = new Video({
            originalName: req.file.originalname,
            fileName: req.file.filename,
            filePath: req.file.path,
            status: 'uploaded'
        });

        await video.save();
        console.log('✅ Uploaded:', video.originalName);

        res.status(201).json({
            success: true,
            data: { id: video._id, fileName: video.originalName, status: video.status }
        });
    } catch (error) {
        console.error('❌ Upload error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Process
exports.processVideo = async (req, res) => {
    try {
        const { id } = req.params;
        const settings = req.body;
        
        console.log('🎬 Process:', id);
        console.log('📝 Settings:', settings);
        
        const video = await Video.findById(id)
        if (!video) {
            return res.status(404).json({ error: 'Video not found' });
        }

        video.subtitleSettings = {
            style: settings.style || 'classic',
            fontSize: settings.fontSize || 24,
            fontColor: settings.fontColor || '#FFFFFF',
            bgColor: settings.bgColor || 'transparent',
            position: settings.position || 'bottom',
            fontFamily: settings.fontFamily || 'Arial'
        };
        video.status = 'processing';
        await video.save();

        res.json({ success: true, message: 'Processing started' });

        processInBackground(video);

    } catch (error) {
        console.error('❌ Process error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Background process
async function processInBackground(video) {
    try {
        console.log('========================================');
        console.log('🎬 PROCESSING:', video.originalName);
        console.log('   Settings:', video.subtitleSettings);
        console.log('========================================');

        if (!fs.existsSync(video.filePath)) {
            throw new Error('Video file not found');
        }

        // Step 1
        console.log('📌 Step 1: Extract audio');
        const audioPath = await subtitleService.extractAudio(video.filePath);

        // Step 2
        console.log('📌 Step 2: Transcribe');
        const transcription = await speechToTextService.transcribe(audioPath);
        console.log('   Text:', transcription.text?.substring(0, 80) + '...');

        // Step 3
        console.log('📌 Step 3: Generate SRT');
        const srtPath = await subtitleService.generateSRT(transcription, video._id);

        // Step 4
        console.log('📌 Step 4: Burn subtitles with settings');
        const processedPath = await subtitleService.burnSubtitles(
            video.filePath, 
            srtPath, 
            video._id,
            video.subtitleSettings
        );

        video.transcription = transcription.text;
        video.subtitlePath = srtPath;
        video.processedPath = processedPath;
        video.status = 'completed';
        await video.save();

        console.log('========================================');
        console.log('✅ COMPLETED!');
        console.log('========================================');

        if (fs.existsSync(audioPath)) {
            fs.unlinkSync(audioPath);
        }

    } catch (error) {
        console.error('❌ FAILED:', error.message);
        video.status = 'failed';
        await video.save();
    }
}

// Get status
exports.getVideoStatus = async (req, res) => {
    try {
        const video = await Video.findById(req.params.id);
        if (!video) {
            return res.status(404).json({ error: 'Not found' });
        }

        res.json({
            success: true,
            data: {
                id: video._id,
                status: video.status,
                originalName: video.originalName,
                transcription: video.transcription,
                subtitleSettings: video.subtitleSettings
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Download video
exports.downloadVideo = async (req, res) => {
    try {
        const video = await Video.findById(req.params.id);
        if (!video || !video.processedPath) {
            return res.status(404).json({ error: 'Not found' });
        }

        if (!fs.existsSync(video.processedPath)) {
            return res.status(404).json({ error: 'File not found' });
        }

        res.download(video.processedPath, `subtitled_${video.originalName}`);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Download SRT
exports.downloadSRT = async (req, res) => {
    try {
        const video = await Video.findById(req.params.id);
        if (!video || !video.subtitlePath) {
            return res.status(404).json({ error: 'Not found' });
        }

        if (!fs.existsSync(video.subtitlePath)) {
            return res.status(404).json({ error: 'File not found' });
        }

        const fileName = video.originalName.replace(/\.[^/.]+$/, '.srt');
        res.download(video.subtitlePath, fileName);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get all
exports.getAllVideos = async (req, res) => {
    try {
        const videos = await Video.find().sort({ createdAt: -1 });
        res.json({ success: true, data: videos });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Delete
exports.deleteVideo = async (req, res) => {
    try {
        const video = await Video.findById(req.params.id);
        if (!video) {
            return res.status(404).json({ error: 'Not found' });
        }

        [video.filePath, video.processedPath, video.subtitlePath].forEach(p => {
            if (p && fs.existsSync(p)) {
                try { fs.unlinkSync(p); } catch(e) {}
            }
        });

        await Video.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
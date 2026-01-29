// backend/src/routes/videoRoutes.js

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const videoController = require('../controllers/videoController');

// Multer setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, unique + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 500 * 1024 * 1024 }
});

// Routes
router.post('/upload', upload.single('video'), videoController.uploadVideo);
router.post('/process/:id', videoController.processVideo);
router.get('/status/:id', videoController.getVideoStatus);
router.get('/download/:id', videoController.downloadVideo);
router.get('/download-srt/:id', videoController.downloadSRT);
router.get('/all', videoController.getAllVideos);
router.delete('/:id', videoController.deleteVideo);

module.exports = router;
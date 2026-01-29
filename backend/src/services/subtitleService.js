// backend/src/services/subtitleService.js

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

class SubtitleService {
    
    constructor() {
        this.ffmpegPath = 'C:/ffmpeg/bin/ffmpeg.exe';
        
        const processedDir = path.join(__dirname, '../../processed');
        if (!fs.existsSync(processedDir)) {
            fs.mkdirSync(processedDir, { recursive: true });
        }
    }

    async extractAudio(videoPath) {
        const outputPath = videoPath.replace(/\.[^/.]+$/, '.wav');
        
        return new Promise((resolve, reject) => {
            const cmd = `"${this.ffmpegPath}" -i "${videoPath}" -vn -acodec pcm_s16le -ar 16000 -ac 1 -y "${outputPath}"`;
            
            exec(cmd, (error) => {
                if (error) {
                    reject(error);
                    return;
                }
                console.log('✅ Audio extracted');
                resolve(outputPath);
            });
        });
    }

    async generateSRT(transcription, videoId) {
        const srtPath = path.join(__dirname, '../../processed', `${videoId}.srt`);
        
        let srtContent = '';
        let index = 1;

        if (transcription.words && transcription.words.length > 0) {
            const wordsPerSegment = 7;
            
            for (let i = 0; i < transcription.words.length; i += wordsPerSegment) {
                const segment = transcription.words.slice(i, i + wordsPerSegment);
                
                if (segment.length > 0) {
                    const start = this.formatTime(segment[0].start);
                    const end = this.formatTime(segment[segment.length - 1].end);
                    const text = segment.map(w => w.text).join(' ');
                    
                    srtContent += `${index}\n${start} --> ${end}\n${text}\n\n`;
                    index++;
                }
            }
        } else if (transcription.text) {
            const sentences = transcription.text.match(/[^.!?]+[.!?]+/g) || [transcription.text];
            
            sentences.forEach((sentence, i) => {
                const start = this.formatTime(i * 4);
                const end = this.formatTime((i + 1) * 4);
                srtContent += `${index}\n${start} --> ${end}\n${sentence.trim()}\n\n`;
                index++;
            });
        }

        fs.writeFileSync(srtPath, srtContent, 'utf8');
        console.log('✅ SRT generated');
        
        return srtPath;
    }

    formatTime(seconds) {
        if (typeof seconds !== 'number' || isNaN(seconds)) seconds = 0;
        
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 1000);

        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
    }

    // HEX to ASS color format (BGR)
    hexToASS(hex) {
        if (!hex || hex === 'transparent' || hex === 'none') return null;
        
        hex = hex.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        
        return `&H${b.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${r.toString(16).padStart(2, '0')}`.toUpperCase();
    }

    getAlignment(position) {
        switch(position) {
            case 'top': return 8;
            case 'center': return 5;
            default: return 2;
        }
    }

    async burnSubtitles(videoPath, srtPath, videoId, settings = {}) {
        const outputPath = path.join(__dirname, '../../processed', `${videoId}_subtitled.mp4`);
        
        console.log('🎬 Burning with settings:', settings);

        const fontSize = settings.fontSize || 24;
        const fontFamily = settings.fontFamily || 'Arial';
        const position = settings.position || 'bottom';
        const fontColor = settings.fontColor || '#FFFFFF';
        const bgColor = settings.bgColor;

        const alignment = this.getAlignment(position);
        const primaryColor = this.hexToASS(fontColor) || '&HFFFFFF';
        
        let borderStyle, backColor, outline, shadow;

        // Check if background color is set
        if (bgColor && bgColor !== 'transparent' && bgColor !== 'none' && bgColor !== '') {
            // WITH BACKGROUND - opaque box style
            borderStyle = 4;
            backColor = this.hexToASS(bgColor);
            outline = 0;
            shadow = 4; // This creates the box effect
            console.log('   Using background color:', bgColor, '→', backColor);
        } else {
            // NO BACKGROUND - outline style
            borderStyle = 1;
            backColor = '&H00000000';
            outline = 2;
            shadow = 1;
            console.log('   No background, using shadow');
        }

        const forceStyle = [
            `FontName=${fontFamily}`,
            `FontSize=${fontSize}`,
            `PrimaryColour=${primaryColor}`,
            `BackColour=${backColor}`,
            `BorderStyle=${borderStyle}`,
            `Outline=${outline}`,
            `Shadow=${shadow}`,
            `Alignment=${alignment}`,
            `MarginV=30`
        ].join(',');

        console.log('   Force style:', forceStyle);

        const srtFixed = srtPath.replace(/\\/g, '/').replace(/:/g, '\\:');

        return new Promise((resolve, reject) => {
            const cmd = `"${this.ffmpegPath}" -i "${videoPath}" -vf "subtitles='${srtFixed}':force_style='${forceStyle}'" -c:a copy -y "${outputPath}"`;

            exec(cmd, { maxBuffer: 1024 * 1024 * 100 }, (error) => {
                if (error) {
                    console.error('❌ FFmpeg error:', error.message);
                    reject(error);
                    return;
                }
                console.log('✅ Subtitles burned!');
                resolve(outputPath);
            });
        });
    }
}

module.exports = new SubtitleService();
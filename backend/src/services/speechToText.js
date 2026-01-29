// backend/src/services/speechToText.js

const axios = require('axios');
const fs = require('fs');

class SpeechToTextService {
    
    constructor() {
        this.apiKey = process.env.ASSEMBLYAI_API_KEY;
        this.baseUrl = 'https://api.assemblyai.com/v2';
    }

    async transcribe(audioPath) {
        try {
            console.log('🎤 Starting transcription with AssemblyAI...');
            console.log('📁 Audio file:', audioPath);

            // Step 1: Upload audio file
            console.log('📤 Uploading audio file...');
            const audioData = fs.readFileSync(audioPath);
            
            const uploadResponse = await axios.post(
                `${this.baseUrl}/upload`,
                audioData,
                {
                    headers: {
                        'authorization': this.apiKey,
                        'content-type': 'application/octet-stream',
                        'transfer-encoding': 'chunked'
                    },
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity
                }
            );

            const audioUrl = uploadResponse.data.upload_url;
            console.log('✅ Audio uploaded:', audioUrl);

            // Step 2: Start transcription
            console.log('🔄 Starting transcription...');
            const transcriptResponse = await axios.post(
                `${this.baseUrl}/transcript`,
                {
                    audio_url: audioUrl,
                    language_code: 'en'
                },
                {
                    headers: {
                        'authorization': this.apiKey,
                        'content-type': 'application/json'
                    }
                }
            );

            const transcriptId = transcriptResponse.data.id;
            console.log('📝 Transcript ID:', transcriptId);

            // Step 3: Poll for result
            console.log('⏳ Waiting for transcription to complete...');
            let result;
            let attempts = 0;
            const maxAttempts = 60; // 5 minutes max

            while (attempts < maxAttempts) {
                const pollingResponse = await axios.get(
                    `${this.baseUrl}/transcript/${transcriptId}`,
                    {
                        headers: {
                            'authorization': this.apiKey
                        }
                    }
                );

                const status = pollingResponse.data.status;
                console.log(`   Status: ${status} (attempt ${attempts + 1})`);

                if (status === 'completed') {
                    result = pollingResponse.data;
                    console.log('✅ Transcription completed!');
                    break;
                } else if (status === 'error') {
                    throw new Error('Transcription failed: ' + pollingResponse.data.error);
                }

                // Wait 5 seconds before next poll
                await new Promise(resolve => setTimeout(resolve, 5000));
                attempts++;
            }

            if (!result) {
                throw new Error('Transcription timed out');
            }

            // Format words for subtitle generation
            const words = (result.words || []).map(word => ({
                text: word.text,
                start: word.start / 1000, // Convert ms to seconds
                end: word.end / 1000
            }));

            return {
                text: result.text || '',
                words: words
            };

        } catch (error) {
            console.error('❌ Transcription error:', error.message);
            throw error;
        }
    }
}

module.exports = new SpeechToTextService();
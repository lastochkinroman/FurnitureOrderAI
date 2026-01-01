const fs = require('fs');
const path = require('path');
const axios = require('axios');
const ffmpeg = require('fluent-ffmpeg');
const { v4: uuidv4 } = require('uuid');

class SpeechRecognitionService {
  constructor(authKey, token) {
    this.authKey = authKey;
    this.token = token;
    this.baseURL = 'https://smartspeech.sber.ru/rest/v1';
  }

  async getAccessToken() {
    try {
      const response = await axios.post(`${this.baseURL}/auth/token`, {
        scope: 'SALUTE_SPEECH_PERS'
      }, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      if (response.data && response.data.access_token) {
        return response.data.access_token;
      }

      throw new Error('Failed to get access token');
    } catch (error) {
      console.error('Speech auth error:', error.message);
      throw new Error('Speech recognition authentication failed');
    }
  }

  async recognizeAudio(audioBuffer) {
    try {
      const accessToken = await this.getAccessToken();

      const response = await axios.post(`${this.baseURL}/speech:recognize`, audioBuffer, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'audio/ogg'
        },
        timeout: 30000
      });

      if (response.data && response.data.result) {
        return response.data.result;
      }

      throw new Error('Invalid response from speech service');
    } catch (error) {
      console.error('Speech recognition error:', error.message);
      throw new Error('Failed to recognize speech');
    }
  }
}

// Global instance
let speechService = null;

function initializeSpeechRecognition(authKey, token) {
  speechService = new SpeechRecognitionService(authKey, token);
}

async function convertAudioToOgg(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .toFormat('ogg')
      .audioCodec('libopus')
      .audioChannels(1)
      .audioFrequency(16000)
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(err))
      .save(outputPath);
  });
}

async function downloadTelegramAudio(ctx, fileId) {
  try {
    const file = await ctx.telegram.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;

    const response = await axios.get(fileUrl, {
      responseType: 'arraybuffer',
      timeout: 30000
    });

    return Buffer.from(response.data);
  } catch (error) {
    console.error('Download audio error:', error.message);
    throw new Error('Failed to download audio file');
  }
}

async function processAudioMessage(ctx) {
  const tempDir = path.join(__dirname, '../../temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const tempFiles = [];
  let recognizedText = '';

  try {
    // Get file ID from message
    const message = ctx.message;
    const fileId = message.voice ? message.voice.file_id : message.audio.file_id;

    if (!fileId) {
      throw new Error('No audio file found in message');
    }

    // Download audio
    const audioBuffer = await downloadTelegramAudio(ctx, fileId);

    // Save to temp file
    const inputFileName = `${uuidv4()}.ogg`;
    const inputPath = path.join(tempDir, inputFileName);
    fs.writeFileSync(inputPath, audioBuffer);
    tempFiles.push(inputPath);

    // Convert to proper format if needed
    let finalAudioBuffer = audioBuffer;

    // If speech service is available, use it
    if (speechService) {
      recognizedText = await speechService.recognizeAudio(finalAudioBuffer);
    } else {
      // Fallback: return a placeholder
      recognizedText = '[Распознавание речи не настроено]';
    }

    return {
      tempFiles,
      recognizedText: recognizedText.trim()
    };

  } catch (error) {
    console.error('Audio processing error:', error);
    throw error;
  }
}

async function recognizeAudio(audioPath) {
  try {
    if (!speechService) {
      throw new Error('Speech recognition service not initialized');
    }

    const audioBuffer = fs.readFileSync(audioPath);
    const text = await speechService.recognizeAudio(audioBuffer);

    return text;
  } catch (error) {
    console.error('Audio recognition error:', error);
    throw error;
  }
}

module.exports = {
  initializeSpeechRecognition,
  processAudioMessage,
  recognizeAudio,
  SpeechRecognitionService
};

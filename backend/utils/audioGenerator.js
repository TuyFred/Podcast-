/**
 * Audio Generator — Free Google Translate TTS
 * No API key required. Uses google-tts-api which calls
 * the same endpoint as Google Translate.
 */

const gtts  = require('google-tts-api');
const axios = require('axios');
const fs    = require('fs');
const fsP   = require('fs').promises;
const path  = require('path');

const UPLOAD_DIR = () => process.env.UPLOAD_DIR || './uploads';

/** Ensure the upload directory exists */
async function ensureUploadDir() {
  const dir = UPLOAD_DIR();
  if (!fs.existsSync(dir)) await fsP.mkdir(dir, { recursive: true });
  return dir;
}

/**
 * Split text into chunks ≤ 200 chars at sentence/word boundaries.
 * Google TTS URL limit is ~200 chars per request.
 */
function splitText(text, maxLen = 200) {
  const sentences = text.match(/[^.!?]+[.!?]*/g) || [text];
  const chunks = [];
  let current  = '';

  for (const s of sentences) {
    const trimmed = s.trim();
    if (!trimmed) continue;
    if ((current + ' ' + trimmed).trim().length <= maxLen) {
      current = (current + ' ' + trimmed).trim();
    } else {
      if (current) chunks.push(current);
      // If a single sentence is too long, split by words
      if (trimmed.length > maxLen) {
        const words = trimmed.split(' ');
        let wordChunk = '';
        for (const w of words) {
          if ((wordChunk + ' ' + w).trim().length <= maxLen) {
            wordChunk = (wordChunk + ' ' + w).trim();
          } else {
            if (wordChunk) chunks.push(wordChunk);
            wordChunk = w;
          }
        }
        if (wordChunk) chunks.push(wordChunk);
        current = '';
      } else {
        current = trimmed;
      }
    }
  }
  if (current) chunks.push(current);
  return chunks.filter(Boolean);
}

/**
 * Download a single audio URL to a buffer.
 */
async function downloadChunk(url) {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    headers: { 'User-Agent': 'Mozilla/5.0' },
    timeout: 10000,
  });
  return Buffer.from(response.data);
}

/**
 * Convert text → MP3 using free Google Translate TTS.
 * @param {string} text       - Text to convert
 * @param {string} language   - Language code e.g. 'en', 'fr', 'es'
 * @returns {Promise<{filePath, fileName, fileSize}>}
 */
async function generateAudio(text, language = 'en') {
  const uploadDir = await ensureUploadDir();
  const fileName  = `podcast_${Date.now()}.mp3`;
  const filePath  = path.join(uploadDir, fileName);

  // Normalize lang code: 'en-US' → 'en'
  const lang   = (language || 'en').split('-')[0].toLowerCase();
  const chunks = splitText(text.trim());

  if (chunks.length === 0) throw new Error('No text to convert.');

  const buffers = [];
  for (const chunk of chunks) {
    try {
      const url = gtts.getAudioUrl(chunk, { lang, slow: false, host: 'https://translate.google.com' });
      const buf = await downloadChunk(url);
      buffers.push(buf);
    } catch (err) {
      console.warn(`[TTS] Skipped chunk: ${err.message}`);
    }
  }

  if (buffers.length === 0) throw new Error('Failed to generate any audio chunks.');

  // Concatenate all buffers into one MP3 file
  const combined = Buffer.concat(buffers);
  await fsP.writeFile(filePath, combined);

  const stats = await fsP.stat(filePath);
  console.log(`✅ Audio generated: ${fileName} (${Math.round(stats.size / 1024)} KB)`);

  return {
    filePath,
    fileName,
    fileSize: stats.size,
    duration: null, // Can be calculated client-side from the audio element
  };
}

module.exports = { generateAudio };

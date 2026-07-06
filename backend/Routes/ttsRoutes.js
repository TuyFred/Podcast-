/**
 * TTS Routes — convert any text to MP3 audio + save to audio library
 * POST /api/tts/convert   { text, language?, title?, notesId? }
 *
 * Strategy:
 *  1. Generate audio to a local buffer
 *  2. Return audioBase64 IMMEDIATELY in the JSON response
 *     → frontend decodes this to a blob URL — works offline, no CORS, no 404
 *  3. In the background, upload to Supabase Storage for persistent library URL
 *  4. Save record in podcasts table with the permanent Supabase URL (or base64 fallback)
 */
const express = require('express');
const router  = express.Router();
const path    = require('path');
const fs      = require('fs');
const fsP     = require('fs').promises;
const { generateAudio } = require('../utils/audioGenerator');
const { verifyToken }   = require('./userRoutes');
const { createClient }  = require('@supabase/supabase-js');

const sbAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const STORAGE_BUCKET = 'audio-files';

/** Upload buffer to Supabase Storage, return public URL or null */
async function uploadBufferToSupabase(buffer, fileName) {
  try {
    const storagePath = `podcasts/${fileName}`;
    const { error } = await sbAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, buffer, { contentType: 'audio/mpeg', upsert: true });

    if (error) throw error;

    const { data } = sbAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
    return data?.publicUrl || null;
  } catch (err) {
    console.warn('[TTS] Supabase Storage upload failed:', err.message);
    return null;
  }
}

/**
 * POST /api/tts/convert
 */
router.post('/convert', verifyToken, async (req, res) => {
  try {
    const { text, language = 'en', title, notesId } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ message: 'text is required.' });
    }
    if (text.trim().length < 3) {
      return res.status(400).json({ message: 'Text too short (min 3 characters).' });
    }
    if (text.length > (notesId ? 30000 : 10000)) {
      return res.status(400).json({
        message: notesId
          ? 'Text too long (max 30 000 characters for podcast).'
          : 'Text too long (max 10 000 characters).',
      });
    }

    console.log(`[TTS] User ${req.userId}: Converting ${text.length} chars | lang: ${language}`);
    const result = await generateAudio(text.trim(), language);

    // Read generated file into buffer immediately
    const audioBuffer = await fsP.readFile(result.filePath);
    const audioBase64 = audioBuffer.toString('base64');

    // Ensure profile exists (podcasts FK)
    try {
      await sbAdmin.from('profiles').upsert(
        { id: req.userId, email: req.userEmail || '', updated_at: new Date().toISOString() },
        { onConflict: 'id', ignoreDuplicates: true }
      );
    } catch (_) { /* non-fatal */ }

    // ── Send response immediately with base64 audio ──────────────────
    // Frontend uses this to play audio right away — no URL fetch needed
    const podcastTitle = title || `TTS · ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

    // Respond before slow Supabase operations
    const responsePayload = {
      success:     true,
      audioBase64,                          // Frontend decodes this into a blob URL
      mimeType:    'audio/mpeg',
      fileName:    result.fileName,
      fileSize:    result.fileSize,
      podcastId:   null,                    // Updated in background
    };
    res.json(responsePayload);

    // ── Background: upload to Supabase Storage + save to library ────
    (async () => {
      try {
        const supabaseUrl = await uploadBufferToSupabase(audioBuffer, result.fileName);
        const baseUrl     = process.env.APP_URL || `http://localhost:${process.env.PORT || 5000}`;
        const audioUrl    = supabaseUrl || `${baseUrl}/uploads/${result.fileName}`;

        console.log(`[TTS] Storage: ${supabaseUrl ? '✅ Supabase' : '⚠️ local fallback'}`);

        const insertData = {
          user_id:           req.userId,
          title:             podcastTitle,
          description:       text.substring(0, 200),
          script_content:    text,
          audio_file_path:   result.fileName,
          audio_url:         audioUrl,
          audio_file_size:   result.fileSize || null,
          language,
          voice_type:        'google_tts',
          generation_status: 'completed',
          generated_at:      new Date().toISOString(),
        };
        if (notesId) insertData.notes_id = notesId;

        const { data: podcast, error: dbErr } = await sbAdmin
          .from('podcasts')
          .insert(insertData)
          .select('id')
          .single();

        if (dbErr) console.error('[TTS] DB save failed:', dbErr.message);
        else console.log(`[TTS] ✅ Saved to library: ${podcast.id}`);

        // Clean up local temp file
        fsP.unlink(result.filePath).catch(() => {});
      } catch (bgErr) {
        console.error('[TTS] Background save error:', bgErr.message);
      }
    })();

  } catch (err) {
    console.error('[TTS] Error:', err.message);
    return res.status(500).json({ message: err.message || 'Failed to generate audio.' });
  }
});

/**
 * GET /api/tts/file/:filename — serve audio file (fallback)
 */
router.get('/file/:filename', (req, res) => {
  const uploadDir = process.env.UPLOAD_DIR || './uploads';
  const filePath  = path.resolve(uploadDir, req.params.filename);

  if (!filePath.startsWith(path.resolve(uploadDir))) {
    return res.status(403).json({ message: 'Forbidden.' });
  }
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: 'File not found.' });
  }

  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  fs.createReadStream(filePath).pipe(res);
});

module.exports = router;

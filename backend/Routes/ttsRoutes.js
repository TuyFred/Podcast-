/**
 * TTS Routes — convert any text to MP3 audio + save to audio library
 * POST /api/tts/convert   { text, language?, title?, notesId? }
 * GET  /api/tts/file/:filename  → serve audio file
 */
const express  = require('express');
const router   = express.Router();
const path     = require('path');
const fs       = require('fs');
const fsP      = require('fs').promises;
const { generateAudio }  = require('../utils/audioGenerator');
const { verifyToken }    = require('./userRoutes');
const { createClient }   = require('@supabase/supabase-js');

const sbAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const STORAGE_BUCKET = 'audio-files';

/**
 * Upload a local file to Supabase Storage and return its public URL.
 * Falls back to local /uploads URL if storage upload fails.
 */
async function uploadToSupabase(localFilePath, fileName) {
  try {
    const fileBuffer = await fsP.readFile(localFilePath);
    const storagePath = `podcasts/${fileName}`;

    const { error } = await sbAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: 'audio/mpeg',
        upsert: true,
      });

    if (error) throw error;

    const { data } = sbAdmin.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storagePath);

    return data?.publicUrl || null;
  } catch (err) {
    console.warn('[TTS] Supabase Storage upload failed, using local URL:', err.message);
    return null;
  }
}

/**
 * POST /api/tts/convert
 * Converts text to MP3 and saves a record in the podcasts table
 * (acts as the user's audio library)
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
    if (text.length > 10000) {
      return res.status(400).json({ message: 'Text too long (max 10 000 characters).' });
    }

    console.log(`[TTS] User ${req.userId}: Converting ${text.length} chars | lang: ${language}`);
    const result = await generateAudio(text.trim(), language);

    // Try to upload to Supabase Storage (permanent URL, no filesystem dependency)
    const supabaseUrl = await uploadToSupabase(result.filePath, result.fileName);

    // Fallback: use local /uploads URL if Supabase Storage is unavailable
    const baseUrl  = process.env.APP_URL || `http://localhost:${process.env.PORT || 5000}`;
    const audioUrl = supabaseUrl || `${baseUrl}/uploads/${result.fileName}`;

    console.log(`[TTS] Audio URL: ${supabaseUrl ? '✅ Supabase Storage' : '⚠️ Local fallback'} → ${audioUrl}`);

    // Clean up temp file if successfully uploaded to Supabase
    if (supabaseUrl) {
      fsP.unlink(result.filePath).catch(() => {});
    }

    // ── Ensure profile exists (podcasts FK references public.profiles) ─
    await sbAdmin.from('profiles').upsert(
      { id: req.userId, email: req.userEmail || '', updated_at: new Date().toISOString() },
      { onConflict: 'id', ignoreDuplicates: true }
    ).then(({ error: pErr }) => {
      if (pErr) console.warn('[TTS] Profile upsert warning:', pErr.message);
    });

    // ── Save to audio library (podcasts table) ─────────────────
    const podcastTitle = title || `TTS · ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

    const insertData = {
      user_id:           req.userId,
      title:             podcastTitle,
      description:       text.substring(0, 200),
      script_content:    text,
      audio_file_path:   result.fileName,
      audio_url:         audioUrl,
      audio_file_size:   result.fileSize || null,
      language:          language,
      voice_type:        'google_tts',
      generation_status: 'completed',
      generated_at:      new Date().toISOString(),
    };

    // Only link a note if one was provided
    if (notesId) insertData.notes_id = notesId;

    const { data: podcast, error: dbErr } = await sbAdmin
      .from('podcasts')
      .insert(insertData)
      .select('id')
      .single();

    if (dbErr) {
      // DB error shouldn't block the audio response
      console.error('[TTS] Failed to save to audio library:', dbErr.message);
    } else {
      console.log(`[TTS] ✅ Saved to audio library: ${podcast.id}`);
    }

    return res.json({
      success:    true,
      audioUrl,
      fileName:   result.fileName,
      fileSize:   result.fileSize,
      podcastId:  podcast?.id || null,
    });
  } catch (err) {
    console.error('[TTS] Error:', err.message);
    return res.status(500).json({ message: err.message || 'Failed to generate audio.' });
  }
});

/**
 * GET /api/tts/file/:filename — serve audio file with streaming support
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
  fs.createReadStream(filePath).pipe(res);
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { Podcast, Notes } = require('../Models');
const { verifyToken } = require('./userRoutes');
const { body, validationResult } = require('express-validator');
const fs = require('fs');
const path = require('path');

// Generate podcast endpoint
router.post(
  '/generate',
  verifyToken,
  [
    body('notesId').notEmpty(),
    body('voiceType').optional().isIn(['google_tts', 'elevenlabs']),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { notesId, title, voiceType = 'google_tts', language = 'en-US' } = req.body;

      // Verify notes exist and belong to user
      const notes = await Notes.findOne({
        where: {
          id: notesId,
          userId: req.userId,
        },
      });

      if (!notes) {
        return res.status(404).json({ message: 'Notes not found' });
      }

      if (notes.processingStatus !== 'completed') {
        return res.status(400).json({ message: 'Notes are still being processed' });
      }

      // Check if podcast already exists
      const existingPodcast = await Podcast.findOne({
        where: {
          notesId,
          userId: req.userId,
        },
      });

      if (existingPodcast) {
        return res.status(400).json({ message: 'Podcast already exists for these notes' });
      }

      // Create podcast record
      const podcast = await Podcast.create({
        notesId,
        userId: req.userId,
        title: title || `Podcast - ${notes.title}`,
        voiceType,
        language,
        generationStatus: 'pending',
      });

      // TODO: Trigger podcast generation in background queue

      res.status(201).json({
        message: 'Podcast generation started',
        podcastId: podcast.id,
        generationStatus: 'pending',
      });
    } catch (error) {
      console.error('Generate podcast error:', error);
      res.status(500).json({ message: 'Failed to generate podcast' });
    }
  }
);

// Get user's podcasts endpoint
router.get('/', verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = { userId: req.userId };
    if (status) whereClause.generationStatus = status;

    const { count, rows } = await Podcast.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Notes,
          attributes: ['id', 'title', 'courseName', 'subjectArea'],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      total: count,
      pages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      podcasts: rows,
    });
  } catch (error) {
    console.error('Get podcasts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ══════════════════════════════════════════════════════════════
   GET /api/podcasts/supabase-list  — bypass RLS (MUST be before /:podcastId)
   ══════════════════════════════════════════════════════════════ */
const { createClient: createSbAdmin } = require('@supabase/supabase-js');
const supabaseAdmin2 = createSbAdmin(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

router.get('/supabase-list', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin2
      .from('podcasts')
      .select('id, title, description, audio_url, audio_file_path, audio_file_size, duration, generation_status, language, created_at, notes(title)')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('[Podcasts Supabase List] Error:', err.message);
    res.status(500).json({ message: 'Failed to fetch podcasts.' });
  }
});

// Get single podcast endpoint
router.get('/:podcastId', verifyToken, async (req, res) => {
  try {
    const podcast = await Podcast.findOne({
      where: {
        id: req.params.podcastId,
        userId: req.userId,
      },
      include: [
        {
          model: Notes,
          attributes: ['id', 'title', 'courseName', 'subjectArea', 'mainTopics'],
        },
      ],
    });

    if (!podcast) {
      return res.status(404).json({ message: 'Podcast not found' });
    }

    res.json(podcast);
  } catch (error) {
    console.error('Get podcast error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Download podcast endpoint
router.get('/:podcastId/download', verifyToken, async (req, res) => {
  try {
    const podcast = await Podcast.findOne({
      where: {
        id: req.params.podcastId,
        userId: req.userId,
      },
    });

    if (!podcast) {
      return res.status(404).json({ message: 'Podcast not found' });
    }

    if (!podcast.audioFilePath || !fs.existsSync(podcast.audioFilePath)) {
      return res.status(404).json({ message: 'Audio file not available' });
    }

    // Update download count
    podcast.downloadCount += 1;
    await podcast.save();

    // Send file
    res.download(podcast.audioFilePath, `${podcast.title}.mp3`);
  } catch (error) {
    console.error('Download podcast error:', error);
    res.status(500).json({ message: 'Download failed' });
  }
});

// Stream podcast endpoint
router.get('/:podcastId/stream', verifyToken, async (req, res) => {
  try {
    const podcast = await Podcast.findOne({
      where: {
        id: req.params.podcastId,
        userId: req.userId,
      },
    });

    if (!podcast) {
      return res.status(404).json({ message: 'Podcast not found' });
    }

    if (!podcast.audioFilePath || !fs.existsSync(podcast.audioFilePath)) {
      return res.status(404).json({ message: 'Audio file not available' });
    }

    // Update stream count
    podcast.streamCount += 1;
    await podcast.save();

    // Stream file
    const fileSize = fs.statSync(podcast.audioFilePath).size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'audio/mpeg',
      });

      fs.createReadStream(podcast.audioFilePath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'audio/mpeg',
      });
      fs.createReadStream(podcast.audioFilePath).pipe(res);
    }
  } catch (error) {
    console.error('Stream podcast error:', error);
    res.status(500).json({ message: 'Streaming failed' });
  }
});

// Rename podcast — PATCH /api/podcasts/:podcastId/rename
router.patch('/:podcastId/rename', verifyToken, async (req, res) => {
  const { title } = req.body;
  if (!title?.trim()) return res.status(400).json({ message: 'Title is required.' });
  try {
    const { data, error } = await supabaseAdmin2
      .from('podcasts')
      .update({ title: title.trim(), updated_at: new Date().toISOString() })
      .eq('id', req.params.podcastId)
      .eq('user_id', req.userId)
      .select('id, title')
      .single();
    if (error || !data) return res.status(404).json({ message: 'Podcast not found or access denied.' });
    res.json({ success: true, podcast: data });
  } catch (err) {
    console.error('[Podcast Rename]', err.message);
    res.status(500).json({ message: 'Failed to rename.' });
  }
});

// Delete podcast — uses supabaseAdmin to bypass RLS
router.delete('/:podcastId', verifyToken, async (req, res) => {
  try {
    // Fetch to verify ownership and get file path
    const { data: pod, error: findErr } = await supabaseAdmin2
      .from('podcasts')
      .select('id, audio_file_path')
      .eq('id', req.params.podcastId)
      .eq('user_id', req.userId)
      .single();

    if (findErr || !pod) return res.status(404).json({ message: 'Podcast not found or access denied.' });

    // Remove local audio file if it exists
    if (pod.audio_file_path) {
      const uploadDir = process.env.UPLOAD_DIR || './uploads';
      const localPath = path.resolve(uploadDir, path.basename(pod.audio_file_path));
      if (fs.existsSync(localPath)) fs.unlink(localPath, () => {});
    }

    const { error: delErr } = await supabaseAdmin2.from('podcasts').delete().eq('id', req.params.podcastId);
    if (delErr) throw delErr;

    res.json({ message: 'Podcast deleted successfully' });
  } catch (error) {
    console.error('Delete podcast error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

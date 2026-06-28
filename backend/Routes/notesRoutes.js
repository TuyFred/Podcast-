const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { verifyToken } = require('./userRoutes');
const { body, validationResult } = require('express-validator');
const { createClient } = require('@supabase/supabase-js');

// Supabase admin client — bypasses RLS, used for all DB operations
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_DIR || './uploads');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 52428800 }, // 50 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.docx', '.doc', '.txt', '.pptx', '.ppt', '.csv', '.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error(`Unsupported file type. Allowed: PDF, DOCX, TXT, PPTX, CSV, JPG, PNG`));
  },
});

// Upload notes endpoint
router.post(
  '/upload',
  verifyToken,
  upload.single('file'),
  [
    body('title').notEmpty(),
    body('courseName').optional(),
    body('subjectArea').optional(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded.' });
      }

      const { title, description, courseName, subjectArea, difficultyLevel } = req.body;
      const fileExtension = path.extname(req.file.originalname).substring(1).toLowerCase();

      // ── Ensure profile row exists (notes FK references public.profiles) ───────
      try {
        await supabaseAdmin.from('profiles').upsert(
          { id: req.userId, email: req.userEmail || '', updated_at: new Date().toISOString() },
          { onConflict: 'id', ignoreDuplicates: true }
        );
      } catch (_) { /* non-fatal */ }

      // ── Insert directly via Supabase admin (bypasses RLS + Sequelize ENUM issues) ──
      const { data: noteRow, error: insertErr } = await supabaseAdmin
        .from('notes')
        .insert({
          user_id:            req.userId,
          title:              title || req.file.originalname,
          description:        description || null,
          original_file_name: req.file.originalname,
          file_size:          req.file.size,
          file_path:          req.file.path,
          file_type:          fileExtension,
          course_name:        courseName  || null,
          subject_area:       subjectArea || null,
          difficulty_level:   difficultyLevel || 'intermediate',
          processing_status:  'pending',
        })
        .select('id')
        .single();

      if (insertErr) {
        console.error('[NotesUpload] Insert error:', insertErr.message);
        return res.status(500).json({ message: insertErr.message || 'Failed to save note.' });
      }

      // ── Trigger AI text extraction in background ───────────────
      const { extractTextFromFile } = require('../utils/textExtractor');
      setImmediate(async () => {
        try {
          const text = await extractTextFromFile(req.file.path, fileExtension);
          await supabaseAdmin.from('notes').update({
            extracted_text:    text,
            processing_status: 'completed',
            ai_processed_at:   new Date().toISOString(),
          }).eq('id', noteRow.id);
          console.log(`[NotesUpload] ✅ Text extracted for note ${noteRow.id}`);
        } catch (e) {
          console.error('[NotesUpload] Text extraction failed:', e.message);
          try { await supabaseAdmin.from('notes').update({ processing_status: 'failed', processing_error: e.message }).eq('id', noteRow.id); } catch (_) {}
        }
      });

      res.status(201).json({
        message:          'Note uploaded and processing started.',
        notesId:          noteRow.id,
        processingStatus: 'pending',
      });
    } catch (error) {
      console.error('[NotesUpload] Error:', error);
      res.status(500).json({ message: error.message || 'Upload failed.' });
    }
  }
);

// Get user's notes endpoint — via supabaseAdmin (bypasses RLS)
router.get('/', verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const from = (parseInt(page) - 1) * parseInt(limit);
    const to   = from + parseInt(limit) - 1;

    let query = supabaseAdmin
      .from('notes')
      .select('id, title, file_type, file_size, created_at, processing_status, course_name, subject_area, difficulty_level', { count: 'exact' })
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (status) query = query.eq('processing_status', status);

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({
      total:       count || 0,
      pages:       Math.ceil((count || 0) / parseInt(limit)),
      currentPage: parseInt(page),
      notes:       data || [],
    });
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ══════════════════════════════════════════════════════════════
   GET /api/notes/supabase-list  — bypass RLS using service key
   MUST be BEFORE /:notesId route or Express will match it first
   ══════════════════════════════════════════════════════════════ */
router.get('/supabase-list', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('notes')
      .select('id, title, file_type, file_size, created_at, processing_status, file_path')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('[Notes Supabase List] Error:', err.message);
    res.status(500).json({ message: 'Failed to fetch notes.' });
  }
});

// Get single note — via Supabase admin (bypasses RLS)
router.get('/:notesId', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('notes')
      .select('*')
      .eq('id', req.params.notesId)
      .eq('user_id', req.userId)
      .single();

    if (error || !data) {
      return res.status(404).json({ message: 'Note not found or access denied.' });
    }

    res.json(data);
  } catch (error) {
    console.error('Get note error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ── file content-type lookup ── */
const MIME_MAP = {
  pdf: 'application/pdf', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  doc: 'application/msword', txt: 'text/plain; charset=utf-8',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ppt: 'application/vnd.ms-powerpoint', csv: 'text/csv; charset=utf-8',
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
};
const getMime = (ext) => MIME_MAP[(ext || '').toLowerCase()] || 'application/octet-stream';

/* ── GET /:notesId/download ── stream original file as attachment ── */
router.get('/:notesId/download', verifyToken, async (req, res) => {
  const fs = require('fs');
  try {
    const { data: note, error } = await supabaseAdmin
      .from('notes')
      .select('file_path, original_file_name, file_type, title')
      .eq('id', req.params.notesId)
      .eq('user_id', req.userId)
      .single();

    if (error || !note) return res.status(404).json({ message: 'Note not found.' });

    const rel = (note.file_path || '').replace(/^\.\//, '');
    const abs = path.resolve(rel);
    if (!fs.existsSync(abs)) return res.status(404).json({ message: 'File no longer available on server.' });

    const filename = encodeURIComponent(note.original_file_name || `${note.title}.${note.file_type}`);
    res.setHeader('Content-Type', getMime(note.file_type));
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${filename}`);
    res.setHeader('Access-Control-Allow-Origin', '*');
    fs.createReadStream(abs).pipe(res);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/* ── GET /:notesId/view ── stream file inline for the viewer ── */
router.get('/:notesId/view', verifyToken, async (req, res) => {
  const fs = require('fs');
  try {
    const { data: note, error } = await supabaseAdmin
      .from('notes')
      .select('file_path, original_file_name, file_type, title')
      .eq('id', req.params.notesId)
      .eq('user_id', req.userId)
      .single();

    if (error || !note) return res.status(404).json({ message: 'Note not found.' });

    const rel = (note.file_path || '').replace(/^\.\//, '');
    const abs = path.resolve(rel);
    if (!fs.existsSync(abs)) return res.status(404).json({ message: 'File no longer available on server.' });

    res.setHeader('Content-Type', getMime(note.file_type));
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    fs.createReadStream(abs).pipe(res);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/* ── GET /:notesId/as-html ── convert DOCX → HTML via mammoth ── */
router.get('/:notesId/as-html', verifyToken, async (req, res) => {
  const fs = require('fs');
  try {
    const { data: note, error } = await supabaseAdmin
      .from('notes')
      .select('file_path, file_type, extracted_text')
      .eq('id', req.params.notesId)
      .eq('user_id', req.userId)
      .single();

    if (error || !note) return res.status(404).json({ message: 'Note not found.' });

    const rel = (note.file_path || '').replace(/^\.\//, '');
    const abs = path.resolve(rel);

    // For DOCX — use mammoth
    if ((note.file_type === 'docx' || note.file_type === 'doc') && fs.existsSync(abs)) {
      const mammoth = require('mammoth');
      const { value: html } = await mammoth.convertToHtml({ path: abs });
      return res.json({ html, type: 'html' });
    }

    // For everything else — return extracted text as pre-formatted HTML
    const text = note.extracted_text || '';
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const html = `<div style="white-space:pre-wrap;font-family:inherit;line-height:1.7">${escaped}</div>`;
    res.json({ html, type: 'text' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Update note — via Supabase admin (bypasses RLS)
router.put('/:notesId', verifyToken, async (req, res) => {
  try {
    const { title, description, courseName, subjectArea, difficultyLevel } = req.body;
    const updates = {};
    if (title !== undefined)           updates.title            = title;
    if (description !== undefined)     updates.description      = description;
    if (courseName !== undefined)      updates.course_name      = courseName;
    if (subjectArea !== undefined)     updates.subject_area     = subjectArea;
    if (difficultyLevel !== undefined) updates.difficulty_level = difficultyLevel;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('notes')
      .update(updates)
      .eq('id', req.params.notesId)
      .eq('user_id', req.userId)
      .select()
      .single();

    if (error || !data) return res.status(404).json({ message: 'Note not found or access denied.' });
    res.json({ message: 'Note updated successfully', notes: data });
  } catch (error) {
    console.error('Update note error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete notes endpoint — uses Supabase admin to bypass RLS
router.delete('/:notesId', verifyToken, async (req, res) => {
  try {
    // First verify ownership, then delete via service role
    const { data: note, error: findErr } = await supabaseAdmin
      .from('notes')
      .select('id, file_path')
      .eq('id', req.params.notesId)
      .eq('user_id', req.userId)
      .single();

    if (findErr || !note) {
      return res.status(404).json({ message: 'Note not found or access denied.' });
    }

    // Remove from storage if file exists
    if (note.file_path) {
      await supabaseAdmin.storage.from('notes-files').remove([note.file_path]).catch(() => {});
    }

    const { error: delErr } = await supabaseAdmin.from('notes').delete().eq('id', req.params.notesId);
    if (delErr) throw delErr;

    res.json({ message: 'Notes deleted successfully' });
  } catch (error) {
    console.error('Delete notes error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ══════════════════════════════════════════════════════════════
   POST /api/notes/extract-text
   Accepts a PDF / DOCX / TXT file and returns extracted plain text.
   Used by the TTS page so users can upload a file and listen to it.
   ══════════════════════════════════════════════════════════════ */
const fs      = require('fs');
const pdfParse = require('pdf-parse');
const mammoth  = require('mammoth');

const extractUpload = multer({
  storage: multer.memoryStorage(),           // keep in memory, don't save to disk
  limits: { fileSize: 10 * 1024 * 1024 },   // 10 MB max
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.pdf', '.docx', '.txt'].includes(ext)) cb(null, true);
    else cb(new Error('Supported formats: PDF, DOCX, TXT'));
  },
});

router.post('/extract-text', verifyToken, extractUpload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });

  const ext = path.extname(req.file.originalname).toLowerCase();

  try {
    let text = '';

    if (ext === '.txt') {
      text = req.file.buffer.toString('utf-8');
    } else if (ext === '.pdf') {
      const parsed = await pdfParse(req.file.buffer);
      text = parsed.text;
    } else if (ext === '.docx') {
      const result = await mammoth.extractRawText({ buffer: req.file.buffer });
      text = result.value;
    }

    // Trim + normalise whitespace
    text = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

    return res.json({
      text,
      charCount: text.length,
      filename: req.file.originalname,
    });
  } catch (err) {
    console.error('[ExtractText] Error:', err.message);
    res.status(500).json({ message: 'Failed to extract text: ' + err.message });
  }
});

/* ══════════════════════════════════════════════════════════════
   AI GENERATION endpoints — use supabaseAdmin + Gemini AI
   All placed AFTER /:notesId routes to avoid Express conflicts
   ══════════════════════════════════════════════════════════════ */
const {
  generateMCQs,
  generateFlashcards:      genFlashcards,
  generateComprehensiveSummary,
  generateExamRevisionSummary,
  generateOneMinuteNotes,
  generatePodcastScript,
} = require('../utils/aiProcessor');

/** Helper: fetch note text + verify ownership via supabaseAdmin */
async function getNoteText(noteId, userId, maxChars = 30000) {
  const { data, error } = await supabaseAdmin
    .from('notes')
    .select('id, title, extracted_text, cleaned_text, processing_status')
    .eq('id', noteId)
    .eq('user_id', userId)
    .single();
  if (error || !data) throw { status: 404, message: 'Note not found or access denied.' };
  if (data.processing_status !== 'completed') throw { status: 400, message: 'Note is still being processed. Please wait a moment.' };
  const text = (data.cleaned_text || data.extracted_text || '').trim();
  if (!text) throw { status: 400, message: 'No text content found in this note.' };
  return { note: data, text: text.substring(0, maxChars), fullLength: text.length };
}

/** Helper: ensure profile row exists before FK-restricted inserts */
async function ensureProfile(userId, email) {
  await supabaseAdmin.from('profiles')
    .upsert({ id: userId, email: email || '', updated_at: new Date().toISOString() },
             { onConflict: 'id', ignoreDuplicates: true });
}

// POST /api/notes/:noteId/generate/quiz
router.post('/:noteId/generate/quiz', verifyToken, async (req, res) => {
  try {
    const { note, text } = await getNoteText(req.params.noteId, req.userId);
    const { numberOfQuestions = 20 } = req.body;

    const questions = await generateMCQs(text, numberOfQuestions);
    if (!Array.isArray(questions) || questions.length === 0)
      return res.status(500).json({ message: 'AI returned no questions. Try again.' });

    await ensureProfile(req.userId, req.userEmail);
    const { data: quiz, error: qErr } = await supabaseAdmin.from('quizzes').insert({
      notes_id:       note.id,
      user_id:        req.userId,
      title:          `Quiz: ${note.title}`,
      total_questions: questions.length,
      questions,
    }).select('id').single();

    if (qErr) throw qErr;
    res.json({ success: true, quizId: quiz.id, count: questions.length, questions });
  } catch (err) {
    const st = err.status || 500;
    console.error('[Generate Quiz]', err.message || err);
    res.status(st).json({ message: err.message || 'Failed to generate quiz.' });
  }
});

// POST /api/notes/:noteId/generate/flashcards
router.post('/:noteId/generate/flashcards', verifyToken, async (req, res) => {
  try {
    const { note, text } = await getNoteText(req.params.noteId, req.userId);
    const { numberOfFlashcards = 20 } = req.body;

    const cards = await genFlashcards(text, numberOfFlashcards);
    if (!Array.isArray(cards) || cards.length === 0)
      return res.status(500).json({ message: 'AI returned no flashcards. Try again.' });

    await ensureProfile(req.userId, req.userEmail);
    // Sanitize category to only valid enum values
    const VALID_CATS = ['definition','concept','theory','application','formula','procedure'];
    const VALID_DIFF = ['easy','medium','hard'];
    const rows = cards.map(c => ({
      notes_id:    note.id,
      user_id:     req.userId,
      question:    c.question  || '',
      answer:      c.answer    || '',
      category:    VALID_CATS.includes(c.category) ? c.category : 'concept',
      difficulty:  VALID_DIFF.includes(c.difficulty) ? c.difficulty : 'medium',
      topic:       c.topic     || null,
      explanation: c.explanation || null,
    }));

    const { data: saved, error: fErr } = await supabaseAdmin.from('flashcards').insert(rows).select('id');
    if (fErr) throw fErr;
    res.json({ success: true, count: saved.length, flashcards: cards });
  } catch (err) {
    const st = err.status || 500;
    console.error('[Generate Flashcards]', err.message || err);
    res.status(st).json({ message: err.message || 'Failed to generate flashcards.' });
  }
});

// POST /api/notes/:noteId/generate/summary
router.post('/:noteId/generate/summary', verifyToken, async (req, res) => {
  try {
    const { note, text } = await getNoteText(req.params.noteId, req.userId);
    const { type = 'comprehensive' } = req.body;

    let content;
    let summaryType = type;
    if (type === 'exam_revision') {
      content = await generateExamRevisionSummary(text);
    } else if (type === 'one_minute') {
      content = await generateOneMinuteNotes(text);
    } else {
      summaryType = 'comprehensive';
      content = await generateComprehensiveSummary(text);
    }

    await ensureProfile(req.userId, req.userEmail);
    const wordCount = content.split(/\s+/).length;
    const { data: saved, error: sErr } = await supabaseAdmin.from('summaries').insert({
      notes_id:    note.id,
      user_id:     req.userId,
      content,
      summary_type: summaryType,
      word_count:  wordCount,
    }).select('id').single();

    if (sErr) throw sErr;
    res.json({ success: true, summaryId: saved.id, content, wordCount, type: summaryType });
  } catch (err) {
    const st = err.status || 500;
    console.error('[Generate Summary]', err.message || err);
    res.status(st).json({ message: err.message || 'Failed to generate summary.' });
  }
});

// POST /api/notes/:noteId/generate/podcast-script
router.post('/:noteId/generate/podcast-script', verifyToken, async (req, res) => {
  try {
    // Use larger text limit for podcast (40K chars so AI has full context)
    const { note, text, fullLength } = await getNoteText(req.params.noteId, req.userId, 40000);
    const { length = 'auto' } = req.body;
    const script = await generatePodcastScript(text, length, fullLength);
    res.json({ success: true, script, title: `Podcast: ${note.title}` });
  } catch (err) {
    const st = err.status || 500;
    console.error('[Generate Podcast Script]', err.message || err);
    res.status(st).json({ message: err.message || 'Failed to generate podcast script.' });
  }
});

module.exports = router;

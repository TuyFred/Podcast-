/**
 * Chat Routes — AI Chatbot for uploaded notes
 * POST /api/chat/ask          — ask a question about a note
 * GET  /api/chat/history/:id  — get chat history for a note
 * DELETE /api/chat/history/:id — clear chat history
 */

const express  = require('express');
const router   = express.Router();
const { Notes } = require('../Models');
const { verifyToken } = require('./userRoutes');
const { chatWithNotes, generalChat } = require('../utils/aiProcessor');

// In-memory chat history store per session (use Redis/DB for production)
// Key: `${userId}:${noteId}`  → array of { role, text, timestamp }
const chatStore = new Map();

function historyKey(userId, noteId) {
  return `${userId}:${noteId}`;
}

// ── POST /api/chat/ask ─────────────────────────────────────────
router.post('/ask', verifyToken, async (req, res) => {
  try {
    const { noteId, question, clearHistory } = req.body;

    if (!noteId || !question?.trim()) {
      return res.status(400).json({ message: 'noteId and question are required.' });
    }

    // Fetch the note and verify ownership
    const note = await Notes.findOne({
      where: { id: noteId, userId: req.userId },
    });

    if (!note) {
      return res.status(404).json({ message: 'Note not found or access denied.' });
    }

    if (!note.cleanedText && !note.extractedText) {
      return res.status(400).json({ message: 'Note has no extracted text. Process it first.' });
    }

    const key      = historyKey(req.userId, noteId);
    let   history  = clearHistory ? [] : (chatStore.get(key) || []);

    // Add user message to history
    history.push({ role: 'user', text: question.trim(), timestamp: new Date().toISOString() });

    // Get AI answer
    const noteContext = note.cleanedText || note.extractedText;
    const answer      = await chatWithNotes(question.trim(), noteContext, history);

    // Add model response to history
    history.push({ role: 'model', text: answer, timestamp: new Date().toISOString() });

    // Keep last N messages
    const limit = parseInt(process.env.CHAT_HISTORY_LIMIT) || 40;
    if (history.length > limit) {
      history = history.slice(-limit);
    }

    chatStore.set(key, history);

    res.json({
      question: question.trim(),
      answer,
      noteId,
      noteTitle: note.title,
      historyLength: history.length,
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ message: 'Failed to get AI response.', error: error.message });
  }
});

// ── POST /api/chat/general ─────────────────────────────────────
// General AI chat — supports optional document context
const generalStore = new Map(); // Key: userId → history[]
const multer = require('multer');
const { extractTextFromFile } = require('../utils/textExtractor');
const fs = require('fs');

const chatUpload = multer({
  dest: process.env.UPLOAD_DIR || './uploads',
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    const ok = ['.pdf','.docx','.doc','.txt','.csv','.pptx'].includes(
      require('path').extname(file.originalname).toLowerCase()
    );
    cb(null, ok);
  },
});

router.post('/general', verifyToken, chatUpload.single('file'), async (req, res) => {
  try {
    const { message, clearHistory } = req.body;
    if (!message?.trim() && !req.file) {
      return res.status(400).json({ message: 'message or file is required.' });
    }

    let userMessage = message?.trim() || '';
    let fileContext = '';

    // If a file was uploaded, extract its text and prepend to the message
    if (req.file) {
      try {
        const ext = require('path').extname(req.file.originalname).substring(1).toLowerCase();
        const raw = await extractTextFromFile(req.file.path, ext);
        fileContext = raw?.substring(0, 8000) || ''; // limit context to 8000 chars
        // Clean up temp file
        fs.unlink(req.file.path, () => {});
      } catch (extractErr) {
        console.warn('[Chat] File extraction warning:', extractErr.message);
      }
    }

    // Build the final prompt — include document context if present
    const fullMessage = fileContext
      ? `I have uploaded a document. Here is its content:\n\n---\n${fileContext}\n---\n\nMy question: ${userMessage || 'Please summarize this document.'}`
      : userMessage;

    let history = clearHistory ? [] : (generalStore.get(req.userId) || []);
    history.push({ role: 'user', text: fullMessage, timestamp: new Date().toISOString() });

    const answer = await generalChat(fullMessage, history);

    history.push({ role: 'model', text: answer, timestamp: new Date().toISOString() });

    const limit = parseInt(process.env.CHAT_HISTORY_LIMIT) || 40;
    if (history.length > limit) history = history.slice(-limit);
    generalStore.set(req.userId, history);

    res.json({
      question:      userMessage,
      answer,
      hasDocument:   !!fileContext,
      historyLength: history.length,
    });
  } catch (error) {
    console.error('General chat error:', error);
    res.status(500).json({ message: 'AI response failed.', error: error.message });
  }
});

// ── GET /api/chat/history/:noteId ──────────────────────────────
router.get('/history/:noteId', verifyToken, async (req, res) => {
  try {
    const { noteId } = req.params;

    // Verify note ownership
    const note = await Notes.findOne({ where: { id: noteId, userId: req.userId } });
    if (!note) {
      return res.status(404).json({ message: 'Note not found or access denied.' });
    }

    const key     = historyKey(req.userId, noteId);
    const history = chatStore.get(key) || [];

    res.json({ noteId, noteTitle: note.title, history, count: history.length });
  } catch (error) {
    console.error('Get chat history error:', error);
    res.status(500).json({ message: 'Failed to retrieve chat history.' });
  }
});

// ── DELETE /api/chat/history/:noteId ───────────────────────────
router.delete('/history/:noteId', verifyToken, async (req, res) => {
  try {
    const { noteId } = req.params;

    const note = await Notes.findOne({ where: { id: noteId, userId: req.userId } });
    if (!note) {
      return res.status(404).json({ message: 'Note not found or access denied.' });
    }

    chatStore.delete(historyKey(req.userId, noteId));
    res.json({ message: 'Chat history cleared.', noteId });
  } catch (error) {
    console.error('Delete chat history error:', error);
    res.status(500).json({ message: 'Failed to clear chat history.' });
  }
});

module.exports = router;

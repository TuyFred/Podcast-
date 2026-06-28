const express = require('express');
const router = express.Router();
const { Flashcard, Notes } = require('../Models');
const { verifyToken } = require('./userRoutes');
const { body, validationResult } = require('express-validator');

// Generate flashcards endpoint
router.post(
  '/generate',
  verifyToken,
  [
    body('notesId').notEmpty(),
    body('numberOfFlashcards').optional().isInt({ min: 5, max: 100 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { notesId, numberOfFlashcards = 20 } = req.body;

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

      // TODO: Generate flashcards using AI

      res.status(201).json({
        message: 'Flashcard generation started',
        notesId,
        numberOfFlashcards,
      });
    } catch (error) {
      console.error('Generate flashcards error:', error);
      res.status(500).json({ message: 'Failed to generate flashcards' });
    }
  }
);

// Get user's flashcards endpoint
/* GET /api/flashcards/supabase-list — bypass RLS */
const { createClient: _sbF } = require('@supabase/supabase-js');
const _sbAdminF = _sbF(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
router.get('/supabase-list', verifyToken, async (req, res) => {
  try {
    const { data, error } = await _sbAdminF.from('flashcards').select('id,question,answer,category,created_at').eq('user_id', req.userId).order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/', verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, notesId, category, difficulty } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = { userId: req.userId };
    if (notesId) whereClause.notesId = notesId;
    if (category) whereClause.category = category;
    if (difficulty) whereClause.difficulty = difficulty;

    const { count, rows } = await Flashcard.findAndCountAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      attributes: {
        exclude: ['explanation', 'examples'],
      },
    });

    res.json({
      total: count,
      pages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      flashcards: rows,
    });
  } catch (error) {
    console.error('Get flashcards error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single flashcard endpoint
router.get('/:flashcardId', verifyToken, async (req, res) => {
  try {
    const flashcard = await Flashcard.findOne({
      where: {
        id: req.params.flashcardId,
        userId: req.userId,
      },
    });

    if (!flashcard) {
      return res.status(404).json({ message: 'Flashcard not found' });
    }

    res.json(flashcard);
  } catch (error) {
    console.error('Get flashcard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create custom flashcard endpoint
router.post(
  '/',
  verifyToken,
  [
    body('notesId').notEmpty(),
    body('question').notEmpty(),
    body('answer').notEmpty(),
    body('category').optional().isIn(['definition', 'concept', 'theory', 'application', 'formula', 'procedure']),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { notesId, question, answer, category, difficulty, topic, explanation, examples } = req.body;

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

      const flashcard = await Flashcard.create({
        notesId,
        userId: req.userId,
        question,
        answer,
        category,
        difficulty: difficulty || 'medium',
        topic,
        explanation,
        examples,
      });

      res.status(201).json({
        message: 'Flashcard created successfully',
        flashcard,
      });
    } catch (error) {
      console.error('Create flashcard error:', error);
      res.status(500).json({ message: 'Failed to create flashcard' });
    }
  }
);

// Update flashcard endpoint
router.put(
  '/:flashcardId',
  verifyToken,
  [
    body('question').optional().notEmpty(),
    body('answer').optional().notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { question, answer, category, difficulty, topic, explanation, examples } = req.body;

      const flashcard = await Flashcard.findOne({
        where: {
          id: req.params.flashcardId,
          userId: req.userId,
        },
      });

      if (!flashcard) {
        return res.status(404).json({ message: 'Flashcard not found' });
      }

      if (question) flashcard.question = question;
      if (answer) flashcard.answer = answer;
      if (category) flashcard.category = category;
      if (difficulty) flashcard.difficulty = difficulty;
      if (topic) flashcard.topic = topic;
      if (explanation !== undefined) flashcard.explanation = explanation;
      if (examples !== undefined) flashcard.examples = examples;

      await flashcard.save();

      res.json({
        message: 'Flashcard updated successfully',
        flashcard,
      });
    } catch (error) {
      console.error('Update flashcard error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Delete flashcard endpoint
router.delete('/:flashcardId', verifyToken, async (req, res) => {
  try {
    const flashcard = await Flashcard.findOne({
      where: {
        id: req.params.flashcardId,
        userId: req.userId,
      },
    });

    if (!flashcard) {
      return res.status(404).json({ message: 'Flashcard not found' });
    }

    await flashcard.destroy();

    res.json({ message: 'Flashcard deleted successfully' });
  } catch (error) {
    console.error('Delete flashcard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark flashcard review endpoint (for spaced repetition)
router.post(
  '/:flashcardId/review',
  verifyToken,
  [
    body('isCorrect').isBoolean(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { isCorrect } = req.body;

      const flashcard = await Flashcard.findOne({
        where: {
          id: req.params.flashcardId,
          userId: req.userId,
        },
      });

      if (!flashcard) {
        return res.status(404).json({ message: 'Flashcard not found' });
      }

      flashcard.userReviewCount += 1;
      if (isCorrect) {
        flashcard.userCorrectCount += 1;
      } else {
        flashcard.userIncorrectCount += 1;
      }

      // Simple spaced repetition: next review in 1 day, 3 days, or 7 days
      const correctRatio = flashcard.userCorrectCount / flashcard.userReviewCount;
      let daysUntilNextReview = 1;
      if (correctRatio >= 0.8) daysUntilNextReview = 7;
      else if (correctRatio >= 0.5) daysUntilNextReview = 3;

      flashcard.nextReviewDate = new Date(Date.now() + daysUntilNextReview * 24 * 60 * 60 * 1000);

      await flashcard.save();

      res.json({
        message: 'Review recorded',
        nextReviewDate: flashcard.nextReviewDate,
      });
    } catch (error) {
      console.error('Review flashcard error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

module.exports = router;

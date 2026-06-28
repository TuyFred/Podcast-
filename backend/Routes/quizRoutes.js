const express = require('express');
const router = express.Router();
const { Quiz, QuizAttempt, Notes } = require('../Models');
const { verifyToken } = require('./userRoutes');
const { body, validationResult } = require('express-validator');

// Generate quiz endpoint
router.post(
  '/generate',
  verifyToken,
  [
    body('notesId').notEmpty(),
    body('numberOfQuestions').optional().isInt({ min: 5, max: 50 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { notesId, title, numberOfQuestions = 20, timeLimit } = req.body;

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

      // TODO: Generate questions using AI

      const quiz = await Quiz.create({
        notesId,
        userId: req.userId,
        title: title || `Quiz - ${notes.title}`,
        totalQuestions: numberOfQuestions,
        timeLimit,
        questions: [], // Will be populated by AI processing
      });

      // TODO: Trigger quiz generation in background

      res.status(201).json({
        message: 'Quiz generation started',
        quizId: quiz.id,
      });
    } catch (error) {
      console.error('Generate quiz error:', error);
      res.status(500).json({ message: 'Failed to generate quiz' });
    }
  }
);

// Get user's quizzes endpoint
router.get('/', verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, notesId } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = { userId: req.userId, isPublished: true };
    if (notesId) whereClause.notesId = notesId;

    const { count, rows } = await Quiz.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Notes,
          attributes: ['id', 'title', 'courseName'],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      attributes: {
        exclude: ['questions'],
      },
    });

    res.json({
      total: count,
      pages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      quizzes: rows,
    });
  } catch (error) {
    console.error('Get quizzes error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/* GET /api/quizzes/supabase-list — bypass RLS */
const { createClient: _sbQ } = require('@supabase/supabase-js');
const _sbAdminQ = _sbQ(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
router.get('/supabase-list', verifyToken, async (req, res) => {
  try {
    const { data, error } = await _sbAdminQ.from('quizzes').select('id,title,total_questions,created_at,notes(title)').eq('user_id', req.userId).order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Get single quiz endpoint
router.get('/:quizId', verifyToken, async (req, res) => {
  try {
    const quiz = await Quiz.findOne({
      where: {
        id: req.params.quizId,
      },
      include: [
        {
          model: Notes,
          attributes: ['id', 'title', 'courseName', 'subjectArea'],
        },
      ],
    });

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Check if user created the quiz or it's public
    if (quiz.userId !== req.userId && !quiz.isPublished) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Don't send questions on initial load - user needs to start attempt
    const quizData = quiz.toJSON();
    quizData.questions = undefined;

    res.json(quizData);
  } catch (error) {
    console.error('Get quiz error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Start quiz attempt endpoint
router.post(
  '/:quizId/start',
  verifyToken,
  async (req, res) => {
    try {
      const quiz = await Quiz.findByPk(req.params.quizId);

      if (!quiz) {
        return res.status(404).json({ message: 'Quiz not found' });
      }

      // Send questions without answers
      const questionsForUser = quiz.questions.map(q => ({
        id: q.id,
        question: q.question,
        options: q.options,
      }));

      res.json({
        quizId: quiz.id,
        title: quiz.title,
        totalQuestions: quiz.totalQuestions,
        timeLimit: quiz.timeLimit,
        questions: questionsForUser,
      });
    } catch (error) {
      console.error('Start quiz error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Submit quiz attempt endpoint
router.post(
  '/:quizId/submit',
  verifyToken,
  [
    body('userAnswers').isArray(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { userAnswers, timeTaken } = req.body;
      const quiz = await Quiz.findByPk(req.params.quizId);

      if (!quiz) {
        return res.status(404).json({ message: 'Quiz not found' });
      }

      // Calculate score
      let correctAnswers = 0;
      userAnswers.forEach((answer) => {
        const question = quiz.questions.find(q => q.id === answer.questionId);
        if (question && question.correctAnswer === answer.selectedOption) {
          correctAnswers++;
        }
      });

      const score = (correctAnswers / quiz.totalQuestions) * 100;
      const isPassed = score >= quiz.passingScore;

      // Create quiz attempt record
      const attempt = await QuizAttempt.create({
        quizId: quiz.id,
        userId: req.userId,
        userAnswers,
        correctAnswers,
        totalQuestions: quiz.totalQuestions,
        score,
        timeTaken,
        isPassed,
        completedAt: new Date(),
      });

      // TODO: Send notification email with results

      res.json({
        message: 'Quiz submitted successfully',
        score,
        correctAnswers,
        totalQuestions: quiz.totalQuestions,
        isPassed,
        attemptId: attempt.id,
      });
    } catch (error) {
      console.error('Submit quiz error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Get quiz results endpoint
router.get('/:quizId/results', verifyToken, async (req, res) => {
  try {
    const attempts = await QuizAttempt.findAll({
      where: {
        quizId: req.params.quizId,
        userId: req.userId,
      },
      order: [['completedAt', 'DESC']],
    });

    if (attempts.length === 0) {
      return res.status(404).json({ message: 'No attempts found' });
    }

    const stats = {
      totalAttempts: attempts.length,
      averageScore: attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length,
      bestScore: Math.max(...attempts.map(a => a.score)),
      passedAttempts: attempts.filter(a => a.isPassed).length,
      attempts,
    };

    res.json(stats);
  } catch (error) {
    console.error('Get results error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

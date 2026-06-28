const express = require('express');
const router = express.Router();
const { Summary, Notes } = require('../Models');
const { verifyToken } = require('./userRoutes');

/* GET /api/summaries/supabase-list — bypass RLS */
const { createClient: _sbS } = require('@supabase/supabase-js');
const _sbAdminS = _sbS(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
router.get('/supabase-list', verifyToken, async (req, res) => {
  try {
    const { data, error } = await _sbAdminS.from('summaries').select('id,content,summary_type,word_count,created_at,notes(title,subject_area)').eq('user_id', req.userId).order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Get user's summaries endpoint
router.get('/', verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, notesId, summaryType } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = { userId: req.userId };
    if (notesId) whereClause.notesId = notesId;
    if (summaryType) whereClause.summaryType = summaryType;

    const { count, rows } = await Summary.findAndCountAll({
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
    });

    res.json({
      total: count,
      pages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      summaries: rows,
    });
  } catch (error) {
    console.error('Get summaries error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single summary endpoint
router.get('/:summaryId', verifyToken, async (req, res) => {
  try {
    const summary = await Summary.findOne({
      where: {
        id: req.params.summaryId,
        userId: req.userId,
      },
      include: [
        {
          model: Notes,
          attributes: ['id', 'title', 'courseName', 'subjectArea'],
        },
      ],
    });

    if (!summary) {
      return res.status(404).json({ message: 'Summary not found' });
    }

    res.json(summary);
  } catch (error) {
    console.error('Get summary error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all summaries for a note endpoint
router.get('/notes/:notesId', verifyToken, async (req, res) => {
  try {
    // Verify notes exist and belong to user
    const notes = await Notes.findOne({
      where: {
        id: req.params.notesId,
        userId: req.userId,
      },
    });

    if (!notes) {
      return res.status(404).json({ message: 'Notes not found' });
    }

    const summaries = await Summary.findAll({
      where: {
        notesId: req.params.notesId,
      },
      order: [['summaryType', 'ASC']],
    });

    res.json({
      notesId: req.params.notesId,
      noteTitle: notes.title,
      summaries,
    });
  } catch (error) {
    console.error('Get note summaries error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Export summary endpoint (PDF, DOCX, TXT)
router.get('/:summaryId/export/:format', verifyToken, async (req, res) => {
  try {
    const { format } = req.params;

    if (!['pdf', 'docx', 'txt'].includes(format)) {
      return res.status(400).json({ message: 'Invalid format. Allowed: pdf, docx, txt' });
    }

    const summary = await Summary.findOne({
      where: {
        id: req.params.summaryId,
        userId: req.userId,
      },
      include: [
        {
          model: Notes,
          attributes: ['id', 'title'],
        },
      ],
    });

    if (!summary) {
      return res.status(404).json({ message: 'Summary not found' });
    }

    // TODO: Generate file in requested format
    // This would use libraries like pdf-lib, docx, or simple fs for txt

    res.json({
      message: `Export to ${format.toUpperCase()} initiated`,
      summaryId: summary.id,
      format,
    });
  } catch (error) {
    console.error('Export summary error:', error);
    res.status(500).json({ message: 'Export failed' });
  }
});

module.exports = router;

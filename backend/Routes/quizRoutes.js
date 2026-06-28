const express = require('express');
const router  = express.Router();
const { verifyToken } = require('./userRoutes');
const { createClient } = require('@supabase/supabase-js');

const sbAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/* ── GET /api/quizzes/supabase-list ─ list all quizzes (no questions) */
router.get('/supabase-list', verifyToken, async (req, res) => {
  try {
    const { data, error } = await sbAdmin
      .from('quizzes')
      .select('id, title, total_questions, created_at, notes(title)')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/* ── GET /api/quizzes/:quizId/play ─ full quiz with questions for play */
router.get('/:quizId/play', verifyToken, async (req, res) => {
  try {
    const { data, error } = await sbAdmin
      .from('quizzes')
      .select('id, title, total_questions, passing_score, questions, created_at, notes(title)')
      .eq('id', req.params.quizId)
      .eq('user_id', req.userId)
      .single();
    if (error || !data) return res.status(404).json({ message: 'Quiz not found.' });
    res.json(data);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/* ── POST /api/quizzes/:quizId/submit ─ save attempt result */
router.post('/:quizId/submit', verifyToken, async (req, res) => {
  try {
    const { answers, timeTaken, score, correctCount, total } = req.body;
    const isPassed = (score || 0) >= 70;

    // Ensure profile row exists
    await sbAdmin.from('profiles')
      .upsert({ id: req.userId, email: req.userEmail || '', updated_at: new Date().toISOString() },
               { onConflict: 'id', ignoreDuplicates: true });

    // Save attempt (ignore error if quiz_attempts table doesn't exist yet)
    await sbAdmin.from('quiz_attempts').insert({
      quiz_id:      req.params.quizId,
      user_id:      req.userId,
      answers:      answers || {},
      score:        score || 0,
      is_passed:    isPassed,
      time_taken:   timeTaken || 0,
      completed_at: new Date().toISOString(),
    }).then(() => {}, () => {});

    res.json({ success: true, score, correctCount, total, isPassed });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/* ── GET / ─ fallback list (same as supabase-list) */
router.get('/', verifyToken, async (req, res) => {
  try {
    const { data, error } = await sbAdmin
      .from('quizzes')
      .select('id, title, total_questions, created_at')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ total: data?.length || 0, quizzes: data || [] });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;

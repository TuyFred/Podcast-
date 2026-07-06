const express   = require('express');
const router    = express.Router();
const { User, Notes, Podcast, Quiz, AdminLog } = require('../Models');
const { verifyToken } = require('./userRoutes');
const { body, validationResult } = require('express-validator');
const { Op }    = require('sequelize');
const { createClient } = require('@supabase/supabase-js');
const emailSvc  = require('../utils/emailService');

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/** Verify caller is admin via profiles table (Supabase, no RLS recursion). */
async function requireSbAdmin(req, res) {
  const { data: me } = await supabaseAdmin.from('profiles').select('role').eq('id', req.userId).single();
  if (!me || me.role !== 'admin') {
    res.status(403).json({ message: 'Admin only.' });
    return false;
  }
  return true;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── POST /api/admin/setup ─────────────────────────────────────
// One-time: creates the admin user in Supabase Auth + sets role
// Protected by a secret key from .env to avoid abuse
router.post('/setup', async (req, res) => {
  const { secret } = req.body;
  if (secret !== (process.env.ADMIN_SETUP_SECRET || 'voiceai-setup-2026')) {
    return res.status(403).json({ message: 'Invalid setup secret.' });
  }

  const email    = process.env.ADMIN_EMAIL    || 'admin@voiceai.app';
  const password = process.env.ADMIN_PASSWORD || 'Admin@VoiceAI2026!';

  try {
    // Create user in Supabase Auth (or find existing)
    let userId;
    const { data: createData, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email, password,
        email_confirm: true,
        user_metadata: { first_name: 'Admin', last_name: 'VoiceAI' },
      });

    if (createError) {
      // User may already exist — find them
      if (createError.message.includes('already') || createError.message.includes('registered')) {
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
        const found = listData?.users?.find(u => u.email === email);
        if (!found) throw createError;
        userId = found.id;
      } else {
        throw createError;
      }
    } else {
      userId = createData.user.id;
    }

    // Upsert profile with admin role
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId, email,
        first_name: 'Admin', last_name: 'VoiceAI',
        role: 'admin',
        is_email_verified: true,
        is_active: true,
        subscription_status: 'free',
      }, { onConflict: 'id' });

    if (profileError) console.warn('Profile upsert warning:', profileError.message);

    res.json({
      message: '✅ Admin user created/updated successfully.',
      email,
      note: 'You can now log in with the credentials from backend/.env',
    });
  } catch (err) {
    console.error('Admin setup error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// Middleware to verify admin role
const verifyAdmin = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all users endpoint
router.get('/users', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, role, status } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (role) whereClause.role = role;
    if (status === 'active') whereClause.isActive = true;
    if (status === 'inactive') whereClause.isActive = false;

    const { count, rows } = await User.findAndCountAll({
      where: whereClause,
      attributes: {
        exclude: ['password'],
      },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      total: count,
      pages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      users: rows,
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user details endpoint
router.get('/users/:userId', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.userId, {
      attributes: {
        exclude: ['password'],
      },
      include: [
        {
          model: Notes,
          attributes: ['id', 'title', 'createdAt', 'processingStatus'],
        },
      ],
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user status endpoint
router.put(
  '/users/:userId/status',
  verifyToken,
  verifyAdmin,
  [
    body('isActive').isBoolean(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { isActive } = req.body;

      const user = await User.findByPk(req.params.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      user.isActive = isActive;
      await user.save();

      // Send email notification via Brevo
      const name = user.firstName || '';
      if (isActive) {
        emailSvc.sendAccountReactivated(user.email, name).catch(console.error);
      } else {
        emailSvc.sendAccountSuspended(user.email, name, req.body.reason || '').catch(console.error);
      }

      // Log admin action
      await AdminLog.create({
        adminId: req.userId,
        action: isActive ? 'user_verified' : 'user_suspended',
        targetType: 'user',
        targetId: user.id,
        description: `User ${isActive ? 'activated' : 'suspended'}`,
      });

      res.json({ message: 'User status updated', user });
    } catch (error) {
      console.error('Update user status error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Delete user endpoint
router.delete('/users/:userId', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Log admin action
    await AdminLog.create({
      adminId: req.userId,
      action: 'user_deleted',
      targetType: 'user',
      targetId: user.id,
      description: `User deleted: ${user.email}`,
    });

    await user.destroy();

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all notes endpoint
router.get('/notes', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (status) whereClause.processingStatus = status;

    const { count, rows } = await Notes.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: 'User',
          attributes: ['id', 'email', 'firstName', 'lastName'],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      attributes: {
        exclude: ['extractedText', 'cleanedText'],
      },
    });

    res.json({
      total: count,
      pages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      notes: rows,
    });
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove flagged notes endpoint
router.delete('/notes/:notesId', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const notes = await Notes.findByPk(req.params.notesId);
    if (!notes) {
      return res.status(404).json({ message: 'Notes not found' });
    }

    // Log admin action
    await AdminLog.create({
      adminId: req.userId,
      action: 'notes_removed',
      targetType: 'notes',
      targetId: notes.id,
      description: `Notes removed: ${notes.title}`,
    });

    await notes.destroy();

    res.json({ message: 'Notes removed successfully' });
  } catch (error) {
    console.error('Remove notes error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get analytics endpoint
router.get('/analytics', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const totalUsers = await User.count();
    const totalNotes = await Notes.count();
    const totalPodcasts = await Podcast.count();
    const totalQuizzes = await Quiz.count();

    // Active users (logged in last 30 days)
    const activeUsers = await User.count({
      where: {
        lastLogin: {
          [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    });

    // Notes processing status breakdown
    const notesStatus = await Notes.findAll({
      attributes: [
        'processingStatus',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count'],
      ],
      group: ['processingStatus'],
      raw: true,
    });

    // Recent activity
    const recentActivity = await AdminLog.findAll({
      order: [['createdAt', 'DESC']],
      limit: 10,
      include: [
        {
          model: User,
          as: 'admin',
          attributes: ['id', 'email', 'firstName', 'lastName'],
        },
      ],
    });

    res.json({
      summary: {
        totalUsers,
        activeUsers,
        totalNotes,
        totalPodcasts,
        totalQuizzes,
      },
      notesStatus,
      recentActivity,
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get admin logs endpoint
router.get('/logs', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, action, adminId } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (action) whereClause.action = action;
    if (adminId) whereClause.adminId = adminId;

    const { count, rows } = await AdminLog.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'admin',
          attributes: ['id', 'email', 'firstName', 'lastName'],
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
      logs: rows,
    });
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ═══════════════════════════════════════════════════════════════
   SUPABASE-BASED ADMIN ENDPOINTS (bypass RLS with service role key)
   ═══════════════════════════════════════════════════════════════ */

// GET /api/admin/sb-users — all profiles list
router.get('/sb-users', verifyToken, async (req, res) => {
  try {
    if (!(await requireSbAdmin(req, res))) return;

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw error;
    res.json(data || []);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// GET /api/admin/sb-stats — counts for dashboard
router.get('/sb-stats', verifyToken, async (req, res) => {
  try {
    if (!(await requireSbAdmin(req, res))) return;

    const [users, notes, podcasts, quizzes, flashcards] = await Promise.all([
      supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('notes').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('podcasts').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('quizzes').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('flashcards').select('id', { count: 'exact', head: true }),
    ]);
    res.json({
      users: users.count || 0,
      notes: notes.count || 0,
      podcasts: podcasts.count || 0,
      quizzes: quizzes.count || 0,
      flashcards: flashcards.count || 0,
    });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// PATCH /api/admin/sb-users/:id — update profile (role, email, name, subscription, status)
router.patch('/sb-users/:id', verifyToken, async (req, res) => {
  try {
    if (!(await requireSbAdmin(req, res))) return;

    const targetId = req.params.id;
    const allowed = ['role', 'subscription_status', 'is_active', 'first_name', 'last_name', 'email'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No valid fields to update.' });
    }

    const { data: target, error: targetErr } = await supabaseAdmin
      .from('profiles')
      .select('id, email, first_name, last_name')
      .eq('id', targetId)
      .single();
    if (targetErr || !target) return res.status(404).json({ message: 'User not found.' });

    const authMeta = {};

    if (updates.email !== undefined) {
      const email = String(updates.email).trim().toLowerCase();
      if (!EMAIL_RE.test(email)) return res.status(400).json({ message: 'Invalid email address.' });

      const { data: dup } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', email)
        .neq('id', targetId)
        .maybeSingle();
      if (dup) return res.status(409).json({ message: 'Email already in use by another account.' });

      const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(targetId, {
        email,
        email_confirm: true,
      });
      if (authErr) throw authErr;
      updates.email = email;
    }

    if (updates.first_name !== undefined) {
      updates.first_name = String(updates.first_name).trim() || null;
      authMeta.first_name = updates.first_name;
    }
    if (updates.last_name !== undefined) {
      updates.last_name = String(updates.last_name).trim() || null;
      authMeta.last_name = updates.last_name;
    }

    if (Object.keys(authMeta).length > 0) {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(targetId);
      const existingMeta = authUser?.user?.user_metadata || {};
      await supabaseAdmin.auth.admin.updateUserById(targetId, {
        user_metadata: { ...existingMeta, ...authMeta },
      });
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', targetId)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    console.error('[Admin PATCH user]', e.message);
    res.status(500).json({ message: e.message || 'Failed to update user.' });
  }
});

// POST /api/admin/sb-users/:id/reset-password — admin sets a new password for a student
router.post('/sb-users/:id/reset-password', verifyToken, async (req, res) => {
  try {
    if (!(await requireSbAdmin(req, res))) return;

    const { password, notify = false } = req.body;
    if (!password || String(password).length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    const targetId = req.params.id;
    const { data: target, error: targetErr } = await supabaseAdmin
      .from('profiles')
      .select('email, first_name')
      .eq('id', targetId)
      .single();
    if (targetErr || !target) return res.status(404).json({ message: 'User not found.' });

    const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(targetId, {
      password: String(password),
    });
    if (authErr) throw authErr;

    if (notify && target.email) {
      const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;
      emailSvc.sendEmail({
        to: target.email,
        subject: 'Your VoiceAI password was reset',
        html: `<p>Hi ${target.first_name || 'there'},</p><p>An administrator reset your VoiceAI account password.</p><p>Please sign in with your new password: <a href="${loginUrl}">${loginUrl}</a></p>`,
        text: `Your VoiceAI password was reset by an administrator. Sign in at ${loginUrl}`,
      }).catch(err => console.warn('[Admin reset-password] Email notify failed:', err.message));
    }

    res.json({ message: 'Password reset successfully.' });
  } catch (e) {
    console.error('[Admin reset-password]', e.message);
    res.status(500).json({ message: e.message || 'Failed to reset password.' });
  }
});

// DELETE /api/admin/sb-users/:id — delete user
router.delete('/sb-users/:id', verifyToken, async (req, res) => {
  try {
    if (!(await requireSbAdmin(req, res))) return;

    // Delete from Supabase Auth
    await supabaseAdmin.auth.admin.deleteUser(req.params.id);
    // Profile will be cascade-deleted by database FK
    res.json({ message: 'User deleted.' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = { router, verifyAdmin };

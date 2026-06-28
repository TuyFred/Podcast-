/**
 * User / Auth Routes
 * – Register: creates Supabase user + sends welcome email via Brevo
 * – Login: Supabase sign-in
 * – Forgot password: sends reset email via Brevo
 * – Reset password: verifies OTP + updates password
 */

const express  = require('express');
const router   = express.Router();
const { User } = require('../Models');
const jwt      = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const { body, validationResult } = require('express-validator');
const crypto   = require('crypto');
const emailSvc = require('../utils/emailService');

// Supabase admin client
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/* ─── helpers ────────────────────────────────────────────────── */
const generateOTP = (len = 6) =>
  Array.from({ length: len }, () => Math.floor(Math.random() * 10)).join('');

/* ─── verifyToken middleware ──────────────────────────────────── */
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

  if (!token) return res.status(403).json({ message: 'No authentication token provided.' });

  // Try Supabase token first
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (!error && user) {
      req.userId    = user.id;
      req.userEmail = user.email;
      req.authType  = 'supabase';
      return next();
    }
  } catch (_) {}

  // Fall back to custom JWT
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId    = decoded.id;
    req.userEmail = decoded.email;
    req.authType  = 'jwt';
    return next();
  } catch (_) {}

  return res.status(401).json({ message: 'Invalid or expired token.' });
};

/* ─── verifyAdmin middleware ─────────────────────────────────── */
const verifyAdmin = async (req, res, next) => {
  await verifyToken(req, res, async () => {
    try {
      const user = await User.findByPk(req.userId, { attributes: ['role'] });
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required.' });
      }
      next();
    } catch (err) {
      res.status(500).json({ message: 'Server error verifying admin.' });
    }
  });
};

/* ══════════════════════════════════════════════════════════════
   POST /api/auth/register
   Creates user in Supabase Auth + sends welcome email via Brevo.
   ══════════════════════════════════════════════════════════════ */
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
    body('firstName').notEmpty().withMessage('First name is required.'),
    body('lastName').notEmpty().withMessage('Last name is required.'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, firstName, lastName, institution, educationLevel } = req.body;

    try {
      // 1. Create user in Supabase Auth (email_confirm:true → no OTP required, we send our own)
      const { data, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: false,  // require email verification
        user_metadata: { first_name: firstName, last_name: lastName },
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          // Notify existing user discreetly
          emailSvc.sendEmailConflict(email).catch(console.error);
          return res.status(400).json({ message: 'Email already registered.' });
        }
        throw signUpError;
      }

      // 2. Upsert profile row (Supabase trigger may also create it)
      await User.upsert({
        id:                 data.user.id,
        email,
        firstName,
        lastName,
        institution:        institution    || null,
        educationLevel:     educationLevel || 'undergraduate',
        isEmailVerified:    false,
        isActive:           true,
        role:               'user',
        subscriptionStatus: 'free',
      });

      // 3. Generate 6-digit OTP and send welcome + verification email via Brevo
      const otp = generateOTP(6);

      // Store OTP temporarily in Supabase user metadata (expires in 10 min)
      await supabaseAdmin.auth.admin.updateUserById(data.user.id, {
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          otp_code: otp,
          otp_expires: Date.now() + 10 * 60 * 1000,
        },
      });

      // Send via Brevo (non-blocking)
      emailSvc.sendWelcomeOTP(email, firstName, otp).catch(err =>
        console.error('[Register] Email send failed:', err.message)
      );

      console.log(`[Register] ✅ User created: ${email}`);
      res.status(201).json({
        message:          'Account created! Check your email for the verification code.',
        userId:           data.user.id,
        email:            data.user.email,
        requiresVerification: true,
      });
    } catch (error) {
      console.error('[Register] Error:', error.message);
      res.status(500).json({ message: error.message || 'Registration failed.' });
    }
  }
);

/* ══════════════════════════════════════════════════════════════
   POST /api/auth/verify-otp
   Verifies the 6-digit OTP sent by Brevo and confirms email.
   ══════════════════════════════════════════════════════════════ */
router.post(
  '/verify-otp',
  [
    body('email').isEmail().normalizeEmail(),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits.'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, otp } = req.body;

    try {
      // Search by email using getUserByEmail (more reliable than listUsers pagination)
      const { data: listData, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      if (error) throw error;

      const user = listData.users.find(u => u.email?.toLowerCase() === email?.toLowerCase());
      if (!user) return res.status(404).json({ message: 'User not found.' });

      const meta = user.user_metadata || {};

      // Check OTP
      if (!meta.otp_code || meta.otp_code !== otp) {
        return res.status(400).json({ message: 'Invalid verification code.' });
      }

      if (meta.otp_expires && Date.now() > meta.otp_expires) {
        return res.status(400).json({ message: 'Verification code has expired. Please request a new one.' });
      }

      // Confirm email in Supabase
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        email_confirm: true,
        user_metadata: { ...meta, otp_code: null, otp_expires: null },
      });

      // Mark email verified in profiles table
      await User.update({ isEmailVerified: true }, { where: { id: user.id } });

      // Send welcome email
      emailSvc.sendWelcomeEmail(email, meta.first_name).catch(console.error);

      res.json({ message: 'Email verified successfully! You can now log in.' });
    } catch (error) {
      console.error('[VerifyOTP] Error:', error.message);
      res.status(500).json({ message: 'Verification failed. Please try again.' });
    }
  }
);

/* ══════════════════════════════════════════════════════════════
   POST /api/auth/resend-otp
   Resends a new OTP to the user's email.
   ══════════════════════════════════════════════════════════════ */
router.post(
  '/resend-otp',
  [body('email').isEmail().normalizeEmail()],
  async (req, res) => {
    const { email } = req.body;

    try {
      const { data: listData, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      if (error) throw error;

      const user = listData.users.find(u => u.email?.toLowerCase() === email?.toLowerCase());
      if (!user) return res.status(404).json({ message: 'User not found.' });

      if (user.email_confirmed_at) {
        return res.status(400).json({ message: 'Email is already verified.' });
      }

      const otp = generateOTP(6);
      const firstName = user.user_metadata?.first_name || '';

      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...user.user_metadata,
          otp_code: otp,
          otp_expires: Date.now() + 10 * 60 * 1000,
        },
      });

      await emailSvc.sendWelcomeOTP(email, firstName, otp);

      res.json({ message: 'New verification code sent! Check your email.' });
    } catch (error) {
      console.error('[ResendOTP] Error:', error.message);
      res.status(500).json({ message: 'Failed to resend code.' });
    }
  }
);

/* ══════════════════════════════════════════════════════════════
   POST /api/auth/login
   ══════════════════════════════════════════════════════════════ */
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password });
      if (error) {
        return res.status(401).json({ message: 'Invalid email or password.' });
      }

      // ── Block unverified accounts ──────────────────────────────
      if (!data.user.email_confirmed_at) {
        // Sign them out immediately so the session doesn't linger
        await supabaseAdmin.auth.admin.signOut(data.session.access_token).catch(() => {});
        return res.status(403).json({
          message: 'Please verify your email before logging in.',
          requiresVerification: true,
          email: data.user.email,
        });
      }

      // ── Update last login timestamp (non-blocking) ─────────────
      supabaseAdmin.from('profiles').update({ updated_at: new Date().toISOString() }).eq('id', data.user.id).then(() => {}).catch(() => {});

      // ── Fetch role from profiles (service role bypasses RLS) ───
      const { data: prof } = await supabaseAdmin
        .from('profiles')
        .select('id,email,first_name,last_name,role,subscription_status,is_active')
        .eq('id', data.user.id)
        .single();

      // Blocked/suspended check
      if (prof && prof.is_active === false) {
        return res.status(403).json({ message: 'Your account has been suspended. Please contact support.' });
      }

      res.json({
        message:       'Login successful',
        access_token:  data.session.access_token,
        refresh_token: data.session.refresh_token,
        user: prof || { id: data.user.id, email: data.user.email, role: 'user' },
      });
    } catch (error) {
      console.error('[Login] Error:', error.message);
      res.status(500).json({ message: 'Login failed.' });
    }
  }
);

/* ═══════════════════════════════════════════════════════════════
   GET /api/auth/profile  — uses Supabase service role, bypasses RLS
   ═══════════════════════════════════════════════════════════════ */
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', req.userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.json({ id: req.userId, email: req.userEmail, role: 'user', is_active: true, subscription_status: 'free' });
      }
      throw error;
    }
    res.json(data);
  } catch (error) {
    console.error('[Profile] GET error:', error.message);
    res.status(500).json({ message: 'Failed to get profile.' });
  }
});

/* ═══════════════════════════════════════════════════════════════
   PUT /api/auth/profile
   ═══════════════════════════════════════════════════════════════ */
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { firstName, lastName, phone, institution, fieldOfStudy } = req.body;
    const updates = {};
    if (firstName)    updates.firstName   = firstName;
    if (lastName)     updates.lastName    = lastName;
    if (phone)        updates.phone       = phone;
    if (institution)  updates.institution = institution;
    if (fieldOfStudy) updates.fieldOfStudy = fieldOfStudy;

    await User.update(updates, { where: { id: req.userId } });
    const updated = await User.findByPk(req.userId);
    res.json({ message: 'Profile updated.', user: updated });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update profile.' });
  }
});

/* ═══════════════════════════════════════════════════════════════
   POST /api/auth/forgot-password
   Sends a password reset OTP + link via Brevo.
   ═══════════════════════════════════════════════════════════════ */
router.post(
  '/forgot-password',
  [body('email').isEmail().normalizeEmail()],
  async (req, res) => {
    const { email } = req.body;

    try {
      // Always return success to prevent email enumeration
      res.json({ message: 'If an account with that email exists, a reset email has been sent.' });

      // Find user
      const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
      if (error || !users) return;

      const user = users.find(u => u.email === email);
      if (!user) return; // silently skip — already responded

      const firstName = user.user_metadata?.first_name || '';

      // Generate OTP for password reset
      const otp = generateOTP(6);
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...user.user_metadata,
          reset_otp: otp,
          reset_otp_expires: Date.now() + 60 * 60 * 1000, // 1 hour
        },
      });

      // Also trigger Supabase's built-in reset link (as fallback)
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?email=${encodeURIComponent(email)}&otp=${otp}`;

      // Send via Brevo
      emailSvc.sendPasswordReset(email, firstName, resetUrl, otp).catch(err =>
        console.error('[ForgotPassword] Email send failed:', err.message)
      );

    } catch (error) {
      console.error('[ForgotPassword] Error:', error.message);
      // Already responded with 200
    }
  }
);

/* ═══════════════════════════════════════════════════════════════
   POST /api/auth/reset-password
   Verifies reset OTP then updates password.
   ═══════════════════════════════════════════════════════════════ */
router.post(
  '/reset-password',
  [
    body('email').isEmail().normalizeEmail(),
    body('otp').isLength({ min: 6, max: 6 }),
    body('newPassword').isLength({ min: 6 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, otp, newPassword } = req.body;

    try {
      const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
      if (error) throw error;

      const user = users.find(u => u.email === email);
      if (!user) return res.status(404).json({ message: 'User not found.' });

      const meta = user.user_metadata || {};

      if (!meta.reset_otp || meta.reset_otp !== otp) {
        return res.status(400).json({ message: 'Invalid or expired reset code.' });
      }
      if (meta.reset_otp_expires && Date.now() > meta.reset_otp_expires) {
        return res.status(400).json({ message: 'Reset code has expired. Please request a new one.' });
      }

      // Update password in Supabase
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        password: newPassword,
        user_metadata: { ...meta, reset_otp: null, reset_otp_expires: null },
      });

      res.json({ message: 'Password reset successfully. You can now log in.' });
    } catch (error) {
      console.error('[ResetPassword] Error:', error.message);
      res.status(500).json({ message: 'Failed to reset password.' });
    }
  }
);

/* ═══════════════════════════════════════════════════════════════
   POST /api/auth/change-password  (authenticated)
   ═══════════════════════════════════════════════════════════════ */
router.post('/change-password', verifyToken,
  [body('newPassword').isLength({ min: 6 })],
  async (req, res) => {
    const { newPassword } = req.body;
    try {
      await supabaseAdmin.auth.admin.updateUserById(req.userId, { password: newPassword });
      res.json({ message: 'Password changed successfully.' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to change password.' });
    }
  }
);

/* GET /api/auth/profile already defined above — no duplicate */

/* ═══════════════════════════════════════════════════════════════
   GET /api/auth/stats  — counts of user's content
   ═══════════════════════════════════════════════════════════════ */
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const uid = req.userId;
    const [notes, podcasts, quizzes, flashcards] = await Promise.all([
      supabaseAdmin.from('notes').select('id', { count: 'exact', head: true }).eq('user_id', uid),
      supabaseAdmin.from('podcasts').select('id', { count: 'exact', head: true }).eq('user_id', uid),
      supabaseAdmin.from('quizzes').select('id', { count: 'exact', head: true }).eq('user_id', uid),
      supabaseAdmin.from('flashcards').select('id', { count: 'exact', head: true }).eq('user_id', uid),
    ]);
    res.json({
      notes:      notes.count      || 0,
      podcasts:   podcasts.count   || 0,
      quizzes:    quizzes.count    || 0,
      flashcards: flashcards.count || 0,
    });
  } catch (err) {
    res.json({ notes: 0, podcasts: 0, quizzes: 0, flashcards: 0 });
  }
});

/* ═══════════════════════════════════════════════════════════════
   PATCH /api/auth/profile  (authenticated)
   ═══════════════════════════════════════════════════════════════ */
router.patch('/profile', verifyToken, async (req, res) => {
  try {
    const allowed = ['first_name','last_name','phone','institution','education_level','field_of_study'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', req.userId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update profile.' });
  }
});

module.exports = { router, verifyToken, verifyAdmin };

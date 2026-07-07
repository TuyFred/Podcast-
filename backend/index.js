const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan    = require('morgan');
const fs        = require('fs');

// Database — Supabase PostgreSQL + Sequelize (hybrid, both kept)
const { sequelize, testConnection } = require('./config/database');
const syncDatabase                    = require('./config/syncDatabase');
require('./Models'); // register Sequelize models (mirror Supabase tables)

// Routes
const { router: userRoutes }  = require('./Routes/userRoutes');
const notesRoutes              = require('./Routes/notesRoutes');
const podcastRoutes            = require('./Routes/podcastRoutes');
const quizRoutes               = require('./Routes/quizRoutes');
const flashcardRoutes          = require('./Routes/flashcardRoutes');
const summaryRoutes            = require('./Routes/summaryRoutes');
const { router: adminRoutes }  = require('./Routes/adminRoutes');
const chatRoutes               = require('./Routes/chatRoutes');
const ttsRoutes                = require('./Routes/ttsRoutes');
const publicRoutes             = require('./Routes/publicRoutes');
const emailSvc                 = require('./utils/emailService');

const app = express();

// ── Security ──────────────────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────
const devOrigins = [
  'http://localhost:5173', 'http://localhost:3000',
  'http://localhost:4173', 'http://localhost:4000',
];

// Additional origins from env (comma-separated frontend URLs)
const envOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',').map(o => o.trim()).filter(Boolean);

// Trusted hosting platform domains (any subdomain)
const TRUSTED_SUFFIXES = [
  '.vercel.app',
  '.onrender.com',
  '.netlify.app',
  '.pages.dev',    // Cloudflare Pages
];

app.use(cors({
  origin: (origin, cb) => {
    // No origin = server-to-server / Render health checks — always allow
    if (!origin) return cb(null, true);
    // Allow any trusted hosting platform subdomain
    if (TRUSTED_SUFFIXES.some(suffix => origin.endsWith(suffix))) return cb(null, true);
    // Allow dev origins
    if (devOrigins.includes(origin)) return cb(null, true);
    // Allow any origin explicitly listed in ALLOWED_ORIGINS env
    if (envOrigins.includes(origin)) return cb(null, true);
    // Also allow FRONTEND_URL directly
    if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) return cb(null, true);

    console.warn(`[CORS] blocked origin: ${origin}`);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Logging ────────────────────────────────────────────────────
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Rate Limiting ──────────────────────────────────────────────
// General API limit — generous to avoid blocking normal dashboard activity
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 min
  max:      parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 2000,
  message:  { message: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders:   false,
  skip: (req) => {
    // Never rate-limit auth endpoints, health checks or static files
    // Auth is called many times per session (profile, token refresh)
    return req.path.startsWith('/auth/') ||
           req.path.startsWith('/admin/sb-') ||
           req.path.startsWith('/public/') ||
           req.path === '/health' ||
           req.path.startsWith('/uploads');
  },
});
app.use('/api/', limiter);

// AI endpoints — limit only heavy AI generation calls, not reads
const aiLimiter = rateLimit({
  windowMs: 60_000, // 1 minute
  max: 60,          // 60 AI calls per minute per IP
  message: { message: 'AI request limit reached. Please wait a moment.' },
  skip: (req) => req.method === 'GET', // reads are never limited
});
app.use('/api/chat', aiLimiter);
app.use('/api/summaries', aiLimiter);
app.use('/api/podcasts', aiLimiter);
app.use('/api/tts', aiLimiter);

// ── Body Parsers ──────────────────────────────────────────────
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ── Static — uploaded files ───────────────────────────────────
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
// CORS + CORP headers required for cross-origin <audio src="..."> playback
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
}, express.static(path.resolve(uploadDir)));

// ── API Routes ────────────────────────────────────────────────
app.use('/api/auth',       userRoutes);
app.use('/api/notes',      notesRoutes);
app.use('/api/podcasts',   podcastRoutes);
app.use('/api/quizzes',    quizRoutes);
app.use('/api/flashcards', flashcardRoutes);
app.use('/api/summaries',  summaryRoutes);
app.use('/api/admin',      adminRoutes);
app.use('/api/chat',       chatRoutes);   // ← AI Chatbot
app.use('/api/tts',        ttsRoutes);    // ← Text to Speech
app.use('/api/public',     publicRoutes); // ← Public stats (landing page)

// ── Health Check ─────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  let dbStatus = 'unknown';
  const restOnly = process.env.USE_SUPABASE_REST_ONLY === 'true' || !sequelize;
  if (restOnly) {
    try {
      const { createClient } = require('@supabase/supabase-js');
      const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } });
      const { error } = await sb.from('profiles').select('id').limit(1);
      dbStatus = error ? 'rest-error' : 'supabase-rest';
    } catch {
      dbStatus = 'rest-unreachable';
    }
  } else {
    try {
      await sequelize.authenticate();
      dbStatus = 'postgresql-connected';
    } catch {
      dbStatus = 'postgresql-disconnected';
    }
  }
  res.json({
    status:    'OK',
    app:       'VoiceAI Backend',
    env:       process.env.NODE_ENV,
    database:  dbStatus,
    ai:        process.env.GEMINI_API_KEY ? 'Gemini 2.5 Flash ready' : '⚠ GEMINI_API_KEY missing',
    email:     emailSvc.isConfigured() ? 'Brevo/Gmail configured' : '⚠ BREVO_API_KEY missing — OTP emails will NOT send',
    timestamp: new Date().toISOString(),
  });
});

// ── API Route Map (dev helper) ────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.get('/api', (req, res) => res.json({
    routes: [
      'POST   /api/auth/register',
      'POST   /api/auth/login',
      'GET    /api/auth/profile',
      'PUT    /api/auth/profile',
      'POST   /api/auth/forgot-password',
      'POST   /api/auth/reset-password',
      'POST   /api/notes/upload',
      'GET    /api/notes',
      'GET    /api/notes/:id',
      'DELETE /api/notes/:id',
      'POST   /api/chat/ask',
      'GET    /api/chat/history/:noteId',
      'DELETE /api/chat/history/:noteId',
      'POST   /api/podcasts/generate/:notesId',
      'GET    /api/podcasts',
      'GET    /api/podcasts/:id/download',
      'POST   /api/summaries/generate/:notesId',
      'GET    /api/summaries',
      'POST   /api/quizzes/generate/:notesId',
      'GET    /api/quizzes',
      'POST   /api/quizzes/:id/submit',
      'POST   /api/flashcards/generate/:notesId',
      'GET    /api/flashcards',
      'GET    /api/admin/users',
      'PUT    /api/admin/users/:id',
      'DELETE /api/admin/users/:id',
    ],
  }));
}

// ── 404 ───────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.path}` });
});

// ── Global Error Handler ──────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ── Start Server ──────────────────────────────────────────────
const PORT = parseInt(process.env.PORT) || 5000;

async function startServer() {
  try {
    // Connect Sequelize to Supabase PostgreSQL (same DB as supabaseAdmin REST)
    const dbConnected = await testConnection();
    if (dbConnected) {
      await syncDatabase();
    }

    app.listen(PORT, async () => {
      const apiBase = process.env.APP_URL || `http://localhost:${PORT}`;
      console.log('');
      console.log('╔══════════════════════════════════════════╗');
      console.log('║         VoiceAI Backend Running           ║');
      console.log('╠══════════════════════════════════════════╣');
      console.log(`║  Port   : ${PORT}`);
      console.log(`║  Env    : ${process.env.NODE_ENV || 'development'}`);
      console.log(`║  AI     : Gemini 2.5 Flash`);
      console.log(`║  API    : ${apiBase}/api`);
      console.log('╚══════════════════════════════════════════╝');
      console.log('');

      // Quick Supabase REST health check (non-fatal)
      try {
        const { createClient } = require('@supabase/supabase-js');
        const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
          { auth: { autoRefreshToken: false, persistSession: false } });
        const { error } = await sb.from('profiles').select('id').limit(1);
        if (error) console.warn('⚠️  Supabase REST warning:', error.message);
        else console.log('✅ Supabase REST connection OK');
      } catch (e) {
        console.warn('⚠️  Supabase REST check failed:', e.message);
      }

      // Verify email connection (non-fatal)
      await emailSvc.verifyConnection().catch(() => {});
    });
  } catch (error) {
    console.error('✗ Failed to start server:', error.message);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => { try { if (sequelize) await sequelize.close(); } catch {} process.exit(0); });
process.on('SIGINT',  async () => { try { if (sequelize) await sequelize.close(); } catch {} process.exit(0); });

startServer();
module.exports = app;

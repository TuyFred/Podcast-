/**
 * Sync Sequelize models with Supabase PostgreSQL.
 *
 * Architecture:
 *   Supabase  = source of truth (Auth, Storage, RLS, SQL Editor migrations)
 *   Sequelize = ORM mirror of the SAME database (direct PostgreSQL via pooler)
 *   supabaseAdmin REST = primary runtime API (kept — not removed)
 *
 * Modes (SEQUELIZE_SYNC_MODE in .env):
 *   validate  — default; checks tables exist, no schema changes
 *   create    — create missing tables only (safe)
 *   alter     — apply model column changes to DB (dev only — can conflict with PG ENUMs)
 *   skip      — do nothing
 */
const { sequelize } = require('./database');

const SUPABASE_TABLES = [
  'profiles', 'notes', 'podcasts', 'summaries', 'quizzes', 'flashcards',
];

async function syncDatabase() {
  if (!sequelize) {
    console.log('[DB] Sequelize sync skipped — no DATABASE_URL configured');
    return { ok: false, mode: 'skipped' };
  }

  const mode = (process.env.SEQUELIZE_SYNC_MODE || 'validate').toLowerCase();

  if (mode === 'skip') {
    return { ok: true, mode: 'skip' };
  }

  try {
    // Load models so Sequelize knows about all tables
    require('../Models');

    if (mode === 'alter') {
      await sequelize.sync({ alter: true });
      console.log('[DB] ✅ Sequelize alter sync — model changes applied to Supabase PostgreSQL');
      return { ok: true, mode: 'alter' };
    }

    if (mode === 'create') {
      await sequelize.sync();
      console.log('[DB] ✅ Sequelize create sync — missing tables created on Supabase PostgreSQL');
      return { ok: true, mode: 'create' };
    }

    // validate (default) — use pg_catalog (reliable with Supabase pooler)
    const rows = await sequelize.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
      { type: sequelize.QueryTypes.SELECT }
    );
    const found = new Set(rows.map(r => r.tablename));
    const missing = SUPABASE_TABLES.filter(t => !found.has(t));

    if (missing.length) {
      console.warn('[DB] ⚠️  Missing tables in Supabase:', missing.join(', '));
      console.warn('[DB]    Run frontend/supabase/schema.sql in Supabase SQL Editor');
      return { ok: false, mode: 'validate', missing };
    }

    console.log('[DB] ✅ Sequelize ↔ Supabase in sync — all tables present (profiles, notes, podcasts, quizzes, flashcards, summaries)');
    return { ok: true, mode: 'validate', tables: SUPABASE_TABLES.length };
  } catch (err) {
    console.warn('[DB] Sequelize sync warning (Supabase REST still works):', err.message);
    return { ok: false, mode, error: err.message };
  }
}

module.exports = syncDatabase;

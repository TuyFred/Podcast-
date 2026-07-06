/**
 * Hybrid database layer — Supabase + Sequelize on the SAME PostgreSQL database.
 *
 * ┌─────────────────────────────────────────────────────────┐
 * │              Supabase PostgreSQL (cloud)                │
 * │  profiles · notes · podcasts · quizzes · flashcards …   │
 * └─────────────────────────────────────────────────────────┘
 *          ▲                              ▲
 *          │                              │
 *   supabaseAdmin REST              Sequelize ORM
 *   (auth, storage, app CRUD)       (models, sync, raw SQL)
 *          │                              │
 *          └────────── backend routes ────┘
 *
 * Keep BOTH:
 *   - supabaseAdmin  → primary for runtime (do not remove)
 *   - sequelize      → mirrors schema; sync via SEQUELIZE_SYNC_MODE
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { sequelize, testConnection, databaseUrl } = require('./database');
const { supabaseAdmin }                        = require('./supabaseAdmin');
const syncDatabase                             = require('./syncDatabase');

let Models = null;
try {
  if (sequelize) Models = require('../Models');
} catch (e) {
  console.warn('[DB] Models not loaded:', e.message);
}

module.exports = {
  sequelize,
  supabaseAdmin,
  syncDatabase,
  testConnection,
  Models,
  databaseUrl,
};

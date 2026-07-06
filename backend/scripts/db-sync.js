#!/usr/bin/env node
/**
 * Manual Sequelize ↔ Supabase sync.
 * Usage:
 *   npm run db:sync         — validate tables (default)
 *   npm run db:sync:alter   — apply model changes to Supabase PostgreSQL (dev only)
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { testConnection } = require('../config/database');
const syncDatabase       = require('../config/syncDatabase');

const modeArg = process.argv[2];
if (modeArg === 'alter') process.env.SEQUELIZE_SYNC_MODE = 'alter';
if (modeArg === 'create') process.env.SEQUELIZE_SYNC_MODE = 'create';

(async () => {
  console.log('VoiceAI — Sequelize ↔ Supabase sync\n');
  const connected = await testConnection();
  if (!connected) {
    console.error('Cannot connect to PostgreSQL. Check DATABASE_URL in .env');
    process.exit(1);
  }
  const result = await syncDatabase();
  console.log('\nResult:', result);
  process.exit(result.ok ? 0 : 1);
})();

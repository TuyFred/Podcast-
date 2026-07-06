const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

/** Build a safe PostgreSQL URL — encodes special chars in password (e.g. @ → %40) */
function buildDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const host     = process.env.DB_HOST;
  const port     = process.env.DB_PORT || '5432';
  const database = process.env.DB_NAME || 'postgres';
  const user     = process.env.DB_USER || 'postgres';
  const password = encodeURIComponent(process.env.DB_PASSWORD || '');

  if (!host || !process.env.DB_PASSWORD) return null;

  // Pooler session mode uses postgres.PROJECT_REF as username
  const poolerHost = process.env.DB_POOLER_HOST;
  const projectRef = process.env.SUPABASE_PROJECT_REF
    || (process.env.SUPABASE_URL || '').match(/https:\/\/([^.]+)/)?.[1];

  if (poolerHost && projectRef) {
    return `postgresql://postgres.${projectRef}:${password}@${poolerHost}:${port}/${database}`;
  }

  return `postgresql://${user}:${password}@${host}:${port}/${database}`;
}

const databaseUrl = buildDatabaseUrl();

// Supabase requires SSL
const sslConfig = process.env.DB_SSL === 'false'
  ? false
  : { require: true, rejectUnauthorized: false };

const sequelize = databaseUrl
  ? new Sequelize(databaseUrl, {
      dialect: 'postgres',
      logging: process.env.NODE_ENV === 'development' ? (msg) => console.log('[SQL]', msg) : false,
      dialectOptions: { ssl: sslConfig },
      pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
    })
  : null;

const useRestOnly = process.env.USE_SUPABASE_REST_ONLY === 'true'
  || process.env.SKIP_SEQUELIZE === 'true'
  || !sequelize;

const testConnection = async () => {
  if (useRestOnly || !sequelize) {
    console.log('ℹ️  Sequelize skipped — Supabase REST API only (set DATABASE_URL to enable both)');
    return false;
  }
  try {
    await sequelize.authenticate();
    const host = (databaseUrl || '').replace(/:([^:@/]+)@/, ':***@');
    console.log('✅ Sequelize PostgreSQL connected:', host.split('@')[1] || 'ok');
    return true;
  } catch (error) {
    if (error.message?.includes('ENOTFOUND') || error.message?.includes('ENETUNREACH')) {
      console.warn('⚠️  PostgreSQL host unreachable (IPv6/network issue).');
      console.warn('    → Use Supavisor pooler URL from Supabase Dashboard → Settings → Database.');
      console.warn('    → Encode @ in password as %40. Supabase REST API still works.');
    } else {
      console.warn('⚠️  Sequelize connection failed:', error.message);
      console.warn('    Supabase REST API still works.');
    }
    return false;
  }
};

module.exports = { sequelize, testConnection, databaseUrl };

const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Supabase requires SSL — rejectUnauthorized:false for self-signed cert
const sslConfig = process.env.DB_SSL === 'false'
  ? false
  : { require: true, rejectUnauthorized: false };

const sequelize = new Sequelize(
  process.env.DB_NAME || 'postgres',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD,
  {
    host:    process.env.DB_HOST,
    port:    parseInt(process.env.DB_PORT) || 5432,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? (msg) => console.log('[SQL]', msg) : false,
    dialectOptions: {
      ssl: sslConfig,
    },
    pool: {
      max:     5,
      min:     0,
      acquire: 30000,
      idle:    10000,
    },
  }
);

const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Sequelize DB connection OK');
  } catch (error) {
    // Non-fatal: all DB ops use supabaseAdmin (REST), Sequelize is legacy
    console.warn('⚠️  Sequelize direct-DB unavailable (using supabaseAdmin REST instead):', error.message);
  }
};

module.exports = { sequelize, testConnection };

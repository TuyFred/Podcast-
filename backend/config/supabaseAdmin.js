/**
 * Shared Supabase admin client (service role — bypasses RLS).
 * Use this for all app CRUD, auth helpers, and storage.
 * Same PostgreSQL database that Sequelize connects to directly.
 */
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

module.exports = { supabaseAdmin };

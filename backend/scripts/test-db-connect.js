/**
 * One-off helper: find working Supabase pooler region.
 * Run: node scripts/test-db-connect.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Sequelize } = require('sequelize');

const ref = 'fgvfceoqeirigwewnven';
const pwd = encodeURIComponent(process.env.DB_PASSWORD || '');
const regions = [
  'eu-central-1', 'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-north-1',
  'us-east-1', 'us-west-1', 'us-west-2',
  'ap-southeast-1', 'ap-northeast-1', 'ap-south-1',
  'sa-east-1', 'ca-central-1',
];

async function tryUrl(label, url) {
  const s = new Sequelize(url, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  });
  try {
    await s.authenticate();
    console.log(`✅ ${label}`);
    await s.close();
    return url;
  } catch (e) {
    console.log(`❌ ${label}: ${e.message}`);
    await s.close().catch(() => {});
    return null;
  }
}

(async () => {
  const attempts = [];

  // Direct IPv6
  attempts.push(['Direct :5432', `postgresql://postgres:${pwd}@db.${ref}.supabase.co:5432/postgres`]);
  attempts.push(['Direct :6543 (PgBouncer)', `postgresql://postgres:${pwd}@db.${ref}.supabase.co:6543/postgres`]);

  for (const prefix of ['aws-0', 'aws-1']) {
    for (const region of regions) {
      const host = `${prefix}-${region}.pooler.supabase.com`;
      // Session pooler — username postgres.PROJECT_REF
      attempts.push([`Pooler ${host}:5432 (postgres.${ref})`,
        `postgresql://postgres.${ref}:${pwd}@${host}:5432/postgres`]);
      // Transaction pooler
      attempts.push([`Pooler ${host}:6543 (postgres.${ref})`,
        `postgresql://postgres.${ref}:${pwd}@${host}:6543/postgres`]);
      // Legacy username postgres
      attempts.push([`Pooler ${host}:5432 (postgres)`,
        `postgresql://postgres:${pwd}@${host}:5432/postgres`]);
    }
  }

  for (const [label, url] of attempts) {
    const ok = await tryUrl(label, url);
    if (ok) {
      const masked = ok.replace(/:([^:@/]+)@/, ':***@');
      console.log('\n✅ Working DATABASE_URL — add to .env:');
      console.log(`DATABASE_URL=${masked}`);
      console.log('(Replace *** with your URL-encoded password)');
      process.exit(0);
    }
  }

  console.log('\nNo connection worked.');
  process.exit(1);
})();

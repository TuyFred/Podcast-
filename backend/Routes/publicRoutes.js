/**
 * Public routes — no authentication required.
 * GET /api/public/stats — platform-wide counters for landing page.
 */
const express = require('express');
const router  = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/** Format a number for display: 0 → "0", 1500 → "1.5K+", 1200000 → "1.2M+" */
function fmt(n) {
  if (!n || n <= 0) return '0';
  if (n >= 1_000_000) {
    const v = n / 1_000_000;
    return (v >= 10 ? Math.floor(v) : v.toFixed(1).replace(/\.0$/, '')) + 'M+';
  }
  if (n >= 1_000) {
    const v = n / 1_000;
    return (v >= 10 ? Math.floor(v) : v.toFixed(1).replace(/\.0$/, '')) + 'K+';
  }
  return String(n);
}

function pct(n) {
  if (!n || n <= 0) return '0%';
  return `${Math.min(99, Math.round(n))}%`;
}

// GET /api/public/stats
router.get('/stats', async (_req, res) => {
  try {
    const [
      notesRes,
      podcastsRes,
      usersRes,
      langsRes,
      voicesRes,
      durationRes,
      completedRes,
    ] = await Promise.all([
      supabaseAdmin.from('notes').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('podcasts').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('podcasts').select('language'),
      supabaseAdmin.from('podcasts').select('voice_type'),
      supabaseAdmin.from('podcasts').select('duration').not('duration', 'is', null),
      supabaseAdmin.from('notes').select('id', { count: 'exact', head: true }).eq('processing_status', 'completed'),
    ]);

    const documents   = notesRes.count || 0;
    const podcasts    = podcastsRes.count || 0;
    const users       = usersRes.count || 0;
    const completed   = completedRes.count || 0;

    // Sum audio duration (stored in seconds)
    const totalSeconds = (durationRes.data || []).reduce((s, r) => s + (r.duration || 0), 0);
    const audioMinutes = Math.max(0, Math.round(totalSeconds / 60));

    // Distinct languages & voice types used in the platform
    const langSet  = new Set((langsRes.data  || []).map(r => r.language).filter(Boolean));
    const voiceSet = new Set((voicesRes.data || []).map(r => r.voice_type).filter(Boolean));
    // Platform supports 14 TTS languages — show max of DB usage vs product capability
    const languages  = Math.max(langSet.size, parseInt(process.env.PLATFORM_LANGUAGES) || 14);
    const aiVoices   = Math.max(voiceSet.size, parseInt(process.env.PLATFORM_AI_VOICES) || 50);

    // Satisfaction proxy: % of notes successfully processed (min 95% when any data exists)
    let satisfaction = 0;
    if (documents > 0) {
      satisfaction = Math.round((completed / documents) * 100);
      if (satisfaction > 0 && satisfaction < 95) satisfaction = 95;
    }

    res.json({
      raw: {
        documents,
        audioMinutes,
        languages: langSet.size,
        aiVoices: voiceSet.size,
        users,
        podcasts,
        satisfaction,
      },
      display: {
        documentsConverted: fmt(documents),
        audioMinutesServed: fmt(audioMinutes),
        languagesSupported: languages >= 10 ? `${languages}+` : String(languages),
        aiVoices:           aiVoices >= 10 ? `${aiVoices}+` : String(aiVoices),
        userSatisfaction:   pct(satisfaction || (documents > 0 ? 95 : 0)),
      },
    });
  } catch (err) {
    console.error('[Public Stats]', err.message);
    res.status(500).json({ message: 'Failed to load platform stats.' });
  }
});

module.exports = router;

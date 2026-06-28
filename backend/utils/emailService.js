/**
 * Email Service
 *
 * Priority order:
 *  1. Brevo REST API  — if BREVO_API_KEY starts with "xkeysib-"  (recommended)
 *  2. Gmail SMTP      — if GMAIL_USER + GMAIL_APP_PASSWORD are set (easiest)
 *  3. Brevo SMTP      — if BREVO_SMTP_KEY is set
 *  4. Console log     — dev fallback (no emails sent)
 */

const nodemailer = require('nodemailer');
const axios      = require('axios');

const FROM_NAME  = () => process.env.EMAIL_FROM_NAME  || 'VoiceAI';
const FROM_EMAIL = () => process.env.EMAIL_FROM        || 'fredtuyishime24@gmail.com';
const APP_URL    = () => process.env.FRONTEND_URL      || 'http://localhost:5173';

/* ─── detect which method to use ─────────────────────────── */
const useRestApi = () => {
  const k = process.env.BREVO_API_KEY || '';
  return k.startsWith('xkeysib-') && k.length > 20;
};
const useGmail = () => !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD && process.env.GMAIL_APP_PASSWORD.length > 10);
const useSmtp  = () => !!(process.env.BREVO_SMTP_USER && process.env.BREVO_SMTP_KEY);

/* ─── nodemailer transports ────────────────────────────────── */
let _gmailTransport  = null;
let _brevoTransport  = null;

function getGmailTransport() {
  if (_gmailTransport) return _gmailTransport;
  _gmailTransport = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
  return _gmailTransport;
}

function getSmtpTransport() {
  if (_brevoTransport) return _brevoTransport;
  _brevoTransport = nodemailer.createTransport({
    host:       process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com',
    port:       parseInt(process.env.BREVO_SMTP_PORT) || 587,
    secure:     false,
    requireTLS: true,
    auth: {
      user: process.env.BREVO_SMTP_USER,
      pass: process.env.BREVO_SMTP_KEY,
    },
    tls: { rejectUnauthorized: false },
    connectionTimeout: 10000,
    greetingTimeout:   10000,
  });
  return _brevoTransport;
}

/* ─── send via Brevo REST API ─────────────────────────────── */
async function sendViaApi({ to, subject, html, text }) {
  const payload = {
    sender:      { name: FROM_NAME(), email: FROM_EMAIL() },
    to:          [{ email: to }],
    subject,
    htmlContent: html,
    textContent: text || subject,
  };

  const resp = await axios.post(
    'https://api.brevo.com/v3/smtp/email',
    payload,
    {
      headers: {
        'accept':       'application/json',
        'api-key':      process.env.BREVO_API_KEY,
        'content-type': 'application/json',
      },
      timeout: 15000,
    }
  );

  console.log(`[EMAIL] ✅ Sent via Brevo API to ${to} — messageId: ${resp.data.messageId}`);
  return { success: true, messageId: resp.data.messageId };
}

/* ─── send via Brevo SMTP ─────────────────────────────────── */
async function sendViaSmtp({ to, subject, html, text }) {
  const info = await getSmtpTransport().sendMail({
    from:    `"${FROM_NAME()}" <${FROM_EMAIL()}>`,
    to,
    subject,
    html,
    text: text || subject,
  });
  console.log(`[EMAIL] ✅ Sent via SMTP to ${to} — messageId: ${info.messageId}`);
  return { success: true, messageId: info.messageId };
}

/* ─── send via Gmail SMTP ──────────────────────────────────── */
async function sendViaGmail({ to, subject, html, text }) {
  const info = await getGmailTransport().sendMail({
    from:    `"${FROM_NAME()}" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html,
    text: text || subject,
  });
  console.log(`[EMAIL] ✅ Sent via Gmail to ${to} — messageId: ${info.messageId}`);
  return { success: true, messageId: info.messageId };
}

/* ─── Master send function ────────────────────────────────── */
async function sendEmail({ to, subject, html, text }) {
  try {
    if (useRestApi()) {
      return await sendViaApi({ to, subject, html, text });
    }
    if (useGmail()) {
      return await sendViaGmail({ to, subject, html, text });
    }
    if (useSmtp()) {
      return await sendViaSmtp({ to, subject, html, text });
    }
    // Dev fallback — just log
    console.log(`[EMAIL - NO CONFIG] To: ${to} | Subject: ${subject}`);
    console.log('[EMAIL] 💡 Set BREVO_API_KEY or GMAIL_APP_PASSWORD in backend/.env');
    return { success: true, simulated: true };
  } catch (err) {
    console.error(`[EMAIL] ❌ Failed to send to ${to}:`, err.message);
    return { success: false, error: err.message };
  }
}

/* ──────────────────────────────────────────────────────────────
   TEMPLATES
────────────────────────────────────────────────────────────── */

function base(content, preview = '') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
</head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  ${preview ? `<div style="display:none;max-height:0;overflow:hidden;">${preview}</div>` : ''}
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

        <!-- Header -->
        <tr><td align="center" style="padding-bottom:20px;">
          <div style="display:inline-block;background:linear-gradient(135deg,#2563EB,#10B981);border-radius:14px;padding:12px 20px;">
            <span style="color:#fff;font-size:18px;font-weight:800;">🎙 ${FROM_NAME()}</span>
          </div>
        </td></tr>

        <!-- Card -->
        <tr><td style="background:#fff;border-radius:20px;padding:36px;box-shadow:0 2px 16px rgba(0,0,0,0.07);">
          ${content}
        </td></tr>

        <!-- Footer -->
        <tr><td align="center" style="padding-top:20px;">
          <p style="margin:0;font-size:12px;color:#94A3B8;">
            © ${new Date().getFullYear()} ${FROM_NAME()} · 
            <a href="${APP_URL()}" style="color:#2563EB;text-decoration:none;">${APP_URL()}</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function otpBox(code) {
  return `
  <div style="text-align:center;margin:24px 0;">
    <div style="display:inline-block;background:#EFF6FF;border:2px dashed #60A5FA;border-radius:14px;padding:24px 32px;">
      <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#2563EB;text-transform:uppercase;letter-spacing:1.5px;">Your code</p>
      <p style="margin:0;font-size:42px;font-weight:900;letter-spacing:12px;color:#0F172A;font-family:monospace;">${code}</p>
      <p style="margin:8px 0 0;font-size:12px;color:#64748B;">Expires in 10 minutes</p>
    </div>
  </div>`;
}

function btn(url, label, color = '#2563EB') {
  return `
  <div style="text-align:center;margin:24px 0;">
    <a href="${url}" style="display:inline-block;background:${color};color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;border-radius:12px;">
      ${label} →
    </a>
    <p style="margin:10px 0 0;font-size:11px;color:#94A3B8;">Or copy: <a href="${url}" style="color:#2563EB;">${url}</a></p>
  </div>`;
}

/* ══════════════════════════════════════════════════════════════
   PUBLIC EMAIL FUNCTIONS
══════════════════════════════════════════════════════════════ */

async function sendWelcomeOTP(email, firstName, otpCode) {
  return sendEmail({
    to:      email,
    subject: `${otpCode} — Your ${FROM_NAME()} verification code`,
    html: base(`
      <h2 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#0F172A;">Welcome to ${FROM_NAME()}! 🎙</h2>
      <p style="margin:0 0 4px;font-size:15px;color:#475569;">
        Hi <strong>${firstName || 'there'}</strong>, please verify your email address.
      </p>
      ${otpBox(otpCode)}
      <p style="margin:16px 0 0;font-size:13px;color:#94A3B8;text-align:center;">
        If you didn't create this account, ignore this email.
      </p>
    `, `Your ${FROM_NAME()} code: ${otpCode}`),
  });
}

async function sendWelcomeEmail(email, firstName) {
  return sendEmail({
    to:      email,
    subject: `Welcome to ${FROM_NAME()} — let's get started! 🎙`,
    html: base(`
      <h2 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#0F172A;">You're all set! 🎉</h2>
      <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.6;">
        Hi <strong>${firstName || 'there'}</strong>! Your ${FROM_NAME()} account is verified and ready.
      </p>
      ${btn(`${APP_URL()}/dashboard`, 'Go to Dashboard', 'linear-gradient(135deg,#2563EB,#10B981)')}
      <p style="margin:20px 0 0;font-size:13px;color:#64748B;">
        🎙 Upload notes → generate podcasts → learn smarter.
      </p>
    `, `Welcome to ${FROM_NAME()}!`),
  });
}

async function sendPasswordReset(email, firstName, resetUrl, otpCode = null) {
  return sendEmail({
    to:      email,
    subject: `Reset your ${FROM_NAME()} password`,
    html: base(`
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0F172A;">Reset your password 🔐</h2>
      <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.6;">
        Hi <strong>${firstName || 'there'}</strong>, we received a password reset request.
      </p>
      ${otpCode ? otpBox(otpCode) : ''}
      ${resetUrl ? btn(resetUrl, 'Reset Password', '#EF4444') : ''}
      <div style="margin-top:20px;padding:14px;background:#FFFBEB;border-radius:12px;border:1px solid #FDE68A;">
        <p style="margin:0;font-size:13px;color:#92400E;">
          ⚠️ This code expires in <strong>1 hour</strong>. If you didn't request this, ignore this email.
        </p>
      </div>
    `),
  });
}

async function sendEmailConflict(email) {
  return sendEmail({
    to:      email,
    subject: `Sign-in attempt on your ${FROM_NAME()} account`,
    html: base(`
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0F172A;">Account already exists 👋</h2>
      <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.6;">
        Someone tried to register with <strong>${email}</strong>, but an account already exists.
      </p>
      ${btn(`${APP_URL()}/login`, 'Sign In to Your Account')}
      <p style="font-size:13px;color:#94A3B8;text-align:center;">
        Forgot your password? <a href="${APP_URL()}/forgot-password" style="color:#2563EB;">Reset it here</a>
      </p>
    `),
  });
}

async function sendAccountSuspended(email, firstName, reason = '') {
  return sendEmail({
    to:      email,
    subject: `Your ${FROM_NAME()} account has been suspended`,
    html: base(`
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#DC2626;">Account Suspended ⚠️</h2>
      <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6;">
        Hi <strong>${firstName || 'there'}</strong>, your account has been temporarily suspended.
        ${reason ? `<br/><br/>Reason: ${reason}` : ''}
      </p>
      <p style="font-size:13px;color:#64748B;">Contact support if you think this is a mistake.</p>
    `),
  });
}

async function sendAccountReactivated(email, firstName) {
  return sendEmail({
    to:      email,
    subject: `Your ${FROM_NAME()} account has been reactivated`,
    html: base(`
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#059669;">Account Reactivated ✅</h2>
      <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.6;">
        Hi <strong>${firstName || 'there'}</strong>! Your account is active again.
      </p>
      ${btn(`${APP_URL()}/login`, 'Sign In Now', '#059669')}
    `),
  });
}

async function sendPodcastReady(email, firstName, podcastTitle) {
  return sendEmail({
    to:      email,
    subject: `🎙 Your podcast "${podcastTitle}" is ready!`,
    html: base(`
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0F172A;">Your podcast is ready! 🎙</h2>
      <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.6;">
        Hi <strong>${firstName || 'there'}</strong>!<br/>
        "<strong>${podcastTitle}</strong>" has been generated successfully.
      </p>
      ${btn(`${APP_URL()}/podcasts`, 'Listen Now', 'linear-gradient(135deg,#059669,#0891B2)')}
    `, `Your podcast "${podcastTitle}" is ready!`),
  });
}

/* ─── verify connection on startup ──────────────────────────── */
async function verifyConnection() {
  if (useRestApi()) {
    try {
      await axios.get('https://api.brevo.com/v3/account', {
        headers: { 'api-key': process.env.BREVO_API_KEY },
        timeout: 8000,
      });
      console.log('[EMAIL] ✅ Brevo REST API connected — ready to send emails!');
      return true;
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      console.error('[EMAIL] ❌ Brevo API key invalid:', msg);
      console.log('[EMAIL] 💡 Get your API key: Brevo dashboard → top-right avatar → SMTP & API → API Keys');
      return false;
    }
  }

  if (useGmail()) {
    try {
      await getGmailTransport().verify();
      console.log('[EMAIL] ✅ Gmail SMTP connected — ready to send emails!');
      return true;
    } catch (err) {
      console.error('[EMAIL] ❌ Gmail SMTP failed:', err.message);
      console.log('[EMAIL] 💡 Gmail tips:');
      console.log('          1. Enable 2-Step Verification on your Google account');
      console.log('          2. Go to Google Account → Security → App passwords');
      console.log('          3. Create an app password for "Mail"');
      console.log('          4. Paste the 16-character password (no spaces) in GMAIL_APP_PASSWORD');
      return false;
    }
  }

  if (useSmtp()) {
    try {
      await getSmtpTransport().verify();
      console.log('[EMAIL] ✅ Brevo SMTP connected!');
      return true;
    } catch (err) {
      console.error('[EMAIL] ❌ Brevo SMTP failed:', err.message);
      console.log('[EMAIL] 💡 Use BREVO_API_KEY (xkeysib-...) or GMAIL_APP_PASSWORD instead');
      return false;
    }
  }

  console.log('[EMAIL] ⚠  No email credentials set. Emails will be logged to console only.');
  console.log('[EMAIL] Options:');
  console.log('         A) BREVO_API_KEY=xkeysib-...  (Brevo dashboard → SMTP & API → API Keys)');
  console.log('         B) GMAIL_APP_PASSWORD=xxxx     (Google account → Security → App passwords)');
  return false;
}

module.exports = {
  sendEmail,
  sendWelcomeOTP,
  sendWelcomeEmail,
  sendPasswordReset,
  sendEmailConflict,
  sendAccountSuspended,
  sendAccountReactivated,
  sendPodcastReady,
  verifyConnection,
  isConfigured: () => useRestApi() || useGmail() || useSmtp(),
};

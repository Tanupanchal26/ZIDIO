const nodemailer = require('nodemailer');
const { smtp, clientUrl } = require('../config/env');
const logger = require('../utils/logger');

// ── Transporter ───────────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host:   smtp.host,
  port:   smtp.port,
  secure: smtp.secure,
  auth:   smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
});

// ── Retry helper — 3 attempts with exponential backoff ───────────────────────
const sendWithRetry = async (mailOptions, attempts = 3) => {
  for (let i = 1; i <= attempts; i++) {
    try {
      await transporter.sendMail({ from: smtp.from, ...mailOptions });
      logger.info(`[EMAIL SENT] To: ${mailOptions.to} | Subject: ${mailOptions.subject}`);
      return;
    } catch (err) {
      if (i === attempts) {
        logger.error(`[EMAIL FAILED] To: ${mailOptions.to} after ${attempts} attempts — ${err.message}`);
        throw err;
      }
      const delay = 1000 * 2 ** (i - 1); // 1s, 2s, 4s
      logger.warn(`[EMAIL RETRY] attempt ${i}/${attempts} for ${mailOptions.to} — retrying in ${delay}ms`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
};

const send = async (mailOptions) => {
  if (!smtp.host) {
    logger.debug(`[EMAIL SKIP] To: ${mailOptions.to} | Subject: ${mailOptions.subject}`);
    return;
  }
  await sendWithRetry(mailOptions);
};

// ── Templates ─────────────────────────────────────────────────────────────────

const sendVerificationEmail = (user, rawToken) =>
  send({
    to:      user.email,
    subject: 'IntellMeet — Verify Your Email',
    html: `
      <h2>Hi ${user.name},</h2>
      <p>Click the button below to verify your email address.</p>
      <p>This link expires in <strong>24 hours</strong>.</p>
      <a href="${clientUrl}/verify-email/${rawToken}"
         style="background:#4F46E5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin:16px 0">
        Verify Email
      </a>
      <p>If you didn't create an account, ignore this email.</p>
    `,
  });

const sendPasswordResetEmail = (user, rawToken) =>
  send({
    to:      user.email,
    subject: 'IntellMeet — Reset Your Password',
    html: `
      <h2>Hi ${user.name},</h2>
      <p>You requested a password reset. Click the button below.</p>
      <p>This link expires in <strong>1 hour</strong>.</p>
      <a href="${clientUrl}/reset-password/${rawToken}"
         style="background:#DC2626;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin:16px 0">
        Reset Password
      </a>
      <p>If you did not request this, your account may be at risk — change your password immediately.</p>
    `,
  });

module.exports = { send, sendVerificationEmail, sendPasswordResetEmail };

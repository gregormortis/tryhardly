import dotenv from 'dotenv';

// Load environment variables BEFORE importing app. ES `import` statements are
// hoisted and would otherwise run app's module-level code (CORS origins, etc.)
// before dotenv populates process.env. Using require here defers app loading
// until after dotenv.config() has run.
dotenv.config();

// Optional error reporting (no-op unless SENTRY_DSN + @sentry/node are present).
// Loaded after dotenv so SENTRY_DSN is available. Required here so it runs before
// app handlers register; reportError() is a safe no-op until init completes.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { initErrorReporting } = require('./lib/errorReporting');
void initErrorReporting();

// eslint-disable-next-line @typescript-eslint/no-var-requires
const app = require('./app').default as import('express').Application;

const PORT = process.env.PORT || 4000;

// Start server
const server = app.listen(PORT, () => {
  console.log(`\nTryHardly API server`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Listening on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);

  // Startup readiness check for the alerting path.
  //
  // Both alert channels fail silently by design: reportError is a no-op
  // without SENTRY_DSN, and mailerService falls back to a NoopEmailProvider in
  // production when EMAIL_PROVIDER/RESEND_API_KEY are unset. A deploy can
  // therefore look perfectly healthy while having no way to tell a human that
  // something is wrong. The 2026-08-04 card-testing incident ran unnoticed
  // until Stripe closed the account; surfacing this at boot makes that
  // specific silence hard to miss.
  const emailProvider = (process.env.EMAIL_PROVIDER || '').toLowerCase();
  const emailLive =
    emailProvider === 'resend'
      ? Boolean(process.env.RESEND_API_KEY)
      : emailProvider === 'log'
        ? true
        : process.env.NODE_ENV !== 'production';
  const sentryLive = Boolean(process.env.SENTRY_DSN);

  console.log(
    `Alerting: email=${emailLive ? 'on' : 'OFF'} sentry=${sentryLive ? 'on' : 'off'} ` +
      `ops=${process.env.OPS_ALERT_EMAIL || 'support@tryhardly.com'}`,
  );
  if (!emailLive && !sentryLive) {
    console.error(
      '[STARTUP WARNING] No alert channel is configured. Payment abuse alerts ' +
        'will only appear in these logs. Set EMAIL_PROVIDER=resend with ' +
        'RESEND_API_KEY, or SENTRY_DSN, so alerts reach a human.',
    );
  }
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n⚠️  SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n⚠️  SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
});

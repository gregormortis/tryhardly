/**
 * Optional, dependency-light error reporting.
 *
 * This module is a no-op unless BOTH of the following are true:
 *   1. The SENTRY_DSN environment variable is set, and
 *   2. The optional `@sentry/node` package is installed.
 *
 * We intentionally do NOT add `@sentry/node` to package.json. It is loaded via a
 * dynamic import wrapped in try/catch, so the backend builds and runs identically
 * whether or not Sentry is present. To enable Sentry in production:
 *
 *   1. npm install @sentry/node
 *   2. Set SENTRY_DSN (and optionally SENTRY_ENVIRONMENT, SENTRY_TRACES_SAMPLE_RATE)
 *
 * See docs/MONITORING.md for the full setup guide.
 */

type CaptureFn = (err: unknown, context?: Record<string, unknown>) => void;

let capture: CaptureFn = () => {
  /* no-op until initialized */
};

let initialized = false;

export async function initErrorReporting(): Promise<void> {
  if (initialized) return;
  initialized = true;

  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    // No DSN configured — error reporting stays a no-op. This is the default.
    return;
  }

  try {
    // Optional dependency: loaded only when present. The eval indirection keeps
    // bundlers/tsc from treating this as a hard dependency at build time.
    const moduleName = '@sentry/node';
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-explicit-any
    const Sentry: any = await import(moduleName).catch(() => null);
    if (!Sentry || typeof Sentry.init !== 'function') {
      console.warn('[errorReporting] SENTRY_DSN is set but @sentry/node is not installed — skipping. Run `npm install @sentry/node` to enable.');
      return;
    }

    Sentry.init({
      dsn,
      environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0),
    });

    capture = (err, context) => {
      try {
        Sentry.captureException(err, context ? { extra: context } : undefined);
      } catch {
        /* never let reporting throw */
      }
    };

    console.log('[errorReporting] Sentry initialized');
  } catch (e) {
    console.warn('[errorReporting] failed to initialize Sentry:', e);
  }
}

/** Report an error to the configured provider. Safe no-op when not configured. */
export function reportError(err: unknown, context?: Record<string, unknown>): void {
  capture(err, context);
}

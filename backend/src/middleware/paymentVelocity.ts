import { Request, Response, NextFunction } from 'express';
import { reportError } from '../lib/errorReporting';
import { sendEmail } from '../services/mailerService';

/**
 * Platform-wide payment velocity circuit breaker.
 *
 * WHY THIS EXISTS
 *   The 2026-08-04 card-testing attack ran 82 identical $10 charges against a
 *   single job in about 25 minutes. The controls added afterwards help but do
 *   not fully close the hole:
 *
 *     - The per-IP and per-user limiters allow 10 requests / 10 minutes each,
 *       i.e. up to 60 checkout initiations per hour per account. Applied to the
 *       original attack they would have permitted roughly 25 charges instead of
 *       82 — better, but still a serious incident.
 *     - The duplicate-checkout block is the control that actually stopped that
 *       specific pattern, because all 82 attempts targeted one job. An attacker
 *       who cycles several jobs defeats it.
 *     - Nothing was watching the platform as a whole. Nobody knew anything was
 *       wrong until Stripe closed the account.
 *
 *   This middleware adds the missing layer: a ceiling on total checkout
 *   initiations across every user, every IP, and every job combined. At current
 *   volume (roughly zero to two jobs per day) a limit of 25 per hour cannot be
 *   reached by legitimate traffic, so it is effectively free of false positives
 *   while making a repeat of the attack impossible to run to completion.
 *
 *   When the ceiling trips, checkout initiation is refused for the remainder of
 *   the window and an alert is sent once per window. Refusing payments for an
 *   hour is a far cheaper failure than losing the Stripe account again.
 *
 * KNOWN LIMITATION
 *   State is per-process, matching the existing rateLimit middleware. On a
 *   multi-instance deploy the effective ceiling multiplies by the instance
 *   count. The backend currently runs a single Railway instance. Moving this to
 *   Redis is the follow-up before scaling out; until then, keep the limit low
 *   enough that even a few instances stay within a tolerable total.
 */

function intFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

interface Window {
  count: number;
  resetAt: number;
  alerted: boolean;
}

export interface VelocityBreakerOptions {
  windowMs?: number;
  max?: number;
  label?: string;
  /** Injectable for tests. */
  onTrip?: (info: { label: string; count: number; max: number; windowMs: number }) => void;
}

/**
 * Default alert.
 *
 * Delivery order matters here, and the order is deliberate:
 *
 *   1. console.error, ALWAYS and FIRST.
 *   2. Sentry, if configured.
 *   3. Email, if an email provider is configured.
 *
 * Steps 2 and 3 are both silently optional in this codebase. reportError is a
 * no-op unless SENTRY_DSN is set AND @sentry/node is installed, and
 * mailerService falls back to a NoopEmailProvider in production whenever
 * EMAIL_PROVIDER is unset or RESEND_API_KEY is missing. An alert that depends
 * only on those two paths can fire into the void on a misconfigured deploy —
 * which is precisely the failure mode that let the 2026-08-04 incident run
 * unnoticed until Stripe closed the account.
 *
 * console.error always reaches Railway's log stream, so the alert has one
 * delivery channel that cannot be switched off by a missing env var. If the
 * email path is inert we say so in the log, so a silent channel looks like a
 * configuration problem rather than an absence of alerts.
 */
function emailIsConfigured(): boolean {
  const provider = (process.env.EMAIL_PROVIDER || '').toLowerCase();
  if (provider === 'resend') return Boolean(process.env.RESEND_API_KEY);
  if (provider === 'log') return true;
  // Unset or 'noop' means NoopEmailProvider in production — nothing is sent.
  return process.env.NODE_ENV !== 'production';
}

async function defaultAlert(info: {
  label: string;
  count: number;
  max: number;
  windowMs: number;
}): Promise<void> {
  const minutes = Math.round(info.windowMs / 60000);
  const subject = `TryHardly ALERT: ${info.label} velocity breaker tripped`;
  const body =
    `The ${info.label} circuit breaker tripped.\n\n` +
    `${info.count} attempts in the last ${minutes} minutes (limit ${info.max}).\n\n` +
    `Payment initiation is refused for the rest of this window. ` +
    `Check Stripe for unfamiliar payment activity, then review recent accounts and jobs.\n\n` +
    `This alert fires at most once per window.`;

  // 1. Unconditional. This is the channel that cannot be misconfigured away.
  console.error(`[ALERT] ${subject}`, {
    count: info.count,
    max: info.max,
    windowMinutes: minutes,
    action: 'checkout initiation refused for the remainder of the window',
  });

  // 2. Sentry, when present.
  try {
    reportError(new Error(subject), { ...info, kind: 'velocity_breaker' });
  } catch {
    /* reporting must never throw */
  }

  // 3. Email, when a provider is actually wired up.
  if (!emailIsConfigured()) {
    console.error(
      '[ALERT] No email provider configured (EMAIL_PROVIDER/RESEND_API_KEY) — ' +
        'this alert was NOT emailed. Configure one so payment alerts reach a human.',
    );
    return;
  }

  const to = process.env.OPS_ALERT_EMAIL || 'support@tryhardly.com';
  try {
    await sendEmail({
      to,
      subject,
      text: body,
      html: `<pre style="font-family:ui-monospace,monospace">${body}</pre>`,
    });
  } catch {
    /* sendEmail already swallows, belt and braces */
  }
}

export function createVelocityBreaker(opts: VelocityBreakerOptions = {}) {
  const windowMs = opts.windowMs ?? intFromEnv('PAYMENT_VELOCITY_WINDOW_MS', 60 * 60 * 1000);
  const max = opts.max ?? intFromEnv('PAYMENT_VELOCITY_MAX', 25);
  const label = opts.label ?? 'platform checkout';
  const onTrip = opts.onTrip ?? ((info) => void defaultAlert(info));

  let win: Window = { count: 0, resetAt: Date.now() + windowMs, alerted: false };

  const middleware = (_req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    if (win.resetAt <= now) {
      win = { count: 0, resetAt: now + windowMs, alerted: false };
    }

    win.count += 1;

    if (win.count > max) {
      if (!win.alerted) {
        win.alerted = true;
        try {
          onTrip({ label, count: win.count, max, windowMs });
        } catch {
          /* alerting must never break the response path */
        }
      }
      const retryAfter = Math.ceil((win.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      res.status(503).json({
        error: 'Payments temporarily unavailable',
        message:
          'Payment processing is paused for a short period while we verify unusual activity. ' +
          'Nothing is wrong with your job. Please try again shortly or contact support@tryhardly.com.',
      });
      return;
    }

    next();
  };

  // Exposed for tests and for an admin health view.
  middleware.snapshot = () => ({ count: win.count, max, resetAt: win.resetAt, windowMs });
  middleware.reset = () => {
    win = { count: 0, resetAt: Date.now() + windowMs, alerted: false };
  };

  return middleware;
}

/** The instance mounted on the checkout route. */
export const platformCheckoutBreaker = createVelocityBreaker({ label: 'platform checkout' });

/**
 * Business limits on a single job's amount.
 *
 * Distinct from stripeService.MIN_CHARGE_CENTS, which is Stripe's own $0.50
 * technical floor. A $0.50 floor is exactly what makes an endpoint attractive
 * for card testing: the 2026-08-04 attack used $10 charges, which cleared that
 * floor with room to spare. A real local job — yard work, a dump run, moving
 * help — is not worth $10, so a business floor costs nothing legitimate and
 * removes most of the value of testing cards here.
 *
 * The ceiling bounds the damage of any single bad authorization. It is set
 * above the largest real job posted to date ($1,900 fencing) so genuine work is
 * unaffected.
 *
 * Both are environment-configurable so they can be tuned without a deploy.
 */
export const MIN_JOB_AMOUNT_CENTS = intFromEnv('MIN_JOB_AMOUNT_CENTS', 2000); // $20
export const MAX_JOB_AMOUNT_CENTS = intFromEnv('MAX_JOB_AMOUNT_CENTS', 500000); // $5,000

export interface AmountCheck {
  ok: boolean;
  reason?: 'below_min' | 'above_max';
  message?: string;
}

function usd(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
}

export function checkJobAmount(amountCents: number): AmountCheck {
  if (amountCents < MIN_JOB_AMOUNT_CENTS) {
    return {
      ok: false,
      reason: 'below_min',
      message: `The minimum job amount is ${usd(MIN_JOB_AMOUNT_CENTS)}. Raise the budget to book this job.`,
    };
  }
  if (amountCents > MAX_JOB_AMOUNT_CENTS) {
    return {
      ok: false,
      reason: 'above_max',
      message: `Jobs over ${usd(MAX_JOB_AMOUNT_CENTS)} need a quick manual review. Email support@tryhardly.com and we will set it up.`,
    };
  }
  return { ok: true };
}

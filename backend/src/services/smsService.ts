/**
 * SMS abstraction (Twilio).
 *
 * Sends real worker text alerts via the Twilio REST API, but ONLY when the
 * production env vars are configured. With no configuration the service is
 * disabled and every send is a safe no-op, so email alerts keep working and
 * nothing is ever texted by accident.
 *
 * Provider selection is implicit and env-driven (there is no EMAIL_PROVIDER-style
 * switch): if all of TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM_NUMBER
 * are set, the Twilio provider is active; otherwise SMS is disabled.
 *
 *   TWILIO_ACCOUNT_SID   — Twilio account SID (starts with "AC...").
 *   TWILIO_AUTH_TOKEN    — Twilio auth token (secret; never logged).
 *   TWILIO_FROM_NUMBER   — the sending number/short code in E.164 (e.g. +15555550123),
 *                          or a Messaging Service SID (starts with "MG...").
 *
 * Uses the global fetch available in Node 18+, so no Twilio SDK dependency is
 * required. Secrets are never written to logs.
 *
 * NOTE: This module does NOT handle inbound STOP/HELP messages — the app has no
 * webhook infrastructure. Production SMS activation must rely on Twilio's
 * built-in STOP handling for the sender (default on long codes / toll-free and
 * configurable on a Messaging Service). See backend/.env.example.
 */

export interface SmsMessage {
  to: string;
  body: string;
}

export interface SmsProvider {
  readonly enabled: boolean;
  send(message: SmsMessage): Promise<void>;
}

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

/**
 * Read Twilio config from the environment. Returns null (SMS disabled) unless
 * ALL three required vars are present and non-empty. This is the single gate
 * that decides whether SMS is active in a given environment.
 */
export function readTwilioConfig(env: NodeJS.ProcessEnv = process.env): TwilioConfig | null {
  const accountSid = (env.TWILIO_ACCOUNT_SID || '').trim();
  const authToken = (env.TWILIO_AUTH_TOKEN || '').trim();
  const fromNumber = (env.TWILIO_FROM_NUMBER || '').trim();
  if (!accountSid || !authToken || !fromNumber) return null;
  return { accountSid, authToken, fromNumber };
}

// Disabled provider: every send is a no-op. Used whenever Twilio is not fully
// configured so callers never have to special-case the missing-config path.
class DisabledSmsProvider implements SmsProvider {
  readonly enabled = false;
  async send(_message: SmsMessage): Promise<void> {
    // Intentionally does nothing — SMS is disabled.
  }
}

// Sends via the Twilio REST API using fetch. Credentials are sent only in the
// HTTP Basic auth header; they are never logged. A Messaging Service SID
// (MG...) is sent as MessagingServiceSid, otherwise the value is used as From.
class TwilioSmsProvider implements SmsProvider {
  readonly enabled = true;
  constructor(private readonly config: TwilioConfig) {}

  async send(message: SmsMessage): Promise<void> {
    const { accountSid, authToken, fromNumber } = this.config;
    const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(
      accountSid,
    )}/Messages.json`;

    const params = new URLSearchParams();
    params.set('To', message.to);
    params.set('Body', message.body);
    if (fromNumber.startsWith('MG')) {
      params.set('MessagingServiceSid', fromNumber);
    } else {
      params.set('From', fromNumber);
    }

    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!res.ok) {
      // Surface the HTTP status and Twilio's error code/message, but never the
      // credentials. Twilio error bodies do not contain the auth token.
      const detail = await res.text().catch(() => '');
      throw new Error(`Twilio send failed (${res.status}): ${detail}`);
    }
  }
}

export function selectSmsProvider(env: NodeJS.ProcessEnv = process.env): SmsProvider {
  const config = readTwilioConfig(env);
  if (!config) return new DisabledSmsProvider();
  return new TwilioSmsProvider(config);
}

const provider: SmsProvider = selectSmsProvider();

/** True when a real SMS provider is configured for this environment. */
export function smsEnabled(): boolean {
  return provider.enabled;
}

/**
 * Send an SMS. Best-effort: swallows provider errors (logged without secrets)
 * so a texting failure can never break the primary action. When SMS is disabled
 * this resolves immediately without attempting any network call. Returns true
 * when a send was attempted and succeeded, false otherwise.
 */
export async function sendSms(message: SmsMessage): Promise<boolean> {
  if (!provider.enabled) return false;
  try {
    await provider.send(message);
    return true;
  } catch (error) {
    // error messages from the provider never include the auth token.
    console.error('sendSms error:', error instanceof Error ? error.message : error);
    return false;
  }
}

const APP_URL = (): string =>
  (process.env.FRONTEND_URL || 'http://localhost:3000').split(',')[0].trim();

// ─── Templates ────────────────────────────────────────────────────────────────

export const smsTemplates = {
  /**
   * Compliant worker job-alert text. Leads with the TryHardly identity, includes
   * the job title plus budget/city when available and a link to browse work, and
   * ends with the required "Reply STOP to opt out." opt-out notice.
   */
  newLocalJobForWorker(
    to: string,
    job: {
      title: string;
      location?: string | null;
      budget?: string | null;
    },
  ): SmsMessage {
    const parts = [`TryHardly: new local job — ${job.title}`];
    if (job.location) parts.push(`in ${job.location}`);
    if (job.budget) parts.push(`(${job.budget})`);
    const lead = parts.join(' ');
    const body = `${lead}. See work: ${APP_URL()}/questboard\nReply STOP to opt out.`;
    return { to, body };
  },
};

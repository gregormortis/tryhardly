/**
 * Mailer abstraction.
 *
 * MVP ships with a logging/no-op provider so the product flows (password reset,
 * application/message notifications) work end-to-end without any email vendor.
 *
 * Provider is selected via EMAIL_PROVIDER:
 *   - "log" (default in dev): writes the rendered email to the logs, never sends.
 *   - "noop": silently drops the email (default in production until a real
 *     provider is wired up — avoids surprising send attempts).
 *   - "resend": sends via the Resend HTTP API (https://resend.com). Requires
 *     RESEND_API_KEY; falls back to the safe default provider if it's missing.
 *
 * To add another provider later (e.g. SendGrid/Postmark/SES), implement the
 * EmailProvider interface and select it here based on EMAIL_PROVIDER. The
 * required production env vars are documented in backend/.env.example.
 */

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

interface EmailProvider {
  send(message: EmailMessage): Promise<void>;
}

// Logs the email instead of sending. Useful in development and for capturing
// password-reset links from server logs without an email vendor.
class LogEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<void> {
    console.log(
      `📧 [mailer:log] To: ${message.to} | Subject: ${message.subject}\n${message.text}`,
    );
  }
}

// Silently drops the email. Safe default for production until a provider is set.
class NoopEmailProvider implements EmailProvider {
  async send(_message: EmailMessage): Promise<void> {
    // Intentionally does nothing.
  }
}

// Sends via the Resend HTTP API. Uses the global fetch available in Node 18+,
// so no extra SDK dependency is required.
class ResendEmailProvider implements EmailProvider {
  constructor(private readonly apiKey: string) {}

  async send(message: EmailMessage): Promise<void> {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: message.to,
        subject: message.subject,
        text: message.text,
        ...(message.html ? { html: message.html } : {}),
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Resend send failed (${res.status}): ${detail}`);
    }
  }
}

// The default provider when EMAIL_PROVIDER is unset: log in dev (so devs see the
// link), noop in production (avoids surprising send attempts before a vendor is set).
function defaultProvider(): EmailProvider {
  return process.env.NODE_ENV === 'production'
    ? new NoopEmailProvider()
    : new LogEmailProvider();
}

function selectProvider(): EmailProvider {
  const configured = (process.env.EMAIL_PROVIDER || '').toLowerCase();
  if (configured === 'log') return new LogEmailProvider();
  if (configured === 'noop') return new NoopEmailProvider();
  if (configured === 'resend') {
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) return new ResendEmailProvider(apiKey);
    // Misconfigured: requested resend but no key. Fall back instead of crashing
    // so transactional flows keep working; surface the reason in logs.
    console.warn(
      'EMAIL_PROVIDER=resend but RESEND_API_KEY is not set — falling back to the default provider.',
    );
    return defaultProvider();
  }
  return defaultProvider();
}

const FROM = process.env.EMAIL_FROM || 'TryHardly <no-reply@tryhardly.com>';
const provider = selectProvider();

// Fire-and-forget by default at the call site; sending must never break the
// primary action. Returns a promise so callers can await when they need to.
export async function sendEmail(message: EmailMessage): Promise<void> {
  try {
    await provider.send(message);
  } catch (error) {
    console.error('sendEmail error:', error);
  }
}

const APP_URL = (): string =>
  (process.env.FRONTEND_URL || 'http://localhost:3000').split(',')[0].trim();

// ─── Templates ────────────────────────────────────────────────────────────────

function wrap(title: string, body: string): { text: string; html: string } {
  const text = `${title}\n\n${body}\n\n— TryHardly\n${FROM}`;
  const html = `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto">
  <h2 style="color:#f59e0b">${title}</h2>
  <p style="color:#333;line-height:1.6">${body.replace(/\n/g, '<br/>')}</p>
  <hr/><p style="color:#999;font-size:12px">TryHardly</p>
</div>`;
  return { text, html };
}

export const emailTemplates = {
  passwordReset(to: string, resetUrl: string): EmailMessage {
    const { text, html } = wrap(
      'Reset your password',
      `We received a request to reset your TryHardly password. Click the link below to choose a new one. This link expires in 1 hour.\n\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.`,
    );
    return { to, subject: 'Reset your TryHardly password', text, html };
  },

  newApplication(to: string, applicantName: string, questTitle: string): EmailMessage {
    const { text, html } = wrap(
      'New application',
      `${applicantName} applied to your quest "${questTitle}". Review applications at ${APP_URL()}/dashboard.`,
    );
    return { to, subject: `New application for "${questTitle}"`, text, html };
  },

  newMessage(to: string, senderName: string, questTitle: string): EmailMessage {
    const { text, html } = wrap(
      'New message',
      `${senderName} sent you a message about "${questTitle}". Read it at ${APP_URL()}/messages.`,
    );
    return { to, subject: `New message about "${questTitle}"`, text, html };
  },

  applicationAccepted(to: string, questTitle: string): EmailMessage {
    const { text, html } = wrap(
      'Application accepted',
      `Great news — you were accepted for "${questTitle}". Time to get started! View it at ${APP_URL()}/questboard.`,
    );
    return { to, subject: `You're in: "${questTitle}"`, text, html };
  },

  applicationRejected(to: string, questTitle: string): EmailMessage {
    const { text, html } = wrap(
      'Application update',
      `Your application for "${questTitle}" wasn't selected this time. Plenty more quests await at ${APP_URL()}/questboard.`,
    );
    return { to, subject: `Update on "${questTitle}"`, text, html };
  },

  jobRequestReceived(to: string, name: string, title: string): EmailMessage {
    const { text, html } = wrap(
      'We got your request',
      `Thanks${name ? `, ${name}` : ''} — we received your request "${title}". We'll line up local help and follow up by email. No account needed right now; create one any time at ${APP_URL()}/auth/register to manage applicants yourself.`,
    );
    return { to, subject: 'Your TryHardly request was received', text, html };
  },

  // Secure no-account manage link for a JOB_REQUEST lead. The manageUrl embeds a
  // one-time-ish, expiring token so the requester can view/edit their submission
  // without an account. Never logged or stored in raw form.
  jobRequestClaimLink(to: string, name: string, title: string, manageUrl: string): EmailMessage {
    const { text, html } = wrap(
      'Manage your request',
      `Hi${name ? ` ${name}` : ''} — here's your private link to check on and update your request "${title}". No account needed:\n\n${manageUrl}\n\nKeep this link private — anyone with it can view your request. It expires in 30 days. If you didn't make this request, you can ignore this email.`,
    );
    return { to, subject: 'Manage your TryHardly request', text, html };
  },

  workerAlertReceived(to: string, name: string): EmailMessage {
    const { text, html } = wrap(
      "You're on the work-alerts list",
      `Thanks${name ? `, ${name}` : ''} — you're signed up for local work alerts. We'll email you when jobs that match come up. Want to start browsing now? See live work at ${APP_URL()}/questboard.`,
    );
    return { to, subject: "You're on the TryHardly work-alerts list", text, html };
  },
};

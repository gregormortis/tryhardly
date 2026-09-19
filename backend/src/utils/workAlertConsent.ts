// Keep in sync with frontend/lib/workAlertConsent.ts (covered by a parity test).
export const WORK_ALERT_SMS_VERSION = 'work-alerts-2026-09-19';
export const WORK_ALERT_SMS_SOURCE = 'https://www.tryhardly.com/work-alerts';
export const WORK_ALERT_SMS_DISCLOSURE =
  'By checking "Text me job alerts" and submitting this form, you agree to receive recurring automated texts from TryHardly about local jobs matching your preferences at the number you provide. Message frequency varies. Message and data rates may apply. Reply STOP to unsubscribe or HELP for help. Consent is optional and is not a condition of purchase or getting work. Text alerts are not live yet. For help, email support@tryhardly.com.';

// US launch only. This checks syntax, not ownership or whether a line can receive SMS.
export function normalizeWorkAlertPhone(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\+?[\d\s().-]+$/.test(value.trim())) return null;
  let digits = value.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1);
  if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(digits)) return null;
  return `+1${digits}`;
}

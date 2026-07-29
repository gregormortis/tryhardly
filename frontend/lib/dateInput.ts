// Normalizes the date strings people actually type or paste into a date field.
//
// A native <input type="date"> only accepts an exact `YYYY-MM-DD` value, so
// pasting `08/01/2026` — the way the date is written everywhere else on the
// page — is silently dropped and the poster is told the deadline is required.
// This turns the common written forms into the one form the input accepts.

const MONTH_DAY_YEAR = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/;
const YEAR_MONTH_DAY = /^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})$/;
const DIGITS_MMDDYYYY = /^(\d{2})(\d{2})(\d{4})$/;
const DIGITS_YYYYMMDD = /^(\d{4})(\d{2})(\d{2})$/;

function pad(n: string): string {
  return n.padStart(2, '0');
}

// Guards against `02/31/2026` rolling forward into March.
function toIsoDate(year: string, month: string, day: string): string | null {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const parsed = new Date(Date.UTC(y, m - 1, d));
  if (parsed.getUTCFullYear() !== y || parsed.getUTCMonth() !== m - 1 || parsed.getUTCDate() !== d) {
    return null;
  }
  return `${year}-${pad(month)}-${pad(day)}`;
}

// Days a deadline must be out from today so workers have time to see the job
// and send a bid. The helper copy on the form quotes this number, so the rule
// and the promise stay in one place.
export const MIN_DEADLINE_DAYS = 2;

/**
 * `YYYY-MM-DD` for a day offset from today, read in the poster's own timezone.
 *
 * `new Date().toISOString()` reports UTC, which is already tomorrow for most of
 * the US after late afternoon — deriving the deadline floor that way rejects a
 * date the poster was told is allowed.
 */
export function isoDateDaysFromNow(days: number, now: Date = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);
  return `${d.getFullYear()}-${pad(String(d.getMonth() + 1))}-${pad(String(d.getDate()))}`;
}

export function minDeadlineIso(now?: Date): string {
  return isoDateDaysFromNow(MIN_DEADLINE_DAYS, now);
}

/**
 * Convert a written date into `YYYY-MM-DD`, or null if it isn't a date.
 *
 * Accepts `2026-08-01`, `08/01/2026`, `8/1/2026`, `2026/08/01`, `08012026`,
 * and `20260801`, with surrounding whitespace ignored.
 */
export function normalizeDateInput(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;

  const ymd = value.match(YEAR_MONTH_DAY);
  if (ymd) return toIsoDate(ymd[1], ymd[2], ymd[3]);

  const mdy = value.match(MONTH_DAY_YEAR);
  if (mdy) return toIsoDate(mdy[3], mdy[1], mdy[2]);

  // Both bare-digit forms are eight characters, so try each and keep whichever
  // yields a real date — only one of them can (a month can't be 13+).
  const digitsYmd = value.match(DIGITS_YYYYMMDD);
  if (digitsYmd) {
    const iso = toIsoDate(digitsYmd[1], digitsYmd[2], digitsYmd[3]);
    if (iso) return iso;
  }

  const digitsMdy = value.match(DIGITS_MMDDYYYY);
  if (digitsMdy) return toIsoDate(digitsMdy[3], digitsMdy[1], digitsMdy[2]);

  return null;
}

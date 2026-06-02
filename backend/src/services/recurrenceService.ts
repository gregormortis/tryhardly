import { RecurrenceCadence } from '@prisma/client';

// Recurring booking is a scheduling/visibility template only. Nothing in this
// module charges, holds, or pre-authorizes money — each generated occurrence is
// an ordinary quest paid out per-task on the normal completion flow.

export const VALID_CADENCES = new Set(Object.values(RecurrenceCadence));

// How many calendar days a single step of each cadence advances. MONTHLY is
// handled separately (calendar-month math) since months are not fixed-length.
const CADENCE_DAYS: Record<Exclude<RecurrenceCadence, 'MONTHLY'>, number> = {
  WEEKLY: 7,
  BIWEEKLY: 14,
};

export interface RecurrenceInput {
  isRecurring?: unknown;
  recurrenceCadence?: unknown;
  recurrenceInterval?: unknown;
  recurrenceEndDate?: unknown;
  recurrenceCount?: unknown;
}

export interface NormalizedRecurrence {
  isRecurring: boolean;
  recurrenceCadence: RecurrenceCadence | null;
  recurrenceInterval: number;
  recurrenceEndDate: Date | null;
  recurrenceCount: number | null;
}

export class RecurrenceValidationError extends Error {}

function coerceCadence(raw: unknown): RecurrenceCadence | null {
  if (typeof raw !== 'string') return null;
  const upper = raw.toUpperCase();
  return VALID_CADENCES.has(upper as RecurrenceCadence) ? (upper as RecurrenceCadence) : null;
}

// Advance a date by `steps` occurrences of the given cadence/interval.
export function advance(from: Date, cadence: RecurrenceCadence, interval: number, steps = 1): Date {
  const next = new Date(from.getTime());
  const mult = Math.max(1, interval) * Math.max(1, steps);
  if (cadence === RecurrenceCadence.MONTHLY) {
    next.setMonth(next.getMonth() + mult);
  } else {
    next.setDate(next.getDate() + CADENCE_DAYS[cadence] * mult);
  }
  return next;
}

// Compute the suggested next occurrence date from a base date. Returns null if
// the series has already passed its end date. Advisory only — never auto-posts.
export function computeNextOccurrence(
  base: Date,
  cadence: RecurrenceCadence,
  interval: number,
  endDate: Date | null,
): Date | null {
  const next = advance(base, cadence, interval);
  if (endDate && next.getTime() > endDate.getTime()) return null;
  return next;
}

// Validate and normalize recurrence fields off an incoming request body. Throws
// RecurrenceValidationError with a user-facing message on bad input. When the
// caller did not opt into recurring, returns the explicit non-recurring shape so
// updates can clear a previously-recurring quest.
export function normalizeRecurrence(body: RecurrenceInput): NormalizedRecurrence {
  const isRecurring = body.isRecurring === true || body.isRecurring === 'true';

  if (!isRecurring) {
    return {
      isRecurring: false,
      recurrenceCadence: null,
      recurrenceInterval: 1,
      recurrenceEndDate: null,
      recurrenceCount: null,
    };
  }

  const recurrenceCadence = coerceCadence(body.recurrenceCadence);
  if (!recurrenceCadence) {
    throw new RecurrenceValidationError(
      'A recurring job needs a cadence of WEEKLY, BIWEEKLY, or MONTHLY.',
    );
  }

  let recurrenceInterval = 1;
  if (body.recurrenceInterval !== undefined && body.recurrenceInterval !== null) {
    const parsed = Number(body.recurrenceInterval);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 52) {
      throw new RecurrenceValidationError('Recurrence interval must be a whole number between 1 and 52.');
    }
    recurrenceInterval = parsed;
  }

  let recurrenceEndDate: Date | null = null;
  if (body.recurrenceEndDate !== undefined && body.recurrenceEndDate !== null && body.recurrenceEndDate !== '') {
    const d = new Date(body.recurrenceEndDate as string);
    if (Number.isNaN(d.getTime())) {
      throw new RecurrenceValidationError('Recurrence end date is not a valid date.');
    }
    recurrenceEndDate = d;
  }

  let recurrenceCount: number | null = null;
  if (body.recurrenceCount !== undefined && body.recurrenceCount !== null && body.recurrenceCount !== '') {
    const parsed = Number(body.recurrenceCount);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 260) {
      throw new RecurrenceValidationError('Occurrence count must be a whole number between 1 and 260.');
    }
    recurrenceCount = parsed;
  }

  return {
    isRecurring: true,
    recurrenceCadence,
    recurrenceInterval,
    recurrenceEndDate,
    recurrenceCount,
  };
}

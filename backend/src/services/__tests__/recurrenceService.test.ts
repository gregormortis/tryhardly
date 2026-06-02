import {
  normalizeRecurrence,
  computeNextOccurrence,
  advance,
  RecurrenceValidationError,
} from '../recurrenceService';
import { RecurrenceCadence } from '@prisma/client';

describe('normalizeRecurrence', () => {
  it('returns the non-recurring shape when isRecurring is falsy', () => {
    expect(normalizeRecurrence({})).toEqual({
      isRecurring: false,
      recurrenceCadence: null,
      recurrenceInterval: 1,
      recurrenceEndDate: null,
      recurrenceCount: null,
    });
    expect(normalizeRecurrence({ isRecurring: false }).isRecurring).toBe(false);
  });

  it('accepts a valid weekly recurrence with defaults', () => {
    const r = normalizeRecurrence({ isRecurring: true, recurrenceCadence: 'WEEKLY' });
    expect(r.isRecurring).toBe(true);
    expect(r.recurrenceCadence).toBe(RecurrenceCadence.WEEKLY);
    expect(r.recurrenceInterval).toBe(1);
  });

  it('accepts string "true" and lowercase cadence', () => {
    const r = normalizeRecurrence({ isRecurring: 'true', recurrenceCadence: 'monthly' });
    expect(r.isRecurring).toBe(true);
    expect(r.recurrenceCadence).toBe(RecurrenceCadence.MONTHLY);
  });

  it('rejects a recurring job without a valid cadence', () => {
    expect(() => normalizeRecurrence({ isRecurring: true })).toThrow(RecurrenceValidationError);
    expect(() => normalizeRecurrence({ isRecurring: true, recurrenceCadence: 'DAILY' })).toThrow(
      RecurrenceValidationError,
    );
  });

  it('validates interval bounds', () => {
    expect(() =>
      normalizeRecurrence({ isRecurring: true, recurrenceCadence: 'WEEKLY', recurrenceInterval: 0 }),
    ).toThrow(RecurrenceValidationError);
    expect(() =>
      normalizeRecurrence({ isRecurring: true, recurrenceCadence: 'WEEKLY', recurrenceInterval: 99 }),
    ).toThrow(RecurrenceValidationError);
    expect(
      normalizeRecurrence({ isRecurring: true, recurrenceCadence: 'WEEKLY', recurrenceInterval: 2 })
        .recurrenceInterval,
    ).toBe(2);
  });

  it('validates occurrence count bounds', () => {
    expect(() =>
      normalizeRecurrence({ isRecurring: true, recurrenceCadence: 'WEEKLY', recurrenceCount: 0 }),
    ).toThrow(RecurrenceValidationError);
    expect(
      normalizeRecurrence({ isRecurring: true, recurrenceCadence: 'WEEKLY', recurrenceCount: 12 })
        .recurrenceCount,
    ).toBe(12);
  });

  it('rejects an invalid end date but accepts a valid one', () => {
    expect(() =>
      normalizeRecurrence({ isRecurring: true, recurrenceCadence: 'WEEKLY', recurrenceEndDate: 'nope' }),
    ).toThrow(RecurrenceValidationError);
    const r = normalizeRecurrence({
      isRecurring: true,
      recurrenceCadence: 'WEEKLY',
      recurrenceEndDate: '2026-12-31',
    });
    expect(r.recurrenceEndDate?.getUTCFullYear()).toBe(2026);
  });
});

describe('advance', () => {
  it('advances weekly by 7 days', () => {
    const from = new Date('2026-01-01T00:00:00Z');
    expect(advance(from, RecurrenceCadence.WEEKLY, 1).toISOString()).toBe('2026-01-08T00:00:00.000Z');
  });

  it('respects the interval multiplier (biweekly x2 = 28 days)', () => {
    const from = new Date('2026-01-01T00:00:00Z');
    expect(advance(from, RecurrenceCadence.BIWEEKLY, 2).toISOString()).toBe('2026-01-29T00:00:00.000Z');
  });

  it('advances monthly by calendar month', () => {
    const from = new Date('2026-01-15T00:00:00Z');
    expect(advance(from, RecurrenceCadence.MONTHLY, 1).getUTCMonth()).toBe(1); // February
  });
});

describe('computeNextOccurrence', () => {
  it('returns the next date when within the end window', () => {
    const base = new Date('2026-01-01T00:00:00Z');
    const next = computeNextOccurrence(base, RecurrenceCadence.WEEKLY, 1, new Date('2026-02-01T00:00:00Z'));
    expect(next?.toISOString()).toBe('2026-01-08T00:00:00.000Z');
  });

  it('returns null when the next date is past the end date', () => {
    const base = new Date('2026-01-30T00:00:00Z');
    const next = computeNextOccurrence(base, RecurrenceCadence.WEEKLY, 1, new Date('2026-02-01T00:00:00Z'));
    expect(next).toBeNull();
  });
});

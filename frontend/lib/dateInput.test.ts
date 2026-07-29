import { isoDateDaysFromNow, minDeadlineIso, normalizeDateInput } from './dateInput';

describe('isoDateDaysFromNow', () => {
  it('counts from the local calendar day, not the UTC one', () => {
    // 18:00 in a UTC-7 zone is already the next day in UTC, so a UTC-derived
    // floor would land a day late and reject a deadline the form allows.
    const lateEvening = new Date(2026, 6, 26, 18, 0, 0);
    expect(isoDateDaysFromNow(2, lateEvening)).toBe('2026-07-28');
  });

  it('rolls over month and year boundaries', () => {
    expect(isoDateDaysFromNow(2, new Date(2026, 6, 30, 9, 0, 0))).toBe('2026-08-01');
    expect(isoDateDaysFromNow(2, new Date(2026, 11, 31, 9, 0, 0))).toBe('2027-01-02');
  });

  it('zero-pads single-digit months and days', () => {
    expect(isoDateDaysFromNow(1, new Date(2026, 0, 4, 9, 0, 0))).toBe('2026-01-05');
  });
});

describe('minDeadlineIso', () => {
  it('is two days out, matching what the form promises the poster', () => {
    expect(minDeadlineIso(new Date(2026, 6, 26, 9, 0, 0))).toBe('2026-07-28');
  });
});

describe('normalizeDateInput', () => {
  it('accepts the forms a poster actually types or pastes', () => {
    expect(normalizeDateInput('2026-08-01')).toBe('2026-08-01');
    expect(normalizeDateInput('08/01/2026')).toBe('2026-08-01');
    expect(normalizeDateInput('8/1/2026')).toBe('2026-08-01');
    expect(normalizeDateInput('2026/08/01')).toBe('2026-08-01');
    expect(normalizeDateInput('08012026')).toBe('2026-08-01');
    expect(normalizeDateInput('20260801')).toBe('2026-08-01');
    expect(normalizeDateInput('  08/01/2026  ')).toBe('2026-08-01');
  });

  it('rejects dates that do not exist instead of rolling them forward', () => {
    expect(normalizeDateInput('02/31/2026')).toBeNull();
    expect(normalizeDateInput('13/01/2026')).toBeNull();
  });

  it('returns null for input that is not a date', () => {
    expect(normalizeDateInput('')).toBeNull();
    expect(normalizeDateInput('next friday')).toBeNull();
    expect(normalizeDateInput('080126')).toBeNull();
  });
});

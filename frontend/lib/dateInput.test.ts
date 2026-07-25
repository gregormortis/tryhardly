import { normalizeDateInput } from './dateInput';

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

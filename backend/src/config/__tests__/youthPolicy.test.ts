/**
 * These rules are the difference between a defensible product and a serious
 * problem, so they are tested as behaviour rather than trusted to a policy
 * page. The bright lines come from federal Hazardous Occupations Orders, which
 * apply to everyone under 18 with no parental-consent exception.
 */
import {
  canYouthBidOnCategory,
  ageFromDateOfBirth,
  isYouthAge,
  MINIMUM_YOUTH_AGE,
  YOUTH_ALLOWED_CATEGORIES,
  YOUTH_LATEST_HOUR,
} from '../youthPolicy';

describe('canYouthBidOnCategory', () => {
  it('allows yard work, the case this exists for', () => {
    expect(canYouthBidOnCategory('yard').allowed).toBe(true);
  });

  it('blocks every category involving heights, driving, or power tools', () => {
    for (const c of ['hauling', 'moving', 'handyman', 'painting', 'pressure']) {
      const r = canYouthBidOnCategory(c);
      expect(r.allowed).toBe(false);
      // A bare refusal reads as arbitrary and invites working around it.
      expect(r.reason && r.reason.length > 20).toBe(true);
    }
  });

  it('blocks indoor cleaning, so a minor is never alone in a stranger home', () => {
    const r = canYouthBidOnCategory('cleaning');
    expect(r.allowed).toBe(false);
    expect(r.reason).toMatch(/outdoor|home/i);
  });

  it('fails closed on an unknown category', () => {
    // A category added later must be opened to minors deliberately, never by
    // default.
    for (const c of ['demolition', 'tree-felling', 'roofing', 'brand-new-category']) {
      expect(canYouthBidOnCategory(c).allowed).toBe(false);
    }
  });

  it('fails closed on missing or empty input', () => {
    for (const c of [null, undefined, '', '   ']) {
      expect(canYouthBidOnCategory(c as any).allowed).toBe(false);
    }
  });

  it('is not case sensitive, so casing cannot bypass the rule', () => {
    expect(canYouthBidOnCategory('YARD').allowed).toBe(true);
    expect(canYouthBidOnCategory('  Handyman  ').allowed).toBe(false);
  });

  it('keeps the allow list small and outdoor-only', () => {
    expect([...YOUTH_ALLOWED_CATEGORIES].sort()).toEqual(['errands', 'other', 'yard']);
  });
});

describe('age handling', () => {
  it('computes age without rolling over early on a birthday', () => {
    const now = new Date('2026-08-09T12:00:00Z');
    expect(ageFromDateOfBirth(new Date('2010-08-09'), now)).toBe(16);
    expect(ageFromDateOfBirth(new Date('2010-08-10'), now)).toBe(15);
    expect(ageFromDateOfBirth(new Date('2010-08-08'), now)).toBe(16);
  });

  it('treats 16 and 17 as young workers, and 15 and 18 as not', () => {
    expect(isYouthAge(15)).toBe(false);
    expect(isYouthAge(16)).toBe(true);
    expect(isYouthAge(17)).toBe(true);
    expect(isYouthAge(18)).toBe(false);
  });

  it('sets the floor at 16, above the age where power mowers are barred', () => {
    // 14-15 year olds cannot lawfully run power mowers for an employer.
    expect(MINIMUM_YOUTH_AGE).toBe(16);
  });

  it('stops earlier than California law requires', () => {
    // CA permits 16-17 year olds until 10pm. A teenager at a stranger's
    // address at 9pm is legal and still a bad default.
    expect(YOUTH_LATEST_HOUR).toBeLessThan(22);
  });
});

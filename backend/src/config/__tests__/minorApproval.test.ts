/**
 * Per-job parental approval is the load-bearing safety mechanism of the
 * young-worker feature, so the invalidation rules are tested as behaviour.
 *
 * The property that matters: a parent approved a SPECIFIC place at a SPECIFIC
 * time. If either changes, the thing they agreed to no longer exists and the
 * approval must not carry over. Silent carry-over to an address a parent never
 * saw is the exact failure this feature exists to prevent.
 */
import {
  isApprovalStillValid,
  isWithinYouthHours,
  CA_REGISTRY_PARENT_URL,
  YOUTH_EARLIEST_HOUR,
  YOUTH_LATEST_HOUR,
} from '../youthPolicy';

const SAT_10AM = new Date('2026-08-15T10:00:00');

const APPROVED = {
  addressAtApproval: '412 Oak Street, Redding',
  scheduleAtApproval: SAT_10AM,
  scheduleNoteAtApproval: 'Saturday morning',
};

const MATCHING = {
  address: '412 Oak Street, Redding',
  scheduledFor: SAT_10AM,
  scheduleNote: 'Saturday morning',
};

describe('isApprovalStillValid', () => {
  it('holds when nothing changed', () => {
    expect(isApprovalStillValid(APPROVED, MATCHING).valid).toBe(true);
  });

  it('tolerates casing and surrounding whitespace only', () => {
    expect(
      isApprovalStillValid(APPROVED, {
        ...MATCHING,
        address: '  412 OAK STREET, REDDING  ',
      }).valid,
    ).toBe(true);
  });

  it('invalidates when the address changes at all', () => {
    const r = isApprovalStillValid(APPROVED, { ...MATCHING, address: '9 Pine Ave, Redding' });
    expect(r.valid).toBe(false);
    expect(r.changed).toBe('address');
  });

  it('invalidates on a near-match address rather than deciding it is close enough', () => {
    // "412 Oak St" is very probably the same house. The platform is still the
    // wrong party to make that call on a minor's behalf.
    const r = isApprovalStillValid(APPROVED, { ...MATCHING, address: '412 Oak St, Redding' });
    expect(r.valid).toBe(false);
    expect(r.changed).toBe('address');
  });

  it('invalidates when the scheduled time changes', () => {
    const r = isApprovalStillValid(APPROVED, {
      ...MATCHING,
      scheduledFor: new Date('2026-08-15T19:00:00'),
    });
    expect(r.valid).toBe(false);
    expect(r.changed).toBe('scheduledFor');
  });

  it('invalidates when a schedule is added where there was none', () => {
    const r = isApprovalStillValid(
      { ...APPROVED, scheduleAtApproval: null },
      MATCHING,
    );
    expect(r.valid).toBe(false);
  });

  it('invalidates when the schedule note changes', () => {
    const r = isApprovalStillValid(APPROVED, { ...MATCHING, scheduleNote: 'Sunday instead' });
    expect(r.valid).toBe(false);
    expect(r.changed).toBe('scheduleNote');
  });

  it('treats a blank address as not matching a real one', () => {
    expect(isApprovalStillValid(APPROVED, { ...MATCHING, address: '' }).valid).toBe(false);
  });
});

describe('youth hours', () => {
  it('allows mid-morning and mid-afternoon', () => {
    expect(isWithinYouthHours(new Date('2026-08-15T09:00:00'))).toBe(true);
    expect(isWithinYouthHours(new Date('2026-08-15T15:30:00'))).toBe(true);
  });

  it('refuses early morning and evening', () => {
    expect(isWithinYouthHours(new Date('2026-08-15T06:59:00'))).toBe(false);
    expect(isWithinYouthHours(new Date('2026-08-15T18:00:00'))).toBe(false);
    expect(isWithinYouthHours(new Date('2026-08-15T21:00:00'))).toBe(false);
  });

  it('is tighter than California law on both ends', () => {
    // CA allows 16-17 year olds 5am-10pm. Legal is not the same as sensible for
    // a teenager at a stranger's address.
    expect(YOUTH_EARLIEST_HOUR).toBeGreaterThan(5);
    expect(YOUTH_LATEST_HOUR).toBeLessThan(22);
  });
});

describe('registry handling', () => {
  it('points at the official state site for a parent to check themselves', () => {
    // Penal Code 290.46(j)(2)(H) makes registry data a prohibited basis for
    // services provided by a business establishment. The platform must never
    // perform the check or act on it; the parent may, to protect their own
    // child, which is the statute's authorized use.
    expect(CA_REGISTRY_PARENT_URL).toBe('https://www.meganslaw.ca.gov/');
  });
});

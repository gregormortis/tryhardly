import {
  buildVerifiedProStatus,
  isProfileComplete,
  VERIFIED_PRO_GATES,
  VerifiedProSignals,
} from '../verifiedProService';

describe('isProfileComplete', () => {
  it('requires a substantial bio', () => {
    expect(
      isProfileComplete({
        bio: 'too short',
        businessName: 'Acme',
        serviceArea: null,
        yearsExperience: null,
        favoriteSkills: [],
      }),
    ).toBe(false);
  });

  it('requires at least one professional detail or featured skill', () => {
    expect(
      isProfileComplete({
        bio: 'A long enough bio about my work and experience.',
        businessName: null,
        serviceArea: null,
        yearsExperience: null,
        favoriteSkills: [],
      }),
    ).toBe(false);
  });

  it('is complete with a bio plus a featured skill', () => {
    expect(
      isProfileComplete({
        bio: 'A long enough bio about my work and experience.',
        businessName: null,
        serviceArea: null,
        yearsExperience: null,
        favoriteSkills: ['carpentry'],
      }),
    ).toBe(true);
  });
});

const FULL: VerifiedProSignals = {
  profileComplete: true,
  codeOfCraftPledged: true,
  verifiedCredentials: 1,
  accountVerified: false,
  completedJobs: VERIFIED_PRO_GATES.minCompletedJobs,
  ratingCount: VERIFIED_PRO_GATES.minRatingCount,
  averageRating: VERIFIED_PRO_GATES.minAvgRating,
  recentSevereDisputes: 0,
};

describe('buildVerifiedProStatus', () => {
  it('is eligible when every checklist item is met', () => {
    const s = buildVerifiedProStatus(FULL);
    expect(s.eligible).toBe(true);
    expect(s.metCount).toBe(s.totalCount);
  });

  it('is not eligible without a Code of Craft pledge', () => {
    const s = buildVerifiedProStatus({ ...FULL, codeOfCraftPledged: false });
    expect(s.eligible).toBe(false);
    expect(s.checklist.find((c) => c.key === 'pledge')!.met).toBe(false);
  });

  it('accepts admin account verification in place of a credential', () => {
    const s = buildVerifiedProStatus({ ...FULL, verifiedCredentials: 0, accountVerified: true });
    expect(s.checklist.find((c) => c.key === 'credential')!.met).toBe(true);
    expect(s.eligible).toBe(true);
  });

  it('fails the credential item with neither credential nor account verification', () => {
    const s = buildVerifiedProStatus({ ...FULL, verifiedCredentials: 0, accountVerified: false });
    expect(s.checklist.find((c) => c.key === 'credential')!.met).toBe(false);
    expect(s.eligible).toBe(false);
  });

  it('fails the clean-record item when a severe dispute exists', () => {
    const s = buildVerifiedProStatus({ ...FULL, recentSevereDisputes: 1 });
    expect(s.checklist.find((c) => c.key === 'clean')!.met).toBe(false);
    expect(s.eligible).toBe(false);
  });

  it('does not award eligibility on insufficient reviews', () => {
    const s = buildVerifiedProStatus({ ...FULL, ratingCount: 0, averageRating: null });
    expect(s.checklist.find((c) => c.key === 'reviews')!.met).toBe(false);
    expect(s.eligible).toBe(false);
  });
});

import {
  calculateJobXp,
  computeEligibleRank,
  getDemotionStatus,
  JOB_XP,
  RANK_GATES,
  ProgressionSignals,
} from '../progressionService';

// These tests cover the pure progression functions only — no DB access — so we
// don't need to mock prisma here.

describe('calculateJobXp', () => {
  const baseInputs = {
    reward: 0,
    rating: null,
    onTime: null,
    hasWrittenReview: false,
    verifiedCredential: false,
    inGuild: false,
  };

  it('awards at least the base floor for a completed job', () => {
    const r = calculateJobXp(baseInputs);
    expect(r.total).toBe(JOB_XP.BASE);
  });

  it('caps the reward contribution so big jobs do not dominate', () => {
    const huge = calculateJobXp({ ...baseInputs, reward: 100000 });
    expect(huge.rewardXp).toBe(JOB_XP.REWARD_CAP);
  });

  it('does not let cash outweigh quality: a great cheap job can beat a poor expensive one', () => {
    const cheapGreat = calculateJobXp({
      ...baseInputs,
      reward: 50,
      rating: 5,
      onTime: true,
      hasWrittenReview: true,
    });
    const expensivePoor = calculateJobXp({ ...baseInputs, reward: 100000, rating: 2 });
    expect(cheapGreat.total).toBeGreaterThan(expensivePoor.total);
  });

  it('treats a 3-star rating as neutral and penalizes below 3', () => {
    const neutral = calculateJobXp({ ...baseInputs, rating: 3 });
    const bad = calculateJobXp({ ...baseInputs, rating: 1 });
    expect(neutral.ratingBonus).toBe(0);
    expect(bad.ratingBonus).toBeLessThan(0);
  });

  it('never returns less than the base floor even for a 1-star job', () => {
    const bad = calculateJobXp({ ...baseInputs, rating: 1 });
    expect(bad.total).toBe(JOB_XP.BASE);
  });

  it('adds on-time, review, credential and guild bonuses', () => {
    const r = calculateJobXp({
      reward: 0,
      rating: 5,
      onTime: true,
      hasWrittenReview: true,
      verifiedCredential: true,
      inGuild: true,
    });
    expect(r.onTimeBonus).toBe(JOB_XP.ON_TIME_BONUS);
    expect(r.reviewBonus).toBe(JOB_XP.REVIEW_BONUS);
    expect(r.credentialBonus).toBe(JOB_XP.CREDENTIAL_BONUS);
    expect(r.guildBonus).toBe(JOB_XP.GUILD_BONUS);
  });
});

describe('computeEligibleRank', () => {
  const novice: ProgressionSignals = {
    level: 1,
    xp: 0,
    completedJobs: 0,
    averageRating: null,
    ratingCount: 0,
    verifiedCredentials: 0,
    inGuild: false,
    isGuildLeader: false,
    guildMemberCount: 0,
    guildReputation: 0,
    recentSevereDisputes: 0,
  };

  it('starts everyone at Novice', () => {
    expect(computeEligibleRank(novice)).toBe('NOVICE');
  });

  it('promotes to Apprentice when level/jobs/rating gates are met', () => {
    const s = {
      ...novice,
      level: RANK_GATES.APPRENTICE.minLevel,
      completedJobs: RANK_GATES.APPRENTICE.minJobs,
      averageRating: RANK_GATES.APPRENTICE.minAvgRating,
      ratingCount: RANK_GATES.APPRENTICE.minRatingCount,
    };
    expect(computeEligibleRank(s)).toBe('APPRENTICE');
  });

  it('does not reach Expert without a guild even with strong stats', () => {
    const s: ProgressionSignals = {
      ...novice,
      level: RANK_GATES.EXPERT.minLevel,
      completedJobs: RANK_GATES.EXPERT.minJobs,
      averageRating: 4.9,
      ratingCount: RANK_GATES.EXPERT.minRatingCount,
      verifiedCredentials: 1,
      inGuild: false,
      isGuildLeader: false,
    };
    expect(computeEligibleRank(s)).toBe('JOURNEYMAN');
  });

  it('reaches Expert with guild membership and strong stats', () => {
    const s: ProgressionSignals = {
      ...novice,
      level: RANK_GATES.EXPERT.minLevel,
      completedJobs: RANK_GATES.EXPERT.minJobs,
      averageRating: 4.9,
      ratingCount: RANK_GATES.EXPERT.minRatingCount,
      verifiedCredentials: 1,
      inGuild: true,
    };
    expect(computeEligibleRank(s)).toBe('EXPERT');
  });

  it('requires guild leadership + member count + guild rep + clean record for Legendary', () => {
    const strong: ProgressionSignals = {
      ...novice,
      level: RANK_GATES.LEGENDARY.minLevel,
      completedJobs: RANK_GATES.LEGENDARY.minJobs,
      averageRating: 4.9,
      ratingCount: RANK_GATES.LEGENDARY.minRatingCount,
      verifiedCredentials: 1,
      inGuild: true,
      isGuildLeader: true,
      guildMemberCount: RANK_GATES.LEGENDARY.minGuildMembers,
      guildReputation: RANK_GATES.LEGENDARY.minGuildReputation,
      recentSevereDisputes: 0,
    };
    expect(computeEligibleRank(strong)).toBe('LEGENDARY');

    // A severe dispute drops them back to Expert.
    expect(computeEligibleRank({ ...strong, recentSevereDisputes: 1 })).toBe('EXPERT');

    // Too small a guild also blocks Legendary.
    expect(
      computeEligibleRank({ ...strong, guildMemberCount: RANK_GATES.LEGENDARY.minGuildMembers - 1 }),
    ).toBe('EXPERT');
  });
});

describe('getDemotionStatus', () => {
  it('returns NONE for a healthy record', () => {
    const s = getDemotionStatus({
      averageRating: 4.8,
      ratingCount: 20,
      recentBadReviewCount: 0,
      severeDisputes: 0,
    });
    expect(s.severity).toBe('NONE');
    expect(s.reasons).toHaveLength(0);
  });

  it('flags AT_RISK for a low average rating', () => {
    const s = getDemotionStatus({
      averageRating: 2.5,
      ratingCount: 10,
      recentBadReviewCount: 0,
      severeDisputes: 0,
    });
    expect(s.severity).toBe('AT_RISK');
    expect(s.reasons.length).toBeGreaterThan(0);
  });

  it('does not judge with too few ratings', () => {
    const s = getDemotionStatus({
      averageRating: 1,
      ratingCount: 1,
      recentBadReviewCount: 0,
      severeDisputes: 0,
    });
    expect(s.severity).toBe('NONE');
  });

  it('flags AT_RISK for a severe dispute', () => {
    const s = getDemotionStatus({
      averageRating: 4.9,
      ratingCount: 30,
      recentBadReviewCount: 0,
      severeDisputes: 1,
    });
    expect(s.severity).toBe('AT_RISK');
  });

  it('flags WATCH for a couple of recent low ratings', () => {
    const s = getDemotionStatus({
      averageRating: 4.0,
      ratingCount: 30,
      recentBadReviewCount: 2,
      severeDisputes: 0,
    });
    expect(s.severity).toBe('WATCH');
  });
});

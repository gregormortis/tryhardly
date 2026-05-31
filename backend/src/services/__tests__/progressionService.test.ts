import {
  calculateJobXp,
  computeEligibleRank,
  computeCandidateState,
  meetsRankGate,
  getDemotionStatus,
  probationStageFor,
  ratingXpBonus,
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

  it('rewards 5-star above 4-star, and treats 3-star (and below) as no bonus', () => {
    expect(ratingXpBonus(5)).toBe(JOB_XP.RATING_5_STAR);
    expect(ratingXpBonus(4)).toBe(JOB_XP.RATING_4_STAR);
    expect(ratingXpBonus(3)).toBe(0);
    expect(ratingXpBonus(1)).toBe(0);
    expect(JOB_XP.RATING_5_STAR).toBeGreaterThan(JOB_XP.RATING_4_STAR);
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
    expect(r.ratingBonus).toBe(JOB_XP.RATING_5_STAR);
  });

  it('adds optional repeat-client, per-skill and photo-proof bonuses when measurable', () => {
    const r = calculateJobXp({
      ...baseInputs,
      repeatClient: true,
      skillRatingCount: 3,
      hasPhotoProof: true,
    });
    expect(r.repeatClientBonus).toBe(JOB_XP.REPEAT_CLIENT_BONUS);
    expect(r.skillRatingBonus).toBe(3 * JOB_XP.SKILL_RATING_BONUS);
    expect(r.photoProofBonus).toBe(JOB_XP.PHOTO_PROOF_BONUS);
  });

  it('contributes 0 (never a penalty) for missing optional signals', () => {
    const r = calculateJobXp(baseInputs);
    expect(r.repeatClientBonus).toBe(0);
    expect(r.skillRatingBonus).toBe(0);
    expect(r.photoProofBonus).toBe(0);
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
    tenureDays: 0,
    bronzeSkillBadges: 0,
    silverSkillBadges: 0,
    goldSkillBadges: 0,
    inGuild: false,
    isGuildLeader: false,
    isGuildOfficerOrLeader: false,
    guildMemberCount: 0,
    guildReputation: 0,
    recentSevereDisputes: 0,
  };

  // Builders that exactly meet each rank's enforced gates, layered upward.
  const apprentice: ProgressionSignals = {
    ...novice,
    level: RANK_GATES.APPRENTICE.minLevel,
    tenureDays: RANK_GATES.APPRENTICE.minTenureDays,
    completedJobs: RANK_GATES.APPRENTICE.minJobs,
    ratingCount: RANK_GATES.APPRENTICE.minRatingCount,
    averageRating: RANK_GATES.APPRENTICE.minAvgRating,
  };

  const journeyman: ProgressionSignals = {
    ...apprentice,
    level: RANK_GATES.JOURNEYMAN.minLevel,
    tenureDays: RANK_GATES.JOURNEYMAN.minTenureDays,
    completedJobs: RANK_GATES.JOURNEYMAN.minJobs,
    ratingCount: RANK_GATES.JOURNEYMAN.minRatingCount,
    averageRating: RANK_GATES.JOURNEYMAN.minAvgRating,
    bronzeSkillBadges: RANK_GATES.JOURNEYMAN.minBronzeBadges,
  };

  const expert: ProgressionSignals = {
    ...journeyman,
    level: RANK_GATES.EXPERT.minLevel,
    tenureDays: RANK_GATES.EXPERT.minTenureDays,
    completedJobs: RANK_GATES.EXPERT.minJobs,
    ratingCount: RANK_GATES.EXPERT.minRatingCount,
    averageRating: RANK_GATES.EXPERT.minAvgRating,
    inGuild: true,
    silverSkillBadges: RANK_GATES.EXPERT.minSilverBadges,
    bronzeSkillBadges: Math.max(RANK_GATES.JOURNEYMAN.minBronzeBadges, RANK_GATES.EXPERT.minSilverBadges),
    verifiedCredentials: RANK_GATES.EXPERT.minCredentials,
  };

  const master: ProgressionSignals = {
    ...expert,
    level: RANK_GATES.MASTER.minLevel,
    tenureDays: RANK_GATES.MASTER.minTenureDays,
    completedJobs: RANK_GATES.MASTER.minJobs,
    ratingCount: RANK_GATES.MASTER.minRatingCount,
    averageRating: RANK_GATES.MASTER.minAvgRating,
    isGuildOfficerOrLeader: true,
    goldSkillBadges: RANK_GATES.MASTER.minGoldBadges,
  };

  const legendary: ProgressionSignals = {
    ...master,
    level: RANK_GATES.LEGENDARY.minLevel,
    tenureDays: RANK_GATES.LEGENDARY.minTenureDays,
    completedJobs: RANK_GATES.LEGENDARY.minJobs,
    ratingCount: RANK_GATES.LEGENDARY.minRatingCount,
    averageRating: RANK_GATES.LEGENDARY.minAvgRating,
    isGuildLeader: true,
    isGuildOfficerOrLeader: true,
    guildMemberCount: RANK_GATES.LEGENDARY.minGuildMembers,
    guildReputation: RANK_GATES.LEGENDARY.minGuildReputation,
    recentSevereDisputes: 0,
  };

  it('starts everyone at Novice', () => {
    expect(computeEligibleRank(novice)).toBe('NOVICE');
  });

  it('promotes through each rank when its full gate is met', () => {
    expect(computeEligibleRank(apprentice)).toBe('APPRENTICE');
    expect(computeEligibleRank(journeyman)).toBe('JOURNEYMAN');
    expect(computeEligibleRank(expert)).toBe('EXPERT');
    expect(computeEligibleRank(master)).toBe('MASTER');
    expect(computeEligibleRank(legendary)).toBe('LEGENDARY');
  });

  it('time-gates each rank: enough level/jobs but too little tenure blocks promotion', () => {
    // Apprentice tenure not met -> stays Novice.
    expect(computeEligibleRank({ ...apprentice, tenureDays: 0 })).toBe('NOVICE');
    // Meets Apprentice tenure but not Journeyman tenure -> stays Apprentice.
    expect(
      computeEligibleRank({ ...journeyman, tenureDays: RANK_GATES.APPRENTICE.minTenureDays }),
    ).toBe('APPRENTICE');
  });

  it('does not reach Expert without a guild even with otherwise-strong stats', () => {
    expect(computeEligibleRank({ ...expert, inGuild: false, isGuildLeader: false })).toBe('JOURNEYMAN');
  });

  it('does not reach Expert without the required credential or silver badges', () => {
    expect(computeEligibleRank({ ...expert, verifiedCredentials: 0 })).toBe('JOURNEYMAN');
    expect(computeEligibleRank({ ...expert, silverSkillBadges: 0 })).toBe('JOURNEYMAN');
  });

  it('does not reach Master without a leadership signal or a gold badge', () => {
    expect(computeEligibleRank({ ...master, isGuildOfficerOrLeader: false })).toBe('EXPERT');
    expect(computeEligibleRank({ ...master, goldSkillBadges: 0 })).toBe('EXPERT');
  });

  it('requires guild leadership + members + rep for Legendary (Master-specific gates)', () => {
    expect(computeEligibleRank(legendary)).toBe('LEGENDARY');
    // Too small a guild blocks Legendary but Master gates still hold.
    expect(
      computeEligibleRank({ ...legendary, guildMemberCount: RANK_GATES.LEGENDARY.minGuildMembers - 1 }),
    ).toBe('MASTER');
    // Too little guild reputation blocks Legendary.
    expect(
      computeEligibleRank({ ...legendary, guildReputation: RANK_GATES.LEGENDARY.minGuildReputation - 1 }),
    ).toBe('MASTER');
    // Officer-but-not-leader cannot be Legendary (but is still Master).
    expect(computeEligibleRank({ ...legendary, isGuildLeader: false })).toBe('MASTER');
  });

  it('blocks Apprentice (and thus all ranks) when there is an unresolved/severe dispute', () => {
    // Apprentice and Legendary both require a clean record, so a dispute on an
    // otherwise-Legendary worker cascades all the way down to Novice.
    expect(computeEligibleRank({ ...apprentice, recentSevereDisputes: 1 })).toBe('NOVICE');
    expect(computeEligibleRank({ ...legendary, recentSevereDisputes: 1 })).toBe('NOVICE');
  });

  describe('candidate state (level vs rank separation)', () => {
    it('marks a worker who has the level for the next rank but misses other gates', () => {
      // Apprentice who has reached Journeyman level but lacks tenure/jobs/badges.
      const candidate: ProgressionSignals = {
        ...apprentice,
        level: RANK_GATES.JOURNEYMAN.minLevel,
      };
      const current = computeEligibleRank(candidate);
      expect(current).toBe('APPRENTICE');
      const state = computeCandidateState(candidate, current);
      expect(state.isCandidate).toBe(true);
      expect(state.candidateForRank).toBe('JOURNEYMAN');
      expect(state.candidateLabel).toBe('Journeyman Candidate');
    });

    it('is not a candidate when the worker lacks even the next-rank level', () => {
      const state = computeCandidateState(apprentice, 'APPRENTICE');
      expect(state.isCandidate).toBe(false);
    });

    it('is not a candidate at the top rank', () => {
      const state = computeCandidateState(legendary, 'LEGENDARY');
      expect(state.isCandidate).toBe(false);
    });

    it('is not a candidate when the worker already fully qualifies (would be promoted)', () => {
      const state = computeCandidateState(journeyman, computeEligibleRank(journeyman));
      expect(state.isCandidate).toBe(false);
    });
  });

  it('meetsRankGate agrees with computeEligibleRank for the exact-threshold builders', () => {
    expect(meetsRankGate('APPRENTICE', apprentice)).toBe(true);
    expect(meetsRankGate('LEGENDARY', legendary)).toBe(true);
    expect(meetsRankGate('LEGENDARY', master)).toBe(false);
  });
});

describe('getDemotionStatus / probation stages', () => {
  it('returns NONE / good standing for a healthy record', () => {
    const s = getDemotionStatus({
      averageRating: 4.8,
      ratingCount: 20,
      recentBadReviewCount: 0,
      severeDisputes: 0,
    });
    expect(s.severity).toBe('NONE');
    expect(s.reasons).toHaveLength(0);
    expect(probationStageFor(s.severity)).toBe('Good standing');
  });

  it('flags AT_RISK / probation for a low average rating', () => {
    const s = getDemotionStatus({
      averageRating: 2.5,
      ratingCount: 10,
      recentBadReviewCount: 0,
      severeDisputes: 0,
    });
    expect(s.severity).toBe('AT_RISK');
    expect(s.reasons.length).toBeGreaterThan(0);
    expect(probationStageFor(s.severity)).toBe('Probation');
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

  it('flags WATCH / warning for a couple of recent low ratings', () => {
    const s = getDemotionStatus({
      averageRating: 4.0,
      ratingCount: 30,
      recentBadReviewCount: 2,
      severeDisputes: 0,
    });
    expect(s.severity).toBe('WATCH');
    expect(probationStageFor(s.severity)).toBe('Warning');
  });
});

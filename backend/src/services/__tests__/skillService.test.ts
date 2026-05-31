import {
  deriveSkillTier,
  nextTierProgress,
  buildSkillBadge,
  slugifySkill,
  SKILL_TIER_RULES,
} from '../skillService';

describe('deriveSkillTier', () => {
  it('is LOCKED with too few ratings', () => {
    expect(deriveSkillTier(4, 5.0)).toBe('LOCKED');
    expect(deriveSkillTier(0, 0)).toBe('LOCKED');
  });

  it('earns BRONZE at 5+ ratings averaging >= 4.2', () => {
    expect(deriveSkillTier(5, 4.2)).toBe('BRONZE');
    expect(deriveSkillTier(10, 4.3)).toBe('BRONZE');
  });

  it('does not earn BRONZE below the average threshold', () => {
    expect(deriveSkillTier(10, 4.1)).toBe('LOCKED');
  });

  it('earns SILVER at 15+ ratings averaging >= 4.5', () => {
    expect(deriveSkillTier(15, 4.5)).toBe('SILVER');
  });

  it('earns GOLD at 40+ ratings averaging >= 4.7', () => {
    expect(deriveSkillTier(40, 4.7)).toBe('GOLD');
  });

  it('earns PLATINUM at 100+ ratings averaging >= 4.85', () => {
    expect(deriveSkillTier(100, 4.85)).toBe('PLATINUM');
    expect(deriveSkillTier(200, 5.0)).toBe('PLATINUM');
  });

  it('never auto-grants MYTHIC from ratings alone (review-gated): caps at PLATINUM', () => {
    expect(deriveSkillTier(250, 4.9)).toBe('PLATINUM');
    expect(deriveSkillTier(1000, 5.0)).toBe('PLATINUM');
  });

  it('falls back to the highest tier whose BOTH gates are met', () => {
    // Enough ratings for GOLD count but only SILVER-level average.
    expect(deriveSkillTier(45, 4.6)).toBe('SILVER');
  });
});

describe('nextTierProgress', () => {
  it('reports ratings needed and average requirement for the next tier', () => {
    const next = nextTierProgress('LOCKED', 1, 4.5);
    expect(next).not.toBeNull();
    expect(next!.tier).toBe('BRONZE');
    expect(next!.ratingsNeeded).toBe(SKILL_TIER_RULES[0].minRatings - 1);
    expect(next!.meetsAverage).toBe(true);
  });

  it('surfaces the review-gated MYTHIC bar as the next goal after PLATINUM', () => {
    const next = nextTierProgress('PLATINUM', 100, 4.9);
    expect(next).not.toBeNull();
    expect(next!.tier).toBe('MYTHIC');
  });

  it('returns null at MYTHIC (top of the ladder)', () => {
    expect(nextTierProgress('MYTHIC', 250, 4.9)).toBeNull();
  });
});

describe('buildSkillBadge', () => {
  it('reports zero average and LOCKED for no ratings', () => {
    const b = buildSkillBadge('mowing', 'Mowing', 0, 0);
    expect(b.tier).toBe('LOCKED');
    expect(b.averageRating).toBe(0);
    expect(b.next?.tier).toBe('BRONZE');
  });

  it('rounds the average to two decimals', () => {
    const b = buildSkillBadge('hauling', 'Hauling', 5, 4.666666);
    expect(b.averageRating).toBe(4.67);
    expect(b.tier).toBe('BRONZE');
  });
});

describe('slugifySkill', () => {
  it('normalizes case and spacing so variants aggregate together', () => {
    expect(slugifySkill('Lawn Mowing')).toBe('lawn-mowing');
    expect(slugifySkill('  lawn   mowing ')).toBe('lawn-mowing');
    expect(slugifySkill('Fence/Repair!')).toBe('fence-repair');
  });

  it('returns empty string for non-skill input', () => {
    expect(slugifySkill('   ')).toBe('');
    expect(slugifySkill('!!!')).toBe('');
  });
});

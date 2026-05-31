import {
  deriveSkillTier,
  nextTierProgress,
  buildSkillBadge,
  slugifySkill,
  SKILL_TIER_RULES,
} from '../skillService';

describe('deriveSkillTier', () => {
  it('is LOCKED with too few ratings', () => {
    expect(deriveSkillTier(2, 5.0)).toBe('LOCKED');
    expect(deriveSkillTier(0, 0)).toBe('LOCKED');
  });

  it('earns BRONZE at 3+ ratings averaging >= 4.0', () => {
    expect(deriveSkillTier(3, 4.0)).toBe('BRONZE');
    expect(deriveSkillTier(7, 4.2)).toBe('BRONZE');
  });

  it('does not earn BRONZE below the average threshold', () => {
    expect(deriveSkillTier(10, 3.9)).toBe('LOCKED');
  });

  it('earns SILVER at 8+ ratings averaging >= 4.3', () => {
    expect(deriveSkillTier(8, 4.3)).toBe('SILVER');
  });

  it('earns GOLD at 20+ ratings averaging >= 4.6', () => {
    expect(deriveSkillTier(20, 4.6)).toBe('GOLD');
  });

  it('earns PLATINUM at 50+ ratings averaging >= 4.8', () => {
    expect(deriveSkillTier(50, 4.8)).toBe('PLATINUM');
    expect(deriveSkillTier(100, 5.0)).toBe('PLATINUM');
  });

  it('falls back to the highest tier whose BOTH gates are met', () => {
    // Enough ratings for GOLD count but only SILVER-level average.
    expect(deriveSkillTier(25, 4.4)).toBe('SILVER');
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

  it('returns null at PLATINUM', () => {
    expect(nextTierProgress('PLATINUM', 50, 4.9)).toBeNull();
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
    const b = buildSkillBadge('hauling', 'Hauling', 3, 4.666666);
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

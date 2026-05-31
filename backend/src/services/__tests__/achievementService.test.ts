import {
  ACHIEVEMENT_CATALOG,
  isPublicSafe,
  getPublicAchievementCatalog,
  getAchievementCatalog,
} from '../achievementService';

describe('achievement public-safe filtering', () => {
  it('treats achievements as public-safe unless explicitly opted out', () => {
    const firstBlood = ACHIEVEMENT_CATALOG.find((a) => a.key === 'FIRST_BLOOD')!;
    expect(isPublicSafe(firstBlood)).toBe(true);
  });

  it('marks the earnings/money achievements as NOT public-safe', () => {
    const goldRush = ACHIEVEMENT_CATALOG.find((a) => a.key === 'GOLD_RUSH')!;
    const wealthy = ACHIEVEMENT_CATALOG.find((a) => a.key === 'WEALTHY')!;
    expect(isPublicSafe(goldRush)).toBe(false);
    expect(isPublicSafe(wealthy)).toBe(false);
  });

  it('excludes money achievements from the public catalog', () => {
    const publicKeys = getPublicAchievementCatalog().map((a) => a.key);
    expect(publicKeys).not.toContain('GOLD_RUSH');
    expect(publicKeys).not.toContain('WEALTHY');
    expect(publicKeys).toContain('FIRST_BLOOD');
    expect(publicKeys).toContain('FIVE_STAR');
  });

  it('keeps money achievements in the full (internal) catalog', () => {
    const allKeys = getAchievementCatalog().map((a) => a.key);
    expect(allKeys).toContain('GOLD_RUSH');
    expect(allKeys).toContain('WEALTHY');
  });

  it('no public-facing achievement copy contains dollar or cash framing', () => {
    const riskTerms = /\$|\bcash\b|\bprize\b|\bwallet\b|\bpayout\b|\bbonus pool\b/i;
    for (const a of getPublicAchievementCatalog()) {
      expect(`${a.name} ${a.description}`).not.toMatch(riskTerms);
    }
  });
});

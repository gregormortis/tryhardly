import {
  jobSkillLevelLabel,
  jobStatusLabel,
  GUILD_DEFINITION,
  GUILD_EARLY_NOTE,
  GUILD_TAGLINE,
} from './guildCopy';

describe('jobSkillLevelLabel', () => {
  it('translates stored rank names into plain experience levels', () => {
    expect(jobSkillLevelLabel('NOVICE')).toBe('Entry level');
    expect(jobSkillLevelLabel('JOURNEYMAN')).toBe('Experienced worker recommended');
    expect(jobSkillLevelLabel('EXPERT')).toBe('Advanced');
    expect(jobSkillLevelLabel('MASTER')).toBe('Highly skilled');
    expect(jobSkillLevelLabel('LEGENDARY')).toBe('Highly skilled');
  });

  it('accepts the mixed-case values older records use', () => {
    expect(jobSkillLevelLabel('Journeyman')).toBe('Experienced worker recommended');
    expect(jobSkillLevelLabel(' master ')).toBe('Highly skilled');
  });

  it('returns null when there is nothing meaningful to show', () => {
    expect(jobSkillLevelLabel(null)).toBeNull();
    expect(jobSkillLevelLabel(undefined)).toBeNull();
    expect(jobSkillLevelLabel('')).toBeNull();
    expect(jobSkillLevelLabel('WIZARD')).toBeNull();
  });
});

describe('jobStatusLabel', () => {
  it('formats job status for display', () => {
    expect(jobStatusLabel('open')).toBe('Open');
    expect(jobStatusLabel('IN_PROGRESS')).toBe('In progress');
    expect(jobStatusLabel('in progress')).toBe('In progress');
    expect(jobStatusLabel('completed')).toBe('Completed');
  });

  it('returns null for unknown or missing status', () => {
    expect(jobStatusLabel(null)).toBeNull();
    expect(jobStatusLabel('summoned')).toBeNull();
  });
});

describe('public guild copy', () => {
  it('describes guilds in marketplace terms, not fantasy terms', () => {
    const copy = `${GUILD_DEFINITION} ${GUILD_TAGLINE} ${GUILD_EARLY_NOTE}`.toLowerCase();
    for (const word of ['adventurer', 'quest', 'realm', 'epic', 'legendary', 'wizard', 'magic']) {
      expect(copy).not.toContain(word);
    }
    expect(copy).toContain('worker-led teams');
  });

  it('frames the seeded starter teams as early launch rather than traction', () => {
    const note = GUILD_EARLY_NOTE.toLowerCase();
    expect(note).toContain('starter teams');
    for (const word of ['showcase', 'thousands', 'trusted by']) {
      expect(note).not.toContain(word);
    }
  });
});

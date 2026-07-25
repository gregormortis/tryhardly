// Public-facing copy for guilds. Guilds are a real product concept — worker-led
// teams — but the stored labels come from the older gamified vocabulary, so the
// public pages translate them into plain marketplace language.

export const GUILD_DEFINITION =
  'Guilds are worker-led teams on TryHardly. They help reliable workers build skills, share standards, mentor newer members, and earn trust through completed local jobs.';

export const GUILD_TAGLINE =
  'Worker-led teams for standards, mentoring, and shared reputation.';

// Job difficulty is stored as a rank name (NOVICE…LEGENDARY). Those names read as
// a status claim about the worker rather than a description of the work, so the
// public team page shows how much experience the job calls for instead.
const SKILL_LEVEL_LABELS: Record<string, string> = {
  NOVICE: 'Entry level',
  APPRENTICE: 'Some experience',
  JOURNEYMAN: 'Experienced worker recommended',
  EXPERT: 'Advanced',
  MASTER: 'Highly skilled',
  LEGENDARY: 'Highly skilled',
};

export function jobSkillLevelLabel(difficulty?: string | null): string | null {
  if (!difficulty) return null;
  return SKILL_LEVEL_LABELS[difficulty.trim().toUpperCase()] ?? null;
}

const JOB_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In progress',
  ASSIGNED: 'In progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Closed',
};

export function jobStatusLabel(status?: string | null): string | null {
  if (!status) return null;
  const key = status.trim().toUpperCase().replace(/[\s-]+/g, '_');
  return JOB_STATUS_LABELS[key] ?? null;
}

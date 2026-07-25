// The public team page needs two things: the guild record itself and the jobs
// that team has posted. Only the first one is required — the jobs endpoint is
// not available in every deployment, and a missing jobs list must not hide the
// guild's real details behind an "unavailable" page.

export interface GuildDetailRecord {
  id: string;
  name: string;
  description?: string | null;
  reputationScore?: number | null;
  createdAt?: string | null;
  members?: unknown[] | null;
  _count?: { members?: number | null } | null;
  [key: string]: unknown;
}

export interface GuildJobRecord {
  id?: string;
  status?: string | null;
  [key: string]: unknown;
}

export interface GuildDetailData {
  guild: GuildDetailRecord;
  // `null` means the jobs list could not be loaded, which is different from a
  // team that has simply not posted any work yet.
  jobs: GuildJobRecord[] | null;
}

type RequestFn = <T>(endpoint: string) => Promise<T>;

export async function loadGuildDetail(
  id: string,
  request: RequestFn
): Promise<GuildDetailData | null> {
  let guild: GuildDetailRecord | null;
  try {
    guild = await request<GuildDetailRecord | null>(`/guilds/${id}`);
  } catch {
    return null;
  }
  if (!guild) return null;

  let jobs: GuildJobRecord[] | null;
  try {
    jobs = (await request<GuildJobRecord[] | null>(`/guilds/${id}/quests`)) ?? [];
  } catch {
    jobs = null;
  }

  return { guild, jobs };
}

export function guildWorkerCount(guild: GuildDetailRecord): number | null {
  const counted = guild._count?.members;
  if (typeof counted === 'number') return counted;
  if (Array.isArray(guild.members)) return guild.members.length;
  return null;
}

export function guildJobsCompleted(jobs: GuildJobRecord[] | null): number | null {
  if (!jobs) return null;
  return jobs.filter(job => job.status?.trim().toUpperCase() === 'COMPLETED').length;
}

export interface GuildStat {
  label: string;
  value: string;
}

// Every row here is derived from data the API actually returned. Rows without a
// source are dropped rather than filled with a placeholder number.
export function guildDetailStats(
  guild: GuildDetailRecord,
  jobs: GuildJobRecord[] | null
): GuildStat[] {
  const stats: GuildStat[] = [];

  const workers = guildWorkerCount(guild);
  if (workers !== null) {
    stats.push({ label: 'Workers', value: workers.toLocaleString() });
  }

  if (typeof guild.reputationScore === 'number') {
    stats.push({ label: 'Shared reputation', value: guild.reputationScore.toLocaleString() });
  }

  const completed = guildJobsCompleted(jobs);
  if (completed !== null) {
    stats.push({ label: 'Jobs completed', value: completed.toLocaleString() });
  }

  const started = guild.createdAt ? new Date(guild.createdAt) : null;
  if (started && !Number.isNaN(started.getTime())) {
    stats.push({ label: 'Started', value: started.toLocaleDateString() });
  }

  return stats;
}

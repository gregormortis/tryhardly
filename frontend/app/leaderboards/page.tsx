'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

// ─── Types (mirror backend leaderboardService payload) ──────────────────────────

interface WorkerEntry {
  rank: number;
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  reputationScore: number;
  averageRating: number | null;
  ratingCount: number;
  completedJobs: number;
  verifiedCredentials: number;
  topSkillBadges: number;
  verified: boolean;
  guild: { id: string; name: string; tag: string } | null;
}

interface SkillMasterEntry {
  rank: number;
  skillSlug: string;
  skillName: string;
  tier: 'GOLD' | 'PLATINUM';
  averageRating: number;
  ratingCount: number;
  worker: { id: string; username: string; displayName: string; avatarUrl: string | null };
}

interface TeamEntry {
  rank: number;
  id: string;
  name: string;
  tag: string;
  badgeUrl: string | null;
  reputationScore: number;
  memberCount: number;
}

interface LeaderboardsPayload {
  topWorkers: WorkerEntry[];
  risingWorkers: WorkerEntry[];
  skillMasters: SkillMasterEntry[];
  topGuilds: TeamEntry[];
}

type TabKey = 'top' | 'rising' | 'skills' | 'teams';

const TABS: { key: TabKey; label: string; blurb: string }[] = [
  { key: 'top', label: 'Top workers', blurb: 'Ranked by rating quality and reliability across completed jobs.' },
  { key: 'rising', label: 'Rising workers', blurb: 'Newer workers building a strong early track record.' },
  { key: 'skills', label: 'Skilled workers', blurb: 'Workers with top-rated skills, based on client ratings per skill.' },
  { key: 'teams', label: 'Worker teams', blurb: 'Groups of workers who take jobs on together, ranked by their shared rating history.' },
];

function rankBadge(rank: number): string {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `${rank}`;
}

function initials(name: string): string {
  return (name || '?').slice(0, 2).toUpperCase();
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-center py-16 px-6 bg-surface border border-line rounded-xl">
      <div className="text-4xl mb-3">🌱</div>
      <p className="text-muted max-w-md mx-auto">{children}</p>
      <Link href="/progression" className="text-accent-text hover:underline mt-3 inline-block text-sm">
        How ratings &amp; badges work →
      </Link>
    </div>
  );
}

function RankCell({ rank }: { rank: number }) {
  const color = rank === 1 ? 'text-accent-text' : rank === 2 ? 'text-body' : rank === 3 ? 'text-warning' : 'text-subtle';
  return <div className={`text-xl font-bold w-10 text-center shrink-0 ${color}`}>{rankBadge(rank)}</div>;
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="w-10 h-10 rounded-full bg-accent/15 border border-accent/25 flex items-center justify-center text-sm font-bold text-accent-text-hover shrink-0">
      {initials(name)}
    </div>
  );
}

function WorkerRow({ entry, showRating }: { entry: WorkerEntry; showRating?: boolean }) {
  return (
    <Link
      href={`/profile/${entry.username}`}
      className="bg-surface border border-line hover:border-accent/30 rounded-xl p-4 flex items-center gap-4 transition-colors"
    >
      <RankCell rank={entry.rank} />
      <Avatar name={entry.displayName || entry.username} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-strong truncate">{entry.displayName || entry.username}</span>
          {entry.verified && (
            <span className="text-[12px] font-mono uppercase tracking-wider text-info bg-info/10 border border-info/25 rounded px-1.5 py-0.5">
              Verified
            </span>
          )}
          {entry.guild && (
            <span className="text-[12px] text-subtle">Team {entry.guild.name}</span>
          )}
        </div>
        <div className="text-xs text-subtle mt-0.5">
          {entry.averageRating != null ? `${entry.averageRating.toFixed(1)}★ · ${entry.ratingCount} review${entry.ratingCount === 1 ? '' : 's'}` : 'No ratings yet'}
          {' · '}{entry.completedJobs} job{entry.completedJobs === 1 ? '' : 's'}
          {entry.verifiedCredentials > 0 && ` · ${entry.verifiedCredentials} verified credential${entry.verifiedCredentials === 1 ? '' : 's'}`}
          {entry.topSkillBadges > 0 && ` · ${entry.topSkillBadges} top skill badge${entry.topSkillBadges === 1 ? '' : 's'}`}
        </div>
      </div>
      <div className="text-right hidden sm:block shrink-0">
        <div className="text-lg font-bold text-accent-text">{entry.reputationScore.toLocaleString()}</div>
        <div className="text-[12px] text-subtle uppercase tracking-wider">Reputation</div>
      </div>
      {showRating && entry.averageRating != null && (
        <div className="text-right hidden sm:block shrink-0">
          <div className="text-lg font-bold text-success">{entry.averageRating.toFixed(1)}★</div>
          <div className="text-[12px] text-subtle uppercase tracking-wider">Avg rating</div>
        </div>
      )}
    </Link>
  );
}

const SKILL_TIER_STYLE: Record<'GOLD' | 'PLATINUM', string> = {
  GOLD: 'text-warning bg-warning/10 border-warning/25',
  PLATINUM: 'text-info bg-info/10 border-info/25',
};

const SKILL_TIER_LABEL: Record<'GOLD' | 'PLATINUM', string> = {
  GOLD: 'Highly rated',
  PLATINUM: 'Top rated',
};

function SkillMasterRow({ entry }: { entry: SkillMasterEntry }) {
  return (
    <Link
      href={`/profile/${entry.worker.username}`}
      className="bg-surface border border-line hover:border-accent/30 rounded-xl p-4 flex items-center gap-4 transition-colors"
    >
      <RankCell rank={entry.rank} />
      <Avatar name={entry.worker.displayName || entry.worker.username} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-strong truncate">{entry.skillName}</span>
          <span className={`text-[12px] font-mono uppercase tracking-wider rounded px-1.5 py-0.5 border ${SKILL_TIER_STYLE[entry.tier]}`}>
            {SKILL_TIER_LABEL[entry.tier]}
          </span>
        </div>
        <div className="text-xs text-subtle mt-0.5">
          {entry.worker.displayName || entry.worker.username} · {entry.averageRating.toFixed(1)}★ over {entry.ratingCount} rating{entry.ratingCount === 1 ? '' : 's'}
        </div>
      </div>
    </Link>
  );
}

function TeamRow({ entry }: { entry: TeamEntry }) {
  // Visible copy says "worker team", but the detail route is still /guilds/<id>: renaming it
  // means moving the route and its API paths, so the slug rename is deferred to its own change.
  return (
    <Link
      href={`/guilds/${entry.id}`}
      className="bg-surface border border-line hover:border-accent/30 rounded-xl p-4 flex items-center gap-4 transition-colors"
    >
      <RankCell rank={entry.rank} />
      <div className="w-10 h-10 rounded-md bg-raised border border-line-strong flex items-center justify-center text-sm font-bold text-body shrink-0">
        {initials(entry.name)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-strong truncate">{entry.name}</div>
        <div className="text-xs text-subtle mt-0.5">
          {entry.memberCount} worker{entry.memberCount === 1 ? '' : 's'}
        </div>
      </div>
      <div className="text-right hidden sm:block shrink-0">
        <div className="text-lg font-bold text-accent-text">{entry.reputationScore.toLocaleString()}</div>
        <div className="text-[12px] text-subtle uppercase tracking-wider">Reputation</div>
      </div>
    </Link>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function LeaderboardsPage() {
  const [data, setData] = useState<LeaderboardsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>('top');

  useEffect(() => {
    let active = true;
    api
      .get<LeaderboardsPayload>('/gamification/leaderboards')
      .then((d) => { if (active) setData(d); })
      .catch(() => { if (active) setData({ topWorkers: [], risingWorkers: [], skillMasters: [], topGuilds: [] }); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const activeTab = useMemo(() => TABS.find((t) => t.key === tab)!, [tab]);

  return (
    <div className="min-h-screen bg-canvas py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-strong mb-2">Top rated workers</h1>
          <p className="text-muted max-w-2xl mx-auto">
            Workers listed here are ranked on their record of completed work on TryHardly: client ratings and reviews,
            completed jobs, and verified credentials. Rankings are never based on earnings or on paying for placement.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-3 justify-center">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.key
                  ? 'bg-accent text-on-accent'
                  : 'bg-surface text-muted border border-line hover:text-strong'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="text-center text-sm text-subtle mb-8">{activeTab.blurb}</p>

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-surface border border-line rounded-xl p-4 animate-pulse h-[68px]" />
            ))}
          </div>
        ) : !data ? (
          <EmptyState>Rankings are still being built. Check back soon.</EmptyState>
        ) : (
          <div className="space-y-3">
            {tab === 'top' && (
              data.topWorkers.length > 0 ? (
                data.topWorkers.map((e) => <WorkerRow key={e.id} entry={e} />)
              ) : (
                <EmptyState>
                  No workers ranked yet. As workers complete jobs and collect client reviews, the highest rated
                  will appear here.
                </EmptyState>
              )
            )}

            {tab === 'rising' && (
              data.risingWorkers.length > 0 ? (
                data.risingWorkers.map((e) => <WorkerRow key={e.id} entry={e} showRating />)
              ) : (
                <EmptyState>
                  No rising workers yet. Newer workers who complete jobs and earn strong early ratings will be
                  highlighted here.
                </EmptyState>
              )
            )}

            {tab === 'skills' && (
              data.skillMasters.length > 0 ? (
                data.skillMasters.map((e) => <SkillMasterRow key={`${e.worker.id}-${e.skillSlug}`} entry={e} />)
              ) : (
                <EmptyState>
                  No skill rankings yet. Once workers collect enough client ratings on a specific skill, their
                  best-rated skills will be listed here.
                </EmptyState>
              )
            )}

            {tab === 'teams' && (
              data.topGuilds.length > 0 ? (
                data.topGuilds.map((e) => <TeamRow key={e.id} entry={e} />)
              ) : (
                <EmptyState>
                  No worker teams ranked yet. Teams appear here once their members build a shared rating history.
                </EmptyState>
              )
            )}
          </div>
        )}

        {/* Footer note */}
        <p className="text-center text-xs text-subtle mt-10 max-w-xl mx-auto">
          Rankings recognize reliability and quality of work. They can earn a worker more visibility and trust,
          but everyone keeps 100% of what they agree to earn.
        </p>
      </div>
    </div>
  );
}

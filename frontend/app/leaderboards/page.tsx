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

interface GuildEntry {
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
  topGuilds: GuildEntry[];
}

type TabKey = 'top' | 'rising' | 'skills' | 'guilds';

const TABS: { key: TabKey; label: string; blurb: string }[] = [
  { key: 'top', label: 'Top Workers', blurb: 'Ranked by trust and rating quality across completed work.' },
  { key: 'rising', label: 'Rising Workers', blurb: 'Newer members building a strong early track record.' },
  { key: 'skills', label: 'Skill Masters', blurb: 'Workers with top-tier, client-rated skill badges.' },
  { key: 'guilds', label: 'Top Guilds', blurb: 'Guilds with the strongest shared reputation.' },
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
    <div className="text-center py-16 px-6 bg-gray-900 border border-gray-800 rounded-xl">
      <div className="text-4xl mb-3">🌱</div>
      <p className="text-gray-400 max-w-md mx-auto">{children}</p>
      <Link href="/progression" className="text-amber-400 hover:underline mt-3 inline-block text-sm">
        How ranks &amp; badges work →
      </Link>
    </div>
  );
}

function RankCell({ rank }: { rank: number }) {
  const color = rank === 1 ? 'text-amber-400' : rank === 2 ? 'text-gray-300' : rank === 3 ? 'text-orange-600' : 'text-gray-500';
  return <div className={`text-xl font-bold w-10 text-center shrink-0 ${color}`}>{rankBadge(rank)}</div>;
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="w-10 h-10 rounded-full bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-sm font-bold text-amber-300 shrink-0">
      {initials(name)}
    </div>
  );
}

function WorkerRow({ entry, showRating }: { entry: WorkerEntry; showRating?: boolean }) {
  return (
    <Link
      href={`/profile/${entry.username}`}
      className="bg-gray-900 border border-gray-800 hover:border-amber-500/30 rounded-xl p-4 flex items-center gap-4 transition-colors"
    >
      <RankCell rank={entry.rank} />
      <Avatar name={entry.displayName || entry.username} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-white truncate">{entry.displayName || entry.username}</span>
          {entry.verified && (
            <span className="text-[10px] font-mono uppercase tracking-wider text-sky-400 bg-sky-400/10 border border-sky-400/25 rounded px-1.5 py-0.5">
              Verified
            </span>
          )}
          {entry.guild && (
            <span className="text-[10px] font-mono uppercase tracking-wider text-violet-300 bg-violet-400/10 border border-violet-400/25 rounded px-1.5 py-0.5">
              {entry.guild.tag}
            </span>
          )}
        </div>
        <div className="text-xs text-gray-500 mt-0.5">
          {entry.averageRating != null ? `${entry.averageRating.toFixed(1)}★ · ${entry.ratingCount} review${entry.ratingCount === 1 ? '' : 's'}` : 'No ratings yet'}
          {' · '}{entry.completedJobs} job{entry.completedJobs === 1 ? '' : 's'}
          {entry.verifiedCredentials > 0 && ` · ${entry.verifiedCredentials} verified credential${entry.verifiedCredentials === 1 ? '' : 's'}`}
          {entry.topSkillBadges > 0 && ` · ${entry.topSkillBadges} top skill badge${entry.topSkillBadges === 1 ? '' : 's'}`}
        </div>
      </div>
      <div className="text-right hidden sm:block shrink-0">
        <div className="text-lg font-bold text-amber-400">{entry.reputationScore.toLocaleString()}</div>
        <div className="text-[10px] text-gray-500 uppercase tracking-wider">Reputation</div>
      </div>
      {showRating && entry.averageRating != null && (
        <div className="text-right hidden sm:block shrink-0">
          <div className="text-lg font-bold text-green-400">{entry.averageRating.toFixed(1)}★</div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Avg rating</div>
        </div>
      )}
    </Link>
  );
}

const SKILL_TIER_STYLE: Record<'GOLD' | 'PLATINUM', string> = {
  GOLD: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/25',
  PLATINUM: 'text-cyan-300 bg-cyan-300/10 border-cyan-300/25',
};

function SkillMasterRow({ entry }: { entry: SkillMasterEntry }) {
  return (
    <Link
      href={`/profile/${entry.worker.username}`}
      className="bg-gray-900 border border-gray-800 hover:border-amber-500/30 rounded-xl p-4 flex items-center gap-4 transition-colors"
    >
      <RankCell rank={entry.rank} />
      <Avatar name={entry.worker.displayName || entry.worker.username} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-white truncate">{entry.skillName}</span>
          <span className={`text-[10px] font-mono uppercase tracking-wider rounded px-1.5 py-0.5 border ${SKILL_TIER_STYLE[entry.tier]}`}>
            {entry.tier}
          </span>
        </div>
        <div className="text-xs text-gray-500 mt-0.5">
          {entry.worker.displayName || entry.worker.username} · {entry.averageRating.toFixed(1)}★ over {entry.ratingCount} rating{entry.ratingCount === 1 ? '' : 's'}
        </div>
      </div>
    </Link>
  );
}

function GuildRow({ entry }: { entry: GuildEntry }) {
  return (
    <Link
      href={`/guilds/${entry.id}`}
      className="bg-gray-900 border border-gray-800 hover:border-violet-500/30 rounded-xl p-4 flex items-center gap-4 transition-colors"
    >
      <RankCell rank={entry.rank} />
      <div className="w-10 h-10 rounded-md bg-violet-400/10 border border-violet-400/25 flex items-center justify-center text-violet-300 shrink-0">⚜</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-white truncate">{entry.name}</span>
          <span className="text-[10px] font-mono uppercase tracking-wider text-violet-300 bg-violet-400/10 border border-violet-400/25 rounded px-1.5 py-0.5">
            {entry.tag}
          </span>
        </div>
        <div className="text-xs text-gray-500 mt-0.5">{entry.memberCount} member{entry.memberCount === 1 ? '' : 's'}</div>
      </div>
      <div className="text-right hidden sm:block shrink-0">
        <div className="text-lg font-bold text-violet-300">{entry.reputationScore.toLocaleString()}</div>
        <div className="text-[10px] text-gray-500 uppercase tracking-wider">Reputation</div>
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
    <div className="min-h-screen bg-gray-950 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-2">Leaderboards</h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Recognition for the most trusted and skilled members of the community. Standings reflect reputation,
            rating quality, completed work, verified credentials, and skill mastery — never earnings.
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
                  ? 'bg-amber-500 text-black'
                  : 'bg-gray-900 text-gray-400 border border-gray-800 hover:text-gray-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="text-center text-sm text-gray-500 mb-8">{activeTab.blurb}</p>

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4 animate-pulse h-[68px]" />
            ))}
          </div>
        ) : !data ? (
          <EmptyState>Leaderboards are warming up. Check back soon.</EmptyState>
        ) : (
          <div className="space-y-3">
            {tab === 'top' && (
              data.topWorkers.length > 0 ? (
                data.topWorkers.map((e) => <WorkerRow key={e.id} entry={e} />)
              ) : (
                <EmptyState>
                  The Top Workers board is in early access. As members complete jobs and earn reviews, the most
                  trusted workers will appear here.
                </EmptyState>
              )
            )}

            {tab === 'rising' && (
              data.risingWorkers.length > 0 ? (
                data.risingWorkers.map((e) => <WorkerRow key={e.id} entry={e} showRating />)
              ) : (
                <EmptyState>
                  No rising workers yet. Newer members who complete jobs and earn strong early ratings will be
                  highlighted here.
                </EmptyState>
              )
            )}

            {tab === 'skills' && (
              data.skillMasters.length > 0 ? (
                data.skillMasters.map((e) => <SkillMasterRow key={`${e.worker.id}-${e.skillSlug}`} entry={e} />)
              ) : (
                <EmptyState>
                  No skill masters yet. Once workers earn enough top-tier (Gold or Platinum) client-rated skill
                  badges, they will be recognized here.
                </EmptyState>
              )
            )}

            {tab === 'guilds' && (
              data.topGuilds.length > 0 ? (
                data.topGuilds.map((e) => <GuildRow key={e.id} entry={e} />)
              ) : (
                <EmptyState>
                  No guilds ranked yet. As guilds grow their shared reputation, the strongest will appear here.
                </EmptyState>
              )
            )}
          </div>
        )}

        {/* Footer note */}
        <p className="text-center text-xs text-gray-600 mt-10 max-w-xl mx-auto">
          Leaderboards recognize trust, reliability, and skill. They are not a contest for money and confer no cash,
          discounts, or fee changes — the marketplace fee stays a flat 12% for everyone.
        </p>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';
import { useRouter } from 'next/navigation';
import type { Quest, Application } from '../../lib/types';
import StripeConnectButton from '../../components/StripeConnectButton';
import {
  applicationStatusView,
  countActiveQuests,
  isActiveAssignment,
  isActivePostedQuest,
  workStatusView,
} from '../../lib/workStatus';
import type { WorkRole } from '../../lib/workStatus';

const XP_PER_LEVEL = 1000;

// What the viewer should do next on a job that is already under way.
function activeCta(questStatus: string | undefined, role: WorkRole): string {
  if (role === 'poster') {
    return questStatus === 'IN_REVIEW' ? 'Confirm completion' : 'View job';
  }
  return questStatus === 'IN_REVIEW' ? 'View submission' : 'Submit completion';
}

// One row in the "Active quests" list, from either side of the marketplace.
interface ActiveWorkItem {
  key: string;
  questId: string;
  title: string;
  reward?: number;
  status?: string;
  role: WorkRole;
}

// A job the viewer finished and still owes a review on. Reviews are one per
// person per job, so `viewerHasReviewed` drops the row once theirs is in.
interface ReviewPrompt {
  questId: string;
  title: string;
  counterparty: 'the worker' | 'your client';
}

interface DashboardData {
  postedQuests: Quest[];
  applications: Application[];
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) router.push('/auth/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    async function fetchDashboard() {
      setDataLoading(true);
      try {
        const [questsRes, applicationsRes] = await Promise.all([
          api
            .get<{ data?: Quest[]; quests?: Quest[] }>('/quests?mine=true&status=any&limit=50')
            .catch(() => ({ data: [], quests: [] })),
          api.get<Application[]>('/users/me/applications').catch(() => []),
        ]);
        const rawQuests = questsRes.data ?? questsRes.quests ?? [];
        // Belt-and-braces filter: if backend ignored `mine=true` (older deploys),
        // still narrow to the user's own posted quests client-side.
        const postedQuests = rawQuests.filter(
          (q: Quest) => q.questGiverId === user.id || q.questGiver?.id === user.id
        );
        setData({
          postedQuests,
          applications: Array.isArray(applicationsRes) ? applicationsRes : [],
        });
      } catch (err: unknown) {
        const e = err as { message?: string };
        setError(e?.message || 'Failed to load dashboard');
      } finally {
        setDataLoading(false);
      }
    }
    fetchDashboard();
  }, [user]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-400">Loading...</p>
      </div>
    );
  }

  const xpProgress = user.xp % XP_PER_LEVEL;
  const xpPercent = (xpProgress / XP_PER_LEVEL) * 100;
  // Both sides of the marketplace count toward the headline metric, and the
  // list below has to show the same jobs the metric counts.
  const activeQuestCount = countActiveQuests(
    data?.postedQuests || [],
    data?.applications || []
  );
  const activeWork: ActiveWorkItem[] = [
    ...(data?.postedQuests || []).filter(isActivePostedQuest).map(q => ({
      key: `posted-${q.id}`,
      questId: q.id,
      title: q.title,
      reward: q.reward,
      status: q.status,
      role: 'poster' as const,
    })),
    ...(data?.applications || []).filter(isActiveAssignment).map(app => ({
      key: `bid-${app.id}`,
      questId: app.quest!.id,
      title: app.quest!.title,
      reward: app.quest!.reward,
      status: app.quest!.status,
      role: 'worker' as const,
    })),
  ];
  // Quests the user posted that a worker submitted for completion review.
  const pendingReview = data?.postedQuests?.filter(q => q.status === 'IN_REVIEW') || [];

  // Completed jobs still owed a review, from both sides of the marketplace.
  const reviewPrompts: ReviewPrompt[] = [
    ...(data?.postedQuests || [])
      .filter(q => q.status === 'COMPLETED' && !q.viewerHasReviewed && !!q.assignedAdventurerId)
      .map(q => ({ questId: q.id, title: q.title, counterparty: 'the worker' as const })),
    ...(data?.applications || [])
      .filter(
        app =>
          app.status === 'ACCEPTED' &&
          !!app.quest?.id &&
          app.quest.status === 'COMPLETED' &&
          !app.quest.viewerHasReviewed
      )
      .map(app => ({
        questId: app.quest!.id,
        title: app.quest!.title,
        counterparty: 'your client' as const,
      })),
  ];

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-8 max-w-4xl mx-auto">

      {/* Welcome header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-100">
          Welcome back, <span className="text-amber-400">{user.username}</span>
        </h1>
        <p className="text-zinc-400 mt-1">Your adventurer dashboard</p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Level', value: user.level, icon: '⚔️', color: 'text-amber-400' },
          { label: 'Total XP', value: user.xp.toLocaleString(), icon: '⭐', color: 'text-yellow-400' },
          { label: 'Active Quests', value: activeQuestCount, icon: '📜', color: 'text-green-400' },
          { label: 'Bids Sent', value: data?.applications?.length ?? 0, icon: '📤', color: 'text-blue-400' },
        ].map(stat => (
          <div key={stat.label} className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
            <div className="text-2xl mb-1">{stat.icon}</div>
            <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-zinc-500">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* XP Progress */}
      <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-zinc-400">Level {user.level} → {user.level + 1}</span>
          <span className="text-zinc-500">{xpProgress} / {XP_PER_LEVEL} XP</span>
        </div>
        <div className="h-2 bg-zinc-800 rounded-full">
          <div className="h-2 bg-amber-400 rounded-full transition-all" style={{ width: `${xpPercent}%` }} />
        </div>
        <p className="text-xs text-zinc-600 mt-1">{XP_PER_LEVEL - xpProgress} XP needed to level up</p>
      </div>

      {/* Stripe Connect */}
      <div className="mb-6">
        <StripeConnectButton stripeAccountId={user.stripeAccountId || null} />
      </div>

      {/* Pending completion reviews — quests a worker submitted for your review. */}
      {!dataLoading && pendingReview.length > 0 && (
        <div className="rounded-xl bg-amber-500/5 border border-amber-500/30 p-4 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-amber-300">✅ Completions to confirm</h2>
            <span className="text-xs text-amber-400/70">{pendingReview.length} awaiting</span>
          </div>
          <div className="space-y-2">
            {pendingReview.map(q => (
              <Link
                key={q.id}
                href={`/questboard/${q.id}`}
                className="flex justify-between items-center p-3 rounded-lg bg-zinc-800 hover:bg-zinc-700/80 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-100">{q.title}</p>
                  <p className="text-xs text-zinc-500">
                    The worker marked this done — confirm it to finish and pay
                  </p>
                </div>
                <span className="text-xs px-2 py-1 rounded bg-amber-500/20 text-amber-300">
                  Confirm completion
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Reviews you still owe — the trust loop only closes when both sides
          rate each other, so surface it on both dashboards. */}
      {!dataLoading && reviewPrompts.length > 0 && (
        <div className="rounded-xl bg-purple-500/5 border border-purple-500/30 p-4 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-purple-300">⭐ Reviews to leave</h2>
            <span className="text-xs text-purple-400/70">{reviewPrompts.length} pending</span>
          </div>
          <div className="space-y-2">
            {reviewPrompts.map(prompt => (
              <Link
                key={prompt.questId}
                href={`/questboard/${prompt.questId}#reviews`}
                className="flex justify-between items-center gap-3 p-3 rounded-lg bg-zinc-800 hover:bg-zinc-700/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/60 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-100 truncate">{prompt.title}</p>
                  <p className="text-xs text-zinc-500">
                    Completed — rate {prompt.counterparty} to build their reputation
                  </p>
                </div>
                <span className="shrink-0 text-xs px-2 py-1 rounded bg-purple-500/20 text-purple-300">
                  Leave a review →
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Active quests — jobs under way on either side: work the user won, and
          jobs they posted that a worker is on. These quests have left the public
          board (they're no longer OPEN), so this section is the way back in. */}
      {!dataLoading && activeWork.length > 0 && (
        <div className="rounded-xl bg-green-500/5 border border-green-500/30 p-4 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-green-300">⚔️ Active quests</h2>
            <span className="text-xs text-green-400/70">{activeWork.length} under way</span>
          </div>
          <div className="space-y-2">
            {activeWork.map(item => (
              <Link
                key={item.key}
                href={`/questboard/${item.questId}`}
                className="group flex justify-between items-center gap-3 p-3 rounded-lg bg-zinc-800 hover:bg-zinc-700/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500/60 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-100 truncate">{item.title}</p>
                  <p className="text-xs text-zinc-500">
                    {item.role === 'poster' ? 'You posted' : 'You were hired'} • $
                    {item.reward?.toLocaleString()} • {workStatusView(item.status, item.role).label}
                  </p>
                </div>
                <span className="shrink-0 text-xs px-2 py-1 rounded bg-green-500/20 text-green-300 group-hover:bg-green-500/30">
                  {activeCta(item.status, item.role)} →
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* My Applications */}
      <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-bold text-zinc-100">📜 My Bids</h2>
            <p className="text-xs text-zinc-500">
              Every bid you&apos;ve sent. Won bids also appear under Active quests.
            </p>
          </div>
          <Link href="/questboard" className="text-xs text-amber-400 hover:underline">Browse quests</Link>
        </div>
        {dataLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-zinc-800 rounded animate-pulse" />
            ))}
          </div>
        ) : data?.applications?.length ? (
          <div className="space-y-2">
            {data.applications.slice(0, 5).map(app => {
              // Once a bid is won its own status never changes again, so the
              // job's work status is what this row has to report.
              const view = applicationStatusView(
                app.status,
                app.quest?.status,
                app.quest?.viewerHasReviewed
              );
              const body = (
                <>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-100 truncate">{app.quest?.title || 'Quest'}</p>
                    <p className="text-xs text-zinc-500">${app.quest?.reward?.toLocaleString()} • {app.quest?.difficulty}</p>
                  </div>
                  <span className={`shrink-0 text-xs px-2 py-1 rounded ${view.tone}`}>{view.label}</span>
                </>
              );
              // A bid on a quest that has since left the public board still needs
              // to be reachable, so link on the quest id whenever we have one.
              return app.quest?.id ? (
                <Link
                  key={app.id}
                  href={`/questboard/${app.quest.id}`}
                  className="flex justify-between items-center gap-3 p-3 rounded-lg bg-zinc-800 hover:bg-zinc-700/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 transition-colors"
                >
                  {body}
                </Link>
              ) : (
                <div key={app.id} className="flex justify-between items-center gap-3 p-3 rounded-lg bg-zinc-800">
                  {body}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-zinc-500 text-sm mb-2">No bids yet.</p>
            <Link href="/questboard" className="text-amber-400 text-sm hover:underline">Find a quest to bid on</Link>
          </div>
        )}
      </div>

      {/* Posted quests */}
      <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-zinc-100">📤 My Posted Quests</h2>
          <Link href="/post-quest" className="text-xs text-amber-400 hover:underline">+ Post new</Link>
        </div>
        {dataLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-zinc-800 rounded animate-pulse" />
            ))}
          </div>
        ) : data?.postedQuests?.length ? (
          <div className="space-y-2">
            {data.postedQuests.slice(0, 5).map(q => {
              const view = workStatusView(q.status, 'poster', q.viewerHasReviewed);
              return (
                <Link
                  key={q.id}
                  href={`/questboard/${q.id}`}
                  className="group flex justify-between items-center p-3 rounded-lg bg-zinc-800 hover:bg-zinc-700/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 cursor-pointer transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-100">{q.title}</p>
                    <p className="text-xs text-zinc-500">{q._count?.applications || 0} applicant{(q._count?.applications || 0) !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded ${view.tone}`}>{view.label}</span>
                    <span className="text-xs text-amber-400 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">Manage →</span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-zinc-500 text-sm mb-2">No quests posted yet.</p>
            <Link href="/post-quest" className="text-amber-400 text-sm hover:underline">Post your first quest</Link>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Browse Quests', href: '/questboard', icon: '📜' },
          { label: 'Post a Quest', href: '/post-quest', icon: '➕' },
          { label: 'My Profile', href: '/profile', icon: '👤' },
          { label: 'Guilds', href: '/guilds', icon: '🛡️' },
        ].map(action => (
          <Link
            key={action.label}
            href={action.href}
            className="flex flex-col items-center gap-2 rounded-xl bg-zinc-900 border border-zinc-800 p-4 hover:border-amber-500/40 transition-colors"
          >
            <span className="text-2xl">{action.icon}</span>
            <span className="text-xs text-zinc-400">{action.label}</span>
          </Link>
        ))}
      </div>

    </div>
  );
}

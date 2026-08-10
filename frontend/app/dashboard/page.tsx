'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';
import { useRouter } from 'next/navigation';
import type { Quest, Application } from '../../lib/types';
import PaymentsPayoutsPanel from '../../components/PaymentsPayoutsPanel';
import type { ConnectStatus } from '../../components/StripeConnectButton';
import { jobCategoryFromTags } from '../../lib/jobCategories';
import { jobLocationLabel } from '../../lib/jobLocation';
import {
  isTestJobTitle,
  jobNextStep,
  lastActivityLabel,
  paymentStateView,
  primaryDashboardRole,
  type NextStep,
  type PaymentStateView,
} from '../../lib/dashboard';
import { countActiveQuests, isActiveWorkStatus } from '../../lib/workStatus';
import type { WorkRole } from '../../lib/workStatus';

const XP_PER_LEVEL = 1000;
// Sections list the most relevant rows and link out for the rest.
const SECTION_LIMIT = 5;
const ACTION_LIMIT = 6;

// One job as the dashboard renders it, from whichever side the viewer is on.
// Everything here comes from the quest/application payloads — a field that is
// absent stays absent rather than being filled with a plausible-looking value.
interface DashboardJob {
  key: string;
  questId: string;
  title: string;
  role: WorkRole;
  amount?: number;
  questStatus?: string;
  categoryLabel?: string;
  locationLabel?: string | null;
  applicationCount?: number;
  lastActivity: string | null;
  isTest: boolean;
  nextStep: NextStep;
  payment: PaymentStateView | null;
}

interface DashboardData {
  postedQuests: Quest[];
  applications: Application[];
}

function jobHref(job: DashboardJob): string {
  return `/job/${job.questId}${job.nextStep.hash ?? ''}`;
}

function money(amount?: number): string | null {
  if (amount === undefined || amount === null) return null;
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return null;
  return `$${n.toLocaleString()}`;
}

function buildPostedJob(quest: Quest): DashboardJob {
  const applicationCount = quest._count?.applications ?? 0;
  return {
    key: `posted-${quest.id}`,
    questId: quest.id,
    title: quest.title,
    role: 'poster',
    amount: quest.reward,
    questStatus: quest.status,
    categoryLabel: jobCategoryFromTags(quest.tags).shortLabel,
    locationLabel: jobLocationLabel(quest.description),
    applicationCount,
    lastActivity: lastActivityLabel(quest.updatedAt),
    isTest: isTestJobTitle(quest.title),
    nextStep: jobNextStep({
      role: 'poster',
      questStatus: quest.status,
      paymentStatus: quest.paymentStatus,
      applicationCount,
      viewerHasReviewed: quest.viewerHasReviewed,
    }),
    payment: paymentStateView(quest.paymentStatus, quest.status, 'poster'),
  };
}

function buildWorkerJob(app: Application): DashboardJob {
  const quest = app.quest!;
  return {
    key: `bid-${app.id}`,
    questId: quest.id,
    title: quest.title,
    role: 'worker',
    amount: quest.reward,
    questStatus: quest.status,
    categoryLabel: quest.tags ? jobCategoryFromTags(quest.tags).shortLabel : undefined,
    locationLabel: null,
    lastActivity: lastActivityLabel(quest.updatedAt),
    isTest: isTestJobTitle(quest.title),
    nextStep: jobNextStep({
      role: 'worker',
      applicationStatus: app.status,
      questStatus: quest.status,
      paymentStatus: quest.paymentStatus,
      viewerHasReviewed: quest.viewerHasReviewed,
    }),
    payment: paymentStateView(quest.paymentStatus, quest.status, 'worker'),
  };
}

const TONE_CLASSES: Record<NextStep['tone'], { pill: string; card: string }> = {
  action: { pill: 'bg-amber-500/20 text-amber-300', card: 'border-amber-500/30 bg-amber-500/5' },
  waiting: { pill: 'bg-blue-500/15 text-blue-300', card: 'border-zinc-800 bg-zinc-800/60' },
  done: { pill: 'bg-zinc-700/70 text-zinc-300', card: 'border-zinc-800 bg-zinc-800/60' },
};

function TestJobChip() {
  return (
    <span
      title="This job is marked as a test or admin record."
      className="shrink-0 rounded border border-zinc-600 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-widest text-zinc-400"
    >
      Test job
    </span>
  );
}

// A row in a job section: status, next step, and the money/scope facts that let
// the viewer decide without opening the job.
function JobRow({ job }: { job: DashboardJob }) {
  const amount = money(job.amount);
  // Once a bid is accepted the reward field holds the amount that bid was won
  // at, so calling it a budget after that point would understate the commitment.
  const amountLabel = amount
    ? `${job.questStatus === 'OPEN' ? 'Budget' : 'Agreed'} ${amount}`
    : null;
  const meta = [
    amountLabel,
    job.role === 'poster' && job.applicationCount !== undefined
      ? `${job.applicationCount} bid${job.applicationCount === 1 ? '' : 's'}`
      : null,
    job.categoryLabel,
    job.locationLabel,
    job.lastActivity,
  ].filter(Boolean) as string[];

  return (
    <Link
      href={jobHref(job)}
      className={`group flex flex-col gap-2 rounded-lg border p-3 transition-colors hover:border-amber-500/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 ${
        job.isTest ? 'border-zinc-800 bg-zinc-900/40 opacity-70' : TONE_CLASSES[job.nextStep.tone].card
      } sm:flex-row sm:items-center sm:justify-between`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-zinc-100">{job.title}</p>
          {job.isTest && <TestJobChip />}
        </div>
        <p className="mt-0.5 text-xs text-zinc-400">{job.nextStep.label}</p>
        {meta.length > 0 && (
          <p className="mt-1 truncate text-xs text-zinc-500">{meta.join(' • ')}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {job.payment && (
          <span className={`rounded px-2 py-1 text-xs ${job.payment.tone}`}>{job.payment.label}</span>
        )}
        {job.nextStep.cta && (
          <span
            className={`rounded px-2 py-1 text-xs font-medium ${TONE_CLASSES[job.nextStep.tone].pill}`}
          >
            {job.nextStep.cta} →
          </span>
        )}
      </div>
    </Link>
  );
}

function SectionCard({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: { label: string; href: string };
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-zinc-100">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>}
        </div>
        {action && (
          <Link
            href={action.href}
            className="shrink-0 rounded text-xs text-amber-400 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60"
          >
            {action.label}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function RowSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-14 animate-pulse rounded bg-zinc-800" />
      ))}
    </div>
  );
}

function EmptyState({
  message,
  cta,
}: {
  message: string;
  cta: { label: string; href: string };
}) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-800 px-4 py-5 text-center">
      <p className="text-sm text-zinc-400">{message}</p>
      <Link
        href={cta.href}
        className="mt-2 inline-block rounded text-sm font-medium text-amber-400 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60"
      >
        {cta.label} →
      </Link>
    </div>
  );
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState('');
  const [payoutStatus, setPayoutStatus] = useState<ConnectStatus | null>(null);
  const handlePayoutStatus = useCallback((status: ConnectStatus | null) => {
    setPayoutStatus(status);
  }, []);

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

  const postedQuests = useMemo(() => data?.postedQuests ?? [], [data]);
  const applications = useMemo(() => data?.applications ?? [], [data]);

  const postedJobs = useMemo(() => postedQuests.map(buildPostedJob), [postedQuests]);
  // Won bids become jobs the viewer is working; the rest stay bids. Splitting
  // them keeps a job from being listed twice under two different names.
  const workerJobs = useMemo(
    () =>
      applications
        .filter(app => app.status === 'ACCEPTED' && !!app.quest?.id)
        .map(buildWorkerJob)
        // Live work first; finished jobs stay reachable underneath it.
        .sort((a, b) => {
          const aActive = isActiveWorkStatus(a.questStatus) ? 0 : 1;
          const bActive = isActiveWorkStatus(b.questStatus) ? 0 : 1;
          return aActive - bActive;
        }),
    [applications]
  );
  const openBids = useMemo(
    () => applications.filter(app => app.status !== 'ACCEPTED' && !!app.quest?.id).map(buildWorkerJob),
    [applications]
  );

  // "Action required" is the whole point of the page: every row where the viewer
  // is the blocker, most consequential first.
  const actionJobs = useMemo(
    () =>
      [...postedJobs, ...workerJobs]
        .filter(job => job.nextStep.actionRequired)
        .sort((a, b) => a.nextStep.priority - b.nextStep.priority),
    [postedJobs, workerJobs]
  );

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <p className="text-zinc-400">Loading...</p>
      </div>
    );
  }

  const xpProgress = user.xp % XP_PER_LEVEL;
  const xpPercent = (xpProgress / XP_PER_LEVEL) * 100;
  const activeJobCount = countActiveQuests(postedQuests, applications);
  const reviewsOwed = [...postedJobs, ...workerJobs].filter(
    job => job.nextStep.cta === 'Leave review'
  ).length;
  const pendingBidCount = applications.filter(app => app.status === 'PENDING').length;
  // Payout setup is only worth prompting for on an account that works jobs, and
  // only when Stripe actually answered — a failed status check is not a warning.
  const payoutActionNeeded =
    applications.length > 0 && payoutStatus !== null && !payoutStatus.onboarded;
  const nothingToDo = !dataLoading && actionJobs.length === 0 && !payoutActionNeeded;

  const primaryRole = primaryDashboardRole(postedJobs.length, workerJobs.length);

  const chips = [
    activeJobCount > 0
      ? { label: `${activeJobCount} active job${activeJobCount === 1 ? '' : 's'}`, tone: 'text-green-300 border-green-500/30' }
      : null,
    pendingBidCount > 0
      ? { label: `${pendingBidCount} bid${pendingBidCount === 1 ? '' : 's'} awaiting a decision`, tone: 'text-blue-300 border-blue-500/30' }
      : null,
    reviewsOwed > 0
      ? { label: `${reviewsOwed} review${reviewsOwed === 1 ? '' : 's'} to leave`, tone: 'text-purple-300 border-purple-500/30' }
      : null,
    payoutStatus?.onboarded
      ? { label: 'Payouts ready', tone: 'text-emerald-300 border-emerald-500/30' }
      : null,
  ].filter(Boolean) as { label: string; tone: string }[];

  const postedSection = (
    <SectionCard
      key="posted"
      title="Jobs you posted"
      subtitle="Bids, bookings and completions on the work you need done."
      action={{ label: '+ Post a job', href: '/post-a-job' }}
    >
      {dataLoading ? (
        <RowSkeleton />
      ) : postedJobs.length ? (
        <>
          <div className="space-y-2">
            {postedJobs.slice(0, SECTION_LIMIT).map(job => (
              <JobRow key={job.key} job={job} />
            ))}
          </div>
          {postedJobs.length > SECTION_LIMIT && (
            <p className="mt-3 text-xs text-zinc-500">
              Showing {SECTION_LIMIT} of {postedJobs.length} jobs you posted.
            </p>
          )}
        </>
      ) : (
        <EmptyState
          message="You haven't posted a job yet. Describe the work and local pros can bid on it."
          cta={{ label: 'Post a job', href: '/post-a-job' }}
        />
      )}
    </SectionCard>
  );

  const workingSection = (
    <SectionCard
      key="working"
      title="Jobs you're working"
      subtitle="Work you were hired for, and what each job needs from you next."
      action={{ label: 'Find local work', href: '/jobs' }}
    >
      {dataLoading ? (
        <RowSkeleton />
      ) : workerJobs.length ? (
        <>
          <div className="space-y-2">
            {workerJobs.slice(0, SECTION_LIMIT).map(job => (
              <JobRow key={job.key} job={job} />
            ))}
          </div>
          {workerJobs.length > SECTION_LIMIT && (
            <p className="mt-3 text-xs text-zinc-500">
              Showing {SECTION_LIMIT} of {workerJobs.length} jobs you were hired for.
            </p>
          )}
        </>
      ) : (
        <EmptyState
          message="No jobs booked with you yet. Bids you win show up here with the next step on each one."
          cta={{ label: 'Browse local jobs', href: '/jobs' }}
        />
      )}
    </SectionCard>
  );

  // A bids list is only worth a section once there is something in it; an empty
  // one becomes a single line of guidance instead of a headline block.
  const bidsSection = openBids.length ? (
    <SectionCard
      key="bids"
      title="Bids you submitted"
      subtitle="Bids still waiting on a decision. Won bids move to “Jobs you're working”."
      action={{ label: 'Browse local jobs', href: '/jobs' }}
    >
      <div className="space-y-2">
        {openBids.slice(0, SECTION_LIMIT).map(job => (
          <JobRow key={job.key} job={job} />
        ))}
      </div>
      {openBids.length > SECTION_LIMIT && (
        <p className="mt-3 text-xs text-zinc-500">
          Showing {SECTION_LIMIT} of {openBids.length} bids.
        </p>
      )}
    </SectionCard>
  ) : (
    <p key="bids" className="mb-6 text-sm text-zinc-500">
      No bids submitted yet.{' '}
      <Link href="/jobs" className="text-amber-400 hover:underline">
        Browse local jobs
      </Link>{' '}
      and submit a bid when something matches your skills.
    </p>
  );

  const sections =
    primaryRole === 'poster'
      ? [postedSection, workerJobs.length ? workingSection : null, bidsSection]
      : [workingSection, bidsSection, postedJobs.length ? postedSection : null];

  return (
    <div className="mx-auto min-h-screen max-w-4xl bg-zinc-950 px-4 py-8">
      {/* Header: who you are, what you can start, and the live counts. */}
      <header className="mb-8">
        <p className="text-xs uppercase tracking-widest text-zinc-500">Your dashboard</p>
        <h1 className="mt-1 text-3xl font-bold text-zinc-100">
          Welcome back, <span className="text-amber-400">{user.username}</span>
        </h1>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/post-a-job"
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-zinc-950 transition-colors hover:bg-amber-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
          >
            Post a job
          </Link>
          <Link
            href="/jobs"
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-amber-500/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60"
          >
            Browse local jobs
          </Link>
        </div>
        {chips.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {chips.map(chip => (
              <span
                key={chip.label}
                className={`rounded-full border px-3 py-1 text-xs ${chip.tone}`}
              >
                {chip.label}
              </span>
            ))}
          </div>
        )}
      </header>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* What to do next — the top of the page answers this before anything else. */}
      <section className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-zinc-100">
              {nothingToDo ? "You're caught up" : 'Action required'}
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              {nothingToDo
                ? 'Nothing needs your attention right now.'
                : 'Steps waiting on you, most important first.'}
            </p>
          </div>
          {!nothingToDo && actionJobs.length > 0 && (
            <span className="shrink-0 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs text-amber-300">
              {actionJobs.length} to do
            </span>
          )}
        </div>

        {dataLoading ? (
          <RowSkeleton />
        ) : nothingToDo ? (
          <div className="flex flex-wrap gap-2">
            <Link
              href="/post-a-job"
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-zinc-950 transition-colors hover:bg-amber-400"
            >
              Post a job
            </Link>
            <Link
              href="/jobs"
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-amber-500/40"
            >
              Find local work
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {payoutActionNeeded && (
              <div className="flex flex-col gap-2 rounded-lg border border-violet-500/30 bg-violet-500/5 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-100">
                    {payoutStatus?.hasAccount
                      ? 'Finish your Stripe payout setup'
                      : 'Connect a payout account'}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-400">
                    Required before you can be paid for completed work.
                  </p>
                </div>
                <Link
                  href="#payments-payouts"
                  className="shrink-0 rounded bg-violet-500/20 px-2 py-1 text-xs font-medium text-violet-200"
                >
                  Payments &amp; payouts →
                </Link>
              </div>
            )}
            {actionJobs.slice(0, ACTION_LIMIT).map(job => (
              <JobRow key={`action-${job.key}`} job={job} />
            ))}
            {actionJobs.length > ACTION_LIMIT && (
              <p className="pt-1 text-xs text-zinc-500">
                {actionJobs.length - ACTION_LIMIT} more waiting on you further down the page.
              </p>
            )}
          </div>
        )}
      </section>

      {sections}

      <div id="payments-payouts" className="mb-6 scroll-mt-4">
        <PaymentsPayoutsPanel
          stripeAccountId={user.stripeAccountId || null}
          onStatusChange={handlePayoutStatus}
        />
      </div>

      {/* Reputation is secondary flavour here — it never outranks the work. */}
      <section className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-zinc-300">Reputation &amp; level</h2>
          <span className="text-xs text-zinc-500">
            Level {user.level} • {user.xp.toLocaleString()} points total
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-zinc-800">
          <div
            className="h-1.5 rounded-full bg-amber-400/80 transition-all"
            style={{ width: `${xpPercent}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-zinc-600">
          {XP_PER_LEVEL - xpProgress} points to level {user.level + 1} — earned by completing jobs and
          collecting reviews.
        </p>
      </section>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: 'Browse local jobs', href: '/jobs' },
          { label: 'Post a job', href: '/post-a-job' },
          { label: 'My profile', href: '/profile' },
          { label: 'Messages', href: '/messages' },
        ].map(action => (
          <Link
            key={action.label}
            href={action.href}
            className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-center text-xs text-zinc-400 transition-colors hover:border-amber-500/40 hover:text-zinc-200"
          >
            {action.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

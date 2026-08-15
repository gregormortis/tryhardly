'use client';

import { useState, useEffect, useMemo } from 'react';
import { MapPin, Clock, AlertTriangle, Search, ChevronDown, CalendarClock, Users, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { JOB_CATEGORIES, jobCategoryFromTags } from '@/lib/jobCategories';
import { timingLabel, bidCountLabel } from '@/lib/questCardCopy';
import { parseLocationLine } from '@/lib/jobLocation';
import { DIRECT_PAYMENT_LIMIT, DIRECT_PAYMENT_SHORT } from '@/lib/paymentCopy';

// ─── Types ────────────────────────────────────────────────────────────────────

type PayType = 'flat' | 'hourly';
type SortKey = 'newest' | 'pay_high' | 'pay_low';

interface Quest {
  id: string;
  category: string;
  categoryLabel: string;
  title: string;
  neighborhood: string;
  city: string;
  pay: number;
  payType: PayType;
  posted: number; // minutes ago
  urgent: boolean;
  // Quote-needed jobs carry a conservative placeholder reward; the card shows
  // "Quote needed" instead of that number so it doesn't read as a fixed price.
  quoteNeeded: boolean;
  tools: string[];
  postedBy: string;
  jobsPosted: number;
  isRecurring: boolean;
  // Decision info a worker scans before opening a job.
  bidCount: number;
  deadline: string | null;
  status: string;
}

interface BackendQuest {
  id: string;
  title: string;
  description?: string;
  category: string;
  reward: number | string;
  status: string;
  tags?: string[];
  createdAt: string;
  deadline?: string | null;
  questGiver?: { username?: string } | null;
  isRecurring?: boolean;
  _count?: { applications?: number } | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

// Derived from the shared job-category config so the filter chips, the SEO
// landing pages, and the ids PostQuestForm writes into tags[] can't drift apart.
const CATEGORIES: { id: string; label: string }[] = [
  { id: 'all', label: 'All jobs' },
  ...JOB_CATEGORIES.map((c) => ({ id: c.slug, label: c.shortLabel })),
];

const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: 'newest',   label: 'Newest first'    },
  { id: 'pay_high', label: 'Highest budget'  },
  { id: 'pay_low',  label: 'Lowest budget'   },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(mins: number): string {
  if (mins < 1)    return 'just now';
  if (mins < 60)   return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
}

function payDisplay(pay: number, payType: PayType): string {
  return payType === 'hourly' ? `$${pay}/hr` : `$${pay}`;
}

function minutesSince(iso: string): number {
  const t = new Date(iso).getTime();
  if (isNaN(t)) return 0;
  return Math.max(0, Math.floor((Date.now() - t) / 60000));
}

// Pull payType from tags as a secondary signal (PostQuestForm writes 'flat'|'hourly').
function extractPayTypeFromTags(tags: string[] | undefined): PayType | null {
  if (!tags?.length) return null;
  if (tags.includes('hourly')) return 'hourly';
  if (tags.includes('flat')) return 'flat';
  return null;
}

function mapBackendQuest(q: BackendQuest): Quest {
  const parsed = parseLocationLine(q.description);
  const tagPayType = extractPayTypeFromTags(q.tags);
  const payType: PayType = tagPayType ?? parsed.payType;
  const rewardNum = typeof q.reward === 'string' ? parseFloat(q.reward) : Number(q.reward);
  const jobCategory = jobCategoryFromTags(q.tags);
  return {
    id: q.id,
    category: jobCategory.slug,
    categoryLabel: jobCategory.shortLabel,
    title: q.title,
    neighborhood: parsed.neighborhood,
    city: parsed.city,
    pay: isNaN(rewardNum) ? 0 : rewardNum,
    payType,
    posted: minutesSince(q.createdAt),
    urgent: false,
    quoteNeeded: !!q.tags?.includes('quote-needed'),
    tools: [],
    postedBy: q.questGiver?.username ?? 'Job poster',
    jobsPosted: 0,
    isRecurring: !!q.isRecurring,
    bidCount: q._count?.applications ?? 0,
    deadline: q.deadline ?? null,
    status: q.status,
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function UrgentBadge() {
  return (
    <span className="text-sm font-semibold text-danger bg-danger/10 border border-danger/25 rounded-sm px-2 py-1">
      Urgent
    </span>
  );
}

interface QuestCardProps {
  quest: Quest;
  isNew: boolean;
  isAuthenticated: boolean;
}

function QuestCard({ quest, isNew, isAuthenticated }: QuestCardProps) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);
  const isOpen = quest.status === 'OPEN';

  const locationLabel = quest.neighborhood && quest.city
    ? `${quest.neighborhood} · ${quest.city}`
    : quest.city || quest.neighborhood || 'Location not listed';

  function goToDetail() {
    router.push(`/job/${quest.id}`);
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={goToDetail}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          goToDetail();
        }
      }}
      aria-label={`View job: ${quest.title}`}
      className={clsx(
        'relative flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 rounded-lg border px-4 sm:px-5 py-4 cursor-pointer transition-all duration-200 overflow-hidden',
        hovered ? 'bg-surface border-accent/35' : 'bg-surface border-line',
        isNew && 'animate-[slideIn_0.35s_ease_both]',
      )}
    >
      <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
        <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-md text-lg bg-accent/10 border border-accent/30 text-accent-text">
          <span className="flex items-center justify-center w-full h-full">◈</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 mb-1.5 flex-wrap">
            <span className="font-semibold text-base text-strong break-words line-clamp-2 leading-snug">
              {quest.title}
            </span>
            {quest.urgent && <UrgentBadge />}
            {quest.isRecurring && (
              <span className="text-sm font-semibold border border-accent/40 bg-accent/10 text-accent-text-hover rounded-sm px-2 py-1 whitespace-nowrap">
                Recurring
              </span>
            )}
          </div>

          {/* Row 1: the facts a worker decides on — where, by when, how contested. */}
          <div className="flex items-center gap-x-3 gap-y-1.5 flex-wrap text-sm text-muted">
            <span className="flex items-center gap-1 break-words">
              <MapPin size={11} className="shrink-0" />
              <span className="break-words">{locationLabel}</span>
            </span>
            <span className="flex items-center gap-1">
              <CalendarClock size={11} className="shrink-0" />
              {timingLabel(quest.deadline)}
            </span>
            <span className="flex items-center gap-1">
              <Users size={11} className="shrink-0" />
              {bidCountLabel(quest.bidCount)}
            </span>
          </div>

          {/* Row 2: classification + freshness, deliberately quieter than row 1. */}
          <div className="flex items-center gap-x-2.5 gap-y-1.5 flex-wrap mt-1.5">
            <span className="text-sm text-muted bg-surface border border-line rounded px-2 py-1">
              {quest.categoryLabel}
            </span>
            <span
              className={clsx(
                'text-sm rounded px-2 py-1 border',
                isOpen
                  ? 'text-success bg-success/10 border-success/20'
                  : 'text-subtle bg-surface border-line',
              )}
            >
              {isOpen ? 'Open for bids' : quest.status.replace(/_/g, ' ').toLowerCase()}
            </span>
            <span className="text-sm text-subtle flex items-center gap-1">
              <Clock size={12} className="inline shrink-0" />
              posted {timeAgo(quest.posted)}
            </span>
            {quest.tools.map((t) => (
              <span key={t} className="text-sm text-subtle bg-surface border border-line rounded px-2 py-1">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0 w-full sm:w-auto">
        <div className="text-left sm:text-right">
          {quest.quoteNeeded ? (
            <>
              <div className="font-bold text-base text-accent-text leading-none">Open to bids</div>
              <div className="text-sm text-subtle mt-0.5">
                you set the price
              </div>
            </>
          ) : (
            <>
              <div className="font-bold text-xl text-accent-text leading-none">
                {payDisplay(quest.pay, quest.payType)}
              </div>
              <div className="text-sm text-subtle mt-0.5">
                {quest.payType === 'hourly' ? 'budget per hour' : 'budget, flat'}
              </div>
            </>
          )}
        </div>

        {/* The card itself navigates; this is the explicit, keyboard-reachable
            affordance so the next step is never a guess. */}
        <span
          aria-hidden="true"
          className={clsx(
            'text-sm font-semibold px-4 py-2 rounded border text-center min-w-[112px] transition-all duration-200',
            hovered
              ? 'text-on-accent bg-accent border-accent'
              : 'text-accent-text border-accent/50',
          )}
        >
          {isOpen ? (isAuthenticated ? 'View & bid' : 'View job') : 'View job'}
        </span>
      </div>
    </div>
  );
}

function QuestRowSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-line bg-surface px-5 py-4 animate-pulse">
      <div className="w-10 h-10 rounded-md bg-raised flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-1/2 bg-raised rounded" />
        <div className="h-3 w-1/3 bg-raised rounded" />
      </div>
      <div className="h-10 w-24 bg-raised rounded hidden sm:block" />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const VALID_CATEGORY_IDS = new Set(CATEGORIES.map((c) => c.id));

export interface QuestBoardProps {
  // SEO landing pages deep-link into a pre-filtered board.
  initialCategory?: string;
  initialSearch?: string;
}

export default function QuestBoard({ initialCategory, initialSearch }: QuestBoardProps = {}) {
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const [activeCategory, setActiveCategory] = useState(
    initialCategory && VALID_CATEGORY_IDS.has(initialCategory) ? initialCategory : 'all',
  );
  const [activeSort, setActiveSort]         = useState<SortKey>('newest');
  const [search, setSearch]                 = useState(initialSearch ?? '');
  const [minPay, setMinPay]                 = useState('');
  const [maxPay, setMaxPay]                 = useState('');
  const [recurringOnly, setRecurringOnly]   = useState(false);
  const [newIds]                            = useState<string[]>([]);
  const [quests, setQuests]                 = useState<Quest[]>([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        // Backend GET /quests returns { data: Quest[], meta }. Older shape used
        // { quests: [...] }; handle both defensively.
        const res = await api.get<{ data?: BackendQuest[]; quests?: BackendQuest[] }>(
          '/quests?limit=100&sort=newest',
        );
        const raw = res.data ?? res.quests ?? [];
        if (cancelled) return;
        setQuests(raw.map(mapBackendQuest));
      } catch (e: unknown) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load quests');
        setQuests([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const min = parseFloat(minPay);
    const max = parseFloat(maxPay);
    const hasMin = Number.isFinite(min) && min > 0;
    const hasMax = Number.isFinite(max) && max > 0;
    return quests
      .filter((quest) => {
        if (activeCategory !== 'all' && quest.category !== activeCategory) return false;
        if (recurringOnly && !quest.isRecurring) return false;
        if (hasMin && quest.pay < min) return false;
        if (hasMax && quest.pay > max) return false;
        if (q) {
          const hay = `${quest.title} ${quest.city} ${quest.neighborhood}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (activeSort === 'pay_high') return b.pay - a.pay;
        if (activeSort === 'pay_low')  return a.pay - b.pay;
        return a.posted - b.posted;
      });
  }, [quests, activeCategory, activeSort, search, minPay, maxPay, recurringOnly]);

  return (
    <div className="min-h-screen bg-canvas text-muted">

      <div className="border-b border-line">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-7">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="max-w-xl">
              <span className="eyebrow">Local job board</span>
              <h1 className="mt-3 text-xl font-bold text-strong tracking-tight leading-tight">
                Browse local paid jobs
              </h1>
              <p className="mt-2 text-base text-muted leading-relaxed">
                Real hands-on work posted by neighbors — yard work, hauling, moving help, handyman
                jobs, cleaning, and errands. Open a job to see the details and send the poster a
                bid with your price.
              </p>
            </div>

            <div className="flex flex-col items-start gap-2.5">
              <a
                href="/post-a-job"
                className="btn-primary"
              >
                Post a job free
              </a>
              <a
                href="/work-alerts"
                className="btn-secondary"
              >
                Get worker alerts
              </a>
            </div>
          </div>

          {!loading && (
            <div className="mt-5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-sm text-subtle">
                <span className="text-strong font-semibold">{quests.length.toLocaleString()}</span>{' '}
                {quests.length === 1 ? 'job open for bids' : 'jobs open for bids'} · new in Redding, CA
                and growing outward
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-7">

        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by job title, neighborhood, or city..."
              aria-label="Search jobs by title, neighborhood, or city"
              className="w-full min-h-12 text-base pl-9 pr-3 py-2.5 bg-surface border border-line rounded-md text-body placeholder-subtle focus:outline-none focus:border-accent/40 transition-colors"
            />
          </div>

          <div className="relative">
            <select
              value={activeSort}
              onChange={(e) => setActiveSort(e.target.value as SortKey)}
              className="min-h-12 text-base pl-3 pr-8 py-2.5 bg-surface border border-line rounded-md text-muted cursor-pointer focus:outline-none focus:border-accent/40 appearance-none transition-colors"
            >
              {SORT_OPTIONS.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-subtle pointer-events-none" />
          </div>

          {!loading && (
            <span className="text-sm text-subtle whitespace-nowrap">
              {visible.length} job{visible.length !== 1 ? 's' : ''} shown
            </span>
          )}
        </div>

        {/* The board lists the neighborhood and city each poster entered — it does
            not filter by exact ZIP, so the copy promises only what search does. */}
        <p className="text-sm text-subtle mb-4 leading-relaxed">
          Jobs list the neighborhood and city the poster entered. Search matches the job title,
          neighborhood, and city — there is no exact ZIP-radius filter yet.
        </p>

        <div className="flex items-center gap-2.5 mb-5 flex-wrap">
          <span className="eyebrow">Poster budget</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={minPay}
            onChange={(e) => setMinPay(e.target.value)}
            placeholder="Min $"
            aria-label="Minimum pay"
            className="w-28 min-h-12 text-base px-3 py-2 bg-surface border border-line rounded-md text-body placeholder-subtle focus:outline-none focus:border-accent/40 transition-colors"
          />
          <span className="text-sm text-subtle">to</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={maxPay}
            onChange={(e) => setMaxPay(e.target.value)}
            placeholder="Max $"
            aria-label="Maximum pay"
            className="w-28 min-h-12 text-base px-3 py-2 bg-surface border border-line rounded-md text-body placeholder-subtle focus:outline-none focus:border-accent/40 transition-colors"
          />

          <button
            type="button"
            onClick={() => setRecurringOnly((v) => !v)}
            aria-pressed={recurringOnly}
            className={clsx(
              'min-h-12 text-sm px-3.5 py-2 rounded-full border whitespace-nowrap transition-all duration-150',
              recurringOnly
                ? 'font-semibold text-accent-text border-accent/60 bg-accent/10'
                : 'text-subtle border-line hover:text-accent-text hover:border-accent/40',
            )}
          >
            🔁 Recurring only
          </button>

          <span className="text-sm text-subtle">
            Budget is what the poster listed — you can still bid your own price.
          </span>

          {(minPay || maxPay || recurringOnly || search) && (
            <button
              type="button"
              onClick={() => { setMinPay(''); setMaxPay(''); setRecurringOnly(false); setSearch(''); }}
            className="btn-secondary px-4 py-2 min-h-11"
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="eyebrow mb-2">Type of work</div>
        {/* Horizontally scrolling chip row. The fade on the right edge is the
            only cue that more categories exist off-screen — without it the row
            just looks clipped, and on touch devices the later categories are
            effectively invisible. */}
        <div className="relative mb-6">
          <div className="flex gap-1.5 overflow-x-auto pb-1 pr-8 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={clsx(
                  'min-h-11 text-sm px-3.5 py-1.5 rounded-full border whitespace-nowrap transition-all duration-150',
                  isActive
                    ? 'font-semibold text-accent-text border-accent/60 bg-accent/10'
                    : 'text-subtle border-line hover:text-accent-text hover:border-accent/40',
                )}
              >
                {cat.label}
              </button>
            );
          })}
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-0 top-0 bottom-1 w-10 bg-gradient-to-l from-canvas to-transparent"
          />
        </div>

        <div className="flex flex-col gap-2">
          {loading ? (
            <>
              {[0, 1, 2].map((i) => (
                <QuestRowSkeleton key={i} />
              ))}
            </>
          ) : error ? (
            <div className="text-center py-14 px-6 border border-dashed border-danger/20 rounded-lg bg-danger/[0.03] flex flex-col items-center gap-3">
              <AlertTriangle size={22} className="text-danger" />
              <p className="text-base font-semibold text-danger">We couldn’t load jobs</p>
              <p className="text-sm text-subtle max-w-xs">{error}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="btn-secondary"
              >
                Try again
              </button>
            </div>
          ) : visible.length === 0 ? (
            <div className="text-center py-14 px-6 border border-dashed border-line rounded-lg bg-surface">
              {quests.length === 0 ? (
                <>
                  <p className="text-base font-semibold text-strong">
                    Be the first neighbor to post a local job.
                  </p>
                  <p className="text-base text-muted mt-2 max-w-md mx-auto leading-relaxed">
                    It is free to post, and local workers can bid when your job goes live.
                  </p>
                  <div className="mt-5 flex flex-col sm:flex-row gap-2.5 justify-center">
                    <a
                      href="/post-a-job"
                      className="btn-primary"
                    >
                      Post a job free
                    </a>
                    <a
                      href="/work-alerts"
                      className="btn-secondary"
                    >
                      Get worker alerts
                    </a>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-base font-semibold text-strong">
                    No jobs match these filters
                  </p>
                  <p className="text-base text-muted mt-2 max-w-md mx-auto leading-relaxed">
                    {quests.length === 1
                      ? 'There is 1 other open job on the board.'
                      : `There are ${quests.length} other open jobs on the board.`}{' '}
                    Try a broader type of work, a wider budget range, or a different search term.
                  </p>
                  <div className="mt-5 flex flex-col sm:flex-row gap-2.5 justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        setMinPay('');
                        setMaxPay('');
                        setRecurringOnly(false);
                        setSearch('');
                        setActiveCategory('all');
                      }}
                      className="btn-primary"
                    >
                      Show all jobs
                    </button>
                    <a
                      href="/post-a-job"
                      className="btn-secondary"
                    >
                      Post a job free
                    </a>
                    <a
                      href="/work-alerts"
                      className="btn-secondary"
                    >
                      Get worker alerts
                    </a>
                  </div>
                </>
              )}
            </div>
          ) : (
            visible.map((quest) => (
              <QuestCard
                key={quest.id}
                quest={quest}
                isNew={newIds.includes(quest.id)}
                isAuthenticated={isAuthenticated}
              />
            ))
          )}
        </div>

        {!loading && !error && visible.length > 0 && (
          <div className="mt-6 rounded-lg border border-line bg-surface px-4 py-3.5">
            <div className="flex items-start gap-2.5">
              <ShieldCheck size={15} className="text-success/80 shrink-0 mt-0.5" />
              <p className="text-sm text-muted leading-relaxed">
                {DIRECT_PAYMENT_SHORT} Agree on the amount, method, and timing before work starts.{' '}
                {DIRECT_PAYMENT_LIMIT} Reviews are only written by people who finished a job together.{' '}
                <a href="/how-it-works" className="text-accent-text hover:text-accent-text-hover">
                  How TryHardly works
                </a>
              </p>
            </div>
          </div>
        )}

        {/* The board used to end with its own copyright line and its own four
            links, stacked directly on top of the site footer's copyright line
            and its links. Two footers back to back is the small kind of mess
            that makes a site feel unfinished. Removed — the site footer covers
            all four destinations. */}

      </div>
    </div>
  );
}

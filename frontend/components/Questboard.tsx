'use client';

import { useState, useEffect, useMemo } from 'react';
import { MapPin, Clock, AlertTriangle, Search, ChevronDown, CalendarClock, Users, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { JOB_CATEGORIES, jobCategoryFromTags } from '@/lib/jobCategories';
import { timingLabel, bidCountLabel } from '@/lib/questCardCopy';

// ─── Types ────────────────────────────────────────────────────────────────────

type PayType = 'flat' | 'hourly';
type TierKey = 'novice' | 'apprentice' | 'journeyman' | 'expert' | 'master' | 'legendary';
type SortKey = 'newest' | 'pay_high' | 'pay_low';

interface Quest {
  id: string;
  category: string;
  categoryLabel: string;
  tier: TierKey;
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
  difficulty: string;
  reward: number | string;
  status: string;
  tags?: string[];
  createdAt: string;
  deadline?: string | null;
  questGiver?: { username?: string } | null;
  isRecurring?: boolean;
  _count?: { applications?: number } | null;
}

interface TierConfig {
  label: string;
  classes: string;
  accentColor: string;
  iconBg: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TIERS: Record<TierKey, TierConfig> = {
  novice:     { label: 'NOVICE',     classes: 'text-green-400 bg-green-400/10 border-green-400/20',   accentColor: '#4ade80', iconBg: 'rgba(74,222,128,0.1)'  },
  apprentice: { label: 'APPRENTICE', classes: 'text-blue-400 bg-blue-400/10 border-blue-400/20',      accentColor: '#60a5fa', iconBg: 'rgba(96,165,250,0.1)'  },
  journeyman: { label: 'JOURNEYMAN', classes: 'text-amber-400 bg-amber-400/10 border-amber-400/20',   accentColor: '#f59e0b', iconBg: 'rgba(245,158,11,0.1)'  },
  expert:     { label: 'EXPERT',     classes: 'text-orange-400 bg-orange-400/10 border-orange-400/20',accentColor: '#f97316', iconBg: 'rgba(249,115,22,0.1)'  },
  master:     { label: 'MASTER',     classes: 'text-violet-400 bg-violet-400/10 border-violet-400/20',accentColor: '#a78bfa', iconBg: 'rgba(167,139,250,0.1)' },
  legendary:  { label: 'LEGENDARY',  classes: 'text-rose-400 bg-rose-400/10 border-rose-400/20',      accentColor: '#f43f5e', iconBg: 'rgba(244,63,94,0.1)'   },
};

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

const DIFFICULTY_TO_TIER: Record<string, TierKey> = {
  NOVICE: 'novice',
  APPRENTICE: 'apprentice',
  JOURNEYMAN: 'journeyman',
  EXPERT: 'expert',
  MASTER: 'master',
  LEGENDARY: 'legendary',
};

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

// PostQuestForm prepends "Location: <neighborhood>, <city> · Pay: $<reward> hourly|flat"
// to the description. Starter/remote quests may use "Location: Online / Remote · Pay: ..."
// instead. Parse both shapes so cards never fall back to "Location TBD" when a label exists.
function parseLocationLine(description?: string): {
  neighborhood: string;
  city: string;
  payType: PayType;
  bodyText: string;
} {
  const fallback = { neighborhood: '', city: '', payType: 'flat' as PayType, bodyText: description ?? '' };
  if (!description) return fallback;
  const firstLine = description.split('\n', 1)[0] ?? '';
  const match = firstLine.match(/^Location:\s*(.+?)\s*·\s*Pay:\s*(?:\$[^\s]+\s*)?(?:listed reward\s*)?(\/?\s*hour|hourly|flat)?/i);
  if (!match) return fallback;
  const location = match[1].trim();
  const [neighborhoodPart, ...cityParts] = location.split(',');
  const neighborhood = neighborhoodPart.trim();
  const city = cityParts.join(',').trim();
  const payType: PayType = /hour/i.test(match[2] ?? '') ? 'hourly' : 'flat';
  const body = description.replace(firstLine, '').replace(/^\n+/, '');
  return { neighborhood, city, payType, bodyText: body };
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
  const tier: TierKey = DIFFICULTY_TO_TIER[q.difficulty] ?? 'novice';
  const jobCategory = jobCategoryFromTags(q.tags);
  return {
    id: q.id,
    category: jobCategory.slug,
    categoryLabel: jobCategory.shortLabel,
    tier,
    title: q.title,
    neighborhood: parsed.neighborhood,
    city: parsed.city,
    pay: isNaN(rewardNum) ? 0 : rewardNum,
    payType,
    posted: minutesSince(q.createdAt),
    urgent: false,
    quoteNeeded: !!q.tags?.includes('quote-needed'),
    tools: [],
    postedBy: q.questGiver?.username ?? 'Quest Giver',
    jobsPosted: 0,
    isRecurring: !!q.isRecurring,
    bidCount: q._count?.applications ?? 0,
    deadline: q.deadline ?? null,
    status: q.status,
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TierBadge({ tier }: { tier: TierKey }) {
  const t = TIERS[tier];
  return (
    <span className={clsx('font-mono text-[9px] font-semibold tracking-widest border rounded-sm px-1.5 py-0.5 whitespace-nowrap', t.classes)}>
      {t.label}
    </span>
  );
}

function UrgentBadge() {
  return (
    <span className="font-mono text-[9px] font-semibold tracking-widest text-rose-400 bg-rose-400/10 border border-rose-400/25 rounded-sm px-1.5 py-0.5">
      URGENT
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
  const tier = TIERS[quest.tier];
  const isOpen = quest.status === 'OPEN';

  const locationLabel = quest.neighborhood && quest.city
    ? `${quest.neighborhood} · ${quest.city}`
    : quest.city || quest.neighborhood || 'Location not listed';

  function goToDetail() {
    router.push(`/questboard/${quest.id}`);
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
        hovered ? 'bg-white/[0.04] border-amber-500/35' : 'bg-white/[0.02] border-white/[0.07]',
        isNew && 'animate-[slideIn_0.35s_ease_both]',
      )}
    >
      <div
        className="absolute left-0 rounded-sm transition-opacity duration-200"
        style={{
          top: '20%', bottom: '20%', width: '2px',
          background: tier.accentColor,
          opacity: hovered ? 1 : 0.4,
        }}
      />

      <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
        <div
          className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-md text-lg"
          style={{ background: tier.iconBg, border: `1px solid ${tier.accentColor}28`, color: tier.accentColor }}
        >
          <span className="flex items-center justify-center w-full h-full">◈</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 mb-1.5 flex-wrap">
            <span className="font-semibold text-[15px] text-stone-100 break-words line-clamp-2 leading-snug">
              {quest.title}
            </span>
            {quest.urgent && <UrgentBadge />}
            {quest.isRecurring && (
              <span className="font-mono text-[9px] font-semibold tracking-widest border border-amber-500/40 bg-amber-400/10 text-amber-300 rounded-sm px-1.5 py-0.5 whitespace-nowrap">
                🔁 RECURRING
              </span>
            )}
          </div>

          {/* Row 1: the facts a worker decides on — where, by when, how contested. */}
          <div className="flex items-center gap-x-3 gap-y-1.5 flex-wrap text-[12px] text-stone-400">
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
            <span className="font-mono text-[10px] text-stone-400 bg-white/[0.04] border border-white/[0.08] rounded px-1.5 py-0.5">
              {quest.categoryLabel}
            </span>
            <span
              className={clsx(
                'font-mono text-[10px] rounded px-1.5 py-0.5 border',
                isOpen
                  ? 'text-green-400 bg-green-400/10 border-green-400/20'
                  : 'text-stone-500 bg-white/[0.03] border-white/[0.08]',
              )}
            >
              {isOpen ? 'Open for bids' : quest.status.replace(/_/g, ' ').toLowerCase()}
            </span>
            <TierBadge tier={quest.tier} />
            <span className="font-mono text-[10px] text-stone-600 flex items-center gap-1">
              <Clock size={10} className="inline shrink-0" />
              posted {timeAgo(quest.posted)}
            </span>
            {quest.tools.map((t) => (
              <span key={t} className="font-mono text-[10px] text-stone-600 bg-white/[0.04] border border-white/[0.07] rounded px-1.5 py-0.5">
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
              <div className="font-bold text-base text-amber-400 leading-none">Open to bids</div>
              <div className="font-mono text-[9px] text-stone-600 mt-0.5 tracking-wide">
                you set the price
              </div>
            </>
          ) : (
            <>
              <div className="font-bold text-xl text-amber-400 leading-none">
                {payDisplay(quest.pay, quest.payType)}
              </div>
              <div className="font-mono text-[9px] text-stone-600 mt-0.5 tracking-wide">
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
            'font-mono text-[11px] font-semibold tracking-widest px-4 py-2 rounded border text-center min-w-[112px] transition-all duration-200',
            hovered
              ? 'text-zinc-950 bg-amber-400 border-amber-400'
              : 'text-amber-400 border-amber-500/50',
          )}
        >
          {isOpen ? (isAuthenticated ? 'VIEW & BID' : 'VIEW JOB') : 'VIEW JOB'}
        </span>
      </div>
    </div>
  );
}

function QuestRowSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-white/[0.06] bg-white/[0.02] px-5 py-4 animate-pulse">
      <div className="w-10 h-10 rounded-md bg-white/[0.05] flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-1/2 bg-white/[0.05] rounded" />
        <div className="h-2.5 w-1/3 bg-white/[0.04] rounded" />
      </div>
      <div className="h-7 w-24 bg-white/[0.05] rounded hidden sm:block" />
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
    <div className="min-h-screen bg-zinc-950 text-stone-400">

      <div className="border-b border-white/[0.06]">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-7">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="max-w-xl">
              <span className="font-mono text-[9px] text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-sm px-2 py-0.5 tracking-widest">
                QUEST BOARD
              </span>
              <h1 className="mt-3 text-2xl sm:text-3xl font-bold text-stone-100 tracking-tight leading-tight">
                Browse local paid jobs
              </h1>
              <p className="mt-2 text-[14px] text-stone-400 leading-relaxed">
                Real hands-on work posted by neighbors — yard work, hauling, moving help, handyman
                jobs, cleaning, and errands. Open a job to see the details and send the poster a
                bid with your price.
              </p>
            </div>

            <div className="flex flex-col items-start gap-2.5">
              <a
                href="/post-quest"
                className="font-mono text-[11px] font-semibold tracking-widest px-5 py-2.5 bg-amber-400 text-zinc-950 rounded hover:bg-amber-300 transition-colors"
              >
                POST A JOB FREE
              </a>
              <a
                href="/work-alerts"
                className="font-mono text-[11px] font-semibold tracking-widest px-5 py-2.5 border border-white/12 rounded text-stone-300 hover:border-amber-500/40 hover:text-amber-400 transition-all"
              >
                GET WORKER ALERTS
              </a>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="font-mono text-[11px] text-stone-500">
              <span className="text-stone-100 font-semibold">{quests.length.toLocaleString()}</span>{' '}
              {quests.length === 1 ? 'job open for bids' : 'jobs open for bids'} · new in Redding, CA
              and growing outward
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-7">

        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-600" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by job title, neighborhood, or city..."
              aria-label="Search jobs by title, neighborhood, or city"
              className="w-full font-mono text-[12px] pl-8 pr-3 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-md text-stone-300 placeholder-stone-700 focus:outline-none focus:border-amber-500/40 transition-colors"
            />
          </div>

          <div className="relative">
            <select
              value={activeSort}
              onChange={(e) => setActiveSort(e.target.value as SortKey)}
              className="font-mono text-[11px] pl-3 pr-8 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-md text-stone-400 cursor-pointer focus:outline-none focus:border-amber-500/40 appearance-none transition-colors"
            >
              {SORT_OPTIONS.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-600 pointer-events-none" />
          </div>

          <span className="font-mono text-[11px] text-stone-600 whitespace-nowrap">
            {visible.length} job{visible.length !== 1 ? 's' : ''} shown
          </span>
        </div>

        {/* The board lists the neighborhood and city each poster entered — it does
            not filter by exact ZIP, so the copy promises only what search does. */}
        <p className="font-mono text-[11px] text-stone-600 mb-4 leading-relaxed">
          Jobs list the neighborhood and city the poster entered. Search matches the job title,
          neighborhood, and city — there is no exact ZIP-radius filter yet.
        </p>

        <div className="flex items-center gap-2.5 mb-5 flex-wrap">
          <span className="font-mono text-[10px] text-stone-600 tracking-widest uppercase">
            Poster budget
          </span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={minPay}
            onChange={(e) => setMinPay(e.target.value)}
            placeholder="Min $"
            aria-label="Minimum pay"
            className="w-24 font-mono text-[12px] px-3 py-2 bg-white/[0.03] border border-white/[0.08] rounded-md text-stone-300 placeholder-stone-700 focus:outline-none focus:border-amber-500/40 transition-colors"
          />
          <span className="font-mono text-[11px] text-stone-700">to</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={maxPay}
            onChange={(e) => setMaxPay(e.target.value)}
            placeholder="Max $"
            aria-label="Maximum pay"
            className="w-24 font-mono text-[12px] px-3 py-2 bg-white/[0.03] border border-white/[0.08] rounded-md text-stone-300 placeholder-stone-700 focus:outline-none focus:border-amber-500/40 transition-colors"
          />

          <button
            type="button"
            onClick={() => setRecurringOnly((v) => !v)}
            aria-pressed={recurringOnly}
            className={clsx(
              'font-mono text-[11px] tracking-wide px-3.5 py-2 rounded-full border whitespace-nowrap transition-all duration-150',
              recurringOnly
                ? 'font-semibold text-amber-400 border-amber-500/60 bg-amber-400/10'
                : 'text-stone-600 border-white/[0.08] hover:text-amber-400 hover:border-amber-500/40',
            )}
          >
            🔁 Recurring only
          </button>

          <span className="font-mono text-[10px] text-stone-700">
            Budget is what the poster listed — you can still bid your own price.
          </span>

          {(minPay || maxPay || recurringOnly || search) && (
            <button
              type="button"
              onClick={() => { setMinPay(''); setMaxPay(''); setRecurringOnly(false); setSearch(''); }}
              className="font-mono text-[11px] tracking-wide px-3 py-2 text-stone-600 hover:text-amber-400 transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="font-mono text-[10px] text-stone-600 tracking-widest uppercase mb-2">
          Type of work
        </div>
        <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={clsx(
                  'font-mono text-[11px] tracking-wide px-3.5 py-1.5 rounded-full border whitespace-nowrap transition-all duration-150',
                  isActive
                    ? 'font-semibold text-amber-400 border-amber-500/60 bg-amber-400/10'
                    : 'text-stone-600 border-white/[0.08] hover:text-amber-400 hover:border-amber-500/40',
                )}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2">
          {loading ? (
            <>
              {[0, 1, 2, 3, 4].map((i) => (
                <QuestRowSkeleton key={i} />
              ))}
            </>
          ) : error ? (
            <div className="text-center py-14 px-6 border border-dashed border-rose-400/20 rounded-lg bg-rose-400/[0.03] flex flex-col items-center gap-3">
              <AlertTriangle size={22} className="text-rose-400" />
              <p className="font-mono text-[12px] text-rose-300">Could not load jobs</p>
              <p className="font-mono text-[11px] text-stone-500 max-w-xs">{error}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="font-mono text-[11px] font-semibold tracking-widest px-5 py-2 border border-white/15 rounded-md text-stone-300 hover:border-amber-500/40 hover:text-amber-400 transition-all"
              >
                TRY AGAIN
              </button>
            </div>
          ) : visible.length === 0 ? (
            <div className="text-center py-14 px-6 border border-dashed border-white/[0.08] rounded-lg bg-white/[0.015]">
              {quests.length === 0 ? (
                <>
                  <p className="text-stone-200 font-semibold text-[15px]">
                    No open jobs in this area yet
                  </p>
                  <p className="text-[13px] text-stone-400 mt-2 max-w-md mx-auto leading-relaxed">
                    TryHardly is just getting started in Redding, CA, so the board is still filling
                    up. Post the first local job — it&apos;s free to post — or join worker alerts and
                    we&apos;ll email you when new local work goes live.
                  </p>
                  <div className="mt-5 flex flex-col sm:flex-row gap-2.5 justify-center">
                    <a
                      href="/post-quest"
                      className="font-mono text-[11px] font-semibold tracking-widest px-5 py-2.5 bg-amber-400 text-zinc-950 rounded hover:bg-amber-300 transition-colors"
                    >
                      POST A JOB FREE
                    </a>
                    <a
                      href="/work-alerts"
                      className="font-mono text-[11px] font-semibold tracking-widest px-5 py-2.5 border border-white/12 rounded text-stone-300 hover:border-amber-500/40 hover:text-amber-400 transition-all"
                    >
                      GET WORKER ALERTS
                    </a>
                    <a
                      href="/request-help"
                      className="font-mono text-[11px] font-semibold tracking-widest px-5 py-2.5 border border-white/12 rounded text-stone-300 hover:border-amber-500/40 hover:text-amber-400 transition-all"
                    >
                      REQUEST HELP
                    </a>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-stone-200 font-semibold text-[15px]">
                    No jobs match these filters
                  </p>
                  <p className="text-[13px] text-stone-400 mt-2 max-w-md mx-auto leading-relaxed">
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
                      className="font-mono text-[11px] font-semibold tracking-widest px-5 py-2.5 bg-amber-400 text-zinc-950 rounded hover:bg-amber-300 transition-colors"
                    >
                      SHOW ALL JOBS
                    </button>
                    <a
                      href="/post-quest"
                      className="font-mono text-[11px] font-semibold tracking-widest px-5 py-2.5 border border-white/12 rounded text-stone-300 hover:border-amber-500/40 hover:text-amber-400 transition-all"
                    >
                      POST A JOB FREE
                    </a>
                    <a
                      href="/work-alerts"
                      className="font-mono text-[11px] font-semibold tracking-widest px-5 py-2.5 border border-white/12 rounded text-stone-300 hover:border-amber-500/40 hover:text-amber-400 transition-all"
                    >
                      GET WORKER ALERTS
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
          <div className="mt-6 rounded-lg border border-white/[0.07] bg-white/[0.02] px-4 py-3.5">
            <div className="flex items-start gap-2.5">
              <ShieldCheck size={15} className="text-green-400/80 shrink-0 mt-0.5" />
              <p className="text-[12px] text-stone-400 leading-relaxed">
                Payments are processed through Stripe — the poster confirms the completed work
                before the charge is captured, and worker payouts run through Stripe Connect.
                Reviews are only written by people who finished a job together. Never accept a
                request to pay or be paid off the platform.{' '}
                <a href="/faq" className="text-amber-400 hover:text-amber-300">
                  How TryHardly works
                </a>
              </p>
            </div>
          </div>
        )}

        <div className="mt-12 pt-5 border-t border-white/[0.05] flex flex-wrap gap-3 justify-between items-center">
          <span className="font-mono text-[10px] text-stone-800 tracking-wider">
            © TRYHARDLY.COM · LOCAL WORK · REAL PEOPLE
          </span>
          <div className="flex flex-wrap gap-5">
            {[
              { label: 'Post a job', href: '/post-quest' },
              { label: 'Worker alerts', href: '/work-alerts' },
              { label: 'How it works', href: '/faq' },
              { label: 'Pricing', href: '/pricing' },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="font-mono text-[10px] text-stone-600 hover:text-amber-400 tracking-wide transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

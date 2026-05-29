'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { MapPin, Clock, AlertTriangle, Search, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

// ─── Types ────────────────────────────────────────────────────────────────────

type PayType = 'flat' | 'hourly';
type TierKey = 'novice' | 'apprentice' | 'journeyman' | 'expert' | 'master' | 'legendary';
type SortKey = 'newest' | 'pay_high' | 'pay_low' | 'nearby';

interface Quest {
  id: string;
  category: string;
  tier: TierKey;
  title: string;
  neighborhood: string;
  city: string;
  pay: number;
  payType: PayType;
  posted: number; // minutes ago
  urgent: boolean;
  tools: string[];
  postedBy: string;
  jobsPosted: number;
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
  questGiver?: { username?: string } | null;
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

const CATEGORIES = [
  { id: 'all',      label: 'All Quests'       },
  { id: 'yard',     label: 'Lawn & Yard'      },
  { id: 'hauling',  label: 'Hauling & Junk'   },
  { id: 'moving',   label: 'Moving Help'      },
  { id: 'handyman', label: 'Handyman'         },
  { id: 'cleaning', label: 'Cleaning'        },
  { id: 'painting', label: 'Painting'        },
  { id: 'pressure', label: 'Pressure Washing'},
  { id: 'other',    label: 'Odd Jobs'        },
];

const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: 'newest',   label: 'Newest first'  },
  { id: 'pay_high', label: 'Highest pay'   },
  { id: 'pay_low',  label: 'Lowest pay'    },
  { id: 'nearby',   label: 'Nearest to me' },
];

const DIFFICULTY_TO_TIER: Record<string, TierKey> = {
  NOVICE: 'novice',
  APPRENTICE: 'apprentice',
  JOURNEYMAN: 'journeyman',
  EXPERT: 'expert',
  MASTER: 'master',
  LEGENDARY: 'legendary',
};

// Recognised UI-category tag values that PostQuestForm writes into tags[].
const UI_CATEGORY_IDS = new Set([
  'yard', 'hauling', 'moving', 'handyman', 'cleaning', 'painting', 'pressure', 'other',
]);

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
// to the description. Parse it here so cards can show the same info.
function parseLocationLine(description?: string): {
  neighborhood: string;
  city: string;
  payType: PayType;
  bodyText: string;
} {
  const fallback = { neighborhood: '', city: '', payType: 'flat' as PayType, bodyText: description ?? '' };
  if (!description) return fallback;
  const firstLine = description.split('\n', 1)[0] ?? '';
  const match = firstLine.match(/^Location:\s*([^,]+),\s*([^·]+?)\s*·\s*Pay:\s*\$[^\s]+\s*(\/?\s*hour|hourly|flat)/i);
  if (!match) return fallback;
  const neighborhood = match[1].trim();
  const city = match[2].trim();
  const payType: PayType = /hour/i.test(match[3]) ? 'hourly' : 'flat';
  const body = description.replace(firstLine, '').replace(/^\n+/, '');
  return { neighborhood, city, payType, bodyText: body };
}

// Pull the UI category id (yard/hauling/etc.) out of the tags PostQuestForm wrote.
function extractCategoryFromTags(tags: string[] | undefined): string {
  if (!tags?.length) return 'other';
  const hit = tags.find((t) => UI_CATEGORY_IDS.has(t));
  return hit ?? 'other';
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
  const category = extractCategoryFromTags(q.tags);
  return {
    id: q.id,
    category,
    tier,
    title: q.title,
    neighborhood: parsed.neighborhood,
    city: parsed.city,
    pay: isNaN(rewardNum) ? 0 : rewardNum,
    payType,
    posted: minutesSince(q.createdAt),
    urgent: false,
    tools: [],
    postedBy: q.questGiver?.username ?? 'Quest Giver',
    jobsPosted: 0,
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
  onClaim: (quest: Quest) => void;
  isNew: boolean;
  isAuthenticated: boolean;
}

function QuestCard({ quest, onClaim, isNew, isAuthenticated }: QuestCardProps) {
  const router = useRouter();
  const [hovered, setHovered]   = useState(false);
  const [claimed, setClaimed]   = useState(false);
  const [claiming, setClaiming] = useState(false);
  const tier = TIERS[quest.tier];

  function handleClaim(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    if (claimed || claiming) return;
    if (!isAuthenticated) {
      const redirect = encodeURIComponent(`/questboard/${quest.id}`);
      router.push(`/auth/register?redirect=${redirect}`);
      return;
    }
    setClaiming(true);
    setTimeout(() => {
      setClaiming(false);
      setClaimed(true);
      onClaim(quest);
    }, 900);
  }

  const locationLabel = quest.neighborhood && quest.city
    ? `${quest.neighborhood} · ${quest.city}`
    : quest.city || quest.neighborhood || 'Location TBD';

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
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
            <span className="font-semibold text-[13px] text-stone-100 break-words line-clamp-2 leading-snug">
              {quest.title}
            </span>
            {quest.urgent && <UrgentBadge />}
          </div>
          <div className="flex items-center gap-x-3 gap-y-1.5 flex-wrap">
            <TierBadge tier={quest.tier} />
            <span className="font-mono text-[11px] text-stone-500 flex items-center gap-1 break-words">
              <MapPin size={10} className="inline shrink-0" />
              <span className="break-words">{locationLabel}</span>
            </span>
            <span className="font-mono text-[11px] text-stone-600 flex items-center gap-1">
              <Clock size={10} className="inline shrink-0" />
              {timeAgo(quest.posted)}
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
          <div className="font-bold text-xl text-amber-400 leading-none">
            {payDisplay(quest.pay, quest.payType)}
          </div>
          <div className="font-mono text-[9px] text-stone-600 mt-0.5 tracking-wide">
            {quest.payType === 'hourly' ? 'per hour' : 'flat rate'}
          </div>
        </div>

        <button
          onClick={handleClaim}
          disabled={claimed}
          title={isAuthenticated ? 'Claim this quest' : 'Sign in or create an account to apply'}
          className={clsx(
            'font-mono text-[11px] font-semibold tracking-widest px-4 py-2 rounded border transition-all duration-200 min-w-[108px] text-center',
            claimed
              ? 'text-green-400 border-green-400/40 bg-green-400/[0.08] cursor-default'
              : claiming
                ? 'text-amber-400 border-amber-400/40 bg-amber-400/[0.15] cursor-default'
                : 'text-amber-400 border-amber-500/50 hover:bg-amber-400/10 cursor-pointer',
          )}
        >
          {claimed
            ? '✓ CLAIMED'
            : claiming
              ? 'CLAIMING…'
              : isAuthenticated ? 'CLAIM QUEST' : 'SIGN IN TO APPLY'}
        </button>
      </div>
    </div>
  );
}

function StatPill({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center px-5 py-2.5 border-r border-white/[0.06] last:border-r-0">
      <span className="font-bold text-xl text-amber-400 leading-none">{value}</span>
      <span className="font-mono text-[10px] text-stone-600 mt-0.5 tracking-widest uppercase">{label}</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function QuestBoard() {
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeSort, setActiveSort]         = useState<SortKey>('newest');
  const [search, setSearch]                 = useState('');
  const [claimedIds, setClaimedIds]         = useState<string[]>([]);
  const [newIds]                            = useState<string[]>([]);
  const [liveCount, setLiveCount]           = useState(1809);
  const [quests, setQuests]                 = useState<Quest[]>([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState<string | null>(null);
  const tickRef                             = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    tickRef.current = setInterval(() => {
      setLiveCount((n) => n + Math.floor(Math.random() * 3));
    }, 4000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, []);

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
    return quests
      .filter((quest) => {
        if (activeCategory !== 'all' && quest.category !== activeCategory) return false;
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
  }, [quests, activeCategory, activeSort, search]);

  function handleClaim(quest: Quest) {
    setClaimedIds((ids) => [...ids, quest.id]);
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-stone-400">

      <div className="border-b border-white/[0.06]">
        <div className="max-w-5xl mx-auto px-4 sm:px-8">
          <div className="flex items-center justify-between gap-3 py-4 flex-wrap">
            <div className="flex items-center gap-3">
              <span className="font-bold text-xl text-stone-100 tracking-tight">TryHardly</span>
              <span className="font-mono text-[9px] text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-sm px-2 py-0.5 tracking-widest">
                QUEST BOARD
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="font-mono text-[11px] text-stone-600">
                <span className="text-stone-100 font-semibold">{liveCount.toLocaleString()}</span> quests live
              </span>
            </div>

            <a
              href="/post-quest"
              className="font-mono text-[11px] font-semibold tracking-widest px-5 py-2 bg-amber-400 text-zinc-950 rounded hover:bg-amber-300 transition-colors"
            >
              POST A QUEST
            </a>
          </div>

          <div className="flex flex-wrap items-center border-t border-white/[0.04]">
            <StatPill value="14,280" label="Completed"   />
            <StatPill value="4.91★"  label="Avg rating"  />
            <StatPill value="3,840"  label="Workers" />
            <StatPill value="180+"   label="Cities"      />
            <div className="flex-1" />
            <div className="hidden sm:flex items-center font-mono text-[10px] text-stone-700 tracking-widest py-2">
              THE WORK AI CANNOT DO
            </div>
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
              placeholder="Search quests or city..."
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
            {visible.length} result{visible.length !== 1 ? 's' : ''}
          </span>
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
            <div className="text-center py-16 font-mono text-[13px] text-stone-600">
              Loading quests…
            </div>
          ) : error ? (
            <div className="text-center py-16 font-mono text-[12px] text-rose-400 flex flex-col items-center gap-2">
              <AlertTriangle size={20} />
              <span>Could not load quests: {error}</span>
            </div>
          ) : visible.length === 0 ? (
            <div className="text-center py-16 font-mono text-[13px] text-stone-700">
              {quests.length === 0
                ? 'No quests posted yet. Be the first to post one!'
                : 'No quests match your filters. Try a different category or search term.'}
            </div>
          ) : (
            visible.map((quest) => (
              <QuestCard
                key={quest.id}
                quest={quest}
                onClaim={handleClaim}
                isNew={newIds.includes(quest.id)}
                isAuthenticated={isAuthenticated}
              />
            ))
          )}
        </div>

        {!loading && !error && visible.length > 0 && (
          <div className="text-center mt-7">
            <button className="font-mono text-[11px] font-semibold tracking-widest px-7 py-3 border border-white/10 rounded-md text-stone-600 hover:border-amber-500/40 hover:text-amber-400 transition-all duration-200">
              LOAD MORE QUESTS
            </button>
          </div>
        )}

        <div className="mt-12 pt-5 border-t border-white/[0.05] flex justify-between items-center">
          <span className="font-mono text-[10px] text-stone-800 tracking-wider">
            © TRYHARDLY.COM · LOCAL WORK · REAL PEOPLE
          </span>
          <div className="flex gap-5">
            {['Post a Quest', 'Become an Adventurer', 'How it Works', 'Pricing'].map((link) => (
              <span key={link} className="font-mono text-[10px] text-stone-700 cursor-pointer hover:text-stone-500 tracking-wide transition-colors">
                {link}
              </span>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Zap, Shield, Briefcase, Award, BadgeCheck } from 'lucide-react';
import clsx from 'clsx';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { guildPathLabel } from '@/lib/guildPath';
import ReportButton from '@/components/ReportButton';
import ServicePackageCard from '@/components/ServicePackageCard';
import type {
  PublicCredential,
  CredentialType,
  ProofOfWorkItem,
  VerifiedProStatus,
  ServicePackage,
  WorkerPassport,
} from '@/lib/types';

// ─── Types ────────────────────────────────────────────────────────────────────

type TierKey = 'novice' | 'apprentice' | 'journeyman' | 'expert' | 'master' | 'legendary';

// Official platform status shown for staff accounts. This is an *appointed*
// status (founder/admin), deliberately distinct from the earned tier ladder so
// it can never read as an earned Legendary rank.
type StaffBadge = 'FOUNDER' | 'ADMIN';

interface CompletedJob {
  id: string;
  title: string;
  reward: number;
}

interface Guild {
  id: string;
  name: string;
}

interface Adventurer {
  id: string;
  username: string;
  avatarInitials: string;
  tier: TierKey;
  staffBadge: StaffBadge | null;
  level: number;
  xp: number;
  xpToNextLevel: number;
  reputationScore: number; // 0–100
  bio: string;
  skills: string[];
  favoriteSkills: string[];
  jobsCompleted: number;
  guild: Guild | null;
  memberSince: string;
  verified: boolean;
  codeOfCraftPledgedAt: string | null;
  recentJobs: CompletedJob[];
}

export interface AdventurerProfileProps {
  userId: string;
}

interface ReceivedReview {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  reviewer?: { id: string; username: string };
  quest?: { id: string; title: string };
}

interface UserReviewsResponse {
  reviews: ReceivedReview[];
  averageRating: number | null;
  reviewCount: number;
}

// ─── Skill badges (mirrors backend skillService SkillBadge) ─────────────────────

type SkillTier = 'LOCKED' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'MYTHIC';

interface SkillBadge {
  skillSlug: string;
  skillName: string;
  ratingCount: number;
  averageRating: number;
  tier: SkillTier;
  next: {
    tier: Exclude<SkillTier, 'LOCKED'>;
    ratingsNeeded: number;
    minAverage: number;
    meetsAverage: boolean;
  } | null;
}

interface SkillBadgesResponse {
  badges: SkillBadge[];
}

// ─── Earned achievements (mirrors backend EarnedAchievement) ────────────────────
// Public, recognition-only: only achievements the user has actually earned
// (including admin-awarded), with money/earnings achievements excluded server-side.

interface EarnedAchievement {
  key: string | null;
  name: string;
  description: string;
  icon: string;
  unlockedAt: string;
}

interface EarnedAchievementsResponse {
  achievements: EarnedAchievement[];
  total: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

// Visual treatment per skill-badge tier. LOCKED renders as honest "in progress".
const SKILL_TIER_STYLE: Record<SkillTier, { label: string; classes: string }> = {
  LOCKED:   { label: 'In progress', classes: 'text-stone-500 bg-white/[0.03] border-white/[0.08]' },
  BRONZE:   { label: 'Bronze',      classes: 'text-amber-600 bg-amber-600/10 border-amber-600/25' },
  SILVER:   { label: 'Silver',      classes: 'text-stone-300 bg-stone-300/10 border-stone-300/25' },
  GOLD:     { label: 'Gold',        classes: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/25' },
  PLATINUM: { label: 'Platinum',    classes: 'text-cyan-300 bg-cyan-300/10 border-cyan-300/25' },
  MYTHIC:   { label: 'Mythic',      classes: 'text-fuchsia-400 bg-fuchsia-400/10 border-fuchsia-400/25' },
};

// Avatar/progress accent per experience band. Purely visual: the band names are
// never shown publicly, so a worker's standing reads from real signals (jobs
// completed, ratings, credentials) rather than an RPG rank word.
const TIERS: Record<TierKey, { avatarClasses: string; ringColor: string }> = {
  novice:     { avatarClasses: 'bg-green-400/10 border-green-400/25 text-green-400',    ringColor: '#4ade80' },
  apprentice: { avatarClasses: 'bg-blue-400/10 border-blue-400/25 text-blue-400',       ringColor: '#60a5fa' },
  journeyman: { avatarClasses: 'bg-amber-400/10 border-amber-400/25 text-amber-400',    ringColor: '#f59e0b' },
  expert:     { avatarClasses: 'bg-orange-400/10 border-orange-400/25 text-orange-400', ringColor: '#f97316' },
  master:     { avatarClasses: 'bg-violet-400/10 border-violet-400/25 text-violet-400', ringColor: '#a78bfa' },
  legendary:  { avatarClasses: 'bg-rose-400/10 border-rose-400/25 text-rose-400',       ringColor: '#f43f5e' },
};

// Visual treatment for official staff status. Amber/crown styling reads as an
// appointed platform role, not a position on the earned tier ladder.
const STAFF_BADGE_STYLE: Record<StaffBadge, { label: string; classes: string }> = {
  FOUNDER: { label: 'FOUNDER', classes: 'text-amber-300 bg-amber-300/10 border-amber-300/30' },
  ADMIN:   { label: 'STAFF',   classes: 'text-amber-300 bg-amber-300/10 border-amber-300/30' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function starsDisplay(score: number): string {
  const filled = Math.round(score / 20);
  return '★'.repeat(filled) + '☆'.repeat(5 - filled);
}

function formatMonthYear(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'Profile not found';
}

const CREDENTIAL_TYPE_LABELS: Record<CredentialType, string> = {
  LICENSE: 'License',
  INSURANCE: 'Insurance',
  CERTIFICATION: 'Certification',
  BOND: 'Bond',
  BACKGROUND_CHECK: 'Background check',
  TRADE_MEMBERSHIP: 'Trade membership',
  OTHER: 'Credential',
};

// Build the verified-badge label. When a jurisdiction is present on a license,
// surface it honestly (e.g. "CA license verified"); otherwise keep it generic.
function credentialBadgeLabel(c: PublicCredential): string {
  const base = CREDENTIAL_TYPE_LABELS[c.type] || 'Credential';
  if (c.jurisdiction) {
    return `${c.jurisdiction} ${base.toLowerCase()} verified`;
  }
  return c.type === 'BACKGROUND_CHECK' ? 'Background check verified' : `${base} verified`;
}

// Map a backend role string to an official staff badge, if any. Only appointed
// platform roles qualify; ordinary users (role "USER" / undefined) get none.
function staffBadgeFromRole(role: string | undefined): StaffBadge | null {
  switch ((role ?? '').toUpperCase()) {
    case 'FOUNDER': return 'FOUNDER';
    case 'ADMIN':   return 'ADMIN';
    default:        return null;
  }
}

// Pick the avatar/progress accent band for a level. Visual only — see TIERS.
function tierFromLevel(level: number): TierKey {
  if (level >= 50) return 'legendary';
  if (level >= 30) return 'master';
  if (level >= 20) return 'expert';
  if (level >= 10) return 'journeyman';
  if (level >= 5) return 'apprentice';
  return 'novice';
}

// Shape returned by GET /api/users/:username (see backend userController).
interface ApiUserProfile {
  id: string;
  username: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  level: number;
  xp: number;
  adventurerClass?: string;
  reputationScore?: number;
  totalQuestsCompleted?: number;
  favoriteSkills?: string[];
  role?: string;
  verified?: boolean;
  codeOfCraftPledgedAt?: string | null;
  createdAt?: string;
  guild?: { id: string; name: string; tag?: string } | null;
  questsCompleted?: Array<{ id: string; title: string; difficulty?: string; reward?: number }>;
}

// Map the backend profile payload to the component's view model. Only fields the
// schema actually tracks are carried over: the endpoint returns just the five
// most recent completed jobs, so no lifetime earnings total is derived from them,
// and per-job ratings/dates aren't available at all.
function mapProfile(u: ApiUserProfile): Adventurer {
  const level = u.level ?? 1;
  return {
    id: u.id,
    username: u.displayName || u.username,
    avatarInitials: (u.displayName || u.username || '?').slice(0, 2).toUpperCase(),
    tier: tierFromLevel(level),
    staffBadge: staffBadgeFromRole(u.role),
    level,
    xp: u.xp ?? 0,
    xpToNextLevel: (level + 1) * 100,
    reputationScore: u.reputationScore ?? 0,
    bio: u.bio || '',
    skills: u.adventurerClass ? [guildPathLabel(u.adventurerClass)] : [],
    favoriteSkills: Array.isArray(u.favoriteSkills) ? u.favoriteSkills : [],
    jobsCompleted: u.totalQuestsCompleted ?? 0,
    guild: u.guild ? { id: u.guild.id, name: u.guild.name } : null,
    memberSince: u.createdAt || new Date().toISOString(),
    verified: !!u.verified,
    codeOfCraftPledgedAt: u.codeOfCraftPledgedAt ?? null,
    recentJobs: (u.questsCompleted ?? []).map((q) => ({
      id: q.id,
      title: q.title,
      reward: q.reward ?? 0,
    })),
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function LevelProgress({ level, xp, xpToNext, ringColor }: { level: number; xp: number; xpToNext: number; ringColor: string }) {
  const pct = Math.min(100, Math.round((xp / xpToNext) * 100));
  return (
    <div>
      <div className="flex justify-between font-mono text-[9px] text-stone-700 mb-1.5 tracking-wide">
        <span>Experience level {level}</span>
        <span>{pct}% toward level {level + 1}</span>
      </div>
      <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        {/* dynamic width + glow — inline style required for runtime value */}
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: ringColor, boxShadow: `0 0 8px ${ringColor}80` }}
        />
      </div>
    </div>
  );
}

function StatCard({ value, label, icon }: { value: string; label: string; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1 p-3.5 bg-white/[0.02] border border-white/[0.06] rounded-lg text-center">
      {icon && <div className="text-stone-600 mb-0.5">{icon}</div>}
      <span className="font-bold text-2xl text-amber-400 leading-none">{value}</span>
      <span className="font-mono text-[9px] text-stone-700 tracking-widest uppercase">{label}</span>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[10px] font-semibold tracking-widest text-stone-700 uppercase mb-3 pb-2 border-b border-white/[0.05]">
      {children}
    </p>
  );
}

function JobHistoryCard({ job }: { job: CompletedJob }) {
  return (
    <div className="flex items-center justify-between gap-3 bg-white/[0.02] border border-white/[0.06] rounded-lg p-3.5">
      <p className="font-semibold text-[13px] text-stone-300 leading-snug">{job.title}</p>
      <span className="font-bold text-[15px] text-amber-400 flex-shrink-0">${job.reward}</span>
    </div>
  );
}

function SkeletonBlock({ h = 'h-4', w = 'w-full' }: { h?: string; w?: string }) {
  return <div className={clsx('bg-white/[0.05] rounded animate-pulse', h, w)} />;
}

// A single skill badge. Earned tiers show the tier label + average; LOCKED
// skills show honest progress toward Bronze rather than a badge not yet earned.
function SkillBadgeCard({ badge }: { badge: SkillBadge }) {
  const style = SKILL_TIER_STYLE[badge.tier] ?? SKILL_TIER_STYLE.LOCKED;
  const earned = badge.tier !== 'LOCKED';
  return (
    <div className={clsx('rounded-lg border p-3.5', style.classes)}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="font-semibold text-[13px] text-stone-200 leading-snug">{badge.skillName}</span>
        <span className="font-mono text-[9px] font-semibold tracking-widest uppercase">{style.label}</span>
      </div>
      {earned ? (
        <p className="font-mono text-[10px] text-stone-500">
          {badge.averageRating.toFixed(1)}★ over {badge.ratingCount} rating{badge.ratingCount === 1 ? '' : 's'}
        </p>
      ) : badge.next ? (
        <p className="font-mono text-[10px] text-stone-600">
          {badge.ratingCount} rating{badge.ratingCount === 1 ? '' : 's'} so far ·{' '}
          {badge.next.ratingsNeeded > 0
            ? `${badge.next.ratingsNeeded} more to ${SKILL_TIER_STYLE[badge.next.tier].label}`
            : `needs ${badge.next.minAverage.toFixed(1)}★ avg for ${SKILL_TIER_STYLE[badge.next.tier].label}`}
        </p>
      ) : null}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdventurerProfile({ userId }: AdventurerProfileProps) {
  const { user } = useAuth();
  const [adventurer, setAdventurer] = useState<Adventurer | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [reviewData, setReviewData] = useState<UserReviewsResponse | null>(null);
  const [credentials, setCredentials] = useState<PublicCredential[]>([]);
  const [skillBadges, setSkillBadges] = useState<SkillBadge[]>([]);
  const [achievements, setAchievements] = useState<EarnedAchievement[]>([]);
  const [proof, setProof] = useState<ProofOfWorkItem[]>([]);
  const [verifiedPro, setVerifiedPro] = useState<VerifiedProStatus | null>(null);
  const [servicePackages, setServicePackages] = useState<ServicePackage[]>([]);
  const [passport, setPassport] = useState<WorkerPassport | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    // Safety net: if the primary profile fetch hangs (slow network, stalled
    // request), flip out of the skeleton so the user gets an actionable error
    // and a navigation escape instead of a spinner that never resolves.
    const timeout = setTimeout(() => {
      if (active) {
        setError('This is taking longer than expected. Please check your connection and try again.');
        setLoading(false);
      }
    }, 12000);
    setReviewData(null);
    setCredentials([]);
    setSkillBadges([]);
    setAchievements([]);
    setProof([]);
    setVerifiedPro(null);
    setServicePackages([]);
    setPassport(null);
    // Worker Passport — a real-data trust snapshot, keyed by username. Fetch
    // separately so the profile still renders if it's empty or fails.
    api
      .get<WorkerPassport>(`/users/${encodeURIComponent(userId)}/passport`)
      .then((p) => { if (active) setPassport(p); })
      .catch(() => { if (active) setPassport(null); });
    // Active service packages are keyed by username and returned active-only;
    // fetch separately so the profile still renders if empty or it fails.
    api
      .get<ServicePackage[]>(`/service-packages/user/${encodeURIComponent(userId)}`)
      .then((s) => { if (active) setServicePackages(Array.isArray(s) ? s : []); })
      .catch(() => { if (active) setServicePackages([]); });
    // Verified credentials are keyed by username; fetch separately so the
    // profile still renders if the endpoint is empty or fails.
    api
      .get<PublicCredential[]>(`/users/${encodeURIComponent(userId)}/credentials`)
      .then((c) => { if (active) setCredentials(Array.isArray(c) ? c : []); })
      .catch(() => { if (active) setCredentials([]); });
    // Public proof-of-work gallery is keyed by username and returns only
    // visible items; fetch separately so the profile still renders if empty.
    api
      .get<ProofOfWorkItem[]>(`/users/${encodeURIComponent(userId)}/proof`)
      .then((p) => { if (active) setProof(Array.isArray(p) ? p : []); })
      .catch(() => { if (active) setProof([]); });
    api
      .get<ApiUserProfile>(`/users/${encodeURIComponent(userId)}`)
      .then((u) => {
        if (!active) return;
        setAdventurer(mapProfile(u));
        // Reviews are keyed by user id; fetch separately so the profile still
        // renders if the reviews endpoint is empty or fails.
        api
          .get<UserReviewsResponse>(`/users/${encodeURIComponent(u.id)}/reviews`)
          .then((r) => { if (active) setReviewData(r); })
          .catch(() => { if (active) setReviewData({ reviews: [], averageRating: null, reviewCount: 0 }); });
        // Skill badges are derived server-side from real per-skill ratings;
        // fetch separately so the profile still renders if the endpoint is
        // empty or fails.
        api
          .get<SkillBadgesResponse>(`/users/${encodeURIComponent(u.id)}/skill-badges`)
          .then((b) => { if (active) setSkillBadges(Array.isArray(b?.badges) ? b.badges : []); })
          .catch(() => { if (active) setSkillBadges([]); });
        // Verified Pro is keyed by user id and derived server-side from real
        // signals. Fetch separately; only render the badge when eligible.
        api
          .get<VerifiedProStatus>(`/users/${encodeURIComponent(u.id)}/verified-pro`)
          .then((v) => { if (active) setVerifiedPro(v); })
          .catch(() => { if (active) setVerifiedPro(null); });
        // Earned achievements are public, recognition-only (money achievements
        // excluded server-side). Fetch separately so the profile still renders
        // if the endpoint is empty or fails.
        api
          .get<EarnedAchievementsResponse>(`/gamification/achievements/${encodeURIComponent(u.id)}/earned`)
          .then((a) => { if (active) setAchievements(Array.isArray(a?.achievements) ? a.achievements : []); })
          .catch(() => { if (active) setAchievements([]); });
      })
      .catch((e: unknown) => { if (active) setError(errorMessage(e)); })
      .finally(() => { if (active) { clearTimeout(timeout); setLoading(false); } });
    return () => { active = false; clearTimeout(timeout); };
  }, [userId]);

  return (
    <div className="min-h-screen bg-zinc-950 text-stone-400 py-10 px-6">
      <div className="max-w-2xl mx-auto">

        {/* Loading */}
        {loading && (
          <div className="space-y-4">
            <div className="flex gap-5 items-start">
              <div className="w-20 h-20 rounded-full bg-white/[0.05] animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-2.5 pt-2">
                <SkeletonBlock h="h-6" w="w-2/5" />
                <SkeletonBlock h="h-3.5" w="w-3/5" />
                <SkeletonBlock h="h-2.5" w="w-4/5" />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2.5">
              {[1,2,3,4].map((i) => <SkeletonBlock key={i} h="h-16" />)}
            </div>
            <SkeletonBlock h="h-24" />
            <SkeletonBlock h="h-3.5" w="w-1/3" />
            <div className="space-y-2">
              {[1,2,3].map((i) => <SkeletonBlock key={i} h="h-16" />)}
            </div>
          </div>
        )}

        {/* Error / not-found fallback — always offers a navigation escape so the
            page never dead-ends on a stuck skeleton. */}
        {error && !loading && (
          <div className="text-center pt-20 flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white/[0.05] flex items-center justify-center">
              <Shield size={22} className="text-stone-500" />
            </div>
            <div>
              <p className="text-stone-200 font-semibold text-[15px]">Profile unavailable</p>
              <p className="font-mono text-[12px] text-stone-500 mt-1.5 max-w-xs mx-auto leading-relaxed">
                {error}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="font-mono text-[11px] font-semibold tracking-widest px-5 py-2.5 border border-white/15 rounded-md text-stone-300 hover:border-amber-500/40 hover:text-amber-400 transition-all"
              >
                TRY AGAIN
              </button>
              <Link
                href="/questboard"
                className="font-mono text-[11px] font-semibold tracking-widest px-5 py-2.5 bg-amber-400 text-zinc-950 rounded-md hover:bg-amber-300 transition-colors"
              >
                BROWSE JOBS
              </Link>
            </div>
          </div>
        )}

        {/* Profile */}
        {adventurer && !loading && (() => {
          // Accent styling for the avatar and level bar. Staff accounts get a
          // neutral amber accent so their seeded high level can't read as earned
          // standing.
          const tier = adventurer.staffBadge
            ? { ...TIERS.novice, avatarClasses: 'bg-amber-300/10 border-amber-300/30 text-amber-300', ringColor: '#fcd34d' }
            : (TIERS[adventurer.tier] ?? TIERS.novice);
          return (
            <div className="space-y-7 animate-[fadeIn_0.35s_ease_both]">

              {/* Hero row */}
              <div className="flex gap-6 items-start pb-7 border-b border-white/[0.06]">

                {/* Avatar — border uses dynamic tier color via inline style */}
                <div
                  className={clsx('w-20 h-20 rounded-full flex items-center justify-center flex-shrink-0 border-2 font-bold text-2xl', tier.avatarClasses)}
                  style={{ boxShadow: `0 0 24px ${tier.ringColor}26` }}
                >
                  {adventurer.avatarInitials}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                    <h1 className="font-bold text-[26px] text-stone-100 tracking-tight leading-none">
                      {adventurer.username}
                    </h1>
                    {/* Staff accounts show their appointed platform status; everyone
                        else shows a neutral experience level, so no worker is
                        headlined by a rank name. */}
                    {adventurer.staffBadge ? (
                      <span className={clsx('font-mono text-[9px] font-semibold tracking-widest border rounded-sm px-2 py-0.5', STAFF_BADGE_STYLE[adventurer.staffBadge].classes)}>
                        {STAFF_BADGE_STYLE[adventurer.staffBadge].label}
                      </span>
                    ) : (
                      <span className="font-mono text-[9px] text-stone-500 bg-white/[0.04] border border-white/[0.07] rounded-sm px-2 py-0.5 tracking-widest">
                        LEVEL {adventurer.level}
                      </span>
                    )}
                    {/* Account verification. For staff/admin this is an official
                        platform-account marker (amber, "OFFICIAL ACCOUNT"), styled
                        to match the appointed staff badge so it can't be mistaken
                        for the earned "Verified Pro" credential below. Non-staff
                        accounts keep the generic sky "VERIFIED" treatment. */}
                    {adventurer.verified && (
                      adventurer.staffBadge ? (
                        <span className="flex items-center gap-1 font-mono text-[9px] font-semibold tracking-widest text-amber-300 bg-amber-300/10 border border-amber-300/30 rounded-sm px-2 py-0.5">
                          <Shield size={9} /> OFFICIAL ACCOUNT
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 font-mono text-[9px] font-semibold tracking-widest text-sky-400 bg-sky-400/10 border border-sky-400/25 rounded-sm px-2 py-0.5">
                          <Shield size={9} /> VERIFIED
                        </span>
                      )
                    )}
                    {credentials.map((c) => (
                      <span
                        key={`badge-${c.id}`}
                        className="flex items-center gap-1 font-mono text-[9px] font-semibold tracking-widest text-emerald-400 bg-emerald-400/10 border border-emerald-400/25 rounded-sm px-2 py-0.5 uppercase"
                      >
                        <BadgeCheck size={9} /> {credentialBadgeLabel(c)}
                      </span>
                    ))}
                    {/* Verified Pro — only when the server reports the worker has
                        actually met every checklist item (derived from real
                        signals), never as a purchasable or self-set flag. */}
                    {verifiedPro?.eligible && (
                      <Link
                        href="/verified-pro"
                        className="flex items-center gap-1 font-mono text-[9px] font-semibold tracking-widest text-emerald-300 bg-emerald-300/10 border border-emerald-300/30 rounded-sm px-2 py-0.5 uppercase hover:border-emerald-300/60"
                      >
                        <BadgeCheck size={9} /> Verified Pro
                      </Link>
                    )}
                    {/* Code of Craft — only when the worker has an active pledge
                        (codeOfCraftPledgedAt set). Withdrawn pledges clear it. */}
                    {adventurer.codeOfCraftPledgedAt && (
                      <Link
                        href="/code-of-craft"
                        className="flex items-center gap-1 font-mono text-[9px] font-semibold tracking-widest text-amber-300 bg-amber-300/10 border border-amber-300/30 rounded-sm px-2 py-0.5 uppercase hover:border-amber-300/60"
                      >
                        <Award size={9} /> Code of Craft
                      </Link>
                    )}
                  </div>

                  {/* Staff accounts have an appointed status, not an earned
                      reputation standing. Their seeded rep/level/XP would read as
                      fake 5-star ratings and inflated progress, so we suppress the
                      earned-signal visuals here. */}
                  {!adventurer.staffBadge && (
                    <>
                      <div className="font-mono text-sm text-amber-400 tracking-wide mb-2">
                        {starsDisplay(adventurer.reputationScore)}
                        <span className="text-[11px] text-stone-600 ml-2">{adventurer.reputationScore}/100 reputation</span>
                      </div>

                      <div className="mb-2.5">
                        <LevelProgress
                          level={adventurer.level}
                          xp={adventurer.xp}
                          xpToNext={adventurer.xpToNextLevel}
                          ringColor={tier.ringColor}
                        />
                      </div>
                    </>
                  )}

                  <p className="font-mono text-[10px] text-stone-800">
                    Member since {formatMonthYear(adventurer.memberSince)}
                  </p>

                  {/* Report entry point — hidden only on your own profile.
                      ReportButton offers signed-out visitors a sign-in link. */}
                  {user?.id !== adventurer.id && (
                    <div className="mt-2">
                      <ReportButton targetType="USER" targetId={adventurer.id} label="Report this profile" />
                    </div>
                  )}
                </div>
              </div>

              {/* Worker reputation — completed jobs is an honest tally, so it shows
                  for everyone. Level and reputation score are seeded for staff
                  accounts (inflated, not earned), so we omit them there rather
                  than display standing that wasn't earned. */}
              <div>
                <SectionLabel>Worker reputation</SectionLabel>
                <div className="grid grid-cols-3 gap-2.5">
                  <StatCard value={String(adventurer.jobsCompleted)} label="Jobs completed" icon={<Briefcase size={13} />} />
                  {!adventurer.staffBadge && (
                    <>
                      <StatCard value={String(adventurer.level)}           label="Experience level" icon={<Zap size={13} />} />
                      <StatCard value={String(adventurer.reputationScore)} label="Reputation"       icon={<Shield size={13} />} />
                    </>
                  )}
                </div>
              </div>

              {/* Worker Passport — a real-data proof-of-work / reliability
                  snapshot. Only signals the worker has actually earned are
                  shown (others are flagged unavailable server-side and hidden
                  here) so the section never implies standing that isn't real. */}
              {passport && (() => {
                const shown = passport.stats.filter((s) => s.available);
                // Always worth showing even on a brand-new worker: it carries
                // "member since" plus the (possibly zero) completed-jobs tally.
                return (
                  <div>
                    <SectionLabel>Worker Passport</SectionLabel>
                    <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4 mb-3">
                      <div className="flex items-center gap-2 mb-3">
                        <BadgeCheck size={14} className="text-amber-400" />
                        <span className="font-mono text-[10px] font-semibold tracking-widest text-stone-400 uppercase">
                          Proof of work &amp; reliability signals
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {shown.map((s) => (
                          <div key={s.key} className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
                            <p className="font-bold text-[14px] text-stone-200 leading-tight">{s.value}</p>
                            <p className="font-mono text-[10px] text-stone-600 mt-1 uppercase tracking-wide">{s.label}</p>
                          </div>
                        ))}
                      </div>
                      <p className="font-mono text-[10px] text-stone-600 mt-3">
                        Member since {formatFullDate(passport.memberSince)}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Skill badges — tiered (Bronze → Platinum) and always derived from
                  real per-skill ratings, so they can never be faked. Favorite
                  skills are surfaced first when the worker has curated them. */}
              {skillBadges.length > 0 && (() => {
                const favorites = adventurer.favoriteSkills;
                const ordered = favorites.length
                  ? [...skillBadges].sort((a, b) => {
                      const ai = favorites.indexOf(a.skillSlug);
                      const bi = favorites.indexOf(b.skillSlug);
                      if (ai === -1 && bi === -1) return 0;
                      if (ai === -1) return 1;
                      if (bi === -1) return -1;
                      return ai - bi;
                    })
                  : skillBadges;
                return (
                  <div>
                    <SectionLabel>Skill badges</SectionLabel>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {ordered.map((b) => (
                        <SkillBadgeCard key={b.skillSlug} badge={b} />
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Service packages — repeatable local services the worker has
                  published (active only). Each card's CTA routes into the normal
                  /request-help intake; no payment is taken from a package. */}
              {servicePackages.length > 0 && (
                <div>
                  <SectionLabel>Service packages</SectionLabel>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {servicePackages.map((p) => (
                      <ServicePackageCard key={p.id} pkg={p} showWorker={false} />
                    ))}
                  </div>
                  <p className="font-mono text-[10px] text-stone-700 leading-relaxed mt-3">
                    Requesting a service starts a normal job — you and the worker agree on details and price
                    before any payment. Nothing is charged from a listing.
                  </p>
                </div>
              )}

              {/* Proof of work — worker-curated gallery of past jobs (image URLs
                  only; we store no files). Only items the worker marked visible
                  are returned by the public endpoint. Rendered only when present
                  so absent galleries show nothing rather than a fake empty box. */}
              {proof.length > 0 && (
                <div>
                  <SectionLabel>Proof of work</SectionLabel>
                  <div className="space-y-3">
                    {proof.map((p) => (
                      <div key={p.id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3.5">
                        <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                          <span className="font-semibold text-[13px] text-stone-200 leading-snug">{p.title}</span>
                          {p.quest?.title && (
                            <span className="font-mono text-[9px] text-amber-300 bg-amber-300/10 border border-amber-300/25 rounded-sm px-2 py-0.5">
                              {p.quest.title}
                            </span>
                          )}
                        </div>
                        {p.description && (
                          <p className="font-mono text-[11px] text-stone-500 leading-relaxed mb-2">{p.description}</p>
                        )}
                        {p.imageUrls.length > 0 && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
                            {p.imageUrls.map((url, i) => (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                key={`${p.id}-img-${i}`}
                                src={url}
                                alt={`${p.title} — example ${i + 1}`}
                                loading="lazy"
                                className="w-full h-28 object-cover rounded-md border border-white/[0.06] bg-white/[0.02]"
                              />
                            ))}
                          </div>
                        )}
                        {p.skillTags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {p.skillTags.map((tag) => (
                              <span
                                key={`${p.id}-tag-${tag}`}
                                className="font-mono text-[10px] text-stone-400 bg-white/[0.04] border border-white/[0.08] rounded px-2 py-0.5"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="font-mono text-[10px] text-stone-700 leading-relaxed mt-3">
                    Proof examples are self-published by the worker to illustrate past work. Skill badges above stay
                    derived from real client ratings.
                  </p>
                </div>
              )}

              {/* Achievements — recognition-only badges the worker has actually
                  earned (money/earnings achievements are excluded server-side).
                  Honest empty/in-progress state when none have been earned. */}
              <div>
                <SectionLabel>Achievements</SectionLabel>
                {achievements.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {achievements.map((a) => (
                      <div
                        key={a.key ?? a.name}
                        className="flex items-start gap-3 rounded-lg border border-amber-400/15 bg-amber-400/[0.05] p-3.5"
                      >
                        <span className="text-xl leading-none mt-0.5" aria-hidden>{a.icon}</span>
                        <div className="min-w-0">
                          <p className="font-semibold text-[13px] text-amber-200 leading-snug">{a.name}</p>
                          <p className="font-mono text-[10px] text-stone-500 mt-0.5 leading-relaxed">{a.description}</p>
                          <p className="font-mono text-[9px] text-stone-700 mt-1">
                            Earned {formatFullDate(a.unlockedAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
                    <p className="font-mono text-[11px] text-stone-600 leading-relaxed">
                      No achievements earned yet. Achievements recognize milestones like a first completed job,
                      five-star work, on-time delivery, and skill mastery — they unlock automatically from real
                      activity.
                    </p>
                    <Link
                      href="/questboard"
                      className="mt-2.5 inline-block font-mono text-[10px] text-amber-400 hover:underline"
                    >
                      Browse local jobs →
                    </Link>
                  </div>
                )}
              </div>

              {/* Bio */}
              {adventurer.bio && (
                <div>
                  <SectionLabel>About</SectionLabel>
                  <p className="font-mono text-[13px] text-stone-500 leading-relaxed">{adventurer.bio}</p>
                </div>
              )}

              {/* Skills */}
              {adventurer.skills.length > 0 && (
                <div>
                  <SectionLabel>Skills</SectionLabel>
                  <div className="flex flex-wrap gap-2">
                    {adventurer.skills.map((skill) => (
                      <span key={skill} className="font-mono text-[11px] text-stone-400 bg-white/[0.04] border border-white/[0.08] rounded px-3 py-1.5">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Verified professional credentials */}
              {credentials.length > 0 && (
                <div>
                  <SectionLabel>Verified credentials</SectionLabel>
                  <div className="space-y-2">
                    {credentials.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-start gap-3 p-3.5 bg-emerald-400/[0.05] border border-emerald-400/15 rounded-lg"
                      >
                        <BadgeCheck size={18} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="font-semibold text-[13px] text-emerald-300 leading-snug">
                            {credentialBadgeLabel(c)}
                          </p>
                          <p className="font-mono text-[11px] text-stone-400 mt-0.5">{c.title}</p>
                          <p className="font-mono text-[10px] text-stone-600 mt-0.5">
                            {[c.issuer, c.jurisdiction, c.expirationDate ? `expires ${formatFullDate(c.expirationDate)}` : null]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="font-mono text-[10px] text-stone-700 leading-relaxed mt-3">
                    Verification means TryHardly reviewed the submitted credential details. Users should confirm
                    licensing requirements for their project and location.
                  </p>
                </div>
              )}

              {/* Guild — the endpoint returns the guild identity only, so the panel
                  shows the name rather than a member count it can't know. */}
              {adventurer.guild && (
                <div>
                  <SectionLabel>Guild</SectionLabel>
                  <div className="flex items-center gap-3.5 p-4 bg-violet-400/[0.05] border border-violet-400/15 rounded-lg">
                    <div className="w-9 h-9 rounded-md bg-violet-400/10 border border-violet-400/25 flex items-center justify-center text-violet-400 flex-shrink-0">
                      ⚜
                    </div>
                    <div>
                      <p className="font-bold text-[14px] text-violet-300">{adventurer.guild.name}</p>
                      <p className="font-mono text-[10px] text-violet-600 mt-0.5">Member</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Recent completed jobs */}
              {adventurer.recentJobs.length > 0 && (
                <div>
                  <SectionLabel>Recent completed jobs</SectionLabel>
                  <div className="space-y-2">
                    {adventurer.recentJobs.map((j) => (
                      <JobHistoryCard key={j.id} job={j} />
                    ))}
                  </div>
                </div>
              )}

              {/* Reviews received from real completed-job counterparties */}
              {reviewData && reviewData.reviewCount > 0 && (
                <div>
                  <SectionLabel>
                    Reviews ({reviewData.reviewCount})
                    {reviewData.averageRating != null && (
                      <span className="text-amber-400 ml-2 normal-case tracking-normal">
                        {reviewData.averageRating.toFixed(1)} ★
                      </span>
                    )}
                  </SectionLabel>
                  <div className="space-y-2">
                    {reviewData.reviews.map((rev) => {
                      const stars = Math.min(5, Math.max(1, rev.rating));
                      return (
                        <div key={rev.id} className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3.5">
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="font-mono text-[11px] text-stone-400">
                              {rev.reviewer?.username || 'Someone'}
                            </span>
                            <span className="font-mono text-[11px] text-amber-400">
                              {'★'.repeat(stars)}{'☆'.repeat(5 - stars)}
                            </span>
                          </div>
                          <p className="font-mono text-[12px] text-stone-500 leading-relaxed whitespace-pre-line">{rev.comment}</p>
                          {rev.quest?.title && (
                            <p className="font-mono text-[10px] text-stone-700 mt-1.5">on “{rev.quest.title}”</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          );
        })()}
      </div>
    </div>
  );
}

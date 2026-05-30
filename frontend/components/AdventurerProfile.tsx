'use client';

import { useEffect, useState } from 'react';
import { Zap, Shield, Sword, Award, MapPin } from 'lucide-react';
import clsx from 'clsx';
import { api } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

type TierKey = 'novice' | 'apprentice' | 'journeyman' | 'expert' | 'master' | 'legendary';

interface CompletedQuest {
  id: string;
  title: string;
  category: string;
  city: string;
  reward: number;
  xpEarned: number;
  completedAt: string;
  rating: number; // 1–5
}

interface Guild {
  id: string;
  name: string;
  rank: string;
  memberCount: number;
}

interface Adventurer {
  id: string;
  username: string;
  avatarInitials: string;
  tier: TierKey;
  level: number;
  xp: number;
  xpToNextLevel: number;
  reputationScore: number; // 0–100
  bio: string;
  skills: string[];
  questsCompleted: number;
  totalGoldEarned: number;
  guild: Guild | null;
  memberSince: string;
  verified: boolean;
  recentQuests: CompletedQuest[];
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

// ─── Constants ────────────────────────────────────────────────────────────────

const TIERS: Record<TierKey, { label: string; classes: string; avatarClasses: string; ringColor: string }> = {
  novice:     { label: 'NOVICE',     classes: 'text-green-400 bg-green-400/10 border-green-400/20',    avatarClasses: 'bg-green-400/10 border-green-400/25 text-green-400',    ringColor: '#4ade80' },
  apprentice: { label: 'APPRENTICE', classes: 'text-blue-400 bg-blue-400/10 border-blue-400/20',       avatarClasses: 'bg-blue-400/10 border-blue-400/25 text-blue-400',       ringColor: '#60a5fa' },
  journeyman: { label: 'JOURNEYMAN', classes: 'text-amber-400 bg-amber-400/10 border-amber-400/20',    avatarClasses: 'bg-amber-400/10 border-amber-400/25 text-amber-400',    ringColor: '#f59e0b' },
  expert:     { label: 'EXPERT',     classes: 'text-orange-400 bg-orange-400/10 border-orange-400/20', avatarClasses: 'bg-orange-400/10 border-orange-400/25 text-orange-400', ringColor: '#f97316' },
  master:     { label: 'MASTER',     classes: 'text-violet-400 bg-violet-400/10 border-violet-400/20', avatarClasses: 'bg-violet-400/10 border-violet-400/25 text-violet-400', ringColor: '#a78bfa' },
  legendary:  { label: 'LEGENDARY',  classes: 'text-rose-400 bg-rose-400/10 border-rose-400/20',       avatarClasses: 'bg-rose-400/10 border-rose-400/25 text-rose-400',       ringColor: '#f43f5e' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function starsDisplay(score: number): string {
  const filled = Math.round(score / 20);
  return '★'.repeat(filled) + '☆'.repeat(5 - filled);
}

function formatGold(n: number): string {
  return n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n}`;
}

function formatMonthYear(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'Adventurer not found';
}

// Derive a display tier from the user's level. Mirrors the QuestDifficulty
// ladder so the badge feels consistent across the app.
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
  verified?: boolean;
  createdAt?: string;
  guild?: { id: string; name: string; tag?: string } | null;
  questsCompleted?: Array<{ id: string; title: string; difficulty?: string; reward?: number }>;
}

// Map the backend profile payload to the component's view model. Fields the
// schema does not track (per-quest city/rating, gold earned) degrade to honest
// defaults rather than inventing data.
function mapProfile(u: ApiUserProfile): Adventurer {
  const level = u.level ?? 1;
  return {
    id: u.id,
    username: u.displayName || u.username,
    avatarInitials: (u.displayName || u.username || '?').slice(0, 2).toUpperCase(),
    tier: tierFromLevel(level),
    level,
    xp: u.xp ?? 0,
    xpToNextLevel: (level + 1) * 100,
    reputationScore: u.reputationScore ?? 0,
    bio: u.bio || '',
    skills: u.adventurerClass ? [u.adventurerClass] : [],
    questsCompleted: u.totalQuestsCompleted ?? 0,
    totalGoldEarned: (u.questsCompleted ?? []).reduce((sum, q) => sum + (q.reward ?? 0), 0),
    guild: u.guild
      ? { id: u.guild.id, name: u.guild.name, rank: 'Member', memberCount: 0 }
      : null,
    memberSince: u.createdAt || new Date().toISOString(),
    verified: !!u.verified,
    recentQuests: (u.questsCompleted ?? []).map((q) => ({
      id: q.id,
      title: q.title,
      category: '',
      city: '',
      reward: q.reward ?? 0,
      xpEarned: 0,
      completedAt: u.createdAt || new Date().toISOString(),
      rating: Math.min(5, Math.max(1, Math.round((u.reputationScore ?? 0) / 20) || 1)),
    })),
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function XPBar({ xp, xpToNext, ringColor }: { xp: number; xpToNext: number; ringColor: string }) {
  const pct = Math.min(100, Math.round((xp / xpToNext) * 100));
  return (
    <div>
      <div className="flex justify-between font-mono text-[9px] text-stone-700 mb-1.5 tracking-wide">
        <span>{xp.toLocaleString()} XP</span>
        <span>{xpToNext.toLocaleString()} XP to next level</span>
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

function QuestHistoryCard({ quest }: { quest: CompletedQuest }) {
  const stars = Math.min(5, Math.max(1, quest.rating));
  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3.5">
      <p className="font-semibold text-[13px] text-stone-300 leading-snug mb-2.5">{quest.title}</p>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="font-bold text-[15px] text-amber-400">${quest.reward}</span>
          <span className="font-mono text-[10px] text-green-400">
            <Zap size={9} className="inline mr-0.5" />+{quest.xpEarned} XP
          </span>
          <span className="font-mono text-[10px] text-stone-600 flex items-center gap-0.5">
            <MapPin size={9} />{quest.city}
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-[10px] text-amber-400">
            {'★'.repeat(stars)}{'☆'.repeat(5 - stars)}
          </span>
          <span className="font-mono text-[10px] text-stone-700">{formatFullDate(quest.completedAt)}</span>
        </div>
      </div>
    </div>
  );
}

function SkeletonBlock({ h = 'h-4', w = 'w-full' }: { h?: string; w?: string }) {
  return <div className={clsx('bg-white/[0.05] rounded animate-pulse', h, w)} />;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdventurerProfile({ userId }: AdventurerProfileProps) {
  const [adventurer, setAdventurer] = useState<Adventurer | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [reviewData, setReviewData] = useState<UserReviewsResponse | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setReviewData(null);
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
      })
      .catch((e: unknown) => { if (active) setError(errorMessage(e)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
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

        {/* Error */}
        {error && !loading && (
          <div className="text-center pt-20 font-mono text-[13px] text-rose-400">{error}</div>
        )}

        {/* Profile */}
        {adventurer && !loading && (() => {
          const tier = TIERS[adventurer.tier] ?? TIERS.novice;
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
                    <span className={clsx('font-mono text-[9px] font-semibold tracking-widest border rounded-sm px-2 py-0.5', tier.classes)}>
                      {tier.label}
                    </span>
                    <span className="font-mono text-[9px] text-stone-700 bg-white/[0.04] border border-white/[0.07] rounded-sm px-2 py-0.5">
                      LVL {adventurer.level}
                    </span>
                    {adventurer.verified && (
                      <span className="flex items-center gap-1 font-mono text-[9px] font-semibold tracking-widest text-sky-400 bg-sky-400/10 border border-sky-400/25 rounded-sm px-2 py-0.5">
                        <Shield size={9} /> VERIFIED
                      </span>
                    )}
                  </div>

                  <div className="font-mono text-sm text-amber-400 tracking-wide mb-2">
                    {starsDisplay(adventurer.reputationScore)}
                    <span className="text-[11px] text-stone-600 ml-2">{adventurer.reputationScore}/100 rep</span>
                  </div>

                  <div className="mb-2.5">
                    <XPBar xp={adventurer.xp} xpToNext={adventurer.xpToNextLevel} ringColor={tier.ringColor} />
                  </div>

                  <p className="font-mono text-[10px] text-stone-800">
                    Adventurer since {formatMonthYear(adventurer.memberSince)}
                  </p>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-4 gap-2.5">
                <StatCard value={String(adventurer.questsCompleted)} label="Quests done"  icon={<Sword size={13} />}  />
                <StatCard value={formatGold(adventurer.totalGoldEarned)} label="Gold earned" icon={<Award size={13} />} />
                <StatCard value={String(adventurer.level)}             label="Level"       icon={<Zap size={13} />}   />
                <StatCard value={String(adventurer.reputationScore)}   label="Rep score"   icon={<Shield size={13} />}/>
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

              {/* Guild */}
              {adventurer.guild && (
                <div>
                  <SectionLabel>Guild</SectionLabel>
                  <div className="flex items-center gap-3.5 p-4 bg-violet-400/[0.05] border border-violet-400/15 rounded-lg">
                    <div className="w-9 h-9 rounded-md bg-violet-400/10 border border-violet-400/25 flex items-center justify-center text-violet-400 flex-shrink-0">
                      ⚜
                    </div>
                    <div>
                      <p className="font-bold text-[14px] text-violet-300 mb-0.5">{adventurer.guild.name}</p>
                      <p className="font-mono text-[10px] text-violet-600">
                        {adventurer.guild.rank} · {adventurer.guild.memberCount} members
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Recent quests */}
              {adventurer.recentQuests.length > 0 && (
                <div>
                  <SectionLabel>Recent completed quests</SectionLabel>
                  <div className="space-y-2">
                    {adventurer.recentQuests.map((q) => (
                      <QuestHistoryCard key={q.id} quest={q} />
                    ))}
                  </div>
                </div>
              )}

              {/* Reviews received from real completed-quest counterparties */}
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

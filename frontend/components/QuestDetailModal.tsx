'use client';

import { useEffect, useState, useCallback } from 'react';
import { X, MapPin, Clock, Users, Zap, Star, Wrench, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import EscrowPanel from './EscrowPanel';

// ─── Types ────────────────────────────────────────────────────────────────────

type TierKey = 'novice' | 'apprentice' | 'journeyman' | 'expert' | 'master' | 'legendary';

interface QuestGiver {
  id: string;
  username: string;
  reputationScore: number;
  questsPosted: number;
  avatarInitials: string;
}

interface Quest {
  id: string;
  title: string;
  category: string;
  tier: TierKey;
  city: string;
  neighborhood: string;
  pay: number;
  payType: 'flat' | 'hourly';
  description: string;
  xpReward: number;
  applicantCount: number;
  deadline: string;
  tools: string[];
  postedBy: QuestGiver;
  status: 'open' | 'claimed' | 'completed';
  createdAt: string;
    escrowStatus?: string;
}

export interface QuestDetailModalProps {
  questId: string | null;
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TIERS: Record<TierKey, { label: string; classes: string }> = {
  novice:     { label: 'NOVICE',     classes: 'text-green-400 bg-green-400/10 border-green-400/20'    },
  apprentice: { label: 'APPRENTICE', classes: 'text-blue-400 bg-blue-400/10 border-blue-400/20'       },
  journeyman: { label: 'JOURNEYMAN', classes: 'text-amber-400 bg-amber-400/10 border-amber-400/20'    },
  expert:     { label: 'EXPERT',     classes: 'text-orange-400 bg-orange-400/10 border-orange-400/20' },
  master:     { label: 'MASTER',     classes: 'text-violet-400 bg-violet-400/10 border-violet-400/20' },
  legendary:  { label: 'LEGENDARY',  classes: 'text-rose-400 bg-rose-400/10 border-rose-400/20'       },
};

const CATEGORY_LABELS: Record<string, string> = {
  yard:     'Lawn & Yard',     hauling: 'Hauling & Junk',
  moving:   'Moving Help',     handyman: 'Handyman',
  cleaning: 'Cleaning',        painting: 'Painting',
  pressure: 'Pressure Washing',other:   'Odd Jobs',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDeadline(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function daysUntil(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Badge({ label, classes }: { label: string; classes: string }) {
  return (
    <span className={clsx('font-mono text-[9px] font-semibold tracking-widest border rounded-sm px-2 py-0.5 whitespace-nowrap', classes)}>
      {label}
    </span>
  );
}

function StatBlock({ value, label, warn = false }: { value: string; label: string; warn?: boolean }) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3 bg-white/[0.02] border border-white/[0.06] rounded-lg flex-1">
      <span className={clsx('font-bold text-xl leading-none', warn ? 'text-rose-400' : 'text-amber-400')}>
        {value}
      </span>
      <span className="font-mono text-[10px] text-stone-600 tracking-widest uppercase">{label}</span>
    </div>
  );
}

function SkeletonLine({ wide = false }: { wide?: boolean }) {
  return (
    <div className={clsx('h-3.5 bg-white/[0.05] rounded animate-pulse', wide ? 'w-full' : 'w-3/5')} />
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function QuestDetailModal({
  questId,
  isOpen,
  onClose,
  currentUserId = null,
}: QuestDetailModalProps) {
  const [quest,    setQuest]    = useState<Quest | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimed,  setClaimed]  = useState(false);
  const [visible,  setVisible]  = useState(false);

  // Animate in/out + body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
      const t = setTimeout(() => {
        document.body.style.overflow = '';
        setQuest(null);
        setError(null);
        setClaimed(false);
      }, 280);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Fetch quest data
  useEffect(() => {
    if (!questId || !isOpen) return;
    setLoading(true);
    setError(null);
    fetch(`/api/quests/${questId}`)
      .then((r) => { if (!r.ok) throw new Error('Quest not found'); return r.json() as Promise<Quest>; })
      .then(setQuest)
      .catch((e: unknown) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, [questId, isOpen]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  function handleClaim() {
    if (!currentUserId) {
      window.location.href = `/login?redirect=/quests/${questId}`;
      return;
    }
    setClaiming(true);
    fetch(`/api/quests/${questId}/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUserId }),
    })
      .then((r) => { if (!r.ok) throw new Error('Claim failed'); return r.json(); })
      .then(() => setClaimed(true))
      .catch((e: unknown) => setError(errorMessage(e)))
      .finally(() => setClaiming(false));
  }

  if (!isOpen) return null;

  const tier = quest ? (TIERS[quest.tier] ?? TIERS.novice) : null;
  const days = quest ? daysUntil(quest.deadline) : 0;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={clsx(
          'fixed inset-0 z-[900] bg-black/75 backdrop-blur-sm transition-opacity duration-300',
          visible ? 'opacity-100' : 'opacity-0',
        )}
      />

      {/* Drawer */}
      <div className="fixed inset-0 z-[901] flex items-end justify-center pointer-events-none">
        <div
          className={clsx(
            'pointer-events-auto w-full max-w-2xl max-h-[92vh] bg-zinc-950 border border-white/[0.08] border-b-0 rounded-t-2xl flex flex-col transition-all duration-300',
            visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0',
          )}
        >
          {/* Handle */}
          <div className="w-9 h-1 bg-white/10 rounded-full mx-auto mt-3 flex-shrink-0" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center bg-white/[0.05] border border-white/10 rounded-md text-stone-500 hover:text-stone-300 transition-colors"
          >
            <X size={15} />
          </button>

          {/* Scrollable body */}
          <div className="overflow-y-auto flex-1 px-8 pt-6 pb-8">

            {/* Loading */}
            {loading && (
              <div className="flex flex-col gap-3.5 pt-2">
                <div className="h-7 w-3/5 bg-white/[0.05] rounded animate-pulse" />
                <div className="flex gap-2">
                  <div className="h-5 w-20 bg-white/[0.05] rounded animate-pulse" />
                  <div className="h-5 w-24 bg-white/[0.05] rounded animate-pulse" />
                </div>
                <SkeletonLine />
                <div className="flex gap-2.5 mt-2">
                  {[1,2,3,4].map((i) => <div key={i} className="h-14 flex-1 bg-white/[0.05] rounded-lg animate-pulse" />)}
                </div>
                <div className="h-28 w-full bg-white/[0.05] rounded-lg animate-pulse mt-1" />
              </div>
            )}

            {/* Error */}
            {error && !loading && (
              <div className="text-center pt-12 font-mono text-[13px] text-rose-400">{error}</div>
            )}

            {/* Content */}
            {quest && !loading && (
              <div className="animate-[fadeSlideUp_0.3s_ease_both]">

                {/* Title + badges */}
                <div className="mb-4 pr-10">
                  <h2 className="font-bold text-2xl text-stone-100 leading-snug mb-2.5">{quest.title}</h2>
                  <div className="flex items-center gap-2 flex-wrap">
                    {tier && <Badge label={tier.label} classes={tier.classes} />}
                    <Badge
                      label={CATEGORY_LABELS[quest.category] ?? quest.category}
                      classes="text-stone-400 bg-white/[0.06] border-white/10"
                    />
                    {quest.status === 'open' && (
                      <Badge label="OPEN" classes="text-green-400 bg-green-400/[0.08] border-green-400/20" />
                    )}
                    <span className="font-mono text-[11px] text-stone-600 flex items-center gap-1">
                      <MapPin size={10} /> {quest.neighborhood}, {quest.city}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex gap-2.5 mb-5 flex-wrap">
                  <StatBlock value={quest.payType === 'hourly' ? `$${quest.pay}/hr` : `$${quest.pay}`} label={quest.payType === 'hourly' ? 'Per hour' : 'Flat rate'} />
                  <StatBlock value={`${quest.xpReward} XP`} label="XP reward" />
                  <StatBlock value={String(quest.applicantCount)} label="Applicants" />
                  <StatBlock value={`${days}d`} label={days <= 3 ? '⚠ Days left' : 'Days left'} warn={days <= 3} />
                </div>

                {/* Deadline */}
                <p className={clsx('font-mono text-[11px] mb-5', days <= 3 ? 'text-rose-400' : 'text-stone-600')}>
                  <Clock size={10} className="inline mr-1" />
                  Deadline: {formatDeadline(quest.deadline)}
                  {days <= 3 && ' — Closing soon'}
                </p>

                {/* Description */}
                <div className="mb-6">
                  <p className="font-mono text-[10px] font-semibold tracking-widest text-stone-700 uppercase mb-2">
                    Quest Description
                  </p>
                  <p className="font-mono text-[13px] text-stone-500 leading-relaxed whitespace-pre-wrap">
                    {quest.description}
                  </p>
                </div>

                {/* Tools */}
                {quest.tools.length > 0 && (
                  <div className="mb-6">
                    <p className="font-mono text-[10px] font-semibold tracking-widest text-stone-700 uppercase mb-2 flex items-center gap-1">
                      <Wrench size={10} /> Tools / Requirements
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {quest.tools.map((t) => (
                        <span key={t} className="font-mono text-[11px] text-stone-500 bg-white/[0.04] border border-white/[0.08] rounded px-2.5 py-1">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quest giver */}
                <div className="flex items-center gap-3.5 p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl mb-7">
                  <div className="w-11 h-11 rounded-full bg-amber-400/10 border border-amber-400/25 flex items-center justify-content-center flex-shrink-0">
                    <span className="flex items-center justify-center w-full h-full font-bold text-sm text-amber-400">
                      {quest.postedBy.avatarInitials}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-[14px] text-stone-100 mb-0.5">{quest.postedBy.username}</p>
                    <p className="font-mono text-[11px] text-stone-600">
                      <Star size={10} className="inline mr-0.5" />
                      {quest.postedBy.reputationScore}/100 rep · {quest.postedBy.questsPosted} quests posted
                    </p>
                  </div>
                  <span className="font-mono text-[10px] text-stone-700">Quest Giver</span>
                </div>

                {/* CTA */}
                {claimed ? (
                  <div className="w-full p-4 bg-green-400/[0.08] border border-green-400/30 rounded-lg text-center font-mono text-[13px] font-semibold text-green-400 tracking-wider">
                    ✓ QUEST CLAIMED — CHECK YOUR DASHBOARD
                  </div>
                ) : (
                  <button
                    onClick={handleClaim}
                    disabled={claiming}
                    className={clsx(
                      'w-full py-4 rounded-lg font-mono text-[13px] font-semibold tracking-widest transition-all duration-200 flex items-center justify-center gap-2',
                      claiming
                        ? 'bg-amber-400/15 text-amber-400 border border-amber-400/40 cursor-default'
                        : 'bg-amber-400 text-zinc-950 hover:bg-amber-300 cursor-pointer',
                    )}
                  >
                    {claiming ? 'CLAIMING…' : currentUserId ? (
                      <><span>CLAIM THIS QUEST</span><ChevronRight size={14} /></>
                    ) : 'LOG IN TO CLAIM'}
                  </button>
                )}

                {!currentUserId && (
                  <p className="font-mono text-[10px] text-stone-700 text-center mt-2.5">
                    You&apos;ll be redirected to log in, then returned here.
                  </p>
                )}

                {/* Escrow Panel */}
                <EscrowPanel
                  questId={quest.id}
                  isQuestGiver={currentUserId === quest.postedBy.id}
                  questStatus={quest.status}
                  escrowStatus={quest.escrowStatus}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, CheckCircle, Zap } from 'lucide-react';
import clsx from 'clsx';
import { api } from '../lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

type PayType = 'flat' | 'hourly';
type TierKey = 'novice' | 'apprentice' | 'journeyman' | 'expert' | 'master' | 'legendary';

interface FormData {
  title: string;
  category: string;
  city: string;
  neighborhood: string;
  description: string;
  reward: string;
  payType: PayType;
  deadline: string;
  xpReward: number;
}

export interface PostQuestFormProps {
  currentUserId?: string | null;
  onSuccess?: (questId: string) => void;
  onCancel?: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'yard',     label: 'Lawn & Yard'       },
  { id: 'hauling',  label: 'Hauling & Junk'    },
  { id: 'moving',   label: 'Moving Help'       },
  { id: 'handyman', label: 'Handyman'          },
  { id: 'cleaning', label: 'Cleaning'         },
  { id: 'painting', label: 'Painting'         },
  { id: 'pressure', label: 'Pressure Washing' },
  { id: 'other',    label: 'Odd Jobs'         },
];

// Map UI category ids -> Prisma QuestCategory enum (schema is currently
// developer-oriented; physical-labor categories fall back to OTHER).
const CATEGORY_ENUM_MAP: Record<string, string> = {
  yard:     'OTHER',
  hauling:  'OTHER',
  moving:   'OTHER',
  handyman: 'OTHER',
  cleaning: 'OTHER',
  painting: 'OTHER',
  pressure: 'OTHER',
  other:    'OTHER',
};

const TIER_TO_DIFFICULTY: Record<TierKey, string> = {
  novice:     'NOVICE',
  apprentice: 'APPRENTICE',
  journeyman: 'JOURNEYMAN',
  expert:     'EXPERT',
  master:     'MASTER',
  legendary:  'LEGENDARY',
};

const TIER_MAP: { min: number; max: number; tier: TierKey; classes: string }[] = [
  { min: 0,    max: 49,       tier: 'novice',     classes: 'text-green-400 bg-green-400/10 border-green-400/20'    },
  { min: 50,   max: 99,       tier: 'apprentice', classes: 'text-blue-400 bg-blue-400/10 border-blue-400/20'       },
  { min: 100,  max: 199,      tier: 'journeyman', classes: 'text-amber-400 bg-amber-400/10 border-amber-400/20'    },
  { min: 200,  max: 499,      tier: 'expert',     classes: 'text-orange-400 bg-orange-400/10 border-orange-400/20' },
  { min: 500,  max: 999,      tier: 'master',     classes: 'text-violet-400 bg-violet-400/10 border-violet-400/20' },
  { min: 1000, max: Infinity, tier: 'legendary',  classes: 'text-rose-400 bg-rose-400/10 border-rose-400/20'       },
];

const STEP_LABELS = ['Details', 'Quest Info', 'Review'];
const MIN_DATE = new Date(Date.now() + 86_400_000 * 2).toISOString().split('T')[0];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTier(reward: number) {
  return TIER_MAP.find((t) => reward >= t.min && reward <= t.max) ?? TIER_MAP[0];
}

function formatDate(iso: string): string {
  if (!iso) return '—';
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
}

function validate(step: number, data: FormData): string[] {
  const errs: string[] = [];
  if (step === 1) {
    if (data.title.trim().length < 10)  errs.push('Title must be at least 10 characters.');
    if (!data.category)                 errs.push('Please select a category.');
    if (!data.city.trim())              errs.push('City is required.');
    if (!data.neighborhood.trim())      errs.push('Neighborhood is required.');
  }
  if (step === 2) {
    if (data.description.trim().length < 30) errs.push('Description must be at least 30 characters.');
    const r = parseFloat(data.reward);
    if (!data.reward || isNaN(r) || r < 10)  errs.push('Reward must be at least $10.');
    if (!data.deadline)                      errs.push('Deadline is required.');
  }
  return errs;
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center mb-8">
      {STEP_LABELS.map((label, i) => {
        const idx   = i + 1;
        const done  = idx < current;
        const active = idx === current;
        return (
          <div key={label} className={clsx('flex items-center', i < STEP_LABELS.length - 1 && 'flex-1')}>
            <div className="flex flex-col items-center gap-1.5">
              <div className={clsx(
                'w-7 h-7 rounded-full flex items-center justify-center font-mono text-[11px] font-semibold border transition-all duration-200',
                done   ? 'bg-amber-400 border-amber-400 text-zinc-950'
                       : active ? 'bg-amber-400/15 border-amber-500/50 text-amber-400'
                                : 'bg-white/[0.04] border-white/10 text-stone-700',
              )}>
                {done ? '✓' : idx}
              </div>
              <span className={clsx(
                'font-mono text-[9px] font-semibold tracking-widest uppercase whitespace-nowrap',
                active ? 'text-amber-400' : done ? 'text-stone-500' : 'text-stone-700',
              )}>{label}</span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div className={clsx(
                'flex-1 h-px mx-2 mb-5 transition-all duration-200',
                done ? 'bg-amber-500/50' : 'bg-white/[0.06]',
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}

const inputCls = 'w-full font-mono text-[13px] px-3.5 py-2.5 bg-white/[0.03] border border-white/[0.09] rounded-md text-stone-300 placeholder-stone-700 focus:outline-none focus:border-amber-500/40 transition-colors';
const labelCls = 'block font-mono text-[10px] font-semibold tracking-widest text-stone-600 uppercase mb-2';

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className={labelCls}>
      {children}
      {required && <span className="text-rose-500 ml-1">*</span>}
    </label>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start py-3 border-b border-white/[0.05] last:border-b-0">
      <span className="font-mono text-[10px] font-semibold tracking-widest text-stone-700 uppercase flex-shrink-0 mr-4">{label}</span>
      <span className="font-mono text-[12px] text-stone-400 text-right">{value}</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PostQuestForm({ currentUserId = null, onSuccess, onCancel }: PostQuestFormProps) {
  const [step,       setStep]       = useState(1);
  const [errors,     setErrors]     = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);

  const [data, setData] = useState<FormData>({
    title: '', category: '', city: '', neighborhood: '',
    description: '', reward: '', payType: 'flat', deadline: '', xpReward: 0,
  });

  // Auth gate
  useEffect(() => {
    if (!currentUserId) {
      window.location.href = '/auth/login?redirect=/post-quest';
    }
  }, [currentUserId]);

  // Auto-calc XP
  useEffect(() => {
    const r = parseFloat(data.reward);
    setData((prev) => ({ ...prev, xpReward: isNaN(r) ? 0 : Math.round(r * 10) }));
  }, [data.reward]);

  function update<K extends keyof FormData>(field: K, value: FormData[K]) {
    setData((prev) => ({ ...prev, [field]: value }));
    setErrors([]);
  }

  function handleNext() {
    const errs = validate(step, data);
    if (errs.length) { setErrors(errs); return; }
    setErrors([]);
    setStep((s) => s + 1);
  }

  function handleBack() {
    setErrors([]);
    setStep((s) => s - 1);
  }

  async function handleSubmit() {
    const errs = [...validate(1, data), ...validate(2, data)];
    if (errs.length) { setErrors(errs); return; }
    setSubmitting(true);
    try {
      const city = data.city.trim();
      const neighborhood = data.neighborhood.trim();
      const payType = data.payType;
      const locationLine = `Location: ${neighborhood}, ${city} · Pay: $${data.reward} ${payType === 'hourly' ? '/ hour' : 'flat'}`;
      const payload = {
        title:       data.title.trim(),
        description: `${locationLine}\n\n${data.description.trim()}`,
        category:    CATEGORY_ENUM_MAP[data.category] ?? 'OTHER',
        difficulty:  TIER_TO_DIFFICULTY[tierInfo.tier],
        reward:      parseFloat(data.reward),
        xpReward:    data.xpReward,
        deadline:    data.deadline ? new Date(`${data.deadline}T00:00:00`).toISOString() : undefined,
        tags:        [city, neighborhood, payType, data.category].filter(Boolean),
      };
      const quest = await api.post<{ id: string }>('/quests', payload);
      setSubmitted(true);
      onSuccess?.(quest.id);
    } catch (e: unknown) {
      setErrors([errorMessage(e)]);
    } finally {
      setSubmitting(false);
    }
  }

  const rewardNum = parseFloat(data.reward) || 0;
  const tierInfo  = getTier(rewardNum);

  if (submitted) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center px-8">
          <CheckCircle size={48} className="text-green-400 mx-auto mb-4" />
          <h2 className="font-bold text-2xl text-stone-100 mb-2">Quest Posted</h2>
          <p className="font-mono text-[12px] text-stone-600 leading-relaxed mb-7">
            Your quest is live on the board.<br />Adventurers can start applying now.
          </p>
          <button
            onClick={() => { window.location.href = '/questboard'; }}
            className="font-mono text-[11px] font-semibold tracking-widest px-7 py-3 bg-amber-400 text-zinc-950 rounded hover:bg-amber-300 transition-colors"
          >
            VIEW QUEST BOARD
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-stone-400 py-10 px-6">
      <div className="max-w-xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="font-bold text-2xl text-stone-100 tracking-tight">Post a Quest</h1>
            <p className="font-mono text-[11px] text-stone-700 mt-1">
              Describe what you need done. Adventurers in your area will apply.
            </p>
          </div>
          {onCancel && (
            <button onClick={onCancel} className="font-mono text-[11px] text-stone-700 hover:text-stone-500 transition-colors">
              Cancel ×
            </button>
          )}
        </div>

        <StepIndicator current={step} />

        {/* ── Step 1 ── */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <FieldLabel required>Quest title</FieldLabel>
              <input
                type="text"
                value={data.title}
                onChange={(e) => update('title', e.target.value)}
                placeholder="e.g. Weekly lawn mowing — front & back yard"
                maxLength={100}
                className={inputCls}
              />
              <p className="font-mono text-[9px] text-stone-800 mt-1.5 text-right">{data.title.length}/100</p>
            </div>

            <div>
              <FieldLabel required>Category</FieldLabel>
              <select
                value={data.category}
                onChange={(e) => update('category', e.target.value)}
                className={clsx(inputCls, 'cursor-pointer')}
              >
                <option value="">Select a category…</option>
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel required>City</FieldLabel>
                <input
                  type="text"
                  value={data.city}
                  onChange={(e) => update('city', e.target.value)}
                  placeholder="e.g. Rocklin, CA"
                  className={inputCls}
                />
              </div>
              <div>
                <FieldLabel required>Neighborhood</FieldLabel>
                <input
                  type="text"
                  value={data.neighborhood}
                  onChange={(e) => update('neighborhood', e.target.value)}
                  placeholder="e.g. Whitney Ranch"
                  className={inputCls}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2 ── */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <FieldLabel required>Description</FieldLabel>
              <textarea
                value={data.description}
                onChange={(e) => update('description', e.target.value)}
                placeholder="Describe exactly what needs to be done, any special instructions, and what to expect on the job…"
                rows={5}
                maxLength={1000}
                className={clsx(inputCls, 'resize-y min-h-[120px] leading-relaxed')}
              />
              <p className="font-mono text-[9px] text-stone-800 mt-1.5 text-right">{data.description.length}/1000</p>
            </div>

            {/* Pay type */}
            <div>
              <FieldLabel>Pay type</FieldLabel>
              <div className="flex gap-2">
                {(['flat', 'hourly'] as PayType[]).map((pt) => (
                  <button
                    key={pt}
                    type="button"
                    onClick={() => update('payType', pt)}
                    className={clsx(
                      'font-mono text-[11px] font-semibold tracking-wide px-5 py-2 rounded-full border transition-all duration-150',
                      data.payType === pt
                        ? 'text-amber-400 border-amber-500/60 bg-amber-400/10'
                        : 'text-stone-600 border-white/[0.08] hover:text-amber-400 hover:border-amber-500/40',
                    )}
                  >
                    {pt === 'flat' ? 'Flat rate' : 'Hourly'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel required>Reward amount ($)</FieldLabel>
                <div className="relative">
                  <span className={clsx(
                    'absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-base',
                    rewardNum > 0 ? 'text-amber-400' : 'text-stone-800',
                  )}>$</span>
                  <input
                    type="number"
                    value={data.reward}
                    onChange={(e) => update('reward', e.target.value)}
                    placeholder="0"
                    min="10"
                    step="5"
                    className={clsx(inputCls, 'pl-7')}
                  />
                </div>
              </div>
              <div>
                <FieldLabel>Deadline</FieldLabel>
                <input
                  type="date"
                  value={data.deadline}
                  min={MIN_DATE}
                  onChange={(e) => update('deadline', e.target.value)}
                  className={clsx(inputCls, '[color-scheme:dark]')}
                />
              </div>
            </div>

            {/* XP preview */}
            {rewardNum > 0 && (
              <div className="flex items-center justify-between p-3.5 bg-white/[0.02] border border-white/[0.06] rounded-lg">
                <div>
                  <p className="font-mono text-[10px] text-stone-700 tracking-widest uppercase mb-1 flex items-center gap-1">
                    <Zap size={10} /> XP reward (auto-calculated)
                  </p>
                  <p className="font-bold text-xl text-amber-400">{data.xpReward} XP</p>
                </div>
                <span className={clsx(
                  'font-mono text-[9px] font-semibold tracking-widest border rounded-sm px-2 py-0.5',
                  tierInfo.classes,
                )}>
                  {tierInfo.tier.toUpperCase()} TIER
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── Step 3: Review ── */}
        {step === 3 && (
          <div>
            <div className="bg-white/[0.02] border border-white/[0.07] rounded-xl p-6 mb-6">
              <h3 className="font-bold text-base text-stone-100 mb-1.5">{data.title}</h3>
              <div className="flex gap-2 flex-wrap mb-4">
                <span className={clsx(
                  'font-mono text-[9px] font-semibold tracking-widest border rounded-sm px-2 py-0.5',
                  tierInfo.classes,
                )}>{tierInfo.tier.toUpperCase()}</span>
                <span className="font-mono text-[9px] text-stone-500 bg-white/[0.05] border border-white/[0.08] rounded-sm px-2 py-0.5">
                  {CATEGORIES.find((c) => c.id === data.category)?.label}
                </span>
              </div>
              <ReviewRow label="Location" value={`${data.neighborhood}, ${data.city}`} />
              <ReviewRow label="Pay"      value={`$${data.reward} ${data.payType === 'hourly' ? '/ hour' : 'flat'}`} />
              <ReviewRow label="XP"       value={`${data.xpReward} XP`} />
              <ReviewRow label="Deadline" value={formatDate(data.deadline)} />
              <div className="pt-3">
                <p className="font-mono text-[10px] font-semibold tracking-widest text-stone-700 uppercase mb-2">Description</p>
                <p className="font-mono text-[12px] text-stone-500 leading-relaxed line-clamp-4">{data.description}</p>
              </div>
            </div>
            <p className="font-mono text-[10px] text-stone-800 leading-relaxed mb-5">
              By posting, you agree to TryHardly&apos;s terms. Payment will be held in escrow and released when you confirm the quest is complete.
            </p>
          </div>
        )}

        {/* Errors */}
        {errors.length > 0 && (
          <div className="mt-5 p-3.5 bg-rose-400/[0.07] border border-rose-400/25 rounded-lg space-y-1">
            {errors.map((e) => (
              <p key={e} className="font-mono text-[11px] text-rose-400">· {e}</p>
            ))}
          </div>
        )}

        {/* Nav buttons */}
        <div className="flex justify-between mt-6">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="font-mono text-[11px] font-semibold tracking-widest px-6 py-3 border border-white/10 rounded-md text-stone-600 hover:text-stone-400 hover:border-white/20 transition-all flex items-center gap-1"
            >
              <ChevronLeft size={13} /> BACK
            </button>
          ) : <div />}

          {step < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              className="font-mono text-[11px] font-semibold tracking-widest px-7 py-3 bg-amber-400 text-zinc-950 rounded-md hover:bg-amber-300 transition-colors flex items-center gap-1"
            >
              NEXT <ChevronRight size={13} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className={clsx(
                'font-mono text-[11px] font-semibold tracking-widest px-7 py-3 rounded-md transition-all flex items-center gap-1',
                submitting
                  ? 'bg-amber-400/20 text-amber-400 border border-amber-400/40 cursor-default'
                  : 'bg-amber-400 text-zinc-950 hover:bg-amber-300 cursor-pointer',
              )}
            >
              {submitting ? 'POSTING…' : 'POST QUEST ⚔'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, CheckCircle, Wand2, Sparkles, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import { api } from '../lib/api';
import { CADENCE_OPTIONS } from '../lib/recurrence';
import { inferQuestFromText, summarizeInference } from '../lib/questInference';
import { recommendBudget, type Difficulty, type Urgency } from '../lib/budgetInference';
import type { RecurrenceCadence } from '../lib/types';
import ImageUploader from './ImageUploader';

// ─── Types ────────────────────────────────────────────────────────────────────

type PayType = 'flat' | 'hourly';
// How the poster wants to price the job. `fixed` is the classic flow (poster
// names a budget). `quote` lets qualified workers apply with their own estimate
// through TryHardly — used for complex/contractor-type work where a poster
// shouldn't anchor a single unrealistic number. Both are paid in-app via Stripe.
type BudgetMode = 'fixed' | 'quote';
type TierKey = 'novice' | 'apprentice' | 'journeyman' | 'expert' | 'master' | 'legendary';

// Tag that flags a quest as quote-needed without any backend schema change. The
// detail/board UI and applications can key off this string.
const QUOTE_TAG = 'quote-needed';

interface FormData {
  title: string;
  category: string;
  // Job location is collected as area code / ZIP + state only — no full street
  // address during posting. These map onto the existing backend location fields.
  areaZip: string;
  state: string;
  description: string;
  // `reward` is kept as the backend/API field name; it is the poster's budget.
  reward: string;
  // Fixed budget vs. let workers quote. Drives validation and what we send.
  budgetMode: BudgetMode;
  payType: PayType;
  deadline: string;
  // System-calculated from budget; never configured by the poster.
  xpReward: number;
  // Optional poster signals that refine the budget suggestion.
  difficulty: Difficulty | '';
  urgency: Urgency | '';
  photoUrl: string;
  // Recurring booking (scheduling/visibility only — no money is charged or held).
  isRecurring: boolean;
  recurrenceCadence: RecurrenceCadence;
  recurrenceEndDate: string;
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
  { id: 'fencing',  label: 'Fencing'          },
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
  fencing:  'OTHER',
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

// Dollar floor at which a fixed-price job reads as "large" to a poster. Kept in
// step with the upper end of category bands (e.g. fencing tops out ~$600) so the
// label only appears on genuinely big jobs, not a routine yard task.
const LARGE_JOB_REWARD = 500;

// Practical, poster-facing badge for the Review step. Posters should never see
// gamified worker ranks (LEGENDARY/EPIC/…); those stay on worker-facing quest
// surfaces. We derive a plain marketplace label from data the poster already
// provided — contractor/license guidance first (most important), then quote
// mode, then sheer size — and otherwise show nothing (the category chip stands
// alone). Returns null when no practical badge applies.
function reviewBadge(args: {
  contractorRequired: boolean;
  contractorRelevant: boolean;
  budgetMode: BudgetMode;
  reward: number;
}): { label: string; classes: string } | null {
  if (args.contractorRequired) {
    return {
      label: 'Licensed contractor may be required',
      classes: 'text-rose-300 bg-rose-400/10 border-rose-400/20',
    };
  }
  if (args.contractorRelevant) {
    return {
      label: 'Contractor-scale job',
      classes: 'text-amber-300 bg-amber-400/10 border-amber-400/20',
    };
  }
  if (args.budgetMode === 'quote') {
    return {
      label: 'Quote needed',
      classes: 'text-stone-300 bg-white/[0.06] border-white/[0.1]',
    };
  }
  if (args.reward >= LARGE_JOB_REWARD) {
    return {
      label: 'Large job',
      classes: 'text-stone-300 bg-white/[0.06] border-white/[0.1]',
    };
  }
  return null;
}

// Worker XP from the budget. Log-scaled and capped so a big-dollar job (e.g. a
// $1,200 fence) doesn't mint absurd XP versus a $50 yard task, and so XP can't
// be farmed by inflating the budget. A flat `reward * 10` made large jobs
// trivialize progression (a single $1,200 quest = 12,000 XP); this keeps the
// curve sane (≈300 XP at $10, ≈900 at $1,200, hard cap 1,500). Posters never
// see or set XP — it's assigned after posting.
function calcXpReward(reward: number): number {
  if (!Number.isFinite(reward) || reward <= 0) return 0;
  return Math.max(10, Math.min(1500, Math.round(90 * Math.log2(reward + 1))));
}

// In quote mode the poster doesn't name a price, but the backend `reward` field
// (and the per-job Stripe payment) still needs a non-zero number. We send a
// conservative placeholder so the quest is valid and XP stays sane — never the
// inflated materials+labor total. Workers refine the real number with an in-app
// quote later. Kept small on purpose: quote jobs must not mint huge XP.
const QUOTE_PLACEHOLDER_REWARD = 50;

function quoteModeReward(rec: { measured?: { laborMin: number } | null }): number {
  // Prefer the low end of any measured labor band (still conservative), else a
  // flat small placeholder. We deliberately avoid laborSuggested/total here.
  const fromMeasure = rec.measured?.laborMin;
  if (Number.isFinite(fromMeasure) && (fromMeasure as number) >= 10) {
    return Math.min(fromMeasure as number, 200);
  }
  return QUOTE_PLACEHOLDER_REWARD;
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
    if (!data.areaZip.trim())           errs.push('Area code or ZIP is required.');
    if (!data.state.trim())             errs.push('State is required.');
  }
  if (step === 2) {
    if (data.description.trim().length < 30) errs.push('Description must be at least 30 characters.');
    // A fixed budget must be a real number; in quote mode the poster doesn't
    // name a price, so we skip that check (workers quote in-app instead).
    if (data.budgetMode === 'fixed') {
      const r = parseFloat(data.reward);
      if (!data.reward || isNaN(r) || r < 10) errs.push('Your budget must be at least $10.');
    }
    if (!data.deadline)                      errs.push('Deadline is required.');
    if (data.photoUrl.trim() && !isValidPhotoUrl(data.photoUrl.trim())) {
      errs.push('Photo URL must be a valid http(s) link.');
    }
  }
  return errs;
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong';
}

function isValidPhotoUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
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

  // Text-first entry: poster describes the job, we infer fields they can edit.
  const [needText,   setNeedText]   = useState('');
  const [applied,    setApplied]    = useState(false);

  const inference = needText.trim().length >= 3 ? inferQuestFromText(needText) : null;
  const inferenceSummary = inference ? summarizeInference(inference) : '';

  // The suggestion only fills the budget on an explicit click, so a manually
  // entered amount is never overwritten. `budgetApplied` just toggles the label.
  const [budgetApplied, setBudgetApplied] = useState(false);

  const [data, setData] = useState<FormData>({
    title: '', category: '', areaZip: '', state: '',
    description: '', reward: '', budgetMode: 'fixed', payType: 'flat', deadline: '', xpReward: 0,
    difficulty: '', urgency: '',
    photoUrl: '',
    isRecurring: false, recurrenceCadence: 'WEEKLY', recurrenceEndDate: '',
  });

  // Deterministic local budget suggestion from the details entered so far.
  const budgetRec = recommendBudget({
    category: data.category || null,
    text: `${data.title} ${data.description} ${needText}`.trim() || null,
    difficulty: data.difficulty || null,
    urgency: data.urgency || null,
    payType: data.payType,
  });

  // Apply a specific suggested amount to the budget field. Nothing is applied
  // automatically — the poster clicks one of the suggestions explicitly, so a
  // manually typed amount is never overwritten.
  function applyBudgetAmount(amount: number) {
    update('reward', String(amount));
    setBudgetApplied(true);
  }

  // Auth gate
  useEffect(() => {
    if (!currentUserId) {
      window.location.href = '/auth/login?redirect=/post-quest';
    }
  }, [currentUserId]);

  // Auto-calc XP (log-scaled + capped; see calcXpReward). In quote mode the
  // poster hasn't named a price, so XP is based on the conservative placeholder
  // reward — never an inflated total — and stays small until a real quote is
  // approved later. Posters never see this number.
  useEffect(() => {
    const effective =
      data.budgetMode === 'quote' ? quoteModeReward(budgetRec) : parseFloat(data.reward);
    setData((prev) => ({ ...prev, xpReward: isNaN(effective) ? 0 : calcXpReward(effective) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.reward, data.budgetMode, budgetRec.measured?.laborMin]);

  function update<K extends keyof FormData>(field: K, value: FormData[K]) {
    setData((prev) => ({ ...prev, [field]: value }));
    setErrors([]);
  }

  // Pre-fill the form from the inferred summary. Every field stays editable
  // below; we only fill blanks so we never clobber something the poster typed.
  function applyInference() {
    if (!inference) return;
    setData((prev) => ({
      ...prev,
      title: prev.title.trim() ? prev.title : (inference.title ?? prev.title),
      category: prev.category || (inference.category ?? prev.category),
      description: prev.description.trim() ? prev.description : needText.trim(),
      isRecurring: prev.isRecurring || inference.isRecurring,
      recurrenceCadence: inference.cadence ?? prev.recurrenceCadence,
      deadline: prev.deadline || (inference.timing?.date ?? prev.deadline),
    }));
    setApplied(true);
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
      const areaZip = data.areaZip.trim();
      const state = data.state.trim().toUpperCase();
      const payType = data.payType;
      const photoUrl = data.photoUrl.trim();
      const isQuote = data.budgetMode === 'quote';
      // Backend `reward` is a required number and the per-job Stripe payment
      // needs a value, so quote-mode quests carry a conservative placeholder.
      // The real price is set by an in-app worker quote later; nothing is
      // charged or held at posting.
      const effectiveReward = isQuote ? quoteModeReward(budgetRec) : parseFloat(data.reward);
      // Location collected as area/ZIP + state only (no street address). Kept in
      // the same `Location:` line the detail page already parses.
      const payLabel = isQuote ? 'Quote needed' : `$${data.reward} ${payType === 'hourly' ? '/ hour' : 'flat'}`;
      const locationLine = `Location: ${areaZip}, ${state} · Pay: ${payLabel}`;
      // For quote jobs, lead the description with a plain, on-platform note so
      // workers know to apply with an estimate. No off-platform negotiation.
      const quoteNote = isQuote
        ? 'Time & Materials / Quote Needed — qualified workers can apply with an estimate through TryHardly.\n\n'
        : '';
      // Photo support is URL-only (no cloud storage): the link is encoded as a
      // `photo:<url>` tag so the detail page can render it without a schema change.
      const tags = [areaZip, state, payType, data.category].filter(Boolean);
      if (isQuote) tags.push(QUOTE_TAG);
      if (photoUrl) tags.push(`photo:${photoUrl}`);
      const payload = {
        title:       data.title.trim(),
        description: `${locationLine}\n\n${quoteNote}${data.description.trim()}`,
        category:    CATEGORY_ENUM_MAP[data.category] ?? 'OTHER',
        difficulty:  TIER_TO_DIFFICULTY[tierInfo.tier],
        reward:      effectiveReward,
        xpReward:    data.xpReward,
        deadline:    data.deadline ? new Date(`${data.deadline}T00:00:00`).toISOString() : undefined,
        tags,
        // Recurring booking template. The backend treats this as scheduling only:
        // no charge or hold is created here, and each occurrence is paid per-task.
        isRecurring: data.isRecurring,
        ...(data.isRecurring
          ? {
              recurrenceCadence: data.recurrenceCadence,
              recurrenceEndDate: data.recurrenceEndDate
                ? new Date(`${data.recurrenceEndDate}T00:00:00`).toISOString()
                : undefined,
            }
          : {}),
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

  // Poster-facing Review badge. tierInfo (the gamified worker rank) is kept for
  // worker-facing surfaces and the post-submit XP plumbing, but is no longer
  // shown to the poster — they see a plain marketplace label instead.
  const posterBadge = reviewBadge({
    contractorRequired: budgetRec.contractor.required,
    contractorRelevant: budgetRec.contractor.message !== '',
    budgetMode: data.budgetMode,
    reward: rewardNum,
  });

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
            {/* Text-first entry: describe the job in plain language. */}
            <div className="rounded-lg border border-amber-500/25 bg-amber-400/[0.04] p-4">
              <FieldLabel>What do you need done?</FieldLabel>
              <textarea
                value={needText}
                onChange={(e) => { setNeedText(e.target.value); setApplied(false); }}
                placeholder="e.g. Need my front and back lawn mowed every Friday, and the hedges trimmed."
                rows={3}
                maxLength={1000}
                className={clsx(inputCls, 'resize-y min-h-[72px] leading-relaxed')}
              />
              {inference && inferenceSummary && (
                <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
                  <p className="font-mono text-[11px] text-amber-300/90">
                    Looks like: <span className="font-semibold text-amber-300">{inferenceSummary}</span>
                  </p>
                  <button
                    type="button"
                    onClick={applyInference}
                    className="font-mono text-[10px] font-semibold tracking-widest px-4 py-2 bg-amber-400 text-zinc-950 rounded hover:bg-amber-300 transition-colors flex items-center gap-1.5"
                  >
                    <Wand2 size={12} /> {applied ? 'APPLIED ✓' : 'USE THIS'}
                  </button>
                </div>
              )}
              <p className="font-mono text-[9px] text-stone-600 mt-2 leading-relaxed">
                We&apos;ll guess the details below — you can edit anything before posting.
              </p>
            </div>

            <div>
              <FieldLabel required>Job title</FieldLabel>
              <input
                type="text"
                value={data.title}
                onChange={(e) => update('title', e.target.value)}
                placeholder="e.g. Weekly lawn mowing — front & back yard"
                maxLength={100}
                className={inputCls}
              />
              <div className="flex items-start justify-between gap-3 mt-1.5">
                <p className="font-mono text-[9px] text-stone-700 leading-relaxed">
                  Give your job a clear title so workers can quickly understand what you need.
                </p>
                <p className="font-mono text-[9px] text-stone-800 whitespace-nowrap">{data.title.length}/100</p>
              </div>
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

            <p className="font-mono text-[9px] text-stone-700 leading-relaxed -mb-2">
              Job location — area code or ZIP and state only. No street address needed to post.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel required>Area code or ZIP</FieldLabel>
                <input
                  type="text"
                  value={data.areaZip}
                  onChange={(e) => update('areaZip', e.target.value)}
                  placeholder="e.g. 95677 or 916"
                  maxLength={10}
                  className={inputCls}
                />
              </div>
              <div>
                <FieldLabel required>State</FieldLabel>
                <input
                  type="text"
                  value={data.state}
                  onChange={(e) => update('state', e.target.value)}
                  placeholder="e.g. CA"
                  maxLength={20}
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
                placeholder="Describe the task, what's included, and anything the worker should bring or know…"
                rows={5}
                maxLength={1000}
                className={clsx(inputCls, 'resize-y min-h-[120px] leading-relaxed')}
              />
              <div className="flex items-start justify-between gap-3 mt-1.5">
                <p className="font-mono text-[9px] text-stone-700 leading-relaxed">
                  Describe the task, what&apos;s included, and anything the worker should bring or know.
                </p>
                <p className="font-mono text-[9px] text-stone-800 whitespace-nowrap">{data.description.length}/1000</p>
              </div>
            </div>

            {/* Optional photo */}
            <div>
              <FieldLabel>Photo (optional)</FieldLabel>
              <ImageUploader
                onUploaded={(url) => update('photoUrl', url)}
                disabled={submitting}
                className="mb-3"
              />
              <input
                type="url"
                value={data.photoUrl}
                onChange={(e) => update('photoUrl', e.target.value)}
                placeholder="https://example.com/photo.jpg"
                className={inputCls}
              />
              <p className="font-mono text-[9px] text-stone-800 mt-1.5">
                Upload a photo of the job, or paste a link to one hosted elsewhere.
              </p>
              {data.photoUrl.trim() && isValidPhotoUrl(data.photoUrl.trim()) && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.photoUrl.trim()}
                  alt="Quest preview"
                  className="mt-3 w-full max-h-48 object-cover rounded-lg border border-white/[0.08]"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              )}
            </div>

            {/* Budget mode: fixed price vs. let workers quote the job. */}
            <div>
              <FieldLabel>How do you want to price this?</FieldLabel>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {([
                  { mode: 'fixed' as BudgetMode, title: 'Fixed budget', sub: 'You set the amount you plan to pay.' },
                  { mode: 'quote' as BudgetMode, title: 'Time & Materials / Quote Needed', sub: 'Let qualified workers quote this job.' },
                ]).map((opt) => (
                  <button
                    key={opt.mode}
                    type="button"
                    onClick={() => { update('budgetMode', opt.mode); setBudgetApplied(false); }}
                    className={clsx(
                      'text-left rounded-md border px-3.5 py-2.5 transition-all duration-150',
                      data.budgetMode === opt.mode
                        ? 'border-amber-500/60 bg-amber-400/10'
                        : 'border-white/[0.08] hover:border-amber-500/40',
                    )}
                  >
                    <span className={clsx(
                      'block font-mono text-[11px] font-semibold tracking-wide',
                      data.budgetMode === opt.mode ? 'text-amber-400' : 'text-stone-400',
                    )}>{opt.title}</span>
                    <span className="block font-mono text-[9px] text-stone-600 mt-0.5 leading-relaxed">{opt.sub}</span>
                  </button>
                ))}
              </div>
              {data.budgetMode === 'quote' && (
                <p className="font-mono text-[9px] text-stone-600 mt-2 leading-relaxed">
                  Good for complex or contractor-type work. Qualified workers apply with an
                  estimate through TryHardly — you pick one and pay in-app when the job is done.
                </p>
              )}
            </div>

            {/* Pay type — only meaningful when you're naming a fixed budget. */}
            {data.budgetMode === 'fixed' && (
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
            )}

            <div className="grid grid-cols-2 gap-4">
              {data.budgetMode === 'fixed' ? (
                <div>
                  <FieldLabel required>Your Budget ($)</FieldLabel>
                  <div className="relative">
                    <span className={clsx(
                      'absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-base',
                      rewardNum > 0 ? 'text-amber-400' : 'text-stone-800',
                    )}>$</span>
                    <input
                      type="number"
                      value={data.reward}
                      onChange={(e) => { update('reward', e.target.value); setBudgetApplied(false); }}
                      placeholder="0"
                      min="10"
                      step="5"
                      className={clsx(inputCls, 'pl-7')}
                    />
                  </div>
                  <p className="font-mono text-[9px] text-stone-700 mt-1.5 leading-relaxed">
                    Enter the total amount you plan to pay for this job.
                  </p>
                </div>
              ) : (
                <div>
                  <FieldLabel>Budget</FieldLabel>
                  <div className={clsx(inputCls, 'flex items-center text-stone-500')}>
                    Workers will quote this job
                  </div>
                  <p className="font-mono text-[9px] text-stone-700 mt-1.5 leading-relaxed">
                    No need to guess a number — qualified workers send an estimate through TryHardly.
                  </p>
                </div>
              )}
              <div>
                <FieldLabel>Timing</FieldLabel>
                <input
                  type="date"
                  value={data.deadline}
                  min={MIN_DATE}
                  onChange={(e) => update('deadline', e.target.value)}
                  className={clsx(inputCls, '[color-scheme:dark]')}
                />
                <p className="font-mono text-[9px] text-stone-700 mt-1.5 leading-relaxed">
                  When do you need this done?
                </p>
              </div>
            </div>

            {/* Recommended budget helper — deterministic local estimate, applied
                only on an explicit click so a typed budget is never overwritten. */}
            <div className="rounded-lg border border-amber-500/25 bg-amber-400/[0.04] p-4">
              <p className="font-mono text-[10px] font-semibold tracking-widest text-amber-400/90 uppercase mb-1.5 flex items-center gap-1.5">
                <Sparkles size={11} /> Recommended budget
              </p>

              {budgetRec.measured ? (
                <>
                  {/* Sized estimate: separate labor-only and materials+labor lines. */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <p className="font-mono text-[9px] tracking-widest text-stone-600 uppercase">
                          Labor only (you supply materials)
                        </p>
                        <span className="font-bold text-lg text-amber-300">
                          ${budgetRec.measured.laborMin}–${budgetRec.measured.laborMax}
                        </span>
                        <span className="font-mono text-[10px] text-stone-600 ml-2">
                          suggest ~${budgetRec.measured.laborSuggested}
                        </span>
                      </div>
                      {data.budgetMode === 'fixed' && (
                        <button
                          type="button"
                          onClick={() => applyBudgetAmount(budgetRec.measured!.laborSuggested)}
                          className="font-mono text-[9px] font-semibold tracking-widest px-3 py-2 bg-amber-400 text-zinc-950 rounded hover:bg-amber-300 transition-colors flex items-center gap-1.5"
                        >
                          <Wand2 size={11} /> USE LABOR
                        </button>
                      )}
                    </div>

                    {budgetRec.measured.totalMin != null && (
                      <div className="flex items-center justify-between gap-3 flex-wrap border-t border-white/[0.06] pt-2.5">
                        <div>
                          <p className="font-mono text-[9px] tracking-widest text-stone-600 uppercase">
                            Materials + labor (rough total)
                          </p>
                          <span className="font-bold text-base text-stone-300">
                            ~${budgetRec.measured.totalMin}–${budgetRec.measured.totalMax}
                          </span>
                        </div>
                        {data.budgetMode === 'fixed' && (
                          <button
                            type="button"
                            onClick={() => applyBudgetAmount(budgetRec.measured!.totalMin!)}
                            className="font-mono text-[9px] font-semibold tracking-widest px-3 py-2 border border-amber-500/50 text-amber-400 rounded hover:bg-amber-400/10 transition-colors flex items-center gap-1.5"
                          >
                            <Wand2 size={11} /> USE TOTAL
                          </button>
                        )}
                      </div>
                    )}

                    <p className="font-mono text-[10px] text-stone-500 leading-relaxed border-t border-white/[0.06] pt-2.5">
                      <span className="text-stone-600 uppercase tracking-widest text-[9px]">Time</span>{' '}
                      {budgetRec.measured.timeEstimate}
                    </p>

                    {budgetRec.measured.assumptions.length > 0 && (
                      <ul className="font-mono text-[9px] text-stone-600 leading-relaxed list-disc list-inside space-y-0.5">
                        {budgetRec.measured.assumptions.map((a) => (
                          <li key={a}>{a}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {budgetApplied && (
                    <p className="font-mono text-[9px] text-amber-300/80 mt-2">Applied ✓ — edit the budget field any time.</p>
                  )}
                </>
              ) : (
                <>
                  <p className="font-mono text-[11px] text-stone-400 leading-relaxed">
                    {budgetRec.explanation}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
                    <span className="font-bold text-lg text-amber-300">
                      ${budgetRec.min}–${budgetRec.max}{data.payType === 'hourly' ? '/hr' : ''}
                    </span>
                    {data.budgetMode === 'fixed' && (
                      <button
                        type="button"
                        onClick={() => applyBudgetAmount(budgetRec.min)}
                        className="font-mono text-[10px] font-semibold tracking-widest px-4 py-2 bg-amber-400 text-zinc-950 rounded hover:bg-amber-300 transition-colors flex items-center gap-1.5"
                      >
                        <Wand2 size={12} /> {budgetApplied ? 'APPLIED ✓' : 'USE THIS BUDGET'}
                      </button>
                    )}
                  </div>
                </>
              )}

              <p className="font-mono text-[9px] text-stone-600 mt-2 leading-relaxed">
                {data.budgetMode === 'quote'
                  ? 'A rough sizing from the job details — workers refine it with an in-app quote.'
                  : 'Just a suggestion from the job details — you set the final number.'}
              </p>

              {/* When the job looks contractor-scale, nudge toward letting workers
                  quote rather than anchoring a single (often too-low) number. */}
              {budgetRec.contractor.required && data.budgetMode === 'fixed' && (
                <button
                  type="button"
                  onClick={() => { update('budgetMode', 'quote'); setBudgetApplied(false); }}
                  className="mt-3 w-full font-mono text-[10px] font-semibold tracking-widest px-4 py-2.5 border border-amber-500/50 text-amber-400 rounded hover:bg-amber-400/10 transition-colors"
                >
                  This looks like a bigger job — let qualified workers quote it instead
                </button>
              )}

              {/* California contractor-license guidance (informational, not legal advice). */}
              {budgetRec.contractor.message && (
                <div
                  className={clsx(
                    'mt-3 rounded-md border p-3 flex items-start gap-2',
                    budgetRec.contractor.required
                      ? 'border-rose-400/40 bg-rose-400/[0.07]'
                      : 'border-white/[0.08] bg-white/[0.02]',
                  )}
                >
                  <AlertTriangle
                    size={13}
                    className={clsx('mt-0.5 flex-shrink-0', budgetRec.contractor.required ? 'text-rose-400' : 'text-stone-600')}
                  />
                  <p
                    className={clsx(
                      'font-mono text-[10px] leading-relaxed',
                      budgetRec.contractor.required ? 'text-rose-300' : 'text-stone-500',
                    )}
                  >
                    {budgetRec.contractor.message}
                  </p>
                </div>
              )}
            </div>

            {/* Optional refinements */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel>Difficulty (optional)</FieldLabel>
                <select
                  value={data.difficulty}
                  onChange={(e) => update('difficulty', e.target.value as Difficulty | '')}
                  className={clsx(inputCls, 'cursor-pointer')}
                >
                  <option value="">No preference</option>
                  <option value="easy">Easy</option>
                  <option value="moderate">Moderate</option>
                  <option value="hard">Hard</option>
                </select>
                <p className="font-mono text-[9px] text-stone-700 mt-1.5 leading-relaxed">
                  How challenging is this job?
                </p>
              </div>
              <div>
                <FieldLabel>Urgency (optional)</FieldLabel>
                <select
                  value={data.urgency}
                  onChange={(e) => update('urgency', e.target.value as Urgency | '')}
                  className={clsx(inputCls, 'cursor-pointer')}
                >
                  <option value="">No preference</option>
                  <option value="flexible">Flexible</option>
                  <option value="soon">Soon</option>
                  <option value="urgent">Urgent</option>
                </select>
                <p className="font-mono text-[9px] text-stone-700 mt-1.5 leading-relaxed">
                  How soon do you need help?
                </p>
              </div>
            </div>

            {/* Recurring booking */}
            <div className="rounded-lg border border-white/[0.08] p-4 space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.isRecurring}
                  onChange={(e) => update('isRecurring', e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/[0.05] text-amber-500 focus:ring-amber-500"
                />
                <span>
                  <span className="block font-mono text-[11px] font-semibold tracking-wide text-stone-300">
                    This is a recurring job
                  </span>
                  <span className="block font-mono text-[10px] text-stone-600 mt-0.5">
                    Keep repeat work (e.g. weekly mowing) on your board. You confirm and pay for each
                    visit separately — nothing is charged in advance.
                  </span>
                </span>
              </label>

              {data.isRecurring && (
                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div>
                    <FieldLabel required>How often</FieldLabel>
                    <select
                      value={data.recurrenceCadence}
                      onChange={(e) => update('recurrenceCadence', e.target.value as RecurrenceCadence)}
                      className={clsx(inputCls, 'cursor-pointer')}
                    >
                      {CADENCE_OPTIONS.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <FieldLabel>Ends on (optional)</FieldLabel>
                    <input
                      type="date"
                      value={data.recurrenceEndDate}
                      min={data.deadline || MIN_DATE}
                      onChange={(e) => update('recurrenceEndDate', e.target.value)}
                      className={clsx(inputCls, '[color-scheme:dark]')}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Secondary TryHardly layer: posting stays simple; tier and worker
                XP are handled by us after the job is posted. No XP to configure. */}
            <p className="font-mono text-[9px] text-stone-700 leading-relaxed flex items-start gap-1.5">
              <Sparkles size={11} className="mt-0.5 flex-shrink-0 text-amber-400/60" />
              We&apos;ll automatically assign the right quest tier and worker XP after posting.
            </p>
          </div>
        )}

        {/* ── Step 3: Review ── */}
        {step === 3 && (
          <div>
            <div className="bg-white/[0.02] border border-white/[0.07] rounded-xl p-6 mb-6">
              <h3 className="font-bold text-base text-stone-100 mb-1.5">{data.title}</h3>
              <div className="flex gap-2 flex-wrap mb-4">
                {posterBadge && (
                  <span className={clsx(
                    'font-mono text-[9px] font-semibold tracking-wide border rounded-sm px-2 py-0.5',
                    posterBadge.classes,
                  )}>{posterBadge.label}</span>
                )}
                <span className="font-mono text-[9px] text-stone-500 bg-white/[0.05] border border-white/[0.08] rounded-sm px-2 py-0.5">
                  {CATEGORIES.find((c) => c.id === data.category)?.label}
                </span>
              </div>
              <ReviewRow label="Location" value={`${data.areaZip}, ${data.state.toUpperCase()}`} />
              <ReviewRow
                label="Budget"
                value={
                  data.budgetMode === 'quote'
                    ? 'Quote needed — workers apply with an estimate'
                    : `$${data.reward} ${data.payType === 'hourly' ? '/ hour' : 'flat'}`
                }
              />
              <ReviewRow label="Timing"   value={formatDate(data.deadline)} />
              {data.isRecurring && (
                <ReviewRow
                  label="Repeats"
                  value={`${CADENCE_OPTIONS.find((c) => c.value === data.recurrenceCadence)?.label ?? 'Weekly'}${
                    data.recurrenceEndDate ? ` · until ${formatDate(data.recurrenceEndDate)}` : ''
                  }`}
                />
              )}
              <div className="pt-3">
                <p className="font-mono text-[10px] font-semibold tracking-widest text-stone-700 uppercase mb-2">Description</p>
                <p className="font-mono text-[12px] text-stone-500 leading-relaxed line-clamp-4">{data.description}</p>
              </div>
            </div>
            <p className="font-mono text-[10px] text-stone-800 leading-relaxed mb-5">
              By posting, you agree to TryHardly&apos;s terms and{' '}
              <a href="/prohibited-services" className="underline hover:text-stone-600">prohibited services policy</a>. Marketplace payments are processed by Stripe, with payout to the worker when you confirm the quest is complete.
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

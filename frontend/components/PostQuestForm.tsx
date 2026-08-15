'use client';

import { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, CheckCircle, Wand2, Sparkles, AlertTriangle, Share2 } from 'lucide-react';
import clsx from 'clsx';
import { api } from '../lib/api';
import { CADENCE_OPTIONS } from '../lib/recurrence';
import { inferQuestFromText, summarizeInference } from '../lib/questInference';
import { recommendBudget, type Difficulty, type Urgency } from '../lib/budgetInference';
import { MIN_DEADLINE_DAYS, minDeadlineIso, normalizeDateInput } from '../lib/dateInput';
import { bandMidpoint, budgetAfterUnitChange, materialsHelperText } from '../lib/postJobPricing';
import { JOB_CATEGORIES, getJobCategory } from '../lib/jobCategories';
import {
  validatePostJobStep,
  isValidPhotoUrl,
  type PostJobField,
  type PostJobIssue,
} from '../lib/postJobValidation';
import {
  EMPTY_POST_JOB_VALUES,
  clearPostJobDraft,
  readPostJobDraft,
  savePostJobDraft,
  type BudgetMode,
  type MaterialsBy,
  type PayType,
  type PostJobFormValues,
} from '../lib/postJobDraft';
import type { RecurrenceCadence } from '../lib/types';
import { PLATFORM_PAYMENTS_ENABLED } from '../lib/paymentsMode';
import ImageUploader from './ImageUploader';

// ─── Types ────────────────────────────────────────────────────────────────────

// The poster-entered values (and their pricing/materials unions) live in
// lib/postJobDraft so the logged-out draft round trip shares one shape with the
// form. `fixed` pricing means the poster names a budget; `quote` lets qualified
// workers apply with their own estimate through TryHardly. The price remains
// editable until the poster chooses a bid.
type FormData = PostJobFormValues;

type TierKey = 'novice' | 'apprentice' | 'journeyman' | 'expert' | 'master' | 'legendary';

// Tag that flags a quest as quote-needed without any backend schema change. The
// detail/board UI and applications can key off this string.
const QUOTE_TAG = 'quote-needed';

export interface PostQuestFormProps {
  currentUserId?: string | null;
  onSuccess?: (questId: string) => void;
  onCancel?: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

// The picker is driven by the same shared config the questboard filters and the
// /jobs landing pages use, so a poster picks the exact label they'll later see
// on the board. `shortLabel` matches the board's filter chips.
const CATEGORY_OPTIONS = JOB_CATEGORIES.map((c) => ({ id: c.slug, label: c.shortLabel }));

// The Prisma QuestCategory enum is still developer-oriented (WEB_DEVELOPMENT,
// DESIGN, …), so every physical-service category maps to OTHER. The real
// category travels in Quest.tags[] as the slug above — see jobCategoryFromTags.
const BACKEND_CATEGORY = 'OTHER';

const MATERIALS_OPTIONS: { value: MaterialsBy; label: string; summary: string }[] = [
  { value: '',        label: "Not sure yet — I'll work it out with the worker", summary: 'To be discussed' },
  { value: 'poster',  label: 'I supply the materials — labor only',            summary: 'Poster supplies materials (labor only)' },
  { value: 'worker',  label: 'Worker supplies materials — include in the bid', summary: 'Worker supplies materials' },
];

const TIER_TO_DIFFICULTY: Record<TierKey, string> = {
  novice:     'NOVICE',
  apprentice: 'APPRENTICE',
  journeyman: 'JOURNEYMAN',
  expert:     'EXPERT',
  master:     'MASTER',
  legendary:  'LEGENDARY',
};

const TIER_MAP: { min: number; max: number; tier: TierKey; classes: string }[] = [
  { min: 0,    max: 49,       tier: 'novice',     classes: 'text-success bg-success/10 border-success/20'    },
  { min: 50,   max: 99,       tier: 'apprentice', classes: 'text-info bg-info/10 border-info/20'       },
  { min: 100,  max: 199,      tier: 'journeyman', classes: 'text-accent-text bg-accent/10 border-accent/20'    },
  { min: 200,  max: 499,      tier: 'expert',     classes: 'text-warning bg-warning/10 border-warning/20' },
  { min: 500,  max: 999,      tier: 'master',     classes: 'text-info bg-info/10 border-info/20' },
  { min: 1000, max: Infinity, tier: 'legendary',  classes: 'text-danger bg-danger/10 border-danger/20'       },
];

const STEP_LABELS = ['Job details', 'Scope & budget', 'Review'];

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  moderate: 'Moderate',
  hard: 'Hard',
};

const URGENCY_LABELS: Record<Urgency, string> = {
  flexible: 'Flexible',
  soon: 'Soon',
  urgent: 'Urgent',
};

// Repeated verbatim on the form and the review step: the one thing a first-time
// poster needs to know before they type anything.
const TRUST_LINE = PLATFORM_PAYMENTS_ENABLED
  ? 'Free to post. Workers bid. You authorize payment only after choosing a worker.'
  : 'Free to post. Local workers bid. You pay your worker directly when the job is done.';

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
      classes: 'text-danger bg-danger/10 border-danger/20',
    };
  }
  if (args.contractorRelevant) {
    return {
      label: 'Contractor-scale job',
      classes: 'text-accent-text-hover bg-accent/10 border-accent/20',
    };
  }
  if (args.budgetMode === 'quote') {
    return {
      label: 'Quote needed',
      classes: 'text-body bg-surface border-line',
    };
  }
  if (args.reward >= LARGE_JOB_REWARD) {
    return {
      label: 'Large job',
      classes: 'text-body bg-surface border-line',
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
                'w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold border transition-all duration-200',
                done   ? 'bg-accent border-accent text-on-accent'
                       : active ? 'bg-accent/15 border-accent/50 text-accent-text'
                                : 'bg-surface border-line text-subtle',
              )}>
                {done ? '✓' : idx}
              </div>
              <span className={clsx(
                'text-sm font-semibold whitespace-nowrap',
                active ? 'text-accent-text' : done ? 'text-subtle' : 'text-subtle',
              )}>{label}</span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div className={clsx(
                'flex-1 h-px mx-2 mb-5 transition-all duration-200',
                done ? 'bg-accent/50' : 'bg-surface',
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}

const inputCls = 'w-full min-h-12 text-base px-3.5 py-2.5 bg-surface border border-line rounded-md text-body placeholder-subtle focus:outline-none focus:border-accent/40 transition-colors';
const labelCls = 'block text-base font-semibold text-strong mb-2';

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className={labelCls}>
      {children}
      {required && <span className="text-danger ml-1">*</span>}
    </label>
  );
}

// Inline, per-field error. The aggregate list at the bottom stays as a summary,
// but the message a poster needs is rendered right under the field that failed.
function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-danger mt-1.5 leading-relaxed">{message}</p>;
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start py-3 border-b border-line last:border-b-0">
      <span className="text-sm font-semibold text-subtle flex-shrink-0 mr-4">{label}</span>
      <span className="text-sm text-muted text-right">{value}</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PostQuestForm({ currentUserId = null, onSuccess, onCancel }: PostQuestFormProps) {
  const [step,       setStep]       = useState(1);
  // Field-level issues from validation, plus a separate slot for a failed POST
  // so an API error never masquerades as a field problem.
  const [issues,     setIssues]     = useState<PostJobIssue[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [postedId,   setPostedId]   = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

  // Text-first entry: poster describes the job, we infer fields they can edit.
  const [needText,   setNeedText]   = useState('');
  const [applied,    setApplied]    = useState(false);

  const inference = needText.trim().length >= 3 ? inferQuestFromText(needText) : null;
  const inferenceSummary = inference ? summarizeInference(inference) : '';

  // The suggestion only fills the budget on an explicit click, so a manually
  // entered amount is never overwritten. `budgetApplied` just toggles the label.
  const [budgetApplied, setBudgetApplied] = useState(false);

  const [data, setData] = useState<FormData>(EMPTY_POST_JOB_VALUES);
  // Fields the inference filled in and the poster hasn't touched since. Re-running
  // the suggestion refreshes those, but anything typed by hand is left alone —
  // otherwise a title inferred from the first draft of the summary sticks around
  // and contradicts the details on the review step.
  const [inferredFields, setInferredFields] = useState<Set<keyof FormData>>(new Set());
  // Set when a poster comes back from creating an account and we restore what
  // they had already typed, so the jump straight to Review is explained.
  const [draftRestored, setDraftRestored] = useState(false);

  // Recomputed every render rather than pinned at module load: the floor is
  // derived from the poster's own calendar day, and a form left open past
  // midnight would otherwise keep validating against yesterday's date.
  const minDate = minDeadlineIso();

  // Deterministic local budget suggestion from the details entered so far.
  const budgetRec = recommendBudget({
    category: data.category || null,
    text: `${data.title} ${data.description} ${needText}`.trim() || null,
    difficulty: data.difficulty || null,
    urgency: data.urgency || null,
    materialsBy: data.materialsBy,
    payType: data.payType,
  });

  // Which measured line the poster should budget against. Driven by who buys
  // the materials, so "worker supplies materials" points at the total.
  const laborIsPrimary = budgetRec.measured?.primary !== 'total';

  // Curated config for the chosen category — its examples double as the concrete
  // "jobs like yours" prompts a first-time poster needs.
  const selectedCategory = data.category ? getJobCategory(data.category) : undefined;

  // Apply a specific suggested amount to the budget field. Nothing is applied
  // automatically — the poster clicks one of the suggestions explicitly, so a
  // manually typed amount is never overwritten.
  function applyBudgetAmount(amount: number) {
    update('reward', String(amount));
    setBudgetApplied(true);
  }

  // Switching pricing mode or pay type changes what the budget number *means*,
  // so an amount entered under the old unit is dropped rather than carried over
  // as a nonsensical price (an hourly $25 is not a $25 flat fence job).
  function changePricing(next: Partial<Pick<FormData, 'budgetMode' | 'payType'>>) {
    setData((prev) => ({
      ...prev,
      ...next,
      reward: budgetAfterUnitChange(
        prev.reward,
        `${prev.budgetMode}:${prev.payType}`,
        `${next.budgetMode ?? prev.budgetMode}:${next.payType ?? prev.payType}`,
      ),
    }));
    setIssues((prev) => prev.filter((i) => i.field !== 'reward'));
    setSubmitError(null);
    setBudgetApplied(false);
  }

  // Restore a draft saved when a logged-out poster hit the account step. It is
  // read back once and cleared immediately, and they land on Review — the step
  // they were on when they were sent to create an account.
  useEffect(() => {
    const draft = readPostJobDraft();
    if (!draft) return;
    clearPostJobDraft();
    setData(draft.values);
    setNeedText(draft.needText);
    setStep(3);
    setDraftRestored(true);
  }, []);

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

  // Clear only the issue for the field being edited, so fixing one problem
  // doesn't hide the others the poster still has to deal with.
  function update<K extends keyof FormData>(field: K, value: FormData[K]) {
    setData((prev) => ({ ...prev, [field]: value }));
    setIssues((prev) => prev.filter((i) => i.field !== field));
    setSubmitError(null);
    // Once the poster edits a field by hand, the suggestion no longer owns it.
    setInferredFields((prev) => {
      if (!prev.has(field)) return prev;
      const next = new Set(prev);
      next.delete(field);
      return next;
    });
  }

  function issueFor(field: PostJobField): string | undefined {
    return issues.find((i) => i.field === field)?.message;
  }

  // Pre-fill the form from the inferred summary. Every field stays editable
  // below. A field is filled when it's blank, and refreshed when the last value
  // in it also came from the suggestion — so re-running it after rewording the
  // summary updates the title instead of leaving a stale one that contradicts
  // the details, while anything typed by hand is never clobbered.
  function applyInference() {
    if (!inference) return;
    const owned = (field: keyof FormData) =>
      !String(data[field]).trim() || inferredFields.has(field);

    const next = { ...data };
    const filled = new Set(inferredFields);
    const take = (field: 'title' | 'description' | 'category' | 'deadline', value: string) => {
      next[field] = value;
      filled.add(field);
    };

    if (owned('title') && inference.title) take('title', inference.title);
    if (owned('description') && needText.trim()) take('description', needText.trim());
    if (owned('category') && inference.category) take('category', inference.category);
    next.isRecurring = data.isRecurring || inference.isRecurring;
    next.recurrenceCadence = inference.cadence ?? data.recurrenceCadence;
    // Only accept an inferred date the deadline rule would also accept —
    // "tomorrow" is a real reading of the text but not a postable deadline.
    const inferredDate = inference.timing?.date;
    if (owned('deadline') && inferredDate && inferredDate >= minDate) {
      take('deadline', inferredDate);
    }

    setData(next);
    setInferredFields(filled);
    setApplied(true);
    setIssues([]);
  }

  // A native date input ignores a pasted `08/01/2026`, so intercept the paste
  // and write the normalized value ourselves.
  function handleDeadlinePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const normalized = normalizeDateInput(e.clipboardData.getData('text'));
    if (!normalized) return;
    e.preventDefault();
    update('deadline', normalized);
  }

  function handleNext() {
    const found = validatePostJobStep(step, data, minDate);
    setIssues(found);
    if (found.length) return;
    setStep((s) => s + 1);
  }

  function handleBack() {
    setIssues([]);
    setSubmitError(null);
    setStep((s) => s - 1);
  }

  // Jump straight back to the step that owns a field the poster wants to change
  // from the review summary.
  function editStep(target: number) {
    setIssues([]);
    setSubmitError(null);
    setStep(target);
  }

  async function copyJobLink() {
    if (!postedId) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/job/${postedId}`);
      setShareCopied(true);
    } catch {
      // Clipboard can be blocked (insecure context, denied permission). Send the
      // poster to the job page so they can copy the URL from the address bar.
      window.location.href = `/job/${postedId}`;
    }
  }

  async function handleSubmit() {
    const detailIssues = validatePostJobStep(1, data, minDate);
    const scopeIssues = validatePostJobStep(2, data, minDate);
    setIssues([...detailIssues, ...scopeIssues]);
    setSubmitError(null);
    // Send the poster back to the step that owns the first problem — the review
    // step can't show them the field they need to fix.
    if (detailIssues.length || scopeIssues.length) {
      setStep(detailIssues.length ? 1 : 2);
      return;
    }
    // Posting is free, but publishing needs an account so the poster can receive
    // bids, message workers, and pick someone. Only this last step is gated:
    // stash the finished draft and send them to create the free account.
    if (!currentUserId) {
      savePostJobDraft({ needText, values: data });
      window.location.href = '/auth/register?redirect=/post-a-job';
      return;
    }
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
      // Who buys materials is a real question for bidding, so state it plainly in
      // the description body (a separate line — the board only parses the first
      // `Location:` line) and tag it so the detail page can surface it later.
      const materialsSummary = MATERIALS_OPTIONS.find((m) => m.value === data.materialsBy)?.summary;
      const materialsNote = data.materialsBy && materialsSummary ? `Materials: ${materialsSummary}\n\n` : '';
      // Effort and timing are worth stating to a bidder, and the poster is shown
      // both on the review step — so they travel in the description rather than
      // being collected and then dropped.
      const scopeNotes = [
        data.difficulty ? `Effort: ${DIFFICULTY_LABELS[data.difficulty]}` : '',
        data.urgency ? `Timing: ${URGENCY_LABELS[data.urgency]}` : '',
      ].filter(Boolean);
      const scopeNote = scopeNotes.length ? `${scopeNotes.join(' · ')}\n\n` : '';
      // Photo support is URL-only (no cloud storage): the link is encoded as a
      // `photo:<url>` tag so the detail page can render it without a schema change.
      const tags = [areaZip, state, payType, data.category].filter(Boolean);
      if (isQuote) tags.push(QUOTE_TAG);
      if (data.materialsBy) tags.push(`materials:${data.materialsBy}`);
      if (photoUrl) tags.push(`photo:${photoUrl}`);
      const payload = {
        title:       data.title.trim(),
        description: `${locationLine}\n\n${quoteNote}${materialsNote}${scopeNote}${data.description.trim()}`,
        category:    BACKEND_CATEGORY,
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
      setPostedId(quest.id);
      onSuccess?.(quest.id);
    } catch (e: unknown) {
      setSubmitError(errorMessage(e));
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

  if (postedId) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center py-10 px-6">
        <div className="w-full max-w-sm text-center">
          <CheckCircle size={48} className="text-success mx-auto mb-4" />
          <h2 className="font-bold text-xl text-strong mb-2">Job posted</h2>
          <p className="text-base text-subtle leading-relaxed mb-2">
            Your job is live on the local job board. Workers nearby can start sending bids now.
          </p>
          <p className="text-base text-subtle leading-relaxed mb-7">
            {PLATFORM_PAYMENTS_ENABLED
              ? 'You’ll review the bids and pick a worker. Nothing is charged until then — you authorize payment after you accept a bid.'
              : 'You’ll review the bids and pick a worker. Agree on the final price and pay your worker directly when the job is done.'}
          </p>

          <div className="space-y-2.5 text-left">
            <button
              onClick={() => { window.location.href = `/job/${postedId}`; }}
              className="btn-primary btn-lg btn-block"
            >
              View your job
            </button>
            <button
              onClick={copyJobLink}
              className="btn-secondary btn-block"
            >
              <Share2 size={16} /> {shareCopied ? 'Link copied' : 'Share job'}
            </button>
            <div className="flex gap-2.5">
              <button
                onClick={() => { window.location.href = '/dashboard'; }}
                className="btn-secondary flex-1"
              >
                My dashboard
              </button>
              <button
                onClick={() => { window.location.href = '/jobs'; }}
                className="btn-secondary flex-1"
              >
                Browse jobs
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas text-muted py-10 px-6">
      <div className="max-w-xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="font-bold text-xl text-strong tracking-tight">Post a local job</h1>
            <p className="text-base text-subtle mt-1">
              Tell us what needs to get done. Workers near you will send bids.
            </p>
          </div>
          {onCancel && (
            <button onClick={onCancel} className="btn-secondary px-4 py-2 min-h-11">
              Cancel ×
            </button>
          )}
        </div>

        <p
          className={clsx(
            'text-sm text-subtle leading-relaxed rounded-md border border-line bg-surface px-3.5 py-2.5',
            !currentUserId || draftRestored ? 'mb-3' : 'mb-8',
          )}
        >
          {TRUST_LINE}
        </p>

        {/* Logged-out visitors fill the whole form first; the account only comes
            up at the final step, so say so before they start typing. */}
        {!currentUserId && (
          <p className="text-sm text-subtle leading-relaxed mb-8 rounded-md border border-accent/25 bg-accent/[0.04] px-3.5 py-2.5">
            No account needed to fill this out. Posting is free — you&apos;ll create a free account
            on the last step to publish your job, get bids, message workers, and choose one.{' '}
            <a href="/request-help" className="text-accent-text underline hover:text-accent-text-hover">
              Or send a quick request instead
            </a>{' '}
            and we&apos;ll line up local help without an account.
          </p>
        )}

        {draftRestored && (
          <p className="text-sm text-success/90 leading-relaxed mb-8 rounded-md border border-success/25 bg-success/[0.05] px-3.5 py-2.5">
            Your job details were saved. Check them over and post when you&apos;re ready.
          </p>
        )}

        <StepIndicator current={step} />

        {/* ── Step 1 ── */}
        {step === 1 && (
          <div className="space-y-5">
            {/* Text-first entry: describe the job in plain language. */}
            <div className="rounded-lg border border-accent/25 bg-accent/[0.04] p-4">
              <FieldLabel>Short summary — what do you need done?</FieldLabel>
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
                  <p className="text-base text-accent-text">
                    Looks like: <span className="font-semibold text-accent-text-hover">{inferenceSummary}</span>
                  </p>
                  <button
                    type="button"
                    onClick={applyInference}
                    className="btn-secondary px-4 py-2 min-h-11"
                  >
                    <Wand2 size={16} /> {applied ? 'Applied' : 'Use this'}
                  </button>
                </div>
              )}
              <p className="text-base text-subtle mt-2 leading-relaxed">
                We&apos;ll guess the details below — you can edit anything before posting. The
                full details workers read are written on the next step.
              </p>
            </div>

            <div>
              <FieldLabel required>Job title</FieldLabel>
              <input
                type="text"
                value={data.title}
                onChange={(e) => update('title', e.target.value)}
                placeholder={
                  selectedCategory?.examples[0]
                    ? `e.g. ${selectedCategory.examples[0]}`
                    : 'e.g. Mow front and back lawn, trim hedges'
                }
                maxLength={100}
                className={clsx(inputCls, issueFor('title') && 'border-danger/50')}
              />
              <FieldError message={issueFor('title')} />
              <div className="flex items-start justify-between gap-3 mt-1.5">
                <p className="text-sm text-subtle leading-relaxed">
                  Name the job the way you&apos;d say it out loud — mowing, dump run, moving help,
                  fence repair, cleaning, errands.
                </p>
                <p className="text-sm text-body whitespace-nowrap">{data.title.length}/100</p>
              </div>
            </div>

            <div>
              <FieldLabel required>Category</FieldLabel>
              <select
                value={data.category}
                onChange={(e) => update('category', e.target.value)}
                className={clsx(inputCls, 'cursor-pointer', issueFor('category') && 'border-danger/50')}
              >
                <option value="">Select a category…</option>
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
              <FieldError message={issueFor('category')} />
              <p className="text-sm text-subtle mt-1.5 leading-relaxed">
                {selectedCategory
                  ? `Jobs like this: ${selectedCategory.examples.join(' · ')}`
                  : 'This is how workers filter the job board, so pick the closest match.'}
              </p>
            </div>

            <div>
              <FieldLabel required>Job location / area</FieldLabel>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="job-area-zip" className="block text-sm font-medium text-strong mb-2">Area code or ZIP</label>
                  <input
                    id="job-area-zip"
                    type="text"
                    value={data.areaZip}
                    onChange={(e) => update('areaZip', e.target.value)}
                    placeholder="Area code or ZIP — 916 or 95677"
                    maxLength={10}
                    className={clsx(inputCls, issueFor('areaZip') && 'border-danger/50')}
                  />
                  <FieldError message={issueFor('areaZip')} />
                </div>
                <div>
                  <label htmlFor="job-state" className="block text-sm font-medium text-strong mb-2">State</label>
                  <input
                    id="job-state"
                    type="text"
                    value={data.state}
                    onChange={(e) => update('state', e.target.value)}
                    placeholder="State — CA"
                    maxLength={2}
                    className={clsx(inputCls, issueFor('state') && 'border-danger/50')}
                  />
                  <FieldError message={issueFor('state')} />
                </div>
              </div>
              <p className="text-sm text-subtle mt-1.5 leading-relaxed">
                Area code or ZIP and state only. Never post your street address here — share the
                exact address privately with the worker after you accept their bid.
              </p>
            </div>
          </div>
        )}

        {/* ── Step 2 ── */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <FieldLabel required>Full details — what needs to get done</FieldLabel>
              <textarea
                value={data.description}
                onChange={(e) => update('description', e.target.value)}
                placeholder="e.g. About 100 ft of wood fence along the side yard. Two panels are leaning and one gate won't latch. Gravel driveway access, dogs will be inside."
                rows={5}
                maxLength={1000}
                className={clsx(
                  inputCls,
                  'resize-y min-h-[120px] leading-relaxed',
                  issueFor('description') && 'border-danger/50',
                )}
              />
              <FieldError message={issueFor('description')} />
              <div className="flex items-start justify-between gap-3 mt-1.5">
                <p className="text-sm text-subtle leading-relaxed">
                  This is what workers read before they bid. Size and access matter most — square
                  footage, linear feet, room or load counts, parking, pets, stairs, and anything the
                  worker should bring.
                </p>
                <p className="text-sm text-body whitespace-nowrap">{data.description.length}/1000</p>
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
                className={clsx(inputCls, issueFor('photoUrl') && 'border-danger/50')}
              />
              <FieldError message={issueFor('photoUrl')} />
              <p className="text-sm text-body mt-1.5">
                Upload a photo of the job, or paste a link to one hosted elsewhere. A photo gets you
                far more accurate bids.
              </p>
              {data.photoUrl.trim() && isValidPhotoUrl(data.photoUrl.trim()) && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.photoUrl.trim()}
                  alt="Quest preview"
                  className="mt-3 w-full max-h-48 object-cover rounded-lg border border-line"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              )}
            </div>

            {/* Budget mode: fixed price vs. let workers quote the job. */}
            <div>
              <FieldLabel>How do you want to price this?</FieldLabel>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {([
                  { mode: 'fixed' as BudgetMode, title: 'Fixed budget', sub: 'You name a budget and workers bid against it.' },
                  { mode: 'quote' as BudgetMode, title: 'Time & materials / quote needed', sub: 'Skip the number and let workers bid their own price.' },
                ]).map((opt) => (
                  <button
                    key={opt.mode}
                    type="button"
                    onClick={() => changePricing({ budgetMode: opt.mode })}
                    className={clsx(
                      'text-left rounded-md border px-3.5 py-2.5 transition-all duration-150',
                      data.budgetMode === opt.mode
                        ? 'border-accent/60 bg-accent/10'
                        : 'border-line hover:border-accent/40',
                    )}
                  >
                    <span className={clsx(
                      'block text-sm font-semibold tracking-wide',
                      data.budgetMode === opt.mode ? 'text-accent-text' : 'text-muted',
                    )}>{opt.title}</span>
                    <span className="block text-sm text-subtle mt-0.5 leading-relaxed">{opt.sub}</span>
                  </button>
                ))}
              </div>
              {data.budgetMode === 'quote' && (
                <p className="text-sm text-subtle mt-2 leading-relaxed">
                  {PLATFORM_PAYMENTS_ENABLED
                    ? 'Good for complex or contractor-type work. Qualified workers bid with their own estimate through TryHardly — you pick one, authorize the agreed amount, and it’s charged after you confirm the work is done.'
                    : 'Good for complex or contractor-type work. Qualified workers bid with their own estimate through TryHardly — you pick one, agree on the final price, and settle directly with the worker.'}
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
                      onClick={() => changePricing({ payType: pt })}
                      className={clsx(
                        'text-sm font-semibold tracking-wide px-5 py-2 rounded-full border transition-all duration-150',
                        data.payType === pt
                          ? 'text-accent-text border-accent/60 bg-accent/10'
                          : 'text-subtle border-line hover:text-accent-text hover:border-accent/40',
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
                  <FieldLabel required>Your budget ($)</FieldLabel>
                  <div className="relative">
                    <span className={clsx(
                      'absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-base',
                      rewardNum > 0 ? 'text-accent-text' : 'text-body',
                    )}>$</span>
                    <input
                      type="number"
                      value={data.reward}
                      onChange={(e) => { update('reward', e.target.value); setBudgetApplied(false); }}
                      placeholder="0"
                      min="10"
                      step="5"
                      className={clsx(inputCls, 'pl-7', issueFor('reward') && 'border-danger/50')}
                    />
                  </div>
                  <FieldError message={issueFor('reward')} />
                  <p className="text-sm text-subtle mt-1.5 leading-relaxed">
                    {PLATFORM_PAYMENTS_ENABLED
                      ? 'What you’re hoping to spend. This is a starting point, not the final charge — workers bid with their own price, and you authorize payment for the amount you agree to after you accept a bid.'
                      : 'What you’re hoping to spend. This is a starting point, not the final price — workers can bid their own price. Once you choose a worker, agree on the amount and pay them directly when the job is done.'}
                  </p>
                </div>
              ) : (
                <div>
                  <FieldLabel>Your budget</FieldLabel>
                  <div className={clsx(inputCls, 'flex items-center text-subtle')}>
                    Workers will bid on this job
                  </div>
                  <p className="text-sm text-subtle mt-1.5 leading-relaxed">
                    {PLATFORM_PAYMENTS_ENABLED
                      ? 'No need to guess a number — qualified workers send a detailed bid through TryHardly, and you authorize payment for the one you accept.'
                      : 'No need to guess a number — qualified workers send a detailed bid through TryHardly. Choose the one that works for you, then settle the agreed amount directly with that worker.'}
                  </p>
                </div>
              )}
              <div>
                <FieldLabel required>When do you need it?</FieldLabel>
                <input
                  type="date"
                  value={data.deadline}
                  min={minDate}
                  onChange={(e) => update('deadline', e.target.value)}
                  onPaste={handleDeadlinePaste}
                  className={clsx(inputCls, '[color-scheme:dark]', issueFor('deadline') && 'border-danger/50')}
                />
                <FieldError message={issueFor('deadline')} />
                <p className="text-sm text-subtle mt-1.5 leading-relaxed">
                  The date the work should be done by — at least {MIN_DEADLINE_DAYS} days out
                  ({formatDate(minDate)} or later) so workers have time to bid. You can paste a
                  date like 08/01/2026.
                </p>
              </div>
            </div>

            {/* Recommended budget helper — deterministic local estimate, applied
                only on an explicit click so a typed budget is never overwritten. */}
            <div className="rounded-lg border border-accent/25 bg-accent/[0.04] p-4">
              <p className="eyebrow mb-1.5 flex items-center gap-1.5">
                <Sparkles size={14} /> Budget starting point
              </p>
              <p className="text-sm text-subtle mb-2.5 leading-relaxed">
                A rough range from what you&apos;ve described — not a quote, and not a price any worker
                has agreed to. Real bids can land above or below it.
              </p>

              {budgetRec.measured ? (
                <>
                  {/* Sized estimate: separate labor-only and materials+labor
                      lines. Both "use" buttons apply the midpoint of their own
                      band, so the two buttons mean the same kind of number, and
                      the line that matches who buys the materials is the one
                      styled as the primary choice. */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <p className="eyebrow text-subtle">
                          Labor only — you supply materials
                        </p>
                        <span className={clsx(
                          'font-bold',
                          laborIsPrimary ? 'text-lg text-accent-text-hover' : 'text-base text-body',
                        )}>
                          ${budgetRec.measured.laborMin}–${budgetRec.measured.laborMax}
                        </span>
                        <span className="text-sm text-subtle ml-2">
                          suggest ~${budgetRec.measured.laborSuggested}
                        </span>
                      </div>
                      {data.budgetMode === 'fixed' && (
                        <button
                          type="button"
                          onClick={() => applyBudgetAmount(budgetRec.measured!.laborSuggested)}
                          className={clsx(
                            'btn-secondary px-3 py-2 min-h-11',
                            laborIsPrimary
                              ? 'bg-accent text-on-accent hover:bg-accent-hover'
                              : 'border border-accent/50 text-accent-text hover:bg-accent/10',
                          )}
                        >
                          <Wand2 size={14} /> Use labor budget
                        </button>
                      )}
                    </div>

                    {budgetRec.measured.totalSuggested != null && (
                      <div className="flex items-center justify-between gap-3 flex-wrap border-t border-line pt-2.5">
                        <div>
                          <p className="eyebrow text-subtle">
                            Materials + labor — rough total
                          </p>
                          <span className={clsx(
                            'font-bold',
                            laborIsPrimary ? 'text-base text-body' : 'text-lg text-accent-text-hover',
                          )}>
                            ~${budgetRec.measured.totalMin}–${budgetRec.measured.totalMax}
                          </span>
                          <span className="text-sm text-subtle ml-2">
                            suggest ~${budgetRec.measured.totalSuggested}
                          </span>
                        </div>
                        {data.budgetMode === 'fixed' && (
                          <button
                            type="button"
                            onClick={() => applyBudgetAmount(budgetRec.measured!.totalSuggested!)}
                            className={clsx(
                            'btn-secondary px-3 py-2 min-h-11',
                              laborIsPrimary
                                ? 'border border-accent/50 text-accent-text hover:bg-accent/10'
                                : 'bg-accent text-on-accent hover:bg-accent-hover',
                            )}
                          >
                          <Wand2 size={14} /> Use total budget
                          </button>
                        )}
                      </div>
                    )}

                    <p className="text-sm text-subtle leading-relaxed border-t border-line pt-2.5">
                      <span className="eyebrow text-subtle">Time</span>{' '}
                      {budgetRec.measured.timeEstimate}
                    </p>

                    {budgetRec.measured.assumptions.length > 0 && (
                      <ul className="text-sm text-subtle leading-relaxed list-disc list-inside space-y-0.5">
                        {budgetRec.measured.assumptions.map((a) => (
                          <li key={a}>{a}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {budgetApplied && (
                    <p className="text-sm text-accent-text mt-2">Applied ✓ — edit the budget field any time.</p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-sm text-muted leading-relaxed">
                    {budgetRec.explanation}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
                    <span className="font-bold text-lg text-accent-text-hover">
                      ${budgetRec.min}–${budgetRec.max}{data.payType === 'hourly' ? '/hr' : ''}
                    </span>
                    {data.budgetMode === 'fixed' && (
                      <button
                        type="button"
                        onClick={() => applyBudgetAmount(bandMidpoint(budgetRec.min, budgetRec.max))}
                        className="btn-secondary px-4 py-2 min-h-11"
                      >
                        <Wand2 size={16} /> {budgetApplied ? 'Applied' : 'Use this budget'}
                      </button>
                    )}
                  </div>
                </>
              )}

              <p className="text-sm text-subtle mt-2 leading-relaxed">
                {data.budgetMode === 'quote'
                  ? 'Rough sizing only — workers set the real number in their bids.'
                  : 'A starting point you can change. Bids you receive decide the final amount.'}
              </p>

              {/* When the job looks contractor-scale, nudge toward letting workers
                  quote rather than anchoring a single (often too-low) number. */}
              {budgetRec.contractor.required && data.budgetMode === 'fixed' && (
                <button
                  type="button"
                  onClick={() => changePricing({ budgetMode: 'quote' })}
                  className="btn-secondary btn-block mt-3"
                >
                  This looks like a bigger job — let qualified workers bid it instead
                </button>
              )}

              {/* California contractor-license guidance (informational, not legal advice). */}
              {budgetRec.contractor.message && (
                <div
                  className={clsx(
                    'mt-3 rounded-md border p-3 flex items-start gap-2',
                    budgetRec.contractor.required
                      ? 'border-danger/40 bg-danger/[0.07]'
                      : 'border-line bg-surface',
                  )}
                >
                  <AlertTriangle
                    size={13}
                    className={clsx('mt-0.5 flex-shrink-0', budgetRec.contractor.required ? 'text-danger' : 'text-subtle')}
                  />
                  <p
                    className={clsx(
                      'text-sm leading-relaxed',
                      budgetRec.contractor.required ? 'text-danger' : 'text-subtle',
                    )}
                  >
                    {budgetRec.contractor.message}
                  </p>
                </div>
              )}
            </div>

            {/* Who buys the materials — the most common reason bids come back
                wildly different on physical work. */}
            <div>
              <FieldLabel>Materials (optional)</FieldLabel>
              <select
                value={data.materialsBy}
                onChange={(e) => update('materialsBy', e.target.value as MaterialsBy)}
                className={clsx(inputCls, 'cursor-pointer')}
              >
                {MATERIALS_OPTIONS.map((m) => (
                  <option key={m.value || 'unset'} value={m.value}>{m.label}</option>
                ))}
              </select>
              <p className="text-sm text-subtle mt-1.5 leading-relaxed">
                {materialsHelperText(data.materialsBy)}
              </p>
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
                <p className="text-sm text-subtle mt-1.5 leading-relaxed">
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
                <p className="text-sm text-subtle mt-1.5 leading-relaxed">
                  How soon do you need help?
                </p>
              </div>
            </div>

            {/* Recurring booking */}
            <div className="rounded-lg border border-line p-4 space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.isRecurring}
                  onChange={(e) => update('isRecurring', e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-line bg-surface text-accent-text focus:ring-accent"
                />
                <span>
                  <span className="block text-base font-semibold text-body">
                    This is a recurring job
                  </span>
                  <span className="block text-sm text-subtle mt-0.5">
                    {PLATFORM_PAYMENTS_ENABLED
                      ? 'Keep repeat work (e.g. weekly mowing) on your board. You confirm and pay for each visit separately — nothing is charged in advance.'
                      : 'Keep repeat work (e.g. weekly mowing) on your board. You and the worker agree how each visit will be paid, then settle directly.'}
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
                      min={data.deadline || minDate}
                      onChange={(e) => update('recurrenceEndDate', e.target.value)}
                      className={clsx(inputCls, '[color-scheme:dark]')}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Secondary TryHardly layer: posting stays simple; tier and worker
                XP are handled by us after the job is posted. No XP to configure. */}
            <p className="text-sm text-subtle leading-relaxed flex items-start gap-1.5">
              <Sparkles size={11} className="mt-0.5 flex-shrink-0 text-accent-text" />
              We&apos;ll size the job automatically after you post.
            </p>
          </div>
        )}

        {/* ── Step 3: Review ── */}
        {step === 3 && (
          <div>
            <p className="text-sm text-subtle leading-relaxed mb-4">
              Here&apos;s what workers will see. Check it over — you can edit anything before posting.
            </p>
            <div className="bg-surface border border-line rounded-xl p-6 mb-4">
              <div className="flex items-start justify-between gap-3 mb-1.5">
                <h3 className="font-bold text-base text-strong">{data.title}</h3>
                <button
                  type="button"
                  onClick={() => editStep(1)}
                  className="text-sm text-subtle hover:text-accent-text transition-colors flex-shrink-0 underline"
                >
                  Edit details
                </button>
              </div>
              <div className="flex gap-2 flex-wrap mb-4">
                {posterBadge && (
                  <span className={clsx(
                    'text-sm font-semibold tracking-wide border rounded-sm px-2 py-0.5',
                    posterBadge.classes,
                  )}>{posterBadge.label}</span>
                )}
                <span className="text-sm text-subtle bg-surface border border-line rounded-sm px-2 py-0.5">
                  {selectedCategory?.shortLabel}
                </span>
              </div>
              <ReviewRow label="Location" value={`${data.areaZip}, ${data.state.toUpperCase()}`} />
              <ReviewRow label="Needed by" value={formatDate(data.deadline)} />
              <ReviewRow
                label="Budget"
                value={
                  data.budgetMode === 'quote'
                    ? 'Workers bid their own price'
                    : `$${data.reward} ${data.payType === 'hourly' ? '/ hour' : 'flat'} · starting point`
                }
              />
              {data.materialsBy && (
                <ReviewRow
                  label="Materials"
                  value={MATERIALS_OPTIONS.find((m) => m.value === data.materialsBy)?.summary ?? ''}
                />
              )}
              {data.difficulty && (
                <ReviewRow label="Effort" value={DIFFICULTY_LABELS[data.difficulty]} />
              )}
              {data.urgency && (
                <ReviewRow label="Timing" value={URGENCY_LABELS[data.urgency]} />
              )}
              {data.isRecurring && (
                <ReviewRow
                  label="Repeats"
                  value={`${CADENCE_OPTIONS.find((c) => c.value === data.recurrenceCadence)?.label ?? 'Weekly'}${
                    data.recurrenceEndDate ? ` · until ${formatDate(data.recurrenceEndDate)}` : ''
                  }`}
                />
              )}
              <div className="pt-3">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <p className="eyebrow">Full details</p>
                  <button
                    type="button"
                    onClick={() => editStep(2)}
                    className="text-sm text-subtle hover:text-accent-text transition-colors flex-shrink-0 underline"
                  >
                    Edit scope &amp; budget
                  </button>
                </div>
                <p className="text-sm text-subtle leading-relaxed line-clamp-4">{data.description}</p>
                {/* The photo goes out with the job, so the poster sees exactly
                    the one they attached before publishing — or none at all. */}
                {data.photoUrl.trim() && isValidPhotoUrl(data.photoUrl.trim()) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={data.photoUrl.trim()}
                    alt="Job photo"
                    className="mt-3 w-full max-h-48 object-cover rounded-lg border border-line"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                )}
              </div>
            </div>
            <p className="text-base text-subtle leading-relaxed mb-3 rounded-md border border-line bg-surface px-3.5 py-2.5">
              {TRUST_LINE} Your job goes on the local job board, workers send bids, and you choose
              the worker and price that work for you.
            </p>
            {!currentUserId && (
              <p className="text-sm text-accent-text leading-relaxed mb-3 rounded-md border border-accent/25 bg-accent/[0.04] px-3.5 py-2.5">
                Last step: create a free account to publish this job. Posting stays free — the
                account is what lets you receive bids, message workers, and pick who does the work.
                We&apos;ll keep these details and bring you right back here.
              </p>
            )}
            <p className="text-base text-body leading-relaxed mb-5">
              By posting, you agree to TryHardly&apos;s terms and{' '}
              <a href="/prohibited-services" className="underline hover:text-subtle">prohibited services policy</a>.{' '}
              {PLATFORM_PAYMENTS_ENABLED
                ? 'Payments are processed by Stripe, and the agreed amount is captured with payout to the worker once you confirm the job is complete.'
                : 'You and your worker agree on the price and settle payment directly. TryHardly does not process the payment, hold funds, or take a cut.'}
            </p>
          </div>
        )}

        {/* Error summary. Individual messages also render inline under their
            field; this repeats them so nothing is missed off-screen. */}
        {(issues.length > 0 || submitError) && (
          <div role="alert" className="mt-5 p-3.5 bg-danger/[0.07] border border-danger/25 rounded-lg space-y-1">
            <p className="text-base font-semibold text-danger mb-1.5">
              {submitError ? 'We couldn’t post your job yet' : 'Please fix these items before continuing'}
            </p>
            {submitError && <p className="text-sm text-danger">Please try again. If it still does not work, contact support.</p>}
            {issues.map((i) => (
              <p key={`${i.field}-${i.message}`} className="text-sm text-danger">· {i.message}</p>
            ))}
          </div>
        )}

        {/* Nav buttons */}
        <div className="flex justify-between mt-6">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="btn-secondary"
            >
              <ChevronLeft size={16} /> Back
            </button>
          ) : <div />}

          {step < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              className="btn-primary btn-lg"
            >
              Next <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className={clsx(
                'btn-primary btn-lg',
                submitting && 'cursor-wait',
              )}
            >
              {submitting
                ? 'Posting…'
                : currentUserId
                ? 'Post job — free'
                : 'Create free account & post'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

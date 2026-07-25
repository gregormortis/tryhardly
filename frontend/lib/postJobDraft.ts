// Draft handoff for the post-a-job flow. A logged-out visitor can fill the whole
// wizard; only the final publish needs an account. The draft is stashed for that
// one round trip through sign-in/registration and read back exactly once, so what
// they typed survives the account step instead of being lost at a login wall.
//
// sessionStorage (not localStorage) on purpose: the draft is tied to the tab that
// is mid-flow, and it disappears when that session ends.

import type { Difficulty, Urgency } from './budgetInference';
import type { RecurrenceCadence } from './types';

export type PayType = 'flat' | 'hourly';
export type BudgetMode = 'fixed' | 'quote';
export type MaterialsBy = '' | 'poster' | 'worker';

// The full set of poster-entered values in the wizard. Owned here so the draft
// round trip and the form can never drift apart.
export interface PostJobFormValues {
  title: string;
  category: string;
  areaZip: string;
  state: string;
  description: string;
  reward: string;
  budgetMode: BudgetMode;
  payType: PayType;
  deadline: string;
  xpReward: number;
  difficulty: Difficulty | '';
  urgency: Urgency | '';
  materialsBy: MaterialsBy;
  photoUrl: string;
  isRecurring: boolean;
  recurrenceCadence: RecurrenceCadence;
  recurrenceEndDate: string;
}

export interface PostJobDraft {
  // The plain-language summary typed at the top of step 1.
  needText: string;
  values: PostJobFormValues;
}

export const EMPTY_POST_JOB_VALUES: PostJobFormValues = {
  title: '', category: '', areaZip: '', state: '',
  description: '', reward: '', budgetMode: 'fixed', payType: 'flat', deadline: '', xpReward: 0,
  difficulty: '', urgency: '', materialsBy: '',
  photoUrl: '',
  isRecurring: false, recurrenceCadence: 'WEEKLY', recurrenceEndDate: '',
};

export const POST_JOB_DRAFT_KEY = 'tryhardly:post-job-draft';

function str(value: unknown, max = 5000): string {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

export function serializePostJobDraft(draft: PostJobDraft): string {
  return JSON.stringify(draft);
}

// Rebuilds a complete, well-typed draft from stored JSON. Every field is read
// back through a type check so a stale or hand-edited payload can never put the
// form into a state the validator wouldn't catch (e.g. an unknown budgetMode
// that skips the budget rule). Returns null when there is nothing usable.
export function parsePostJobDraft(raw: string | null | undefined): PostJobDraft | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const envelope = parsed as Record<string, unknown>;
  if (!envelope.values || typeof envelope.values !== 'object') return null;
  const v = envelope.values as Record<string, unknown>;
  return {
    needText: str(envelope.needText, 1000),
    values: {
      title: str(v.title, 100),
      category: str(v.category, 60),
      areaZip: str(v.areaZip, 10),
      state: str(v.state, 2),
      description: str(v.description, 1000),
      reward: str(v.reward, 12),
      budgetMode: oneOf(v.budgetMode, ['fixed', 'quote'] as const, 'fixed'),
      payType: oneOf(v.payType, ['flat', 'hourly'] as const, 'flat'),
      deadline: str(v.deadline, 10),
      // Recomputed from the budget when the form loads; never trusted from a draft.
      xpReward: 0,
      difficulty: oneOf(v.difficulty, ['easy', 'moderate', 'hard', ''] as const, ''),
      urgency: oneOf(v.urgency, ['flexible', 'soon', 'urgent', ''] as const, ''),
      materialsBy: oneOf(v.materialsBy, ['poster', 'worker', ''] as const, ''),
      photoUrl: str(v.photoUrl, 2000),
      isRecurring: v.isRecurring === true,
      recurrenceCadence: oneOf(v.recurrenceCadence, ['WEEKLY', 'BIWEEKLY', 'MONTHLY'] as const, 'WEEKLY'),
      recurrenceEndDate: str(v.recurrenceEndDate, 10),
    },
  };
}

// Storage access is wrapped because sessionStorage throws in private-mode and
// storage-disabled browsers; losing the draft is acceptable, breaking the flow
// is not.
export function savePostJobDraft(draft: PostJobDraft): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(POST_JOB_DRAFT_KEY, serializePostJobDraft(draft));
  } catch {
    // Draft is a convenience; the poster can retype it.
  }
}

export function readPostJobDraft(): PostJobDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    return parsePostJobDraft(window.sessionStorage.getItem(POST_JOB_DRAFT_KEY));
  } catch {
    return null;
  }
}

export function clearPostJobDraft(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(POST_JOB_DRAFT_KEY);
  } catch {
    // Nothing to do — a stale draft is read back at most once.
  }
}

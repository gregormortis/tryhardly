// Derivations for the logged-in dashboard: what the viewer should do next on
// each job, and how the money side of that job currently reads.
//
// The dashboard is an operational control centre, so every row has to answer
// "what happens next, and is it on me?". That answer depends on the viewer's
// side of the job (poster vs worker), the job's work status, and the payment
// state — all of which already arrive with the quest/application payloads. No
// label here invents data: when a signal is missing the helper returns null so
// the card can omit the line instead of guessing.

import type { WorkRole } from './workStatus';

export type { WorkRole };

// How urgent a row is. `action` rows are the ones that belong in "Action
// required"; `waiting` rows are under way but blocked on someone else; `done`
// rows are finished and only kept for reference.
export type NextStepTone = 'action' | 'waiting' | 'done';

export interface NextStep {
  // Plain-language statement of where the job stands / what is owed.
  label: string;
  // Button text. Null when there is genuinely nothing to press.
  cta: string | null;
  // True only when the viewer themselves is the blocker.
  actionRequired: boolean;
  tone: NextStepTone;
  // Deep-link suffix for the quest detail page (reviews live in an anchor).
  hash?: string;
  // Sort order for the "Action required" list: lower runs first. Money and the
  // completion handshake outrank housekeeping like an outstanding review.
  priority: number;
}

// Lower sorts first. Anything the viewer is not blocking sits at the bottom.
const PRIORITY = {
  confirmCompletion: 1,
  authorizePayment: 2,
  reviewBids: 3,
  continueJob: 4,
  leaveReview: 5,
  none: 99,
} as const;

export interface JobNextStepInput {
  role: WorkRole;
  questStatus?: string | null;
  // Worker side only: the status of the viewer's own bid.
  applicationStatus?: string | null;
  paymentStatus?: string | null;
  applicationCount?: number;
  viewerHasReviewed?: boolean;
}

const AUTHORIZED_STATES = ['AUTHORIZED', 'CAPTURED'];

// Whether the poster has a live authorization on the job, which is what gates a
// worker actually starting. NONE / CANCELED / CAPTURE_FAILED all mean "not yet".
export function isPaymentAuthorized(paymentStatus?: string | null): boolean {
  return !!paymentStatus && AUTHORIZED_STATES.includes(paymentStatus);
}

function bidsLabel(count: number): string {
  return count === 1 ? '1 bid to review' : `${count} bids to review`;
}

function posterNextStep(input: JobNextStepInput): NextStep {
  const { questStatus, paymentStatus, applicationCount = 0, viewerHasReviewed } = input;

  switch (questStatus) {
    case 'OPEN':
      return applicationCount > 0
        ? {
            label: bidsLabel(applicationCount),
            cta: 'Review bids',
            actionRequired: true,
            tone: 'action',
            priority: PRIORITY.reviewBids,
          }
        : {
            label: 'Collecting bids — no bids yet',
            cta: 'Manage job',
            actionRequired: false,
            tone: 'waiting',
            priority: PRIORITY.none,
          };
    case 'IN_PROGRESS':
      return isPaymentAuthorized(paymentStatus)
        ? {
            label: 'Worker booked — awaiting completion',
            cta: 'Manage job',
            actionRequired: false,
            tone: 'waiting',
            priority: PRIORITY.none,
          }
        : {
            label: 'Authorize payment to start the job',
            cta: 'Authorize payment',
            actionRequired: true,
            tone: 'action',
            priority: PRIORITY.authorizePayment,
          };
    case 'IN_REVIEW':
      return {
        label: 'Worker marked this done — confirm to finish and pay',
        cta: 'Confirm completion',
        actionRequired: true,
        tone: 'action',
        priority: PRIORITY.confirmCompletion,
      };
    case 'COMPLETED':
      return viewerHasReviewed
        ? {
            label: 'Completed',
            cta: 'View job',
            actionRequired: false,
            tone: 'done',
            priority: PRIORITY.none,
          }
        : {
            label: 'Rate the worker to finish the job',
            cta: 'Leave review',
            actionRequired: true,
            tone: 'action',
            hash: '#reviews',
            priority: PRIORITY.leaveReview,
          };
    case 'CANCELLED':
      return {
        label: 'Cancelled',
        cta: null,
        actionRequired: false,
        tone: 'done',
        priority: PRIORITY.none,
      };
    default:
      return {
        label: 'View job',
        cta: 'Manage job',
        actionRequired: false,
        tone: 'waiting',
        priority: PRIORITY.none,
      };
  }
}

function workerNextStep(input: JobNextStepInput): NextStep {
  const { applicationStatus, questStatus, paymentStatus, viewerHasReviewed } = input;

  if (applicationStatus === 'PENDING') {
    return {
      label: 'Bid submitted — waiting on the poster',
      cta: 'View job',
      actionRequired: false,
      tone: 'waiting',
      priority: PRIORITY.none,
    };
  }
  if (applicationStatus === 'REJECTED') {
    return {
      label: 'Not selected',
      cta: 'View job',
      actionRequired: false,
      tone: 'done',
      priority: PRIORITY.none,
    };
  }

  switch (questStatus) {
    case 'IN_PROGRESS':
      return isPaymentAuthorized(paymentStatus)
        ? {
            label: 'Cleared to work — submit completion when the job is done',
            cta: 'Continue job',
            actionRequired: true,
            tone: 'action',
            priority: PRIORITY.continueJob,
          }
        : {
            label: 'Waiting on the poster to authorize payment',
            cta: 'View job',
            actionRequired: false,
            tone: 'waiting',
            priority: PRIORITY.none,
          };
    case 'IN_REVIEW':
      return {
        label: 'Completion submitted — waiting on the poster to confirm',
        cta: 'View job',
        actionRequired: false,
        tone: 'waiting',
        priority: PRIORITY.none,
      };
    case 'COMPLETED':
      return viewerHasReviewed
        ? {
            label: 'Completed',
            cta: 'View job',
            actionRequired: false,
            tone: 'done',
            priority: PRIORITY.none,
          }
        : {
            label: 'Rate your client to finish the job',
            cta: 'Leave review',
            actionRequired: true,
            tone: 'action',
            hash: '#reviews',
            priority: PRIORITY.leaveReview,
          };
    case 'CANCELLED':
      return {
        label: 'Cancelled',
        cta: null,
        actionRequired: false,
        tone: 'done',
        priority: PRIORITY.none,
      };
    default:
      // An accepted bid on a job that has not started moving yet.
      return {
        label: 'Bid accepted',
        cta: 'View job',
        actionRequired: false,
        tone: 'waiting',
        priority: PRIORITY.none,
      };
  }
}

export function jobNextStep(input: JobNextStepInput): NextStep {
  return input.role === 'poster' ? posterNextStep(input) : workerNextStep(input);
}

export interface PaymentStateView {
  label: string;
  tone: string;
}

const PAYMENT_TONE = {
  neutral: 'bg-zinc-700/70 text-zinc-300',
  active: 'bg-blue-500/15 text-blue-300',
  attention: 'bg-amber-500/15 text-amber-300',
  done: 'bg-emerald-500/15 text-emerald-300',
} as const;

// The money-side pill for a job card. Wording tracks lib/paymentCopy: the
// payment method is authorized at booking, the charge is captured once the
// completed work is confirmed, and the payout follows capture. Returns null when
// there is no payment state worth reporting, so cards omit rather than invent.
export function paymentStateView(
  paymentStatus: string | null | undefined,
  questStatus: string | null | undefined,
  role: WorkRole,
): PaymentStateView | null {
  switch (paymentStatus) {
    case 'AUTHORIZED':
      if (questStatus === 'IN_REVIEW') {
        return { label: 'Ready for confirmation', tone: PAYMENT_TONE.attention };
      }
      return {
        label: questStatus === 'IN_PROGRESS' ? 'Payment authorized' : 'Awaiting completion',
        tone: PAYMENT_TONE.active,
      };
    case 'CAPTURED':
      if (role === 'worker') {
        return {
          label: questStatus === 'COMPLETED' ? 'Payout processing' : 'Charge captured',
          tone: PAYMENT_TONE.done,
        };
      }
      return { label: 'Charge captured', tone: PAYMENT_TONE.done };
    case 'CANCELED':
      return { label: 'Authorization canceled', tone: PAYMENT_TONE.neutral };
    case 'CAPTURE_FAILED':
      return { label: 'Charge not captured', tone: PAYMENT_TONE.attention };
    default:
      // NONE / missing: there is no payment state to report yet. The row's next
      // step already says whose move it is, so the pill stays off rather than
      // showing a state that does not exist.
      return null;
  }
}

// Which side of the marketplace this account is mainly using, so the dashboard
// can lead with the section they came for. Ties go to the poster view because a
// posted job carries the money decisions.
export function primaryDashboardRole(postedCount: number, workingCount: number): WorkRole {
  if (postedCount === 0 && workingCount === 0) return 'poster';
  return workingCount > postedCount ? 'worker' : 'poster';
}

// QA and admin jobs live in the same table as real ones. We never hide or delete
// them, but a row that shouts TEST should not present itself as an ordinary job
// the viewer can act on. Matches an all-caps TEST token (so "water test" and
// "Testimonial" stay clean) plus the explicit do-not-work markers.
export function isTestJobTitle(title?: string | null): boolean {
  if (!title) return false;
  if (/(^|[^A-Za-z])TEST([^A-Za-z]|$)/.test(title)) return true;
  return /\b(do not work|do not apply|do not bid)\b/i.test(title);
}

// "Last activity" on a job card. Only rendered when the backend gave us a
// timestamp — a job with no update history shows nothing rather than "just now".
export function lastActivityLabel(
  updatedAt?: string | null,
  now: Date = new Date(),
): string | null {
  if (!updatedAt) return null;
  const then = new Date(updatedAt).getTime();
  if (Number.isNaN(then)) return null;
  const minutes = Math.floor((now.getTime() - then) / 60000);
  if (minutes < 0) return null;
  if (minutes < 60) return minutes <= 1 ? 'Updated just now' : `Updated ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Updated ${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `Updated ${days}d ago`;
  return `Updated ${new Date(then).toLocaleDateString()}`;
}

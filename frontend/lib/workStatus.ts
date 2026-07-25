// Labels for the work lifecycle of an assigned job (IN_PROGRESS → IN_REVIEW →
// COMPLETED), shared by the dashboard and the quest detail page.
//
// An accepted application keeps status ACCEPTED for the rest of the job, so
// "Accepted" is only ever the right label before the work starts moving. Once a
// worker is assigned, both sides should read the *quest* status instead.

export type WorkRole = 'worker' | 'poster';

export interface WorkStatusView {
  label: string;
  // Tailwind classes for the status pill.
  tone: string;
  // The completion handshake is done and reviews are open.
  isCompleted: boolean;
  // A review from this viewer is still outstanding.
  reviewPending: boolean;
}

const TONE = {
  neutral: 'bg-zinc-700 text-zinc-300',
  active: 'bg-blue-500/20 text-blue-300',
  attention: 'bg-amber-500/20 text-amber-300',
  done: 'bg-green-500/20 text-green-300',
} as const;

// Title-case a raw enum value ("IN_PROGRESS" → "In progress") as a fallback for
// any status a newer backend adds.
function humanize(status: string): string {
  return status
    .toLowerCase()
    .split('_')
    .map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');
}

export function workStatusView(
  questStatus: string | undefined,
  role: WorkRole,
  viewerHasReviewed = false,
): WorkStatusView {
  const isCompleted = questStatus === 'COMPLETED';
  const reviewPending = isCompleted && !viewerHasReviewed;

  if (isCompleted) {
    return {
      label: reviewPending ? 'Completed • Review pending' : 'Completed',
      tone: reviewPending ? TONE.attention : TONE.done,
      isCompleted,
      reviewPending,
    };
  }

  if (questStatus === 'IN_REVIEW') {
    return {
      label:
        role === 'worker'
          ? 'Awaiting poster confirmation'
          : 'Completion submitted — confirm to finish',
      tone: TONE.attention,
      isCompleted,
      reviewPending,
    };
  }

  if (questStatus === 'IN_PROGRESS') {
    return { label: 'In progress', tone: TONE.active, isCompleted, reviewPending };
  }

  return {
    label: questStatus ? humanize(questStatus) : 'Unknown',
    tone: TONE.neutral,
    isCompleted,
    reviewPending,
  };
}

// The label for a bid row on the worker's dashboard. Before a bid is accepted the
// application status is the whole story; afterwards the job's work status is.
export function applicationStatusView(
  applicationStatus: string,
  questStatus: string | undefined,
  viewerHasReviewed = false,
): WorkStatusView {
  if (applicationStatus !== 'ACCEPTED') {
    return {
      label: humanize(applicationStatus),
      tone: applicationStatus === 'REJECTED' ? TONE.neutral : TONE.active,
      isCompleted: false,
      reviewPending: false,
    };
  }
  const view = workStatusView(questStatus, 'worker', viewerHasReviewed);
  // A won bid on a job that hasn't started moving yet still reads as "Accepted".
  if (questStatus === undefined || questStatus === 'OPEN') {
    return { ...view, label: 'Accepted', tone: TONE.done };
  }
  return view;
}

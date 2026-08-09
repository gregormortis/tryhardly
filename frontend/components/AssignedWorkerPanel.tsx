'use client';

import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import type { Quest } from '@/lib/types';
import { workStatusView } from '@/lib/workStatus';
import { AUTHORIZE_CAPTURE_PAYOUT_WORKER } from '@/lib/paymentCopy';

// Worker-facing counterpart to AcceptedBidPanel, shown on the quest detail page
// once the worker's bid has been accepted and they are the assigned worker.
//
// A quest leaves the public board as soon as it starts, so this panel is the
// worker's in-place answer to "my bid was accepted — now what?": the agreed
// amount, where the client's coordination details land, and a direct jump to the
// completion handshake further down the page.

interface AssignedWorkerPanelProps {
  quest: Quest;
}

// Prisma Decimal columns serialize to strings; coerce before formatting.
function money(value?: number | string | null): string {
  if (value === undefined || value === null || value === '') return '—';
  const n = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(n) ? `$${n.toLocaleString()}` : '—';
}

export default function AssignedWorkerPanel({ quest }: AssignedWorkerPanelProps) {
  const inReview = quest.status === 'IN_REVIEW';
  const completed = quest.status === 'COMPLETED';
  const posterId = quest.questGiver?.id ?? quest.questGiverId;

  const nextStep = completed
    ? 'This job is confirmed complete. Your payout is routed to your Stripe account after the charge is captured.'
    : inReview
      ? 'Your work is with the client for review. They will confirm it or send it back with notes.'
      : 'When the work is done, submit it for review with notes and any proof photos.';

  return (
    <div className="bg-surface border border-success/40 rounded-xl p-6 space-y-5">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="text-success shrink-0 mt-0.5" size={22} />
        <div>
          <h2 className="text-lg font-semibold text-strong">
            You&apos;re assigned to this job
          </h2>
          <p className="text-sm text-muted mt-1">{nextStep}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-raised rounded-lg px-4 py-3">
          <div className="text-[12px] uppercase tracking-wide text-subtle">Agreed amount</div>
          <div className="text-sm font-semibold text-accent-text mt-0.5">{money(quest.reward)}</div>
        </div>
        <div className="bg-raised rounded-lg px-4 py-3">
          <div className="text-[12px] uppercase tracking-wide text-subtle">Job status</div>
          <div className="text-sm font-medium text-strong mt-0.5">
            {workStatusView(quest.status, 'worker').label}
          </div>
        </div>
      </div>

      <p className="text-xs text-subtle">{AUTHORIZE_CAPTURE_PAYOUT_WORKER}</p>

      <div className="flex flex-wrap gap-3">
        {!completed && (
          <a
            href="#work-completion"
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-accent hover:bg-accent text-on-accent transition-colors"
          >
            {inReview ? 'View your submission' : 'Submit completion'}
          </a>
        )}
        {completed && (
          <a
            href="#reviews"
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-accent hover:bg-accent text-on-accent transition-colors"
          >
            Leave a review
          </a>
        )}
        {posterId && (
          <Link
            href={`/messages/${quest.id}/${posterId}`}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-line-strong text-body hover:border-accent hover:text-accent-text transition-colors"
          >
            Message the client
          </Link>
        )}
      </div>
      <p className="text-xs text-subtle">
        Contact details, the job site address, and access notes are shared by the client in your
        messages for this job.
      </p>
    </div>
  );
}

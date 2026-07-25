'use client';

import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle2, MapPin, Phone } from 'lucide-react';
import { api } from '@/lib/api';
import type { Application, Quest } from '@/lib/types';
import { posterPaymentNextStep, type PaymentStatusValue } from '@/lib/paymentCopy';
import EscrowPanel from './EscrowPanel';

// Owner-facing "what happens next" panel shown immediately after a bid is
// accepted, right on the quest detail page. The headline tracks the live
// authorization state reported by the embedded payment panel, so it stops asking
// for a payment method the poster has already authorized.
//
// It surfaces the selected worker and the exact accepted bid amount (the amount
// that will be authorized — never silently changed), explains the
// authorize → capture → payout flow, and lets the poster share practical job
// coordination details (preferred contact method + job site/address) with the
// winning bidder. Those details are sent as an on-platform message to the
// selected worker only, so they are never visible to non-selected bidders.
//
// The actual payment authorization CTA + live payment status are provided by the
// embedded EscrowPanel, which already owns the manual-capture Checkout flow and
// the worker-payout-readiness guard.

interface AcceptedBidPanelProps {
  quest: Quest;
  acceptedApplication: Application | null;
}

// Prisma Decimal columns serialize to strings; coerce before formatting.
function numeric(value?: number | string | null): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(n) ? n : null;
}

function money(n: number | null): string {
  if (n === null) return '—';
  return `$${n.toLocaleString()}`;
}

export default function AcceptedBidPanel({
  quest,
  acceptedApplication,
}: AcceptedBidPanelProps) {
  const [contactMethod, setContactMethod] = useState('');
  const [jobSite, setJobSite] = useState('');
  const [notes, setNotes] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  // Mirrored from the embedded payment panel so the headline can't keep asking
  // for an authorization that already exists.
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusValue>('NONE');
  const handlePaymentStatusChange = useCallback(
    (status: PaymentStatusValue) => setPaymentStatus(status),
    []
  );
  const nextStep = posterPaymentNextStep(paymentStatus);

  const workerId =
    acceptedApplication?.adventurerId ?? quest.assignedAdventurerId ?? null;
  const workerName = acceptedApplication?.adventurer?.username ?? 'your selected worker';

  // The amount that will be authorized is the accepted bid amount (written to
  // quest.reward at accept time). Show it exactly; never imply it changed.
  const acceptedAmount =
    numeric(acceptedApplication?.bidAmount) ??
    numeric(acceptedApplication?.proposedRate) ??
    numeric(quest.reward);

  const canSendCoordination =
    !!workerId && (contactMethod.trim() || jobSite.trim() || notes.trim());

  const handleSendCoordination = async () => {
    if (!workerId) return;
    const lines = ['Job coordination details'];
    if (contactMethod.trim()) lines.push(`Preferred contact: ${contactMethod.trim()}`);
    if (jobSite.trim()) lines.push(`Job site / address: ${jobSite.trim()}`);
    if (notes.trim()) lines.push(`Notes: ${notes.trim()}`);
    const content = lines.join('\n');

    setSending(true);
    try {
      await api.post(`/messages/quest/${quest.id}`, {
        recipientId: workerId,
        content,
      });
      setSent(true);
      toast.success('Job details sent to your selected worker.');
    } catch (err: any) {
      toast.error(err?.message || 'Could not send job details');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-gray-900 border border-violet-500/40 rounded-xl p-6 space-y-5">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="text-violet-400 shrink-0 mt-0.5" size={22} />
        <div>
          <h2 className="text-lg font-semibold text-white">{nextStep.heading}</h2>
          <p className="text-sm text-gray-400 mt-1">
            You accepted a bid from{' '}
            <span className="text-violet-300 font-medium">{workerName}</span>.{' '}
            {nextStep.detail}
          </p>
        </div>
      </div>

      {/* Selected worker + accepted amount */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-800/60 rounded-lg px-4 py-3">
          <div className="text-[11px] uppercase tracking-wide text-gray-500">
            Selected worker
          </div>
          <div className="text-sm font-medium text-gray-100 mt-0.5 truncate">
            {workerName}
          </div>
        </div>
        <div className="bg-gray-800/60 rounded-lg px-4 py-3">
          <div className="text-[11px] uppercase tracking-wide text-gray-500">
            Accepted bid amount
          </div>
          <div className="text-sm font-semibold text-amber-400 mt-0.5">
            {money(acceptedAmount)}
          </div>
        </div>
      </div>
      <p className="text-xs text-gray-500 -mt-2">
        This is the exact amount that will be authorized. It only changes if you agree a
        revised amount with your worker first.
      </p>

      {/* Job coordination details for the winning bidder */}
      <div className="rounded-lg border border-gray-800 bg-gray-950/40 p-4 space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-200">
            Share job details with {workerName}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Now that you&apos;ve accepted their bid, you can share practical contact and
            job-site details. This is sent only to your selected worker — other bidders
            can&apos;t see it.
          </p>
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-1">
            <Phone size={12} /> Preferred contact method
          </label>
          <input
            value={contactMethod}
            onChange={(e) => setContactMethod(e.target.value)}
            placeholder="e.g. Call or text 555-123-4567, or reply here"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 text-sm focus:outline-none focus:border-violet-500"
          />
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-1">
            <MapPin size={12} /> Job site / address
          </label>
          <textarea
            value={jobSite}
            onChange={(e) => setJobSite(e.target.value)}
            rows={2}
            placeholder="Street address, gate code, parking notes, where to meet…"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 text-sm resize-none focus:outline-none focus:border-violet-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">
            Anything else (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Scheduling, access, pets, or other details for the job."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 text-sm resize-none focus:outline-none focus:border-violet-500"
          />
        </div>

        <button
          type="button"
          onClick={handleSendCoordination}
          disabled={sending || !canSendCoordination}
          className="w-full rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-sm font-semibold text-gray-100 transition-colors"
        >
          {sending ? 'Sending…' : sent ? 'Send updated details' : `Send details to ${workerName}`}
        </button>
        {sent && (
          <p className="text-xs text-emerald-400">
            ✓ Sent. You can update and resend at any time.
          </p>
        )}
      </div>

      {/* Payment authorization CTA + live status (manual-capture Checkout flow). */}
      <EscrowPanel
        questId={quest.id}
        isQuestGiver
        questStatus={quest.status}
        onStatusChange={handlePaymentStatusChange}
      />
    </div>
  );
}

'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { MaterialItem, WalkthroughType } from '@/lib/types';
import { DIRECT_PAYMENT_WORKER } from '@/lib/paymentCopy';

// Professional, non-gamified bid submission form for a worker applying to a job.
// Collects a total bid, a material/labor breakdown, an itemized material list,
// tools, timeline, and an optional remote or on-site walkthrough request. This
// component is presentation + local state only — it never touches payment; it
// hands a clean payload to the parent, which POSTs it to /quests/:id/apply.

export interface BidPayload {
  coverLetter?: string;
  bidAmount?: number;
  materialCostEstimate?: number;
  laborCostEstimate?: number;
  estimatedLaborHours?: number;
  materialItems?: MaterialItem[];
  toolsNeeded?: string;
  timeline?: string;
  walkthroughRequested: boolean;
  walkthroughType: WalkthroughType;
  proposedWalkthroughTimes?: string;
  bidNotes?: string;
  legalQualificationAck?: boolean;
}

interface BidFormProps {
  // Whether the job is contractor-scale / quote-needed, which surfaces the
  // legal-qualification acknowledgement and makes it required to submit.
  contractorScale: boolean;
  submitting: boolean;
  onSubmit: (payload: BidPayload) => void;
  // Account-readiness gating. A worker may draft a bid freely, but Submit Bid is
  // disabled until their required account setup is ready. When
  // `payoutReady` is undefined the status is still loading; when false we block
  // submission and surface the connect-payout guidance. Defaults keep the form
  // fully enabled for callers that don't gate on payout status.
  payoutReady?: boolean;
  payoutStatusLoading?: boolean;
  // Where to send the worker to finish required account setup.
  payoutSetupHref?: string;
  // The job may close while a worker is filling this out. Keep the fields
  // visible, but make the form read-only once the backend reports that closure.
  disabled?: boolean;
  bidCount?: number;
  maxBids?: number;
}

export const PAYOUT_SETUP_COPY =
  'Complete the required account setup before submitting bids.';

interface DraftMaterial {
  name: string;
  quantity: string;
  unit: string;
  estimatedCost: string;
  notes: string;
}

const EMPTY_MATERIAL: DraftMaterial = {
  name: '',
  quantity: '',
  unit: '',
  estimatedCost: '',
  notes: '',
};

const inputClass =
  'w-full bg-raised border border-line-strong rounded-lg px-3 py-2 text-strong text-sm focus:outline-none focus:border-accent';

function toNumber(value: string): number | undefined {
  if (value.trim() === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export default function BidForm({
  contractorScale,
  submitting,
  onSubmit,
  payoutReady = true,
  payoutStatusLoading = false,
  payoutSetupHref = '/dashboard',
  disabled = false,
  bidCount,
  maxBids,
}: BidFormProps) {
  const [bidAmount, setBidAmount] = useState('');
  const [materialCost, setMaterialCost] = useState('');
  const [laborCost, setLaborCost] = useState('');
  const [laborHours, setLaborHours] = useState('');
  const [materials, setMaterials] = useState<DraftMaterial[]>([]);
  const [toolsNeeded, setToolsNeeded] = useState('');
  const [timeline, setTimeline] = useState('');
  const [bidNotes, setBidNotes] = useState('');
  const [coverLetter, setCoverLetter] = useState('');

  const [walkthroughType, setWalkthroughType] = useState<WalkthroughType>('NONE');
  const [proposedTimes, setProposedTimes] = useState('');

  const [legalAck, setLegalAck] = useState(false);
  const [error, setError] = useState('');

  const materialsTotal = useMemo(
    () =>
      materials.reduce((sum, m) => {
        const cost = Number(m.estimatedCost) * (Number(m.quantity) || 1);
        return Number.isFinite(cost) ? sum + cost : sum;
      }, 0),
    [materials]
  );

  // Live estimate summary so the worker sees how their material + labor figures
  // add up as they type. Shown only once a relevant figure is entered.
  const materialNum = toNumber(materialCost);
  const laborNum = toNumber(laborCost);
  const totalNum = toNumber(bidAmount);
  const showSummary =
    materialNum !== undefined || laborNum !== undefined || totalNum !== undefined;
  const fmt = (n: number) => `$${n.toLocaleString()}`;

  const addMaterial = () => setMaterials((prev) => [...prev, { ...EMPTY_MATERIAL }]);
  const removeMaterial = (i: number) =>
    setMaterials((prev) => prev.filter((_, idx) => idx !== i));
  const updateMaterial = (i: number, field: keyof DraftMaterial, value: string) =>
    setMaterials((prev) =>
      prev.map((m, idx) => (idx === i ? { ...m, [field]: value } : m))
    );

  const handleSubmit = () => {
    setError('');

    // Setup precondition: a worker can draft a bid, but cannot submit until
    // their required account setup is ready. Guard here as well as via the
    // disabled button so the copy is always shown when they try.
    if (!payoutReady) {
      setError(PAYOUT_SETUP_COPY);
      return;
    }

    const amount = toNumber(bidAmount);
    const cover = coverLetter.trim();

    if (amount === undefined && cover === '') {
      setError('Enter your total bid, or add a note to the client.');
      return;
    }
    if (contractorScale && !legalAck) {
      setError('Please acknowledge the qualification statement to submit a bid for this job.');
      return;
    }

    const cleanMaterials: MaterialItem[] = materials
      .filter((m) => m.name.trim() !== '')
      .map((m) => ({
        name: m.name.trim(),
        quantity: toNumber(m.quantity) ?? null,
        unit: m.unit.trim() || null,
        estimatedCost: toNumber(m.estimatedCost) ?? null,
        notes: m.notes.trim() || null,
      }));

    onSubmit({
      coverLetter: cover || undefined,
      bidAmount: amount,
      materialCostEstimate: toNumber(materialCost),
      laborCostEstimate: toNumber(laborCost),
      estimatedLaborHours: toNumber(laborHours),
      materialItems: cleanMaterials.length > 0 ? cleanMaterials : undefined,
      toolsNeeded: toolsNeeded.trim() || undefined,
      timeline: timeline.trim() || undefined,
      walkthroughRequested: walkthroughType !== 'NONE',
      walkthroughType,
      proposedWalkthroughTimes:
        walkthroughType !== 'NONE' && proposedTimes.trim() !== ''
          ? proposedTimes.trim()
          : undefined,
      bidNotes: bidNotes.trim() || undefined,
      legalQualificationAck: legalAck,
    });
  };

  return (
    <fieldset disabled={disabled} className="min-w-0 space-y-5 border-0 p-0 m-0">
      <div>
        <h3 className="text-base font-semibold text-strong">Submit your bid</h3>
        <p className="text-xs text-subtle mt-1">
          Give the client a clear estimate. {DIRECT_PAYMENT_WORKER}
        </p>
        {bidCount !== undefined && (
          <p className="text-xs text-muted mt-2">
            {maxBids !== undefined && maxBids > 0
              ? `${bidCount} of ${maxBids} bids — closes at ${maxBids}`
              : `${bidCount} bids so far`}
          </p>
        )}
      </div>

      {error && (
        <div className="p-3 bg-danger/30 border border-danger rounded-lg text-danger text-sm">
          {error}
        </div>
      )}

      {/* Total bid + breakdown */}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-muted mb-1">
            Total bid (USD)
          </label>
          <input
            type="number"
            min="0"
            inputMode="decimal"
            value={bidAmount}
            onChange={(e) => setBidAmount(e.target.value)}
            placeholder="e.g. 750"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1">
            Material estimate
          </label>
          <input
            type="number"
            min="0"
            inputMode="decimal"
            value={materialCost}
            onChange={(e) => setMaterialCost(e.target.value)}
            placeholder="Materials $"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1">
            Labor estimate
          </label>
          <input
            type="number"
            min="0"
            inputMode="decimal"
            value={laborCost}
            onChange={(e) => setLaborCost(e.target.value)}
            placeholder="Labor $"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1">
            Estimated labor hours
          </label>
          <input
            type="number"
            min="0"
            inputMode="decimal"
            value={laborHours}
            onChange={(e) => setLaborHours(e.target.value)}
            placeholder="Hours"
            className={inputClass}
          />
        </div>
      </div>

      {/* Live estimate summary */}
      {showSummary && (
        <div className="rounded-lg border border-line-strong bg-raised px-3 py-2.5 text-sm">
          <div className="flex items-center justify-between text-muted">
            <span>Materials</span>
            <span>{materialNum !== undefined ? fmt(materialNum) : '—'}</span>
          </div>
          <div className="flex items-center justify-between text-muted mt-1">
            <span>Labor</span>
            <span>{laborNum !== undefined ? fmt(laborNum) : '—'}</span>
          </div>
          <div className="flex items-center justify-between font-semibold text-strong mt-2 pt-2 border-t border-line-strong/60">
            <span>Total bid</span>
            <span className="text-accent-text">{totalNum !== undefined ? fmt(totalNum) : '—'}</span>
          </div>
        </div>
      )}

      {/* Itemized materials */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-medium text-muted">
            Itemized materials (optional)
          </label>
          <button
            type="button"
            onClick={addMaterial}
            className="text-xs font-medium text-accent-text hover:text-accent-text-hover"
          >
            + Add material
          </button>
        </div>
        {materials.length === 0 ? (
          <p className="text-xs text-subtle">
            Add line items to itemize what the job needs (name, quantity, unit, cost).
          </p>
        ) : (
          <div className="space-y-2">
            {materials.map((m, i) => (
              <div
                key={i}
                className="grid grid-cols-12 gap-2 items-start bg-raised rounded-lg p-2"
              >
                <input
                  value={m.name}
                  onChange={(e) => updateMaterial(i, 'name', e.target.value)}
                  placeholder="Material"
                  className={`col-span-4 ${inputClass}`}
                />
                <input
                  value={m.quantity}
                  onChange={(e) => updateMaterial(i, 'quantity', e.target.value)}
                  placeholder="Qty"
                  type="number"
                  min="0"
                  className={`col-span-2 ${inputClass}`}
                />
                <input
                  value={m.unit}
                  onChange={(e) => updateMaterial(i, 'unit', e.target.value)}
                  placeholder="Unit"
                  className={`col-span-2 ${inputClass}`}
                />
                <input
                  value={m.estimatedCost}
                  onChange={(e) => updateMaterial(i, 'estimatedCost', e.target.value)}
                  placeholder="$ each"
                  type="number"
                  min="0"
                  className={`col-span-3 ${inputClass}`}
                />
                <button
                  type="button"
                  onClick={() => removeMaterial(i)}
                  aria-label="Remove material"
                  className="col-span-1 h-9 text-subtle hover:text-danger text-lg leading-none"
                >
                  ×
                </button>
                <input
                  value={m.notes}
                  onChange={(e) => updateMaterial(i, 'notes', e.target.value)}
                  placeholder="Notes (optional)"
                  className={`col-span-12 ${inputClass}`}
                />
              </div>
            ))}
            {materialsTotal > 0 && (
              <p className="text-xs text-subtle text-right">
                Itemized materials ≈ ${materialsTotal.toLocaleString()}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Tools / timeline */}
      <div>
        <label className="block text-xs font-medium text-muted mb-1">
          Tools / equipment / materials you&apos;ll bring
        </label>
        <textarea
          value={toolsNeeded}
          onChange={(e) => setToolsNeeded(e.target.value)}
          rows={2}
          placeholder="e.g. Power drill, post-hole digger, ladder, tarps"
          className={`${inputClass} resize-none`}
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-muted mb-1">
          Timeline / availability
        </label>
        <input
          value={timeline}
          onChange={(e) => setTimeline(e.target.value)}
          placeholder="e.g. Can start next Mon, ~2 days of work"
          className={inputClass}
        />
      </div>

      {/* Walkthrough request */}
      <div className="rounded-lg border border-line-strong bg-raised p-3 space-y-3">
        <div>
          <label className="block text-sm font-medium text-body">
            Request a walkthrough (optional)
          </label>
          <p className="text-xs text-subtle mt-0.5">
            Want to see the site before finalizing your bid? Request a remote walkthrough
            (video call) or an on-site review.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {([
            ['NONE', 'No walkthrough'],
            ['REMOTE', 'Remote walkthrough'],
            ['IN_PERSON', 'On-site review'],
          ] as [WalkthroughType, string][]).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setWalkthroughType(value)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                walkthroughType === value
                  ? 'border-accent bg-accent/15 text-accent-text-hover'
                  : 'border-line-strong text-body hover:border-line-strong'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {walkthroughType !== 'NONE' && (
          <div>
            <label className="block text-xs font-medium text-muted mb-1">
              Proposed times / availability
            </label>
            <textarea
              value={proposedTimes}
              onChange={(e) => setProposedTimes(e.target.value)}
              rows={2}
              placeholder="e.g. Weekdays after 4pm, or Sat morning"
              className={`${inputClass} resize-none`}
            />
          </div>
        )}
      </div>

      {/* Notes to client */}
      <div>
        <label className="block text-xs font-medium text-muted mb-1">
          Bid breakdown notes / notes to client
        </label>
        <textarea
          value={bidNotes}
          onChange={(e) => setBidNotes(e.target.value)}
          rows={3}
          placeholder="Explain your approach, assumptions, or anything the client should know."
          className={`${inputClass} resize-none`}
        />
      </div>

      {/* Optional cover letter (kept for the simple express-interest path) */}
      <div>
        <label className="block text-xs font-medium text-muted mb-1">
          Cover note (optional)
        </label>
        <textarea
          value={coverLetter}
          onChange={(e) => setCoverLetter(e.target.value)}
          rows={2}
          placeholder="A short intro to the client."
          className={`${inputClass} resize-none`}
        />
      </div>

      {/* Contractor legal acknowledgement for contractor-scale jobs */}
      {contractorScale && (
        <label className="flex items-start gap-2 rounded-lg border border-accent/30 bg-accent/5 p-3 cursor-pointer">
          <input
            type="checkbox"
            checked={legalAck}
            onChange={(e) => setLegalAck(e.target.checked)}
            className="mt-0.5 accent-amber-500"
          />
          <span className="text-xs text-accent-text leading-relaxed">
            I am responsible for only accepting work I am legally qualified to perform.
          </span>
        </label>
      )}

      {/* Account-readiness gate: draft freely, but Submit is blocked until the
          worker's required account setup is ready. */}
      {!payoutStatusLoading && !payoutReady && (
        <div className="rounded-lg border border-accent/40 bg-accent/5 p-3">
          <p className="text-xs text-accent-text leading-relaxed">{PAYOUT_SETUP_COPY}</p>
          <Link
            href={payoutSetupHref}
            className="mt-2 inline-block text-xs font-semibold text-accent-text hover:text-accent-text-hover underline"
          >
            Finish account setup →
          </Link>
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={disabled || submitting || payoutStatusLoading || !payoutReady}
        className="w-full bg-accent hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed text-on-accent font-bold py-3 rounded-lg transition-colors"
      >
        {disabled
          ? 'Bidding closed'
          : payoutStatusLoading
          ? 'Checking account setup…'
          : !payoutReady
          ? 'Finish account setup to submit'
          : submitting
          ? 'Submitting bid…'
          : totalNum !== undefined
          ? `Submit bid · ${fmt(totalNum)}`
          : 'Submit bid'}
      </button>
    </fieldset>
  );
}

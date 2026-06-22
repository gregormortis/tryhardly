'use client';

import { useMemo, useState } from 'react';
import type { MaterialItem, WalkthroughType } from '@/lib/types';

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
}

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
  'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 text-sm focus:outline-none focus:border-amber-500';

function toNumber(value: string): number | undefined {
  if (value.trim() === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export default function BidForm({ contractorScale, submitting, onSubmit }: BidFormProps) {
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
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold text-white">Submit your bid</h3>
        <p className="text-xs text-gray-500 mt-1">
          Give the client a clear estimate. Costs are estimates you and the client agree on —
          payment is only arranged after the client accepts a bid.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Total bid + breakdown */}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-400 mb-1">
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
          <label className="block text-xs font-medium text-gray-400 mb-1">
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
          <label className="block text-xs font-medium text-gray-400 mb-1">
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
          <label className="block text-xs font-medium text-gray-400 mb-1">
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
        <div className="rounded-lg border border-gray-700 bg-gray-800/40 px-3 py-2.5 text-sm">
          <div className="flex items-center justify-between text-gray-400">
            <span>Materials</span>
            <span>{materialNum !== undefined ? fmt(materialNum) : '—'}</span>
          </div>
          <div className="flex items-center justify-between text-gray-400 mt-1">
            <span>Labor</span>
            <span>{laborNum !== undefined ? fmt(laborNum) : '—'}</span>
          </div>
          <div className="flex items-center justify-between font-semibold text-white mt-2 pt-2 border-t border-gray-700/60">
            <span>Total bid</span>
            <span className="text-amber-400">{totalNum !== undefined ? fmt(totalNum) : '—'}</span>
          </div>
        </div>
      )}

      {/* Itemized materials */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-medium text-gray-400">
            Itemized materials (optional)
          </label>
          <button
            type="button"
            onClick={addMaterial}
            className="text-xs font-medium text-amber-400 hover:text-amber-300"
          >
            + Add material
          </button>
        </div>
        {materials.length === 0 ? (
          <p className="text-xs text-gray-600">
            Add line items to itemize what the job needs (name, quantity, unit, cost).
          </p>
        ) : (
          <div className="space-y-2">
            {materials.map((m, i) => (
              <div
                key={i}
                className="grid grid-cols-12 gap-2 items-start bg-gray-800/50 rounded-lg p-2"
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
                  className="col-span-1 h-9 text-gray-500 hover:text-red-400 text-lg leading-none"
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
              <p className="text-xs text-gray-500 text-right">
                Itemized materials ≈ ${materialsTotal.toLocaleString()}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Tools / timeline */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">
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
        <label className="block text-xs font-medium text-gray-400 mb-1">
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
      <div className="rounded-lg border border-gray-700 bg-gray-800/40 p-3 space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-200">
            Request a walkthrough (optional)
          </label>
          <p className="text-xs text-gray-500 mt-0.5">
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
                  ? 'border-amber-500 bg-amber-500/15 text-amber-300'
                  : 'border-gray-700 text-gray-300 hover:border-gray-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {walkthroughType !== 'NONE' && (
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
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
        <label className="block text-xs font-medium text-gray-400 mb-1">
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
        <label className="block text-xs font-medium text-gray-400 mb-1">
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
        <label className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 cursor-pointer">
          <input
            type="checkbox"
            checked={legalAck}
            onChange={(e) => setLegalAck(e.target.checked)}
            className="mt-0.5 accent-amber-500"
          />
          <span className="text-xs text-amber-200/90 leading-relaxed">
            I am responsible for only accepting work I am legally qualified to perform.
          </span>
        </label>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-gray-900 font-bold py-3 rounded-lg transition-colors"
      >
        {submitting
          ? 'Submitting bid…'
          : totalNum !== undefined
          ? `Submit bid · ${fmt(totalNum)}`
          : 'Submit bid'}
      </button>
    </div>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, MessageSquare, Video, MapPin, ShieldCheck } from 'lucide-react';
import type { Application, WalkthroughType } from '@/lib/types';
import { guildPathLabel } from '@/lib/guildPath';

// Poster-facing comparison of all bids on a job. Shows each bidder with their
// total bid, labor/material split, hours, timeline, walkthrough request and
// notes, and lets the poster accept one bid (which assigns that worker and sets
// the agreed amount) or set a bid aside. Selecting one bid does not auto-accept
// any other. No gamified language on this surface.

interface BidComparisonProps {
  applications: Application[];
  questId: string;
  actioningId: string | null;
  onAccept: (appId: string) => void;
  onReject: (appId: string) => void;
}

const WALKTHROUGH_LABELS: Record<WalkthroughType, string> = {
  NONE: '',
  REMOTE: 'Remote walkthrough requested',
  IN_PERSON: 'On-site review requested',
};

const STATUS_LABELS: Record<Application['status'], string> = {
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  REJECTED: 'Set aside',
};

// Prisma serializes Decimal columns (bidAmount, proposedRate, cost/hour
// estimates) to JSON *strings*, not numbers — so coerce before any numeric
// comparison or formatting. Returns null for missing/garbage values.
function numeric(value?: number | string | null): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(n) ? n : null;
}

function money(n?: number | string | null): string | null {
  const num = numeric(n);
  if (num === null) return null;
  return `$${num.toLocaleString()}`;
}

function statusBadge(status: Application['status']): string {
  if (status === 'ACCEPTED') return 'bg-green-500/20 text-green-400';
  if (status === 'REJECTED') return 'bg-gray-700 text-gray-400';
  return 'bg-yellow-500/20 text-yellow-400';
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-900/60 rounded-lg px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-sm font-medium text-gray-100">{value}</div>
    </div>
  );
}

export default function BidComparison({
  applications,
  questId,
  actioningId,
  onAccept,
  onReject,
}: BidComparisonProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const hasAccepted = applications.some((a) => a.status === 'ACCEPTED');

  // Priced bids that are still in play — used for the lowest-bid aid and the
  // summary price range at the top.
  const activePrices = applications
    .filter((a) => a.status !== 'REJECTED' && numeric(a.bidAmount) !== null)
    .map((a) => numeric(a.bidAmount)!)
    .sort((x, y) => x - y);

  const lowestBid = activePrices.length > 0 ? activePrices[0] : null;
  const highestBid = activePrices.length > 0 ? activePrices[activePrices.length - 1] : null;

  if (applications.length === 0) {
    return (
      <div className="text-center py-10 border border-dashed border-gray-800 rounded-lg bg-gray-950/30">
        <div className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-gray-800/80 mb-3">
          <MessageSquare size={20} className="text-gray-500" />
        </div>
        <p className="text-sm text-gray-300 font-medium">No bids yet</p>
        <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto leading-relaxed">
          Workers can submit a full estimate with materials, labor, and timeline. Share your job to
          attract qualified workers.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Summary bar — at-a-glance price range across active bids */}
      {activePrices.length > 1 && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-800 bg-gray-950/40 px-4 py-2.5">
          <span className="text-xs text-gray-400">
            {activePrices.length} priced {activePrices.length === 1 ? 'bid' : 'bids'}
          </span>
          <span className="text-xs text-gray-300">
            Range{' '}
            <span className="font-semibold text-amber-400">{money(lowestBid)}</span>
            {highestBid !== lowestBid && (
              <>
                {' – '}
                <span className="font-semibold text-amber-400">{money(highestBid)}</span>
              </>
            )}
          </span>
        </div>
      )}

      {applications.map((app) => {
        const total = app.bidAmount ?? app.proposedRate ?? null;
        const isLowest =
          lowestBid !== null && numeric(app.bidAmount) === lowestBid && app.status !== 'REJECTED';
        const isOpen = !!expanded[app.id];
        const walkthrough =
          app.walkthroughRequested && app.walkthroughType && app.walkthroughType !== 'NONE'
            ? WALKTHROUGH_LABELS[app.walkthroughType]
            : null;
        const isSetAside = app.status === 'REJECTED';

        return (
          <div
            key={app.id}
            className={`p-4 rounded-lg border transition-colors ${
              app.status === 'ACCEPTED'
                ? 'border-green-500/40 bg-green-500/5'
                : isSetAside
                ? 'border-gray-800 bg-gray-800/30 opacity-70'
                : 'border-gray-800 bg-gray-800/60 hover:border-gray-700'
            }`}
          >
            {/* Header: worker + total bid */}
            <div className="flex items-start justify-between gap-3">
              <Link
                href={`/profile/${app.adventurer?.username}`}
                className="flex items-center gap-3 group min-w-0"
              >
                <div className="w-10 h-10 bg-amber-500/20 border border-amber-500/40 rounded-full flex items-center justify-center text-amber-400 font-bold text-sm shrink-0">
                  {app.adventurer?.username?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="min-w-0">
                  <p className="text-white font-medium group-hover:text-amber-400 truncate">
                    {app.adventurer?.username}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    Lv.{app.adventurer?.level} • {guildPathLabel(app.adventurer?.adventurerClass)}
                  </p>
                </div>
              </Link>
              <div className="text-right shrink-0">
                {money(total) ? (
                  <div className="text-xl font-bold text-amber-400">{money(total)}</div>
                ) : (
                  <div className="text-sm text-gray-500">No price named</div>
                )}
                <span
                  className={`inline-block mt-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${statusBadge(
                    app.status
                  )}`}
                >
                  {STATUS_LABELS[app.status]}
                </span>
              </div>
            </div>

            {/* Comparison badges */}
            {(isLowest || walkthrough || app.legalQualificationAck) && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {isLowest && app.status !== 'ACCEPTED' && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-300">
                    Lowest bid
                  </span>
                )}
                {walkthrough && (
                  <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border border-sky-500/40 bg-sky-500/10 text-sky-300">
                    {app.walkthroughType === 'REMOTE' ? <Video size={11} /> : <MapPin size={11} />}
                    {walkthrough}
                  </span>
                )}
                {app.legalQualificationAck && (
                  <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-300">
                    <ShieldCheck size={11} />
                    Qualification acknowledged
                  </span>
                )}
              </div>
            )}

            {/* At-a-glance stats */}
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
              <StatTile label="Materials" value={money(app.materialCostEstimate) ?? '—'} />
              <StatTile label="Labor" value={money(app.laborCostEstimate) ?? '—'} />
              <StatTile
                label="Hours"
                value={
                  numeric(app.estimatedLaborHours) !== null
                    ? `${numeric(app.estimatedLaborHours)} h`
                    : '—'
                }
              />
              <StatTile label="Timeline" value={app.timeline || '—'} />
            </div>

            {/* Expand for full breakdown */}
            {(app.materialItems?.length ||
              app.toolsNeeded ||
              app.bidNotes ||
              app.coverLetter ||
              app.proposedWalkthroughTimes) && (
              <button
                type="button"
                onClick={() =>
                  setExpanded((prev) => ({ ...prev, [app.id]: !prev[app.id] }))
                }
                className="mt-3 text-xs font-medium text-amber-400 hover:text-amber-300"
              >
                {isOpen ? 'Hide details' : 'View full bid'}
              </button>
            )}

            {isOpen && (
              <div className="mt-3 space-y-3 border-t border-gray-700/60 pt-3">
                {app.materialItems && app.materialItems.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-gray-300 mb-1">
                      Itemized materials
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-gray-400">
                        <thead className="text-gray-500">
                          <tr className="text-left">
                            <th className="py-1 pr-2">Material</th>
                            <th className="py-1 pr-2">Qty</th>
                            <th className="py-1 pr-2">Unit</th>
                            <th className="py-1 pr-2">Est. cost</th>
                            <th className="py-1">Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {app.materialItems.map((m, i) => (
                            <tr key={i} className="border-t border-gray-800">
                              <td className="py-1 pr-2 text-gray-200">{m.name}</td>
                              <td className="py-1 pr-2">{m.quantity ?? '—'}</td>
                              <td className="py-1 pr-2">{m.unit ?? '—'}</td>
                              <td className="py-1 pr-2">{money(m.estimatedCost) ?? '—'}</td>
                              <td className="py-1">{m.notes ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {app.toolsNeeded && (
                  <div>
                    <div className="text-xs font-semibold text-gray-300 mb-0.5">
                      Tools / equipment
                    </div>
                    <p className="text-xs text-gray-400 whitespace-pre-line">{app.toolsNeeded}</p>
                  </div>
                )}
                {app.proposedWalkthroughTimes && (
                  <div>
                    <div className="text-xs font-semibold text-gray-300 mb-0.5">
                      Proposed walkthrough times
                    </div>
                    <p className="text-xs text-gray-400 whitespace-pre-line">
                      {app.proposedWalkthroughTimes}
                    </p>
                  </div>
                )}
                {app.bidNotes && (
                  <div>
                    <div className="text-xs font-semibold text-gray-300 mb-0.5">
                      Notes to client
                    </div>
                    <p className="text-xs text-gray-400 whitespace-pre-line">{app.bidNotes}</p>
                  </div>
                )}
                {app.coverLetter && (
                  <div>
                    <div className="text-xs font-semibold text-gray-300 mb-0.5">Cover note</div>
                    <p className="text-xs text-gray-400 whitespace-pre-line">{app.coverLetter}</p>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="mt-4 flex flex-wrap gap-2">
              {app.status === 'PENDING' && !hasAccepted && (
                <>
                  <button
                    onClick={() => onAccept(app.id)}
                    disabled={actioningId === app.id}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-green-500 hover:bg-green-400 text-gray-900 disabled:opacity-50 transition-colors"
                  >
                    {actioningId === app.id ? (
                      'Accepting…'
                    ) : (
                      <>
                        <Check size={15} />
                        {money(total) ? `Accept bid · ${money(total)}` : 'Accept bid'}
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => onReject(app.id)}
                    disabled={actioningId === app.id}
                    className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-700 text-gray-300 hover:border-gray-600 hover:text-gray-100 disabled:opacity-50 transition-colors"
                  >
                    Set aside
                  </button>
                </>
              )}
              {app.adventurerId && (
                <Link
                  href={`/messages/${questId}/${app.adventurerId}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border border-gray-700 text-gray-300 hover:border-amber-500 hover:text-amber-400 transition-colors"
                >
                  <MessageSquare size={14} />
                  Message
                </Link>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

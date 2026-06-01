'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import type { Quest } from '@/lib/types';

interface CompletionPanelProps {
  quest: Quest;
  isQuestGiver: boolean;
  isAssignedWorker: boolean;
  // Called after a successful action so the parent can refetch the quest.
  onChange: () => void | Promise<void>;
}

const MAX_PROOF_URLS = 8;

// Split a textarea of newline/comma-separated URLs into a clean, deduped list.
function parseUrls(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(/[\n,]/)) {
    const s = part.trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
    if (out.length >= MAX_PROOF_URLS) break;
  }
  return out;
}

// Role-aware work completion handshake surfaced on the quest detail page:
//   - assigned worker: submit completion proof (notes + image URLs)
//   - quest giver: confirm completion or request changes once proof is submitted
//   - both: see the current status and the submitted proof history
export default function CompletionPanel({
  quest,
  isQuestGiver,
  isAssignedWorker,
  onChange,
}: CompletionPanelProps) {
  const [note, setNote] = useState('');
  const [proofText, setProofText] = useState('');
  const [changeNote, setChangeNote] = useState('');
  const [busy, setBusy] = useState<null | 'submit' | 'confirm' | 'changes'>(null);

  const status = quest.status;
  const inReview = status === 'IN_REVIEW';
  const completed = status === 'COMPLETED';
  const proofUrls = quest.completionProofUrls || [];

  // The worker can submit while the quest is in progress, or resubmit while it is
  // in review (e.g. after a change request).
  const canSubmit = isAssignedWorker && (status === 'IN_PROGRESS' || status === 'IN_REVIEW');
  // The giver acts only when a completion request is awaiting review.
  const canReview = isQuestGiver && inReview;

  // Nothing to show for non-participants or quests that haven't started.
  if ((!isQuestGiver && !isAssignedWorker) || status === 'OPEN' || status === 'CANCELLED') {
    return null;
  }

  const submit = async () => {
    setBusy('submit');
    try {
      await api.post(`/quests/${quest.id}/completion/submit`, {
        note: note.trim() || undefined,
        proofUrls: parseUrls(proofText),
      });
      toast.success('Submitted for review. The quest giver will confirm or request changes.');
      setNote('');
      setProofText('');
      await onChange();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit completion');
    } finally {
      setBusy(null);
    }
  };

  const confirm = async () => {
    setBusy('confirm');
    try {
      await api.post(`/quests/${quest.id}/completion/confirm`, {});
      toast.success('Completion confirmed. You can now leave a review below.');
      await onChange();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to confirm completion');
    } finally {
      setBusy(null);
    }
  };

  const requestChanges = async () => {
    setBusy('changes');
    try {
      await api.post(`/quests/${quest.id}/completion/request-changes`, {
        note: changeNote.trim() || undefined,
      });
      toast.success('Sent back to the worker with your notes.');
      setChangeNote('');
      await onChange();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to request changes');
    } finally {
      setBusy(null);
    }
  };

  const statusBadge = completed
    ? { label: 'Completed', cls: 'bg-green-500/20 text-green-400 border-green-500/40' }
    : inReview
      ? { label: 'Awaiting review', cls: 'bg-amber-500/20 text-amber-400 border-amber-500/40' }
      : { label: 'In progress', cls: 'bg-blue-500/20 text-blue-400 border-blue-500/40' };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <h2 className="text-lg font-semibold text-white">Work completion</h2>
        <span className={`text-xs font-medium px-2 py-1 rounded-full border ${statusBadge.cls}`}>
          {statusBadge.label}
        </span>
      </div>

      {/* Most recent change request, shown to both parties while back in progress. */}
      {!completed && !inReview && quest.changeRequestNote && (
        <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-sm text-rose-300">
          <span className="font-medium text-rose-200">Changes requested:</span> {quest.changeRequestNote}
        </div>
      )}

      {/* Submitted proof + notes — visible to both parties once submitted. */}
      {(inReview || completed) && (
        <div className="mb-4 space-y-3">
          {quest.completionNote && (
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Worker&apos;s notes</p>
              <p className="text-sm text-gray-300 whitespace-pre-line">{quest.completionNote}</p>
            </div>
          )}
          {proofUrls.length > 0 ? (
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Proof of work</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {proofUrls.map((url) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={url}
                    src={url}
                    alt="Completion proof"
                    className="w-full max-h-56 object-cover rounded-lg border border-gray-800"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No proof images were attached.</p>
          )}
        </div>
      )}

      {/* Worker: submit / resubmit completion. */}
      {canSubmit && (
        <div className="space-y-3 pt-2 border-t border-gray-800">
          <p className="text-sm text-gray-300">
            {inReview ? 'Resubmit your work' : 'Mark this done and submit it for review'}
          </p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Completion notes — what you did, anything the client should know…"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 text-sm focus:outline-none focus:border-amber-500 resize-none"
          />
          <textarea
            value={proofText}
            onChange={(e) => setProofText(e.target.value)}
            rows={2}
            placeholder="Proof photo URLs — one per line (optional)"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 text-sm focus:outline-none focus:border-amber-500 resize-none"
          />
          <button
            onClick={submit}
            disabled={busy !== null}
            className="w-full sm:w-auto px-4 py-2 text-sm font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-gray-900 disabled:opacity-50"
          >
            {busy === 'submit' ? 'Submitting…' : inReview ? 'Resubmit for review' : 'Submit for review'}
          </button>
        </div>
      )}

      {/* Worker: waiting on the giver. */}
      {isAssignedWorker && inReview && (
        <p className="pt-2 text-sm text-gray-500">
          Submitted for review. We&apos;ll let you know when the client confirms or requests changes.
        </p>
      )}

      {/* Giver: confirm or request changes. */}
      {canReview && (
        <div className="space-y-3 pt-2 border-t border-gray-800">
          <p className="text-sm text-gray-300">Review the submitted work</p>
          <button
            onClick={confirm}
            disabled={busy !== null}
            className="w-full sm:w-auto px-4 py-2 text-sm font-semibold rounded-lg bg-green-500/90 hover:bg-green-400 text-gray-900 disabled:opacity-50"
          >
            {busy === 'confirm' ? 'Confirming…' : 'Confirm completion'}
          </button>
          <div className="pt-1">
            <textarea
              value={changeNote}
              onChange={(e) => setChangeNote(e.target.value)}
              rows={2}
              maxLength={2000}
              placeholder="Need changes? Tell the worker what to fix (optional)…"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 text-sm focus:outline-none focus:border-amber-500 resize-none"
            />
            <button
              onClick={requestChanges}
              disabled={busy !== null}
              className="mt-2 w-full sm:w-auto px-4 py-2 text-sm font-medium rounded-lg border border-gray-700 text-gray-200 hover:border-rose-500 hover:text-rose-300 disabled:opacity-50"
            >
              {busy === 'changes' ? 'Sending…' : 'Request changes'}
            </button>
          </div>
        </div>
      )}

      {/* Giver: nudge while still in progress (worker hasn't submitted yet). */}
      {isQuestGiver && status === 'IN_PROGRESS' && (
        <p className="pt-2 text-sm text-gray-500">
          The worker hasn&apos;t submitted this for review yet. You&apos;ll be notified when they do.
        </p>
      )}

      {completed && (
        <p className="pt-2 text-sm text-green-400">
          This task is complete{quest.completedAt ? ` (${new Date(quest.completedAt).toLocaleDateString()})` : ''}.
        </p>
      )}
    </div>
  );
}

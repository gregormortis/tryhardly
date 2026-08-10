'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import type { Quest } from '@/lib/types';
import ImageUploader from './ImageUploader';

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
  // Reviews are one per person per quest, so the prompt has to retire once this
  // viewer's review is in — otherwise it leads them into a duplicate-review error.
  const viewerHasReviewed = !!quest.viewerHasReviewed;

  // The worker can submit while the quest is in progress, or resubmit while it is
  // in review (e.g. after a change request).
  const canSubmit = isAssignedWorker && (status === 'IN_PROGRESS' || status === 'IN_REVIEW');
  // The giver acts only when a completion request is awaiting review.
  const canReview = isQuestGiver && inReview;

  // Nothing to show for non-participants or quests that haven't started.
  if ((!isQuestGiver && !isAssignedWorker) || status === 'OPEN' || status === 'CANCELLED') {
    return null;
  }

  // Uploaded photos land in the same textarea the worker can type URLs into, so
  // both entry paths share one list and one submit payload.
  const addProofUrl = (url: string) =>
    setProofText((prev) => (prev.trim() ? `${prev.trim()}\n${url}` : url));

  const submit = async () => {
    setBusy('submit');
    try {
      await api.post(`/quests/${quest.id}/completion/submit`, {
        note: note.trim() || undefined,
        proofUrls: parseUrls(proofText),
      });
      toast.success('Submitted for review. The customer will confirm or request changes.');
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
    ? { label: 'Completed', cls: 'bg-success/20 text-success border-success/40' }
    : inReview
      ? {
          label: isQuestGiver ? 'Your confirmation needed' : 'Awaiting poster confirmation',
          cls: 'bg-accent/20 text-accent-text border-accent/40',
        }
      : { label: 'In progress', cls: 'bg-info/20 text-info border-info/40' };

  return (
    <div id="work-completion" className="bg-surface border border-line rounded-xl p-6 scroll-mt-24">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <h2 className="text-lg font-semibold text-strong">Work completion</h2>
        <span className={`text-xs font-medium px-2 py-1 rounded-full border ${statusBadge.cls}`}>
          {statusBadge.label}
        </span>
      </div>

      {/* Most recent change request, shown to both parties while back in progress. */}
      {!completed && !inReview && quest.changeRequestNote && (
        <div className="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/30 text-sm text-danger">
          <span className="font-medium text-danger">Changes requested:</span> {quest.changeRequestNote}
        </div>
      )}

      {/* Submitted proof + notes — visible to both parties once submitted. */}
      {(inReview || completed) && (
        <div className="mb-4 space-y-3">
          {quest.completionNote && (
            <div>
              <p className="text-xs uppercase tracking-wider text-subtle mb-1">Worker&apos;s notes</p>
              <p className="text-sm text-body whitespace-pre-line">{quest.completionNote}</p>
            </div>
          )}
          {proofUrls.length > 0 ? (
            <div>
              <p className="text-xs uppercase tracking-wider text-subtle mb-2">Proof of work</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {proofUrls.map((url) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={url}
                    src={url}
                    alt="Completion proof"
                    className="w-full max-h-56 object-cover rounded-lg border border-line"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-subtle">No proof images were attached.</p>
          )}
        </div>
      )}

      {/* Worker: submit / resubmit completion. */}
      {canSubmit && (
        <div className="space-y-3 pt-2 border-t border-line">
          <p className="text-sm text-body">
            {inReview ? 'Resubmit your work' : 'Mark this done and submit it for review'}
          </p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Completion notes — what you did, anything the client should know…"
            className="w-full bg-raised border border-line-strong rounded-lg px-3 py-2 text-strong text-sm focus:outline-none focus:border-accent resize-none"
          />
          {/* Renders nothing unless Cloudinary is configured, so the URL box
              below stays the fallback rather than becoming a dead button. */}
          <ImageUploader
            multiple
            disabled={busy !== null}
            onUploaded={addProofUrl}
            label="Proof photos (optional)"
          />
          <textarea
            value={proofText}
            onChange={(e) => setProofText(e.target.value)}
            rows={2}
            placeholder="Proof photo URLs — one per line (optional)"
            className="w-full bg-raised border border-line-strong rounded-lg px-3 py-2 text-strong text-sm focus:outline-none focus:border-accent resize-none"
          />
          <button
            onClick={submit}
            disabled={busy !== null}
            className="w-full sm:w-auto px-4 py-2 text-sm font-semibold rounded-lg bg-accent hover:bg-accent text-on-accent disabled:opacity-50"
          >
            {busy === 'submit' ? 'Submitting…' : inReview ? 'Resubmit for review' : 'Submit for review'}
          </button>
        </div>
      )}

      {/* Worker: waiting on the giver. */}
      {isAssignedWorker && inReview && (
        <p className="pt-2 text-sm text-subtle">
          Submitted for review. We&apos;ll let you know when the client confirms or requests changes.
        </p>
      )}

      {/* Giver: confirm or request changes. */}
      {canReview && (
        <div className="space-y-3 pt-2 border-t border-line">
          <p className="text-sm text-body">Review the submitted work</p>
          <button
            onClick={confirm}
            disabled={busy !== null}
            className="w-full sm:w-auto px-4 py-2 text-sm font-semibold rounded-lg bg-success/90 hover:bg-success text-on-status disabled:opacity-50"
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
              className="w-full bg-raised border border-line-strong rounded-lg px-3 py-2 text-strong text-sm focus:outline-none focus:border-accent resize-none"
            />
            <button
              onClick={requestChanges}
              disabled={busy !== null}
              className="mt-2 w-full sm:w-auto px-4 py-2 text-sm font-medium rounded-lg border border-line-strong text-body hover:border-danger hover:text-danger disabled:opacity-50"
            >
              {busy === 'changes' ? 'Sending…' : 'Request changes'}
            </button>
          </div>
        </div>
      )}

      {/* Giver: nudge while still in progress (worker hasn't submitted yet). */}
      {isQuestGiver && status === 'IN_PROGRESS' && (
        <p className="pt-2 text-sm text-subtle">
          The worker hasn&apos;t submitted this for review yet. You&apos;ll be notified when they do.
        </p>
      )}

      {completed && (
        <div className="pt-2 space-y-2">
          <p className="text-sm text-success">
            This task is complete{quest.completedAt ? ` (${new Date(quest.completedAt).toLocaleDateString()})` : ''}.
          </p>
          {viewerHasReviewed ? (
            <p className="text-sm text-muted">
              Review submitted.{' '}
              <a href="#reviews" className="text-accent-text hover:text-accent-text-hover">
                See all reviews
              </a>
            </p>
          ) : (
            <a
              href="#reviews"
              className="inline-block px-4 py-2 text-sm font-semibold rounded-lg bg-accent hover:bg-accent text-on-accent"
            >
              Leave a review
            </a>
          )}
        </div>
      )}
    </div>
  );
}

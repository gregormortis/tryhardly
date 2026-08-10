'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Handshake } from '@/lib/types';

type ViewerRole = 'poster' | 'worker';

interface HandshakeResponse {
  handshake: Handshake | null;
  history: Handshake[];
  viewerRole: ViewerRole;
}

interface HandshakePanelProps {
  questId: string;
}

interface ProposalFormProps {
  initialHandshake?: Handshake | null;
  submitting: boolean;
  onSubmit: (values: ProposalValues) => Promise<void>;
}

interface ProposalValues {
  amount: string;
  scope: string;
  location: string;
  scheduleNote: string;
  paymentMethod: string;
}

const inputClass =
  'w-full bg-raised border border-line-strong rounded-lg px-3 py-2 text-strong text-sm focus:outline-none focus:border-accent';

function formatAmount(amountCents: number): string {
  return (amountCents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });
}

function formatTime(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function titleFor(handshake: Handshake): string {
  return handshake.version > 1 ? `Revised terms (v${handshake.version})` : 'The Handshake';
}

function ProposalForm({ initialHandshake, submitting, onSubmit }: ProposalFormProps) {
  const [amount, setAmount] = useState(
    initialHandshake ? String(initialHandshake.amountCents / 100) : '',
  );
  const [scope, setScope] = useState(initialHandshake?.scope ?? '');
  const [location, setLocation] = useState(initialHandshake?.location ?? '');
  const [scheduleNote, setScheduleNote] = useState(initialHandshake?.scheduleNote ?? '');
  const [paymentMethod, setPaymentMethod] = useState(initialHandshake?.paymentMethod ?? '');

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!scope.trim()) {
      toast.error('Describe what is included before proposing terms.');
      return;
    }

    await onSubmit({
      amount,
      scope: scope.trim(),
      location: location.trim(),
      scheduleNote: scheduleNote.trim(),
      paymentMethod: paymentMethod.trim(),
    });
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label htmlFor="handshake-amount" className="block text-xs font-medium text-muted mb-1">
          Agreed price (USD)
        </label>
        <input
          id="handshake-amount"
          type="number"
          min="20"
          max="5000"
          step="0.01"
          inputMode="decimal"
          required
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="e.g. 250"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="handshake-scope" className="block text-xs font-medium text-muted mb-1">
          What is included
        </label>
        <textarea
          id="handshake-scope"
          required
          value={scope}
          onChange={(event) => setScope(event.target.value)}
          rows={4}
          placeholder="List the work included, plus anything that is not included."
          className={`${inputClass} resize-none`}
        />
        <p className="mt-1 text-xs text-subtle">
          Scope is required. It is what disagreements are usually about.
        </p>
      </div>

      <div>
        <label htmlFor="handshake-location" className="block text-xs font-medium text-muted mb-1">
          Location (optional)
        </label>
        <input
          id="handshake-location"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          placeholder="Address, access notes, or where to meet"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="handshake-schedule" className="block text-xs font-medium text-muted mb-1">
          Schedule note (optional)
        </label>
        <input
          id="handshake-schedule"
          value={scheduleNote}
          onChange={(event) => setScheduleNote(event.target.value)}
          placeholder="e.g. Saturday morning"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="handshake-payment-method" className="block text-xs font-medium text-muted mb-1">
          How you will settle (optional)
        </label>
        <input
          id="handshake-payment-method"
          value={paymentMethod}
          onChange={(event) => setPaymentMethod(event.target.value)}
          placeholder="e.g. cash when the job is complete"
          className={inputClass}
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-accent hover:bg-accent px-4 py-2.5 text-sm font-semibold text-on-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting
          ? 'Saving terms…'
          : initialHandshake
            ? 'Propose revised terms'
            : 'Propose terms'}
      </button>
    </form>
  );
}

function Terms({ handshake }: { handshake: Handshake }) {
  const scheduledFor = formatTime(handshake.scheduledFor);

  return (
    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="rounded-lg bg-raised px-3 py-2.5">
        <dt className="text-xs uppercase tracking-wide text-subtle">Price</dt>
        <dd className="mt-0.5 text-base font-semibold text-accent-text">
          {formatAmount(handshake.amountCents)}
        </dd>
      </div>
      <div className="rounded-lg bg-raised px-3 py-2.5">
        <dt className="text-xs uppercase tracking-wide text-subtle">When</dt>
        <dd className="mt-0.5 text-sm font-medium text-strong">
          {scheduledFor ?? handshake.scheduleNote ?? 'Not set'}
        </dd>
      </div>
      <div className="rounded-lg bg-raised px-3 py-2.5">
        <dt className="text-xs uppercase tracking-wide text-subtle">Where</dt>
        <dd className="mt-0.5 text-sm font-medium text-strong">
          {handshake.location ?? 'Not set'}
        </dd>
      </div>
      <div className="rounded-lg bg-raised px-3 py-2.5">
        <dt className="text-xs uppercase tracking-wide text-subtle">How you will settle</dt>
        <dd className="mt-0.5 text-sm font-medium text-strong">
          {handshake.paymentMethod ?? 'Not set'}
        </dd>
      </div>
      <div className="rounded-lg border border-line bg-surface px-3 py-2.5 sm:col-span-2">
        <dt className="text-xs uppercase tracking-wide text-subtle">What is included</dt>
        <dd className="mt-1 whitespace-pre-line text-sm text-strong">{handshake.scope}</dd>
      </div>
    </dl>
  );
}

export default function HandshakePanel({ questId }: HandshakePanelProps) {
  const { user } = useAuth();
  const [response, setResponse] = useState<HandshakeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<null | 'propose' | 'agree' | 'decline' | 'break'>(null);
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [showBreakForm, setShowBreakForm] = useState(false);
  const [breakReason, setBreakReason] = useState('');

  const loadHandshake = useCallback(async () => {
    try {
      const data = await api.get<HandshakeResponse>(`/handshakes/quest/${questId}`);
      setResponse(data);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Could not load the agreement.');
    } finally {
      setLoading(false);
    }
  }, [questId]);

  useEffect(() => {
    setLoading(true);
    setShowRevisionForm(false);
    setShowBreakForm(false);
    setBreakReason('');
    void loadHandshake();
  }, [loadHandshake]);

  const propose = async (values: ProposalValues) => {
    setBusy('propose');
    try {
      await api.post<Handshake>(`/handshakes/quest/${questId}`, {
        amount: values.amount,
        scope: values.scope,
        location: values.location || undefined,
        scheduleNote: values.scheduleNote || undefined,
        paymentMethod: values.paymentMethod || undefined,
      });
      toast.success('Terms sent for review.');
      setShowRevisionForm(false);
      await loadHandshake();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Could not save these terms.');
    } finally {
      setBusy(null);
    }
  };

  const agree = async (handshake: Handshake) => {
    setBusy('agree');
    try {
      await api.post<Handshake>(`/handshakes/${handshake.id}/agree`, {});
      toast.success('Terms agreed and recorded.');
      await loadHandshake();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Could not agree to these terms.');
    } finally {
      setBusy(null);
    }
  };

  const decline = async (handshake: Handshake) => {
    setBusy('decline');
    try {
      await api.post<Handshake>(`/handshakes/${handshake.id}/decline`, {});
      toast.success('Terms declined. You can propose different terms.');
      await loadHandshake();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Could not decline these terms.');
    } finally {
      setBusy(null);
    }
  };

  const breakAgreement = async (handshake: Handshake) => {
    if (breakReason.trim().length < 10) {
      toast.error('Give at least 10 characters of context.');
      return;
    }

    setBusy('break');
    try {
      await api.post<Handshake>(`/handshakes/${handshake.id}/break`, {
        reason: breakReason.trim(),
      });
      toast.success('Agreement cancelled and recorded.');
      setShowBreakForm(false);
      setBreakReason('');
      await loadHandshake();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Could not cancel this agreement.');
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-line bg-surface p-6">
        <p className="text-sm text-subtle">Loading agreement…</p>
      </div>
    );
  }

  const activeHandshake = response?.handshake ?? null;
  const latestHandshake = response?.history[0] ?? null;
  const terminalHandshake =
    !activeHandshake &&
    latestHandshake &&
    (latestHandshake.status === 'BROKEN' || latestHandshake.status === 'HONORED')
      ? latestHandshake
      : null;
  const handshake = activeHandshake ?? terminalHandshake;

  if (!handshake) {
    return (
      <section className="rounded-xl border border-line bg-surface p-6 space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-strong">Agree the job details</h2>
          <p className="mt-1 text-sm text-muted">
            Before work starts, record the price, timing, place, and scope you both accept.
            It gives you both the same clear record.
          </p>
        </div>
        <ProposalForm submitting={busy === 'propose'} onSubmit={propose} />
      </section>
    );
  }

  const proposedByMe = handshake.proposedById === user?.id;
  const otherParty = response?.viewerRole === 'poster' ? 'worker' : 'poster';

  if (handshake.status === 'BROKEN') {
    const brokeIt = handshake.brokenById === user?.id ? 'You cancelled this agreement.' : 'The other person cancelled this agreement.';

    return (
      <section className="rounded-xl border border-danger/40 bg-surface p-6 space-y-4">
        <div>
          <p className="text-sm font-semibold text-danger">Agreement cancelled</p>
          <h2 className="mt-1 text-lg font-semibold text-strong">{titleFor(handshake)}</h2>
        </div>
        <Terms handshake={handshake} />
        <div className="rounded-lg border border-danger/40 bg-danger/10 p-3">
          <p className="text-sm font-medium text-danger">{brokeIt}</p>
          <p className="mt-1 text-sm text-strong">{handshake.brokenReason ?? 'No reason was recorded.'}</p>
          {formatTime(handshake.brokenAt) && (
            <p className="mt-1 text-xs text-subtle">Cancelled {formatTime(handshake.brokenAt)}</p>
          )}
        </div>
      </section>
    );
  }

  if (handshake.status === 'HONORED') {
    return (
      <section className="rounded-xl border border-success/40 bg-surface p-6 space-y-4">
        <div>
          <p className="text-sm font-semibold text-success">Completed successfully</p>
          <h2 className="mt-1 text-lg font-semibold text-strong">{titleFor(handshake)}</h2>
          {formatTime(handshake.honoredAt) && (
            <p className="mt-1 text-sm text-muted">Confirmed {formatTime(handshake.honoredAt)}</p>
          )}
        </div>
        <Terms handshake={handshake} />
      </section>
    );
  }

  if (handshake.status === 'AGREED') {
    return (
      <section className="rounded-xl border border-success/40 bg-surface p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-success">Agreed and locked</p>
            <h2 className="mt-1 text-lg font-semibold text-strong">{titleFor(handshake)}</h2>
            {formatTime(handshake.agreedAt) && (
              <p className="mt-1 text-sm text-muted">Agreed {formatTime(handshake.agreedAt)}</p>
            )}
          </div>
          <span className="rounded-full border border-success/40 bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
            Settled
          </span>
        </div>
        <Terms handshake={handshake} />

        {showBreakForm ? (
          <div className="space-y-3 border-t border-line pt-4">
            <div>
              <label htmlFor="handshake-break-reason" className="block text-sm font-semibold text-strong">
                Why are you cancelling?
              </label>
              <p className="mt-1 text-xs text-danger">
                This cancellation and your reason are recorded against you.
              </p>
            </div>
            <textarea
              id="handshake-break-reason"
              value={breakReason}
              onChange={(event) => setBreakReason(event.target.value)}
              minLength={10}
              rows={3}
              placeholder="Give the other person a clear reason."
              className={`${inputClass} resize-none`}
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => breakAgreement(handshake)}
                disabled={busy === 'break' || breakReason.trim().length < 10}
                className="rounded-lg border border-danger px-4 py-2 text-sm font-semibold text-danger disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy === 'break' ? 'Cancelling…' : 'Record cancellation'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowBreakForm(false);
                  setBreakReason('');
                }}
                disabled={busy === 'break'}
                className="rounded-lg border border-line-strong px-4 py-2 text-sm font-semibold text-strong disabled:cursor-not-allowed disabled:opacity-50"
              >
                Keep agreement
              </button>
            </div>
          </div>
        ) : (
          <div className="border-t border-line pt-4">
            <button
              type="button"
              onClick={() => setShowBreakForm(true)}
              className="text-sm font-semibold text-danger hover:text-danger"
            >
              Cancel this agreement
            </button>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-info/40 bg-surface p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-info">
            {proposedByMe ? `Waiting on the ${otherParty}.` : 'Review the proposed terms'}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-strong">{titleFor(handshake)}</h2>
        </div>
        <span className="rounded-full border border-info/40 bg-info/10 px-2.5 py-1 text-xs font-medium text-info">
          Proposed
        </span>
      </div>
      <Terms handshake={handshake} />

      {proposedByMe ? (
        showRevisionForm ? (
          <div className="space-y-3 border-t border-line pt-4">
            <div>
              <h3 className="text-sm font-semibold text-strong">Revise terms</h3>
              <p className="mt-1 text-xs text-subtle">
                Your new proposal replaces these terms and needs a new acceptance.
              </p>
            </div>
            <ProposalForm
              key={handshake.id}
              initialHandshake={handshake}
              submitting={busy === 'propose'}
              onSubmit={propose}
            />
            <button
              type="button"
              onClick={() => setShowRevisionForm(false)}
              disabled={busy === 'propose'}
              className="text-sm font-semibold text-muted hover:text-strong disabled:cursor-not-allowed disabled:opacity-50"
            >
              Keep current terms
            </button>
          </div>
        ) : (
          <div className="border-t border-line pt-4">
            <button
              type="button"
              onClick={() => setShowRevisionForm(true)}
              className="text-sm font-semibold text-accent-text hover:text-accent-text"
            >
              Revise terms
            </button>
          </div>
        )
      ) : (
        <div className="flex flex-wrap gap-2 border-t border-line pt-4">
          <button
            type="button"
            onClick={() => agree(handshake)}
            disabled={busy !== null}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-on-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy === 'agree' ? 'Agreeing…' : 'Agree to terms'}
          </button>
          <button
            type="button"
            onClick={() => decline(handshake)}
            disabled={busy !== null}
            className="rounded-lg border border-danger/40 px-4 py-2 text-sm font-semibold text-danger disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy === 'decline' ? 'Declining…' : 'Decline'}
          </button>
        </div>
      )}
    </section>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import EscrowPaymentForm from './EscrowPaymentForm';

interface Milestone {
  id: string;
  title: string;
  description: string;
  amount: number; // cents
  status: 'PENDING' | 'COMPLETED' | 'PAID';
}

// Mirrors the backend escrowService.getEscrowStatus() response shape.
interface EscrowStatus {
  questId: string;
  escrowStatus: 'NONE' | 'PENDING' | 'FUNDED' | 'PARTIALLY_RELEASED' | 'RELEASED' | 'REFUNDED';
  paymentIntentId: string | null;
  totalBudget: number; // cents
  totalEscrowed: number; // cents
  totalReleased: number; // cents
  totalRemaining: number; // cents
  platformFee: number; // cents
  milestones: Milestone[];
  paymentIntent: {
    id: string;
    status: string;
    amount: number;
    amountCaptured: number;
  } | null;
}

interface InitEscrowResponse {
  paymentIntentId: string;
  clientSecret: string;
  message?: string;
}

interface EscrowPanelProps {
  questId: string;
  isQuestGiver: boolean;
  questStatus: string;
}

const STATUS_STYLES: Record<string, string> = {
  RELEASED: 'bg-emerald-500/20 text-emerald-400',
  FUNDED: 'bg-blue-500/20 text-blue-400',
  PARTIALLY_RELEASED: 'bg-indigo-500/20 text-indigo-400',
  PENDING: 'bg-amber-500/20 text-amber-400',
  REFUNDED: 'bg-red-500/20 text-red-400',
  NONE: 'bg-zinc-700 text-zinc-400',
};

function dollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function EscrowPanel({ questId, isQuestGiver, questStatus }: EscrowPanelProps) {
  const [escrow, setEscrow] = useState<EscrowStatus | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchEscrowStatus = useCallback(async () => {
    try {
      const data = await api.get<EscrowStatus>(`/payments/quest/${questId}/status`);
      setEscrow(data);
    } catch {
      // Quest may not have escrow initialized yet — leave escrow null.
      setEscrow(null);
    }
  }, [questId]);

  useEffect(() => {
    fetchEscrowStatus();
  }, [fetchEscrowStatus]);

  const handleInitEscrow = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<InitEscrowResponse>(
        `/payments/quest/${questId}/escrow`,
        {},
      );
      setClientSecret(res.clientSecret);
      await fetchEscrowStatus();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message || 'Failed to initialize escrow');
    } finally {
      setLoading(false);
    }
  };

  // action is the backend route segment: 'complete' or 'cancel'.
  const handleAction = async (action: 'complete' | 'cancel') => {
    setActionLoading(action);
    setError(null);
    try {
      await api.post(`/payments/quest/${questId}/${action}`, {});
      setClientSecret(null);
      await fetchEscrowStatus();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message || `Failed to ${action} escrow`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmed = async () => {
    setClientSecret(null);
    await fetchEscrowStatus();
  };

  // ── No escrow yet ──────────────────────────────────────────────────────────
  if (!escrow || escrow.escrowStatus === 'NONE') {
    return (
      <div className="mt-6 p-4 rounded-lg border border-zinc-700 bg-zinc-900">
        <h3 className="text-base font-semibold text-zinc-100 mb-2">Payment Escrow</h3>
        {clientSecret ? (
          <div className="space-y-3">
            <p className="text-sm text-zinc-400">
              Confirm payment to authorize the escrow hold. Funds are captured only when you
              complete the quest.
            </p>
            <EscrowPaymentForm clientSecret={clientSecret} onConfirmed={handleConfirmed} />
          </div>
        ) : isQuestGiver ? (
          <div>
            <p className="text-sm text-zinc-400 mb-3">
              Lock in payment before work begins. Funds are held securely until the quest is
              complete.
            </p>
            {error && <p className="text-xs text-rose-400 mb-2">{error}</p>}
            <button
              onClick={handleInitEscrow}
              disabled={loading}
              className="w-full rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 px-4 py-2.5 text-sm font-bold text-white transition-colors"
            >
              {loading ? 'Initializing…' : 'Initialize Escrow'}
            </button>
          </div>
        ) : (
          <p className="text-sm text-zinc-400">
            Waiting for the quest giver to initialize payment escrow.
          </p>
        )}
      </div>
    );
  }

  // ── Escrow exists ──────────────────────────────────────────────────────────
  const canComplete =
    isQuestGiver &&
    ['PENDING', 'FUNDED', 'PARTIALLY_RELEASED'].includes(escrow.escrowStatus);
  const canCancel =
    isQuestGiver &&
    ['PENDING', 'FUNDED', 'PARTIALLY_RELEASED'].includes(escrow.escrowStatus);

  return (
    <div className="mt-6 p-4 rounded-lg border border-zinc-700 bg-zinc-900 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-zinc-100">Payment Escrow</h3>
        <span
          className={`text-xs font-medium px-2 py-1 rounded-full ${
            STATUS_STYLES[escrow.escrowStatus] ?? STATUS_STYLES.NONE
          }`}
        >
          {escrow.escrowStatus}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-zinc-800 rounded p-2">
          <p className="text-zinc-500 text-xs">Total Budget</p>
          <p className="text-zinc-100 font-semibold">{dollars(escrow.totalBudget)}</p>
        </div>
        <div className="bg-zinc-800 rounded p-2">
          <p className="text-zinc-500 text-xs">Platform Fee</p>
          <p className="text-zinc-100 font-semibold">{dollars(escrow.platformFee)}</p>
        </div>
        <div className="bg-zinc-800 rounded p-2">
          <p className="text-zinc-500 text-xs">Released</p>
          <p className="text-zinc-100 font-semibold">{dollars(escrow.totalReleased)}</p>
        </div>
        <div className="bg-zinc-800 rounded p-2">
          <p className="text-zinc-500 text-xs">Remaining</p>
          <p className="text-zinc-100 font-semibold">{dollars(escrow.totalRemaining)}</p>
        </div>
      </div>

      {escrow.milestones.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-zinc-500 uppercase tracking-wide">Milestones</p>
          {escrow.milestones.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between text-sm bg-zinc-800/60 rounded px-2 py-1.5"
            >
              <span className="text-zinc-300">{m.title}</span>
              <span className="flex items-center gap-2">
                <span className="text-zinc-400">{dollars(m.amount)}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded ${
                    m.status === 'PAID'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-zinc-700 text-zinc-400'
                  }`}
                >
                  {m.status}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}

      {/* If escrow is PENDING and the giver re-opens with a fresh clientSecret. */}
      {clientSecret && escrow.escrowStatus === 'PENDING' && (
        <EscrowPaymentForm clientSecret={clientSecret} onConfirmed={handleConfirmed} />
      )}

      {error && <p className="text-xs text-rose-400">{error}</p>}

      {isQuestGiver && (canComplete || canCancel) && (
        <div className="flex gap-2">
          {canComplete && (
            <button
              onClick={() => handleAction('complete')}
              disabled={actionLoading === 'complete'}
              className="flex-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-3 py-2 text-xs font-bold text-white transition-colors"
            >
              {actionLoading === 'complete' ? 'Releasing…' : 'Complete & Release'}
            </button>
          )}
          {canCancel && (
            <button
              onClick={() => handleAction('cancel')}
              disabled={actionLoading === 'cancel'}
              className="flex-1 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 px-3 py-2 text-xs font-bold text-white transition-colors"
            >
              {actionLoading === 'cancel' ? 'Cancelling…' : 'Cancel & Refund'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

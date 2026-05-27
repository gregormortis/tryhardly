'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

interface Milestone {
  id: string;
  title: string;
  description: string;
  amount: number;
  status: 'PENDING' | 'PAID';
}

interface EscrowStatus {
  escrowStatus: string;
  paymentIntentId: string | null;
  totalBudget: number;
  releasedAmount: number;
  remainingAmount: number;
  platformFee: number;
  milestones: Milestone[];
  stripeStatus: string | null;
}

interface EscrowPanelProps {
  questId: string;
  isQuestGiver: boolean;
  questStatus: string;
  escrowStatus?: string;
}

export default function EscrowPanel({ questId, isQuestGiver, questStatus, escrowStatus: initialEscrowStatus }: EscrowPanelProps) {
  const [escrow, setEscrow] = useState<EscrowStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const fetchEscrowStatus = useCallback(async () => {
    try {
      const data = await api.get<EscrowStatus>(`/api/payments/quest/${questId}/status`);
      setEscrow(data);
    } catch {
      // Quest may not have escrow initialized yet
    }
  }, [questId]);

  useEffect(() => {
    if (initialEscrowStatus && initialEscrowStatus !== 'NONE') {
      fetchEscrowStatus();
    }
  }, [questId, initialEscrowStatus, fetchEscrowStatus]);

  const handleInitEscrow = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<{ clientSecret: string }>(`/api/payments/quest/${questId}/escrow`, {});
      setClientSecret(res.clientSecret);
      await fetchEscrowStatus();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message || 'Failed to initialize escrow');
    } finally {
      setLoading(false);
    }
  };

  const handleReleaseMilestone = async (milestoneId: string) => {
    setActionLoading(milestoneId);
    setError(null);
    try {
      await api.post(`/api/payments/milestone/${milestoneId}/release`, {});
      await fetchEscrowStatus();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message || 'Failed to release milestone payment');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCompleteQuest = async () => {
    setActionLoading('complete');
    setError(null);
    try {
      await api.post(`/api/payments/quest/${questId}/complete`, {});
      await fetchEscrowStatus();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message || 'Failed to complete quest payment');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelQuest = async () => {
    if (!confirm('Cancel this quest and refund escrowed funds?')) return;
    setActionLoading('cancel');
    setError(null);
    try {
      await api.post(`/api/payments/quest/${questId}/cancel`, {});
      await fetchEscrowStatus();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message || 'Failed to cancel quest');
    } finally {
      setActionLoading(null);
    }
  };

  // Show init escrow button for quest givers when quest is claimed but not yet funded
  if (isQuestGiver && (questStatus === 'CLAIMED' || questStatus === 'ASSIGNED') && (!initialEscrowStatus || initialEscrowStatus === 'NONE')) {
    return (
      <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-4 space-y-3">
        <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">Payment Escrow</h3>
        <p className="text-xs text-zinc-400">
          Lock in the payment before work begins. Funds are held securely until the quest is complete.
        </p>
        {clientSecret && (
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3">
            <p className="text-xs text-emerald-400 font-semibold">✓ Payment authorized — awaiting confirmation</p>
            <p className="text-xs text-zinc-400 mt-1">Payment Intent ID: <code className="text-zinc-300">{clientSecret.split('_secret_')[0]}</code></p>
          </div>
        )}
        {error && <p className="text-xs text-rose-400">{error}</p>}
        {!clientSecret && (
          <button
            onClick={handleInitEscrow}
            disabled={loading}
            className="w-full rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 px-4 py-2.5 text-sm font-bold text-black transition-colors"
          >
            {loading ? 'Authorizing...' : 'Fund Escrow'}
          </button>
        )}
      </div>
    );
  }

  if (!escrow) return null;

  const escrowColor = {
    NONE: 'zinc',
    PENDING: 'amber',
    FUNDED: 'emerald',
    RELEASED: 'blue',
    REFUNDED: 'zinc',
  }[escrow.escrowStatus] || 'zinc';

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">Payment Escrow</h3>
        <span className={`text-xs font-bold px-2 py-1 rounded-full bg-${escrowColor}-500/20 text-${escrowColor}-400`}>
          {escrow.escrowStatus}
        </span>
      </div>

      {/* Budget breakdown */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-zinc-700/50 p-2">
          <p className="text-xs text-zinc-400">Total</p>
          <p className="text-sm font-bold text-zinc-100">${escrow.totalBudget}</p>
        </div>
        <div className="rounded-lg bg-zinc-700/50 p-2">
          <p className="text-xs text-zinc-400">Released</p>
          <p className="text-sm font-bold text-emerald-400">${escrow.releasedAmount}</p>
        </div>
        <div className="rounded-lg bg-zinc-700/50 p-2">
          <p className="text-xs text-zinc-400">Platform Fee</p>
          <p className="text-sm font-bold text-zinc-300">{escrow.platformFee}%</p>
        </div>
      </div>

      {/* Milestones */}
      {escrow.milestones.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Milestones</p>
          {escrow.milestones.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-lg bg-zinc-700/40 px-3 py-2">
              <div>
                <p className="text-xs font-semibold text-zinc-200">{m.title}</p>
                <p className="text-xs text-zinc-400">${m.amount}</p>
              </div>
              {m.status === 'PAID' ? (
                <span className="text-xs text-emerald-400 font-bold">✓ PAID</span>
              ) : isQuestGiver && escrow.escrowStatus === 'FUNDED' ? (
                <button
                  onClick={() => handleReleaseMilestone(m.id)}
                  disabled={actionLoading === m.id}
                  className="text-xs bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold px-3 py-1 rounded-lg transition-colors"
                >
                  {actionLoading === m.id ? '...' : 'Release'}
                </button>
              ) : (
                <span className="text-xs text-zinc-500">Pending</span>
              )}
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-rose-400">{error}</p>}

      {/* Quest Giver actions */}
      {isQuestGiver && escrow.escrowStatus === 'FUNDED' && (
        <div className="flex gap-2">
          <button
            onClick={handleCompleteQuest}
            disabled={!!actionLoading}
            className="flex-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-3 py-2 text-xs font-bold text-white transition-colors"
          >
            {actionLoading === 'complete' ? 'Processing...' : 'Complete & Release All'}
          </button>
          <button
            onClick={handleCancelQuest}
            disabled={!!actionLoading}
            className="flex-1 rounded-lg bg-zinc-600 hover:bg-zinc-500 disabled:opacity-50 px-3 py-2 text-xs font-bold text-white transition-colors"
          >
            {actionLoading === 'cancel' ? 'Cancelling...' : 'Cancel Quest'}
          </button>
        </div>
      )}
    </div>
  );
}

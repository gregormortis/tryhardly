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

  const fetchEscrowStatus = useCallback(async () => {
    try {
      const data = await api.get<EscrowStatus>(`/api/payments/quest/${questId}/status`);
      setEscrow(data);
    } catch {
      // Quest may not have escrow initialized yet
    }
  }, [questId]);

  useEffect(() => {
    fetchEscrowStatus();
  }, [fetchEscrowStatus]);

  const handleInitEscrow = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.post(`/api/payments/quest/${questId}/initialize`, {});
      await fetchEscrowStatus();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message || 'Failed to initialize escrow');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: string) => {
    setActionLoading(action);
    setError(null);
    try {
      await api.post(`/api/payments/quest/${questId}/${action}`, {});
      await fetchEscrowStatus();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message || `Failed to ${action} escrow`);
    } finally {
      setActionLoading(null);
    }
  };

  if (!escrow) {
    return (
      <div className="mt-6 p-4 rounded-lg border border-zinc-700 bg-zinc-900">
        <h3 className="text-base font-semibold text-zinc-100 mb-2">Payment Escrow</h3>
        {isQuestGiver && questStatus === 'claimed' && (
          <div>
            <p className="text-sm text-zinc-400 mb-3">Lock in payment before work begins. Funds held securely until quest is complete.</p>
            {error && <p className="text-xs text-rose-400 mb-2">{error}</p>}
            <button
              onClick={handleInitEscrow}
              disabled={loading}
              className="w-full rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 px-4 py-2.5 text-sm font-bold text-white transition-colors"
            >
              {loading ? 'Initializing...' : 'Initialize Escrow'}
            </button>
          </div>
        )}
        {!isQuestGiver && (
          <p className="text-sm text-zinc-400">Waiting for quest giver to initialize payment escrow.</p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-6 p-4 rounded-lg border border-zinc-700 bg-zinc-900 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-zinc-100">Payment Escrow</h3>
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
          escrow.escrowStatus === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400' :
          escrow.escrowStatus === 'FUNDED' ? 'bg-blue-500/20 text-blue-400' :
          escrow.escrowStatus === 'CANCELLED' ? 'bg-red-500/20 text-red-400' :
          'bg-zinc-700 text-zinc-400'
        }`}>{escrow.escrowStatus}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-zinc-800 rounded p-2">
          <p className="text-zinc-500 text-xs">Total Budget</p>
          <p className="text-zinc-100 font-semibold">${(escrow.totalBudget / 100).toFixed(2)}</p>
        </div>
        <div className="bg-zinc-800 rounded p-2">
          <p className="text-zinc-500 text-xs">Platform Fee</p>
          <p className="text-zinc-100 font-semibold">${(escrow.platformFee / 100).toFixed(2)}</p>
        </div>
      </div>

      {error && <p className="text-xs text-rose-400">{error}</p>}

      {isQuestGiver && (
        <div className="flex gap-2">
          {escrow.escrowStatus === 'FUNDED' && (
            <button
              onClick={() => handleAction('release')}
              disabled={actionLoading === 'release'}
              className="flex-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-3 py-2 text-xs font-bold text-white transition-colors"
            >
              {actionLoading === 'release' ? 'Releasing...' : 'Release Payment'}
            </button>
          )}
          {(escrow.escrowStatus === 'INITIALIZED' || escrow.escrowStatus === 'FUNDED') && (
            <button
              onClick={() => handleAction('cancel')}
              disabled={actionLoading === 'cancel'}
              className="flex-1 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 px-3 py-2 text-xs font-bold text-white transition-colors"
            >
              {actionLoading === 'cancel' ? 'Cancelling...' : 'Cancel Escrow'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

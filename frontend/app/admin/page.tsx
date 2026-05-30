'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

interface Stats {
  users: number;
  quests: number;
  openQuests: number;
  completedQuests: number;
  applications: number;
}

interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: string;
  level: number;
  reputationScore: number;
  verified: boolean;
  totalQuestsPosted: number;
  totalQuestsCompleted: number;
  createdAt: string;
}

interface AdminQuest {
  id: string;
  title: string;
  status: string;
  category: string;
  reward: number;
  createdAt: string;
  questGiver?: { id: string; username: string };
  _count?: { applications: number };
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [quests, setQuests] = useState<AdminQuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/auth/login'); return; }
    if (!isAdmin) { setLoading(false); return; }
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id]);

  const loadAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [s, u, q] = await Promise.all([
        api.get<Stats>('/admin/stats'),
        api.get<AdminUser[]>('/admin/users'),
        api.get<AdminQuest[]>('/admin/quests'),
      ]);
      setStats(s);
      setUsers(u);
      setQuests(q);
    } catch (err: any) {
      setError(err.message || 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelQuest = async (id: string) => {
    try {
      await api.put(`/admin/quests/${id}/cancel`, {});
      toast.success('Quest cancelled');
      setQuests((prev) => prev.map((q) => (q.id === id ? { ...q, status: 'CANCELLED' } : q)));
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel quest');
    }
  };

  const handleToggleVerify = async (u: AdminUser) => {
    try {
      const res = await api.put<{ id: string; verified: boolean }>(`/admin/users/${u.id}/verify`, {
        verified: !u.verified,
      });
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, verified: res.verified } : x)));
      toast.success(res.verified ? 'User verified' : 'Verification removed');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update user');
    }
  };

  if (authLoading || (loading && isAdmin)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-100 mb-2">Admin access required</h1>
          <p className="text-gray-400 mb-6">You don&apos;t have permission to view this page.</p>
          <Link href="/dashboard" className="text-amber-400 hover:text-amber-300 font-medium">
            ← Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Admin Dashboard</h1>

        {error && (
          <div className="mb-6 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
            {[
              { label: 'Users', value: stats.users },
              { label: 'Quests', value: stats.quests },
              { label: 'Open', value: stats.openQuests },
              { label: 'Completed', value: stats.completedQuests },
              { label: 'Applications', value: stats.applications },
            ].map((card) => (
              <div key={card.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center">
                <div className="text-3xl font-bold text-amber-400">{card.value}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">{card.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Quests */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-4">Recent quests</h2>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            {quests.length === 0 ? (
              <p className="p-6 text-sm text-gray-500">No quests found.</p>
            ) : (
              <div className="divide-y divide-gray-800">
                {quests.map((q) => (
                  <div key={q.id} className="flex items-center justify-between gap-4 p-4">
                    <div className="min-w-0">
                      <Link href={`/questboard/${q.id}`} className="text-white font-medium hover:text-amber-400 truncate block">
                        {q.title}
                      </Link>
                      <p className="text-xs text-gray-500">
                        {q.questGiver?.username || 'Unknown'} · {q.category} · {q._count?.applications ?? 0} applicants
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        q.status === 'OPEN' ? 'bg-green-500/20 text-green-400' :
                        q.status === 'CANCELLED' ? 'bg-red-500/20 text-red-400' :
                        'bg-gray-700 text-gray-300'
                      }`}>
                        {q.status}
                      </span>
                      {q.status !== 'CANCELLED' && q.status !== 'COMPLETED' && (
                        <button
                          onClick={() => handleCancelQuest(q.id)}
                          className="text-xs px-2 py-1 rounded border border-gray-700 text-gray-300 hover:border-red-500 hover:text-red-400"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Users */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">Recent users</h2>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            {users.length === 0 ? (
              <p className="p-6 text-sm text-gray-500">No users found.</p>
            ) : (
              <div className="divide-y divide-gray-800">
                {users.map((u) => (
                  <div key={u.id} className="flex items-center justify-between gap-4 p-4">
                    <div className="min-w-0">
                      <Link href={`/profile/${u.username}`} className="text-white font-medium hover:text-amber-400">
                        {u.username}
                      </Link>
                      <p className="text-xs text-gray-500 truncate">
                        {u.email} · Lv.{u.level} · {u.role}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {u.verified && (
                        <span className="text-xs px-2 py-1 rounded-full bg-sky-500/20 text-sky-400">Verified</span>
                      )}
                      <button
                        onClick={() => handleToggleVerify(u)}
                        className="text-xs px-2 py-1 rounded border border-gray-700 text-gray-300 hover:border-amber-500 hover:text-amber-400"
                      >
                        {u.verified ? 'Unverify' : 'Verify'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

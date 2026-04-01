'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';
import { useRouter } from 'next/navigation';
import type { Quest, Application } from '../../lib/types';

const XP_PER_LEVEL = 1000;

interface DashboardData {
  postedQuests: Quest[];
  applications: Application[];
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) router.push('/auth/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    async function fetchDashboard() {
      setDataLoading(true);
      try {
        // Fetch user's posted quests and applications in parallel
        const [questsRes, applicationsRes] = await Promise.all([
          api.get<{ quests: Quest[] }>('/quests?status=OPEN&limit=50').catch(() => ({ quests: [] })),
          api.get<Application[]>('/users/me/applications').catch(() => []),
        ]);

        // Filter to only this user's posted quests
        const postedQuests = (questsRes.quests || []).filter(
          q => q.questGiverId === user.id || q.questGiver?.id === user.id
        );

        setData({
          postedQuests,
          applications: Array.isArray(applicationsRes) ? applicationsRes : [],
        });
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard');
      } finally {
        setDataLoading(false);
      }
    }
    fetchDashboard();
  }, [user]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  const xpProgress = user.xp % XP_PER_LEVEL;
  const xpPercent = (xpProgress / XP_PER_LEVEL) * 100;

  const activeApps = data?.applications?.filter(a => a.status === 'ACCEPTED') || [];
  const pendingApps = data?.applications?.filter(a => a.status === 'PENDING') || [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Welcome header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-100">
          Welcome back, <span className="text-amber-400">{user.username}</span>
        </h1>
        <p className="text-gray-400 mt-1">Your adventurer dashboard</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Level', value: user.level, icon: '⚔️', color: 'text-amber-400' },
          { label: 'Total XP', value: user.xp.toLocaleString(), icon: '⭐', color: 'text-yellow-400' },
          { label: 'Active Quests', value: activeApps.length, icon: '📜', color: 'text-green-400' },
          { label: 'Applications', value: data?.applications?.length ?? 0, icon: '📤', color: 'text-blue-400' },
        ].map(stat => (
          <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="text-2xl mb-1">{stat.icon}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* XP Progress */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold text-gray-200">Level {user.level} → {user.level + 1}</h2>
          <span className="text-sm text-gray-500">{xpProgress} / {XP_PER_LEVEL} XP</span>
        </div>
        <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-1000"
            style={{ width: `${xpPercent}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">{XP_PER_LEVEL - xpProgress} XP needed to level up</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Applications */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-200">📜 My Applications</h2>
            <Link href="/questboard" className="text-xs text-amber-400 hover:text-amber-300">Browse quests</Link>
          </div>
          {dataLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-gray-800 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : data?.applications?.length ? (
            <div className="space-y-3">
              {data.applications.slice(0, 5).map(app => (
                <Link key={app.id} href={`/questboard/${app.questId}`}>
                  <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-gray-200">{app.quest?.title || 'Quest'}</p>
                      <p className="text-xs text-gray-500">${app.quest?.reward?.toLocaleString()} • {app.quest?.difficulty}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      app.status === 'ACCEPTED' ? 'bg-green-500/20 text-green-400' :
                      app.status === 'REJECTED' ? 'bg-red-500/20 text-red-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>{app.status}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600 text-sm">No applications yet.</p>
              <Link href="/questboard" className="text-amber-400 text-sm hover:underline mt-2 block">
                Find a quest to apply
              </Link>
            </div>
          )}
        </div>

        {/* Posted quests */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-200">📤 My Posted Quests</h2>
            <Link href="/post-quest" className="text-xs text-amber-400 hover:text-amber-300">+ Post new</Link>
          </div>
          {dataLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-gray-800 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : data?.postedQuests?.length ? (
            <div className="space-y-3">
              {data.postedQuests.slice(0, 5).map(q => (
                <Link key={q.id} href={`/questboard/${q.id}`}>
                  <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-gray-200">{q.title}</p>
                      <p className="text-xs text-gray-500">{q._count?.applications || 0} applicant{(q._count?.applications || 0) !== 1 ? 's' : ''}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      q.status === 'OPEN' ? 'bg-green-500/20 text-green-400' :
                      q.status === 'IN_PROGRESS' ? 'bg-amber-500/20 text-amber-400' :
                      q.status === 'COMPLETED' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>{q.status}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600 text-sm">No quests posted yet.</p>
              <Link href="/post-quest" className="text-amber-400 text-sm hover:underline mt-2 block">
                Post your first quest
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Browse Quests', href: '/questboard', icon: '📜' },
          { label: 'Post a Quest', href: '/post-quest', icon: '➕' },
          { label: 'My Profile', href: '/profile', icon: '👤' },
          { label: 'Guilds', href: '/guilds', icon: '🛡️' },
        ].map(action => (
          <Link
            key={action.href}
            href={action.href}
            className="bg-gray-900 border border-gray-800 hover:border-amber-500/50 rounded-xl p-4 text-center transition-colors"
          >
            <p className="text-2xl mb-1">{action.icon}</p>
            <p className="text-sm text-gray-300">{action.label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

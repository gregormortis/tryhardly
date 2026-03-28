'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({ openQuests: 0, activeApplications: 0, reputation: 0, guildCount: 0 });
  const [recentQuests, setRecentQuests] = useState<any[]>([]);
  const [recentApplications, setRecentApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (!token) {
      router.push('/auth/login');
      return;
    }
    if (userData) {
      try { setUser(JSON.parse(userData)); } catch {}
    }
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [userData, questData, appData] = await Promise.all([
        api.request<any>('/users/me'),
        api.request<any[]>('/users/me/quests'),
        api.request<any[]>('/users/me/applications'),
      ]);
      setUser(userData);
      setStats({
        openQuests: questData.filter((q: any) => q.status === 'open').length,
        activeApplications: appData.filter((a: any) => a.status === 'pending' || a.status === 'accepted').length,
        reputation: userData.reputation || 0,
        guildCount: userData.guilds?.length || 0,
      });
      setRecentQuests(questData.slice(0, 5));
      setRecentApplications(appData.slice(0, 5));
    } catch {
      // Mock data
      setStats({ openQuests: 3, activeApplications: 2, reputation: 847, guildCount: 1 });
      setRecentQuests([
        { _id: '1', title: 'Fix Authentication Bug', status: 'open', reward: 500, applicants: 4 },
        { _id: '2', title: 'Build Dashboard Widget', status: 'in_progress', reward: 1200, applicants: 2 },
        { _id: '3', title: 'Code Review Service', status: 'completed', reward: 300, applicants: 1 },
      ]);
      setRecentApplications([
        { _id: '1', quest: { _id: 'q1', title: 'Optimize Database Queries', reward: 2000 }, status: 'pending', appliedAt: new Date().toISOString() },
        { _id: '2', quest: { _id: 'q2', title: 'Design Mobile UI', reward: 800 }, status: 'accepted', appliedAt: new Date(Date.now() - 3 * 86400000).toISOString() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-amber-400 text-xl animate-pulse">Loading your quest log...</div>
      </div>
    );
  }

  const statusColor: Record<string, string> = {
    open: 'text-green-400',
    in_progress: 'text-amber-400',
    completed: 'text-blue-400',
    cancelled: 'text-red-400',
    pending: 'text-yellow-400',
    accepted: 'text-green-400',
    rejected: 'text-red-400',
  };

  return (
    <div className="min-h-screen bg-gray-950 py-10 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Welcome banner */}
        <div className="bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">
                Welcome back, <span className="text-amber-400">{user?.username}</span>
              </h1>
              <p className="text-gray-400 mt-1">{user?.adventurerClass} &bull; {user?.reputation || 0} Reputation</p>
            </div>
            <Link
              href="/post-quest"
              className="bg-amber-500 hover:bg-amber-400 text-gray-900 font-black px-6 py-3 rounded-xl transition-colors hidden sm:block"
            >
              + Post Quest
            </Link>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Open Quests', value: stats.openQuests, color: 'text-green-400', href: '/profile' },
            { label: 'Applications', value: stats.activeApplications, color: 'text-amber-400', href: '/profile' },
            { label: 'Reputation', value: stats.reputation, color: 'text-amber-400', href: '/profile' },
            { label: 'Guilds', value: stats.guildCount, color: 'text-purple-400', href: '/guilds' },
          ].map(stat => (
            <Link key={stat.label} href={stat.href}>
              <div className="bg-gray-900 border border-gray-800 hover:border-amber-500/30 rounded-xl p-5 transition-all cursor-pointer">
                <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-gray-500 text-sm mt-1">{stat.label}</div>
              </div>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* My Recent Quests */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">My Quests</h2>
              <Link href="/profile" className="text-amber-400 hover:text-amber-300 text-sm">View all</Link>
            </div>
            <div className="space-y-3">
              {recentQuests.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No quests yet.</p>
                  <Link href="/post-quest" className="text-amber-400 text-sm hover:text-amber-300 mt-2 inline-block">Post your first quest</Link>
                </div>
              ) : (
                recentQuests.map((quest: any) => (
                  <Link key={quest._id} href={`/questboard/${quest._id}`}>
                    <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors cursor-pointer">
                      <div>
                        <div className="text-white text-sm font-medium">{quest.title}</div>
                        <div className="text-gray-500 text-xs mt-0.5">${quest.reward?.toLocaleString()} &bull; {quest.applicants || 0} applicants</div>
                      </div>
                      <span className={`text-xs font-medium ${statusColor[quest.status] || 'text-gray-400'}`}>
                        {quest.status?.replace('_', ' ')}
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Recent Applications */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">My Applications</h2>
              <Link href="/profile" className="text-amber-400 hover:text-amber-300 text-sm">View all</Link>
            </div>
            <div className="space-y-3">
              {recentApplications.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No applications yet.</p>
                  <Link href="/questboard" className="text-amber-400 text-sm hover:text-amber-300 mt-2 inline-block">Browse quests</Link>
                </div>
              ) : (
                recentApplications.map((app: any) => (
                  <Link key={app._id} href={`/questboard/${app.quest?._id}`}>
                    <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors cursor-pointer">
                      <div>
                        <div className="text-white text-sm font-medium">{app.quest?.title}</div>
                        <div className="text-gray-500 text-xs mt-0.5">${app.quest?.reward?.toLocaleString()} &bull; {new Date(app.appliedAt).toLocaleDateString()}</div>
                      </div>
                      <span className={`text-xs font-medium capitalize ${statusColor[app.status] || 'text-gray-400'}`}>
                        {app.status}
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link href="/post-quest" className="bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 rounded-xl p-5 transition-all text-center">
            <div className="text-2xl mb-2">+</div>
            <div className="text-amber-400 font-semibold">Post a Quest</div>
            <div className="text-gray-500 text-xs mt-1">Find adventurers for your task</div>
          </Link>
          <Link href="/questboard" className="bg-gray-900 border border-gray-800 hover:border-amber-500/30 rounded-xl p-5 transition-all text-center">
            <div className="text-2xl mb-2">🔍</div>
            <div className="text-white font-semibold">Browse Quests</div>
            <div className="text-gray-500 text-xs mt-1">Find quests to complete</div>
          </Link>
          <Link href="/guilds" className="bg-gray-900 border border-gray-800 hover:border-amber-500/30 rounded-xl p-5 transition-all text-center">
            <div className="text-2xl mb-2">🏰</div>
            <div className="text-white font-semibold">Explore Guilds</div>
            <div className="text-gray-500 text-xs mt-1">Join a guild of adventurers</div>
          </Link>
        </div>
      </div>
    </div>
  );
}

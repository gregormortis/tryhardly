'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface LeaderboardUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  level: number;
  xp: number;
  adventurerClass: string;
  reputationScore: number;
  totalQuestsCompleted: number;
}

const CLASS_ICONS: Record<string, string> = {
  WARRIOR: '⚔️',
  MAGE: '📜',
  ROGUE: '🗡️',
  CLERIC: '✨',
};

export default function LeaderboardPage() {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.get<LeaderboardUser[]>('/users/leaderboard');
        setUsers(data);
      } catch {
        setUsers([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'text-amber-400';
    if (rank === 2) return 'text-gray-300';
    if (rank === 3) return 'text-orange-600';
    return 'text-gray-500';
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `${rank}`;
  };

  return (
    <div className="min-h-screen bg-gray-950 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-2">🏆 Leaderboard</h1>
          <p className="text-gray-400">Top adventurers competing for glory and rewards</p>
        </div>

        {/* Leaderboard */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-6 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-800 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-800 rounded w-1/4" />
                    <div className="h-3 bg-gray-800 rounded w-1/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <div className="text-4xl mb-3">🏆</div>
            <p className="text-gray-400">No adventurers ranked yet. Be the first!</p>
            <Link href="/auth/register" className="text-amber-400 hover:underline mt-2 inline-block">
              Create an account →
            </Link>
          </div>
        ) : (
          <>
            {/* Top 3 podium */}
            {users.length >= 3 && (
              <div className="grid grid-cols-3 gap-4 mb-10">
                {/* 2nd place */}
                <div className="bg-gray-900 border border-gray-500/30 rounded-xl p-6 text-center mt-6">
                  <div className="text-4xl mb-2">🥈</div>
                  <div className="text-3xl mb-2">{CLASS_ICONS[users[1].adventurerClass] || '⚔️'}</div>
                  <div className="font-bold text-white text-lg">{users[1].displayName}</div>
                  <div className="text-gray-500 text-sm">@{users[1].username}</div>
                  <div className="text-amber-400 font-bold mt-2">Level {users[1].level}</div>
                  <div className="text-green-400 text-sm">{users[1].xp.toLocaleString()} XP</div>
                </div>
                {/* 1st place */}
                <div className="bg-gray-900 border border-amber-500/40 rounded-xl p-6 text-center shadow-lg shadow-amber-900/20">
                  <div className="text-4xl mb-2">🥇</div>
                  <div className="text-3xl mb-2">{CLASS_ICONS[users[0].adventurerClass] || '⚔️'}</div>
                  <div className="font-bold text-white text-lg">{users[0].displayName}</div>
                  <div className="text-gray-500 text-sm">@{users[0].username}</div>
                  <div className="text-amber-400 font-bold mt-2">Level {users[0].level}</div>
                  <div className="text-green-400 text-sm">{users[0].xp.toLocaleString()} XP</div>
                </div>
                {/* 3rd place */}
                <div className="bg-gray-900 border border-amber-700/30 rounded-xl p-6 text-center mt-6">
                  <div className="text-4xl mb-2">🥉</div>
                  <div className="text-3xl mb-2">{CLASS_ICONS[users[2].adventurerClass] || '⚔️'}</div>
                  <div className="font-bold text-white text-lg">{users[2].displayName}</div>
                  <div className="text-gray-500 text-sm">@{users[2].username}</div>
                  <div className="text-amber-400 font-bold mt-2">Level {users[2].level}</div>
                  <div className="text-green-400 text-sm">{users[2].xp.toLocaleString()} XP</div>
                </div>
              </div>
            )}

            {/* Full list */}
            <div className="space-y-3">
              {users.map((user, i) => {
                const rank = i + 1;
                return (
                  <div
                    key={user.id}
                    className="bg-gray-900 border border-gray-800 hover:border-amber-500/30 rounded-xl p-5 flex items-center gap-4 transition-colors"
                  >
                    {/* Rank */}
                    <div className={`text-2xl font-bold w-12 text-center ${getRankColor(rank)}`}>
                      {getRankIcon(rank)}
                    </div>

                    {/* Avatar */}
                    <div className="w-10 h-10 bg-amber-500/20 border border-amber-500/30 rounded-full flex items-center justify-center text-lg">
                      {CLASS_ICONS[user.adventurerClass] || '⚔️'}
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{user.displayName}</span>
                        <span className="text-gray-600 text-sm">@{user.username}</span>
                      </div>
                      <div className="text-sm text-gray-500">
                        Level {user.level} • {user.totalQuestsCompleted} quests completed • ⭐ {user.reputationScore} rep
                      </div>
                    </div>

                    {/* XP */}
                    <div className="text-right hidden sm:block">
                      <div className="text-xl font-bold text-green-400">{user.xp.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">XP</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* CTA */}
        <div className="mt-12 text-center bg-gray-900 border border-gray-800 rounded-xl p-8">
          <h2 className="text-2xl font-bold text-white mb-2">Think you can climb higher?</h2>
          <p className="text-gray-400 mb-6">Complete more quests, level up, and dominate the leaderboard!</p>
          <Link
            href="/questboard"
            className="inline-block bg-amber-500 hover:bg-amber-600 text-black font-bold px-8 py-3 rounded-lg transition-colors"
          >
            Find Quests
          </Link>
        </div>
      </div>
    </div>
  );
}

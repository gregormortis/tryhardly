'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

const MOCK_LEADERBOARD = [
  { id: '1', username: 'ShadowNinja', avatar: '🥷', level: 42, xp: 28500, questsCompleted: 127, rank: 1 },
  { id: '2', username: 'CodeWarrior', avatar: '⚔️', level: 38, xp: 22100, questsCompleted: 98, rank: 2 },
  { id: '3', username: 'PixelMage', avatar: '✨', level: 35, xp: 19800, questsCompleted: 89, rank: 3 },
  { id: '4', username: 'DataDruid', avatar: '🌿', level: 34, xp: 18200, questsCompleted: 76, rank: 4 },
  { id: '5', username: 'BugSlayer', avatar: '🐞', level: 33, xp: 17500, questsCompleted: 71, rank: 5 },
  { id: '6', username: 'CloudArchitect', avatar: '☁️', level: 31, xp: 15900, questsCompleted: 65, rank: 6 },
  { id: '7', username: 'APIWizard', avatar: '🧙', level: 30, xp: 15000, questsCompleted: 62, rank: 7 },
  { id: '8', username: 'FrontendFox', avatar: '🦊', level: 29, xp: 14200, questsCompleted: 58, rank: 8 },
  { id: '9', username: 'BackendBear', avatar: '🐻', level: 28, xp: 13700, questsCompleted: 55, rank: 9 },
  { id: '10', username: 'DevOpsLion', avatar: '🦁', level: 27, xp: 13000, questsCompleted: 51, rank: 10 },
];

type TimeRange = 'week' | 'month' | 'alltime';
type Category = 'overall' | 'quests' | 'guilds';

export default function LeaderboardPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('alltime');
  const [category, setCategory] = useState<Category>('overall');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await api.get(`/leaderboard?range=${timeRange}&category=${category}`) as any[];        setUsers(data);
      } catch {
        setUsers(MOCK_LEADERBOARD);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [timeRange, category]);

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

        {/* Filters */}
        <div className="mb-8 flex flex-wrap gap-4 justify-center">
          <div className="flex gap-2 bg-gray-900 border border-gray-800 rounded-lg p-1">
            {(['week', 'month', 'alltime'] as TimeRange[]).map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-colors ${
                  timeRange === range
                    ? 'bg-amber-500 text-black'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {range === 'alltime' ? 'All Time' : range}
              </button>
            ))}
          </div>

          <div className="flex gap-2 bg-gray-900 border border-gray-800 rounded-lg p-1">
            {(['overall', 'quests', 'guilds'] as Category[]).map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-colors ${
                  category === cat
                    ? 'bg-amber-500 text-black'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
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
        ) : (
          <div className="space-y-3">
            {users.map(user => (
              <Link
                key={user.id}
                href={`/profile/${user.id}`}
                className="block bg-gray-900 border border-gray-800 hover:border-amber-500/30 rounded-xl p-6 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  {/* Rank */}
                  <div className={`text-3xl font-bold w-12 text-center ${getRankColor(user.rank)}`}>
                    {getRankIcon(user.rank)}
                  </div>

                  {/* Avatar & Info */}
                  <div className="flex items-center gap-4 flex-1">
                    <div className="text-4xl">{user.avatar}</div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white group-hover:text-amber-400 transition-colors">
                        {user.username}
                      </h3>
                      <p className="text-sm text-gray-400">Level {user.level}</p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="hidden sm:flex gap-8 text-center">
                    <div>
                      <div className="text-2xl font-bold text-green-400">{user.xp.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">XP</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-400">{user.questsCompleted}</div>
                      <div className="text-xs text-gray-500">Quests</div>
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="text-gray-600 group-hover:text-amber-400 transition-colors">
                    →
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Call to Action */}
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

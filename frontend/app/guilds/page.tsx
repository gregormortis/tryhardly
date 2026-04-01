'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Guild {
  id: string;
  name: string;
  tag: string;
  description: string;
  reputationScore: number;
  isPublic: boolean;
  leader: { id: string; username: string; avatarUrl?: string };
  _count: { members: number };
}

const RANK_ICONS = ['🥇', '🥈', '🥉'];

export default function GuildsPage() {
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchGuilds();
  }, []);

  async function fetchGuilds() {
    try {
      const data = await api.get<{ guilds: Guild[]; total: number }>('/guilds');
      setGuilds(data.guilds);
    } catch {
      // Fallback to empty — API might not be running
      setGuilds([]);
    } finally {
      setLoading(false);
    }
  }

  const filtered = guilds.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    g.tag.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-black text-white mb-8">🏰 Guilds</h1>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-6 animate-pulse">
              <div className="h-6 bg-gray-800 rounded w-48 mb-2" />
              <div className="h-4 bg-gray-800 rounded w-96" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-black text-white mb-2">🏰 Guilds</h1>
        <p className="text-gray-400">Join a guild, team up with adventurers, and tackle epic quests together.</p>
      </div>

      {/* Search + Create */}
      <div className="flex gap-4 mb-8">
        <input
          type="text"
          placeholder="🔍 Search guilds..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
        />
        <Link
          href="/guilds/create"
          className="bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold px-6 py-3 rounded-xl transition-colors"
        >
          + Create Guild
        </Link>
      </div>

      {/* Top 3 Leaderboard */}
      {filtered.length >= 3 && (
        <div className="grid grid-cols-3 gap-4 mb-10">
          {filtered.slice(0, 3).map((guild, i) => (
            <Link key={guild.id} href={`/guilds/${guild.id}`}>
              <div className={`bg-gray-900 border rounded-xl p-5 text-center hover:scale-[1.02] transition-transform ${
                i === 0 ? 'border-yellow-500/40 shadow-lg shadow-yellow-900/20' :
                i === 1 ? 'border-gray-500/40' : 'border-amber-700/40'
              }`}>
                <div className="text-4xl mb-2">{RANK_ICONS[i]}</div>
                <div className="text-lg font-black text-white">{guild.name}</div>
                <div className="text-gray-500 text-sm mb-1">[{guild.tag}]</div>
                <div className="text-amber-400 font-bold">⭐ {guild.reputationScore}</div>
                <div className="text-gray-500 text-xs mt-1">{guild._count.members} members</div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Guild List */}
      <h2 className="text-xl font-bold text-white mb-4">All Guilds</h2>
      <div className="space-y-3">
        {filtered.map((guild) => (
          <Link key={guild.id} href={`/guilds/${guild.id}`}>
            <div className="bg-gray-900 border border-gray-800 hover:border-amber-500/30 rounded-xl p-5 flex items-center justify-between transition-all group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center">
                  <span className="text-amber-400 font-black text-lg">{guild.tag[0]}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-bold group-hover:text-amber-300 transition-colors">{guild.name}</h3>
                    <span className="text-gray-600 text-sm">[{guild.tag}]</span>
                  </div>
                  <p className="text-gray-400 text-sm line-clamp-1 max-w-md">{guild.description}</p>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-gray-500 text-xs">👥 {guild._count.members} members</span>
                    <span className="text-gray-500 text-xs">👑 Led by {guild.leader.username}</span>
                    <span className="text-yellow-400 text-xs">⭐ {guild.reputationScore}</span>
                  </div>
                </div>
              </div>
              <span className="border border-amber-500/40 text-amber-400 font-bold px-5 py-2 rounded-lg text-sm group-hover:bg-amber-500 group-hover:text-gray-900 transition-all">
                View
              </span>
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <div className="text-4xl mb-3">🏰</div>
          <p className="text-gray-400 mb-2">No guilds found.</p>
          <Link href="/guilds/create" className="text-amber-400 hover:underline">Create one!</Link>
        </div>
      )}
    </div>
  );
}

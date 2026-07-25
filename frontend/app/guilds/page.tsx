'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { GUILD_DEFINITION, GUILD_EARLY_NOTE, GUILD_TAGLINE } from '@/lib/guildCopy';

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

const PLACE_ICONS = ['🥇', '🥈', '🥉'];

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
        <h1 className="text-4xl font-black text-white mb-8">Guilds</h1>
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
      <div className="mb-6">
        <h1 className="text-4xl font-black text-white mb-2">Guilds</h1>
        <p className="text-gray-400">{GUILD_TAGLINE}</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-8">
        <p className="text-gray-300 text-sm leading-relaxed">{GUILD_DEFINITION}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-400">
          <span className="px-2.5 py-1 bg-gray-800 border border-gray-700 rounded-full">Trade groups</span>
          <span className="px-2.5 py-1 bg-gray-800 border border-gray-700 rounded-full">Skill communities</span>
          <span className="px-2.5 py-1 bg-gray-800 border border-gray-700 rounded-full">Mentoring</span>
          <span className="px-2.5 py-1 bg-gray-800 border border-gray-700 rounded-full">Shared standards</span>
          <span className="px-2.5 py-1 bg-gray-800 border border-gray-700 rounded-full">Local jobs</span>
        </div>
      </div>

      {/* Search + Create */}
      <div className="flex gap-4 mb-8">
        <input
          type="text"
          placeholder="🔍 Search guilds by name or tag..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
        />
        <Link
          href="/guilds/create"
          className="bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold px-6 py-3 rounded-xl transition-colors"
        >
          + Start a guild
        </Link>
      </div>

      {/* Highest-rated teams */}
      {filtered.length >= 3 && (
        <>
          <h2 className="text-xl font-bold text-white mb-1">Highest rated guilds</h2>
          <p className="text-gray-500 text-sm mb-4">Ranked by the shared reputation their members have earned on completed jobs.</p>
          <div className="grid grid-cols-3 gap-4 mb-10">
            {filtered.slice(0, 3).map((guild, i) => (
              <Link key={guild.id} href={`/guilds/${guild.id}`}>
                <div className={`bg-gray-900 border rounded-xl p-5 text-center hover:scale-[1.02] transition-transform ${
                  i === 0 ? 'border-yellow-500/40 shadow-lg shadow-yellow-900/20' :
                  i === 1 ? 'border-gray-500/40' : 'border-amber-700/40'
                }`}>
                  <div className="text-4xl mb-2">{PLACE_ICONS[i]}</div>
                  <div className="text-lg font-black text-white">{guild.name}</div>
                  <div className="text-gray-500 text-sm mb-1">[{guild.tag}]</div>
                  <div className="text-amber-400 font-bold">⭐ {guild.reputationScore} reputation</div>
                  <div className="text-gray-500 text-xs mt-1">{guild._count.members} workers</div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Guild List */}
      <h2 className="text-xl font-bold text-white mb-2">All guilds</h2>
      {guilds.length > 0 && (
        <p className="text-gray-500 text-sm mb-4">{GUILD_EARLY_NOTE}</p>
      )}
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
                    <span className="text-gray-500 text-xs">👥 {guild._count.members} workers</span>
                    <span className="text-gray-500 text-xs">Team lead: {guild.leader.username}</span>
                    <span className="text-yellow-400 text-xs">⭐ {guild.reputationScore} reputation</span>
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
          <p className="text-gray-400 mb-2">No guilds match your search yet.</p>
          <Link href="/guilds/create" className="text-amber-400 hover:underline">Start a guild</Link>
        </div>
      )}
    </div>
  );
}

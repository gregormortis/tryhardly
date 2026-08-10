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
        <h1 className="text-4xl font-black text-strong mb-8">Guilds</h1>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-surface border border-line rounded-xl p-6 animate-pulse">
              <div className="h-6 bg-raised rounded w-48 mb-2" />
              <div className="h-4 bg-raised rounded w-96" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-4xl font-black text-strong mb-2">Guilds</h1>
        <p className="text-muted">{GUILD_TAGLINE}</p>
      </div>

      <div className="bg-surface border border-line rounded-xl p-5 mb-8">
        <p className="text-body text-sm leading-relaxed">{GUILD_DEFINITION}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
          <span className="px-2.5 py-1 bg-raised border border-line-strong rounded-full">Trade groups</span>
          <span className="px-2.5 py-1 bg-raised border border-line-strong rounded-full">Skill communities</span>
          <span className="px-2.5 py-1 bg-raised border border-line-strong rounded-full">Mentoring</span>
          <span className="px-2.5 py-1 bg-raised border border-line-strong rounded-full">Shared standards</span>
          <span className="px-2.5 py-1 bg-raised border border-line-strong rounded-full">Local jobs</span>
        </div>
      </div>

      {/* Search + Create */}
      <div className="flex gap-4 mb-8">
        <input
          type="text"
          placeholder="🔍 Search guilds by name or tag..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-surface border border-line rounded-xl px-4 py-3 text-strong placeholder-subtle focus:outline-none focus:border-accent"
        />
        <Link
          href="/guilds/create"
          className="bg-accent hover:bg-accent text-on-accent font-bold px-6 py-3 rounded-xl transition-colors"
        >
          + Start a guild
        </Link>
      </div>

      {/* Highest-rated teams */}
      {filtered.length >= 3 && (
        <>
          <h2 className="text-xl font-bold text-strong mb-1">Highest rated guilds</h2>
          <p className="text-subtle text-sm mb-4">Ranked by the shared reputation their members have earned on completed jobs.</p>
          <div className="grid grid-cols-3 gap-4 mb-10">
            {filtered.slice(0, 3).map((guild, i) => (
              <Link key={guild.id} href={`/guilds/${guild.id}`}>
                <div className={`bg-surface border rounded-xl p-5 text-center hover:scale-[1.02] transition-transform ${
                  i === 0 ? 'border-warning/40 shadow-lg shadow-yellow-900/20' :
                  i === 1 ? 'border-line-strong/40' : 'border-accent/40'
                }`}>
                  <div className="text-4xl mb-2">{PLACE_ICONS[i]}</div>
                  <div className="text-lg font-black text-strong">{guild.name}</div>
                  <div className="text-subtle text-sm mb-1">[{guild.tag}]</div>
                  <div className="text-accent-text font-bold">⭐ {guild.reputationScore} reputation</div>
                  <div className="text-subtle text-xs mt-1">{guild._count.members} workers</div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Guild List */}
      <h2 className="text-xl font-bold text-strong mb-2">All guilds</h2>
      {guilds.length > 0 && (
        <p className="text-subtle text-sm mb-4">{GUILD_EARLY_NOTE}</p>
      )}
      <div className="space-y-3">
        {filtered.map((guild) => (
          <Link key={guild.id} href={`/guilds/${guild.id}`}>
            <div className="bg-surface border border-line hover:border-accent/30 rounded-xl p-5 flex items-center justify-between transition-all group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-accent/10 border border-accent/20 rounded-xl flex items-center justify-center">
                  <span className="text-accent-text font-black text-lg">{guild.tag[0]}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-strong font-bold group-hover:text-accent-text-hover transition-colors">{guild.name}</h3>
                    <span className="text-subtle text-sm">[{guild.tag}]</span>
                  </div>
                  <p className="text-muted text-sm line-clamp-1 max-w-md">{guild.description}</p>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-subtle text-xs">👥 {guild._count.members} workers</span>
                    <span className="text-subtle text-xs">Team lead: {guild.leader.username}</span>
                    <span className="text-warning text-xs">⭐ {guild.reputationScore} reputation</span>
                  </div>
                </div>
              </div>
              <span className="border border-accent/40 text-accent-text font-bold px-5 py-2 rounded-lg text-sm group-hover:bg-accent group-hover:text-on-accent transition-all">
                View
              </span>
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-subtle">
          <p className="text-muted mb-2">No guilds match your search yet.</p>
          <Link href="/guilds/create" className="text-accent-text hover:underline">Start a guild</Link>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';

const MOCK_GUILDS = [
  { id: '1', name: 'Iron Code Syndicate', tag: 'ICS', description: 'Elite developers tackling legendary coding quests. TypeScript warriors only.', reputationScore: 4.9, _count: { members: 24 }, isPublic: true, leaderId: 'u1', leader: { username: 'CodeLord' } },
  { id: '2', name: 'The Pixel Mages', tag: 'TPM', description: 'Design guild specializing in UI/UX and brand identity quests. Figma masters.', reputationScore: 4.8, _count: { members: 18 }, isPublic: true, leaderId: 'u2', leader: { username: 'DesignWitch' } },
  { id: '3', name: 'Wordsmith Alliance', tag: 'WSA', description: 'Writers, editors, and content strategists conquering writing quests together.', reputationScore: 4.7, _count: { members: 31 }, isPublic: true, leaderId: 'u3', leader: { username: 'QuillMaster' } },
  { id: '4', name: 'Data Dragons', tag: 'DDR', description: 'Data scientists and analysts who slay complexity with SQL and Python.', reputationScore: 4.6, _count: { members: 15 }, isPublic: true, leaderId: 'u4', leader: { username: 'DataKnight' } },
  { id: '5', name: 'The Full Stack Collective', tag: 'FSC', description: 'Full-stack legends who handle front-to-back development quests of any scale.', reputationScore: 4.5, _count: { members: 42 }, isPublic: true, leaderId: 'u5', leader: { username: 'StackHero' } },
  { id: '6', name: 'Motion Alchemists', tag: 'MOA', description: 'Video editors and animators who transform raw footage into gold.', reputationScore: 4.4, _count: { members: 12 }, isPublic: true, leaderId: 'u6', leader: { username: 'FrameWizard' } },
];

const RANK_COLORS = ['text-yellow-400', 'text-gray-300', 'text-amber-700', 'text-gray-400', 'text-gray-400', 'text-gray-400'];
const RANK_ICONS = ['🥇', '🥈', '🥉', '4', '5', '6'];

export default function GuildsPage() {
  const [search, setSearch] = useState('');

  const filtered = MOCK_GUILDS.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    g.tag.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-black text-white mb-2">🏰 Guilds</h1>
        <p className="text-gray-400">Join a guild, team up with adventurers, and tackle epic quests together.</p>
      </div>

      {/* Search + Create */}
      <div className="flex gap-4 mb-8">
        <input
          type="text" placeholder="🔍 Search guilds..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
        />
        <button className="bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold px-6 py-3 rounded-xl transition-colors">
          + Create Guild
        </button>
      </div>

      {/* Leaderboard Top 3 */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        {MOCK_GUILDS.slice(0, 3).map((guild, i) => (
          <div key={guild.id} className={`bg-gray-900 border rounded-xl p-5 text-center ${
            i === 0 ? 'border-yellow-500/40 shadow-lg shadow-yellow-900/20' :
            i === 1 ? 'border-gray-500/40' : 'border-amber-700/40'
          }`}>
            <div className="text-4xl mb-2">{RANK_ICONS[i]}</div>
            <div className="text-lg font-black text-white">{guild.name}</div>
            <div className="text-gray-500 text-sm mb-1">[{guild.tag}]</div>
            <div className="text-amber-400 font-bold">★ {guild.reputationScore}</div>
            <div className="text-gray-500 text-xs mt-1">{guild._count.members} members</div>
          </div>
        ))}
      </div>

      {/* Guild List */}
      <h2 className="text-xl font-bold text-white mb-4">All Guilds</h2>
      <div className="space-y-3">
        {filtered.map((guild, i) => (
          <div key={guild.id} className="bg-gray-900 border border-gray-800 hover:border-amber-500/30 rounded-xl p-5 flex items-center justify-between transition-all group">
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
                  <span className="text-yellow-400 text-xs">★ {guild.reputationScore}</span>
                </div>
              </div>
            </div>
            <button className="border border-amber-500/40 hover:bg-amber-500 hover:text-gray-900 hover:border-amber-500 text-amber-400 font-bold px-5 py-2 rounded-lg text-sm transition-all">
              Join
            </button>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <div className="text-4xl mb-3">🏰</div>
          <p className="text-gray-400">No guilds found. <button className="text-amber-400 hover:underline">Create one!</button></p>
        </div>
      )}
    </div>
  );
}

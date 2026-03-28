'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const DIFFICULTY_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  NOVICE: { bg: 'bg-green-400/10', text: 'text-green-400', label: 'Novice' },
  APPRENTICE: { bg: 'bg-blue-400/10', text: 'text-blue-400', label: 'Apprentice' },
  JOURNEYMAN: { bg: 'bg-yellow-400/10', text: 'text-yellow-400', label: 'Journeyman' },
  EXPERT: { bg: 'bg-orange-400/10', text: 'text-orange-400', label: 'Expert' },
  MASTER: { bg: 'bg-red-400/10', text: 'text-red-400', label: 'Master' },
  LEGENDARY: { bg: 'bg-purple-400/10', text: 'text-purple-400', label: 'Legendary' },
};

const CATEGORIES = ['All', 'Development', 'Design', 'Writing', 'Marketing', 'Data', 'Video', 'Audio', 'Other'];

const MOCK_QUESTS = [
  { id: '1', title: 'Build a REST API for our SaaS app', category: 'Development', difficulty: 'EXPERT', reward: 2500, xpReward: 500, currency: 'USD', status: 'OPEN', questGiver: { username: 'TechStartupCo', reputationScore: 4.8 }, _count: { applications: 12 }, tags: ['Node.js', 'TypeScript', 'PostgreSQL'], createdAt: new Date().toISOString() },
  { id: '2', title: 'Design a brand identity for our bakery', category: 'Design', difficulty: 'JOURNEYMAN', reward: 800, xpReward: 200, currency: 'USD', status: 'OPEN', questGiver: { username: 'SweetBakery', reputationScore: 5.0 }, _count: { applications: 5 }, tags: ['Figma', 'Branding', 'Illustrator'], createdAt: new Date().toISOString() },
  { id: '3', title: 'Write 10 SEO blog posts about crypto', category: 'Writing', difficulty: 'APPRENTICE', reward: 400, xpReward: 120, currency: 'USD', status: 'OPEN', questGiver: { username: 'CryptoMedia', reputationScore: 4.2 }, _count: { applications: 28 }, tags: ['SEO', 'Crypto', 'Content'], createdAt: new Date().toISOString() },
  { id: '4', title: 'Create a mobile app for restaurant orders', category: 'Development', difficulty: 'MASTER', reward: 5000, xpReward: 1000, currency: 'USD', status: 'OPEN', questGiver: { username: 'FoodieApps', reputationScore: 4.6 }, _count: { applications: 7 }, tags: ['React Native', 'Firebase', 'Mobile'], createdAt: new Date().toISOString() },
  { id: '5', title: 'Edit a 3-min promo video for our product', category: 'Video', difficulty: 'NOVICE', reward: 150, xpReward: 60, currency: 'USD', status: 'OPEN', questGiver: { username: 'EcomStore', reputationScore: 4.9 }, _count: { applications: 19 }, tags: ['Premiere Pro', 'Motion', 'Video'], createdAt: new Date().toISOString() },
  { id: '6', title: 'Analyze sales data and build Tableau dashboard', category: 'Data', difficulty: 'JOURNEYMAN', reward: 1200, xpReward: 280, currency: 'USD', status: 'OPEN', questGiver: { username: 'RetailCorp', reputationScore: 4.4 }, _count: { applications: 3 }, tags: ['Tableau', 'Excel', 'SQL'], createdAt: new Date().toISOString() },
];

export default function QuestboardPage() {
  const [quests, setQuests] = useState(MOCK_QUESTS);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [difficulty, setDifficulty] = useState('');

  const filtered = quests.filter((q) => {
    if (category !== 'All' && q.category !== category) return false;
    if (difficulty && q.difficulty !== difficulty) return false;
    if (search && !q.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-black text-white mb-2">📜 Questboard</h1>
        <p className="text-gray-400">Find your next adventure. Filter by category, difficulty, or search by name.</p>
      </div>

      {/* Filters */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-8 flex flex-col md:flex-row gap-4">
        <input
          type="text" placeholder="🔍 Search quests..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
        />
        <select
          value={difficulty} onChange={(e) => setDifficulty(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-500"
        >
          <option value="">All Difficulties</option>
          {Object.entries(DIFFICULTY_COLORS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <Link href="/post-quest" className="bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold px-6 py-2 rounded-lg text-sm transition-colors whitespace-nowrap">
          + Post Quest
        </Link>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
        {CATEGORIES.map((c) => (
          <button
            key={c} onClick={() => setCategory(c)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              category === c ? 'bg-amber-500 text-gray-900' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Results count */}
      <p className="text-gray-500 text-sm mb-4">{filtered.length} quest{filtered.length !== 1 ? 's' : ''} found</p>

      {/* Quest Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((quest) => {
          const diff = DIFFICULTY_COLORS[quest.difficulty] || DIFFICULTY_COLORS.NOVICE;
          return (
            <Link
              key={quest.id} href={`/quest/${quest.id}`}
              className="bg-gray-900 border border-gray-800 hover:border-amber-500/40 rounded-xl p-5 transition-all hover:shadow-lg hover:shadow-amber-900/10 group"
            >
              <div className="flex justify-between items-start mb-3">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${diff.bg} ${diff.text}`}>
                  {diff.label}
                </span>
                <span className="text-gray-500 text-xs">{quest._count.applications} applicants</span>
              </div>
              <h3 className="text-white font-bold text-lg mb-2 group-hover:text-amber-300 transition-colors leading-snug">
                {quest.title}
              </h3>
              <p className="text-gray-500 text-sm mb-3">{quest.category}</p>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {quest.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="bg-gray-800 text-gray-400 px-2 py-0.5 rounded text-xs">{tag}</span>
                ))}
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-amber-400 font-black text-xl">${quest.reward.toLocaleString()}</div>
                  <div className="text-gray-500 text-xs">+{quest.xpReward} XP</div>
                </div>
                <div className="text-right">
                  <div className="text-gray-400 text-sm">{quest.questGiver.username}</div>
                  <div className="text-yellow-400 text-xs">★ {quest.questGiver.reputationScore.toFixed(1)}</div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20 text-gray-500">
          <div className="text-5xl mb-4">🔍</div>
          <p className="text-xl font-medium text-gray-400">No quests found</p>
          <p className="mt-2">Try adjusting your filters or <Link href="/post-quest" className="text-amber-400 hover:underline">post a new quest</Link>.</p>
        </div>
      )}
    </div>
  );
}

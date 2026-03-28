'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';

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
  { id: '1', title: 'Build a REST API for our SaaS app', category: 'Development', difficulty: 'EXPERT', reward: 2500, xpReward: 500, currency: 'USD', poster: { username: 'TechStartup', level: 8 }, _count: { applications: 4 }, tags: ['Node.js', 'PostgreSQL', 'REST'] },
  { id: '2', title: 'Design a brand identity for our bakery', category: 'Design', difficulty: 'JOURNEYMAN', reward: 800, xpReward: 200, currency: 'USD', poster: { username: 'BakeryOwner', level: 3 }, _count: { applications: 7 }, tags: ['Logo', 'Branding', 'Figma'] },
  { id: '3', title: 'Write 10 SEO blog posts about crypto', category: 'Writing', difficulty: 'APPRENTICE', reward: 400, xpReward: 120, currency: 'USD', poster: { username: 'CryptoMedia', level: 5 }, _count: { applications: 12 }, tags: ['SEO', 'Crypto', 'Content'] },
  { id: '4', title: 'Create a mobile app for restaurant orders', category: 'Development', difficulty: 'MASTER', reward: 5000, xpReward: 1000, currency: 'USD', poster: { username: 'FoodTech', level: 10 }, _count: { applications: 2 }, tags: ['React Native', 'Mobile', 'UI/UX'] },
  { id: '5', title: 'Edit a 3-min promo video for our product', category: 'Video', difficulty: 'NOVICE', reward: 150, xpReward: 60, currency: 'USD', poster: { username: 'MarketingCo', level: 4 }, _count: { applications: 9 }, tags: ['Video Editing', 'Premiere', 'Motion'] },
  { id: '6', title: 'Analyze sales data and build Tableau dashboard', category: 'Data', difficulty: 'JOURNEYMAN', reward: 1200, xpReward: 280, currency: 'USD', poster: { username: 'RetailChain', level: 6 }, _count: { applications: 3 }, tags: ['Tableau', 'SQL', 'Analytics'] },
];

interface Quest {
  id: string;
  title: string;
  category: string;
  difficulty: string;
  reward: number;
  xpReward: number;
  currency: string;
  poster: { username: string; level: number };
  _count: { applications: number };
  tags: string[];
}

export default function QuestboardPage() {
  const [quests, setQuests] = useState<Quest[]>(MOCK_QUESTS);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [difficulty, setDifficulty] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchQuests() {
      try {
        const data = await api.get<{ quests: Quest[] }>('/quests');
        if (data.quests?.length) setQuests(data.quests);
      } catch {
        // Use mock data if API unavailable
      } finally {
        setLoading(false);
      }
    }
    fetchQuests();
  }, []);

  const filtered = quests.filter(q => {
    const matchSearch = q.title.toLowerCase().includes(search.toLowerCase()) ||
      q.tags?.some(t => t.toLowerCase().includes(search.toLowerCase()));
    const matchCat = category === 'All' || q.category === category;
    const matchDiff = !difficulty || q.difficulty === difficulty;
    return matchSearch && matchCat && matchDiff;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-100">📜 Questboard</h1>
          <p className="text-gray-400 mt-1">{filtered.length} quests available</p>
        </div>
        <Link
          href="/post-quest"
          className="bg-amber-500 hover:bg-amber-600 text-black font-semibold px-5 py-2.5 rounded-lg transition-colors"
        >
          + Post a Quest
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6 flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search quests or skills..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-gray-100 focus:outline-none focus:border-amber-500"
        />
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-gray-300 focus:outline-none"
        >
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={difficulty}
          onChange={e => setDifficulty(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-gray-300 focus:outline-none"
        >
          <option value="">All Levels</option>
          {Object.entries(DIFFICULTY_COLORS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Quest Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-6 animate-pulse">
              <div className="h-4 bg-gray-800 rounded mb-3 w-3/4" />
              <div className="h-3 bg-gray-800 rounded mb-2 w-1/2" />
              <div className="h-3 bg-gray-800 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-2xl mb-2">🔍</p>
          <p>No quests match your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(quest => {
            const diff = DIFFICULTY_COLORS[quest.difficulty] || DIFFICULTY_COLORS.NOVICE;
            return (
              <Link
                key={quest.id}
                href={`/questboard/${quest.id}`}
                className="bg-gray-900 border border-gray-800 hover:border-amber-500/50 rounded-xl p-6 transition-all hover:shadow-lg hover:shadow-amber-500/5 block group"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${diff.bg} ${diff.text}`}>
                    {diff.label}
                  </span>
                  <span className="text-xs text-gray-500">{quest._count?.applications || 0} applicants</span>
                </div>
                <h3 className="font-semibold text-gray-100 group-hover:text-amber-400 transition-colors mb-2 line-clamp-2">
                  {quest.title}
                </h3>
                <p className="text-sm text-gray-500 mb-4">{quest.category}</p>
                {quest.tags && quest.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {quest.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">{tag}</span>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between pt-3 border-t border-gray-800">
                  <div>
                    <p className="text-amber-400 font-bold">${quest.reward.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">+{quest.xpReward} XP</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Posted by</p>
                    <p className="text-xs text-gray-400">{quest.poster?.username} <span className="text-amber-500">Lv.{quest.poster?.level}</span></p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

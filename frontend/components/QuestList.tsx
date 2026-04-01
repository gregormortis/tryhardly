'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Quest {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  reward: number;
  xpReward: number;
  status: string;
  category: string;
  tags: string[];
  questGiver?: { username: string };
}

const DIFF_COLOR: Record<string, string> = {
  NOVICE: 'text-green-400 bg-green-900/30 border-green-700',
  APPRENTICE: 'text-blue-400 bg-blue-900/30 border-blue-700',
  JOURNEYMAN: 'text-yellow-400 bg-yellow-900/30 border-yellow-700',
  EXPERT: 'text-orange-400 bg-orange-900/30 border-orange-700',
  MASTER: 'text-red-400 bg-red-900/30 border-red-700',
  LEGENDARY: 'text-purple-400 bg-purple-900/30 border-purple-700',
};

export default function QuestList() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchQuests() {
      try {
        const data = await api.get<{ quests: Quest[] }>('/quests?limit=6&status=OPEN');
        setQuests(data.quests || []);
      } catch {
        // API not running — show nothing, the static examples above handle it
        setQuests([]);
      } finally {
        setLoading(false);
      }
    }
    fetchQuests();
  }, []);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-6 animate-pulse">
              <div className="h-4 bg-gray-800 rounded w-24 mb-3" />
              <div className="h-5 bg-gray-800 rounded w-3/4 mb-3" />
              <div className="h-3 bg-gray-800 rounded w-full mb-2" />
              <div className="h-6 bg-gray-800 rounded w-20 mt-4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (quests.length === 0) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-100 mb-2">🔥 Fresh from the API</h2>
        <p className="text-gray-500 text-sm">Live quests pulled from the Tryhardly backend</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {quests.map((quest) => (
          <Link key={quest.id} href={`/questboard/${quest.id}`}>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-amber-500/40 transition-colors h-full">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">
                  {quest.category.replace(/_/g, ' ')}
                </span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded border ${DIFF_COLOR[quest.difficulty] || 'text-gray-400'}`}>
                  {quest.difficulty}
                </span>
              </div>
              <h3 className="font-semibold text-gray-100 mb-2 line-clamp-2">{quest.title}</h3>
              <p className="text-sm text-gray-500 line-clamp-2 mb-3">{quest.description}</p>
              {quest.tags?.length > 0 && (
                <div className="flex gap-1 mb-3 flex-wrap">
                  {quest.tags.slice(0, 3).map(t => (
                    <span key={t} className="text-xs bg-gray-800 text-gray-500 px-2 py-0.5 rounded">{t}</span>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-amber-400 font-bold text-lg">${Number(quest.reward).toLocaleString()}</span>
                <span className="text-xs text-purple-400">+{quest.xpReward} XP</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

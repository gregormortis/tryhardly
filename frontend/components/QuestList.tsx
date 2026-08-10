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
  NOVICE: 'text-success bg-success/30 border-success',
  APPRENTICE: 'text-info bg-info/30 border-info',
  JOURNEYMAN: 'text-warning bg-warning/30 border-warning',
  EXPERT: 'text-warning bg-warning/30 border-warning',
  MASTER: 'text-danger bg-danger/30 border-danger',
  LEGENDARY: 'text-info bg-info/30 border-info',
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
            <div key={i} className="bg-surface border border-line rounded-xl p-6 animate-pulse">
              <div className="h-4 bg-raised rounded w-24 mb-3" />
              <div className="h-5 bg-raised rounded w-3/4 mb-3" />
              <div className="h-3 bg-raised rounded w-full mb-2" />
              <div className="h-6 bg-raised rounded w-20 mt-4" />
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
        <h2 className="text-2xl font-bold text-strong mb-2">🔥 Fresh from the API</h2>
        <p className="text-subtle text-sm">Live quests pulled from the Tryhardly backend</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {quests.map((quest) => (
          <Link key={quest.id} href={`/job/${quest.id}`}>
            <div className="bg-surface border border-line rounded-xl p-6 hover:border-accent/40 transition-colors h-full">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs bg-raised text-muted px-2 py-0.5 rounded">
                  {quest.category.replace(/_/g, ' ')}
                </span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded border ${DIFF_COLOR[quest.difficulty] || 'text-muted'}`}>
                  {quest.difficulty}
                </span>
              </div>
              <h3 className="font-semibold text-strong mb-2 line-clamp-2">{quest.title}</h3>
              <p className="text-sm text-subtle line-clamp-2 mb-3">{quest.description}</p>
              {quest.tags?.length > 0 && (
                <div className="flex gap-1 mb-3 flex-wrap">
                  {quest.tags.slice(0, 3).map(t => (
                    <span key={t} className="text-xs bg-raised text-subtle px-2 py-0.5 rounded">{t}</span>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-accent-text font-bold text-lg">${Number(quest.reward).toLocaleString()}</span>
                <span className="text-xs text-info">+{quest.xpReward} pts</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

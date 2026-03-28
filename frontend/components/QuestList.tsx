'use client';

import { useEffect, useState } from 'react';

interface Quest {
  id: number;
  title: string;
  description: string;
  difficulty: string;
  reward: number;
  xpReward: number;
  status: string;
  category: string;
  icon: string;
}

export default function QuestList() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/quests')
      .then(res => res.json())
      .then(data => {
        setQuests(data.quests || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch quests:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="text-center py-12">Loading quests...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h2 className="text-4xl font-bold mb-8">Live Quests on the Questboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {quests.map((quest) => (
          <div 
            key={quest.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border-2 border-purple-500 hover:border-purple-400 transition-all hover:shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-4xl">{quest.icon}</span>
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                quest.difficulty === 'EXPERT' ? 'bg-red-500 text-white' :
                quest.difficulty === 'HARD' ? 'bg-orange-500 text-white' :
                'bg-green-500 text-white'
              }`}>
                {quest.difficulty}
              </span>
            </div>
            <h3 className="text-xl font-bold mb-2">{quest.title}</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">{quest.description}</p>
            <div className="flex justify-between items-center">
              <div>
                <div className="text-lg font-bold text-yellow-500">${quest.reward}</div>
                <div className="text-sm text-purple-500">{quest.xpReward} XP</div>
              </div>
              <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-bold transition-colors">
                Apply Now
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

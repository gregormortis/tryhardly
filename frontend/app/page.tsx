import Link from 'next/link';

const STATS = [
  { label: 'Active Quests', value: '2,400+', icon: '📜' },
  { label: 'Adventurers', value: '18,000+', icon: '⚔️' },
  { label: 'Guilds', value: '340+', icon: '🛡️' },
  { label: 'Gold Paid Out', value: '$1.2M+', icon: '💰' },
];

const HOW_IT_WORKS = [
  { step: '01', title: 'Post a Quest', desc: 'Describe what you need, set a reward, and choose a difficulty. Your quest goes live in minutes.', icon: '✍️' },
  { step: '02', title: 'Adventurers Apply', desc: 'Skilled freelancers browse the questboard and apply. Review their profiles and class rankings.', icon: '📜' },
  { step: '03', title: 'Quest Completed', desc: 'Your chosen adventurer completes the work. Approve delivery and release the reward.', icon: '✅' },
];

const FEATURES = [
  { icon: '⭐', title: 'XP & Leveling', desc: 'Complete quests to earn XP, level up your adventurer class, and unlock better opportunities.' },
  { icon: '🛡️', title: 'Guild System', desc: 'Form or join guilds with other adventurers. Take on guild quests and build reputation together.' },
  { icon: '💰', title: 'Secure Escrow', desc: 'Quest rewards are locked in escrow until completion. Get paid fairly, every time.' },
  { icon: '🏆', title: 'Leaderboards', desc: 'Rise through the ranks. Top adventurers get featured and unlocked access to legendary quests.' },
  { icon: '📊', title: 'Quest Analytics', desc: 'Track your earnings, XP progress, completion rates, and application success from your dashboard.' },
  { icon: '🔍', title: 'Smart Matching', desc: 'Our difficulty rating system matches quest posters with adventurers of the right skill level.' },
];

const QUEST_EXAMPLES = [
  { title: 'Build a REST API', category: 'Development', difficulty: 'EXPERT', reward: 2500, tags: ['Node.js', 'PostgreSQL'] },
  { title: 'Brand identity for bakery', category: 'Design', difficulty: 'JOURNEYMAN', reward: 800, tags: ['Figma', 'Branding'] },
  { title: '10 SEO blog posts', category: 'Writing', difficulty: 'APPRENTICE', reward: 400, tags: ['SEO', 'Content'] },
];

const DIFF_COLOR: Record<string, string> = {
  NOVICE: 'text-green-400', APPRENTICE: 'text-blue-400',
  JOURNEYMAN: 'text-yellow-400', EXPERT: 'text-orange-400', MASTER: 'text-red-400',
};

export default function HomePage() {
  return (
    <div className="overflow-hidden">
      {/* Hero */}
      <section className="relative min-h-[85vh] flex items-center justify-center px-4 py-20">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-purple-500/5 pointer-events-none" />
        <div className="text-center max-w-4xl mx-auto relative">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-full px-4 py-1.5 text-sm text-amber-400 mb-8">
            ⚔️ Guild-Inspired Quest Marketplace
          </div>
          <h1 className="text-5xl sm:text-7xl font-bold text-gray-100 leading-tight mb-6">
            Transform Work Into
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">
              Epic Adventures
            </span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Post quests. Find skilled adventurers. Level up together.
            The freelance marketplace where every project is a legendary quest.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/questboard"
              className="bg-amber-500 hover:bg-amber-600 text-black font-bold px-8 py-4 rounded-xl text-lg transition-colors shadow-lg shadow-amber-500/20"
            >
              📜 Browse Quests
            </Link>
            <Link
              href="/auth/register"
              className="bg-gray-800 hover:bg-gray-700 text-gray-100 font-bold px-8 py-4 rounded-xl text-lg transition-colors border border-gray-700"
            >
              Start Your Adventure
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-t border-b border-gray-800 bg-gray-900/50 py-12">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {STATS.map(s => (
            <div key={s.label}>
              <p className="text-3xl mb-1">{s.icon}</p>
              <p className="text-3xl font-bold text-amber-400">{s.value}</p>
              <p className="text-sm text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Sample Quests */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-100 mb-3">Live on the Questboard</h2>
          <p className="text-gray-400">Real quests from real clients. Start earning today.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {QUEST_EXAMPLES.map((q, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-amber-500/40 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">{q.category}</span>
                <span className={`text-xs font-medium ${DIFF_COLOR[q.difficulty]}`}>{q.difficulty}</span>
              </div>
              <h3 className="font-semibold text-gray-100 mb-3">{q.title}</h3>
              <div className="flex gap-1 mb-4">
                {q.tags.map(t => <span key={t} className="text-xs bg-gray-800 text-gray-500 px-2 py-0.5 rounded">{t}</span>)}
              </div>
              <p className="text-amber-400 font-bold text-lg">${q.reward.toLocaleString()}</p>
            </div>
          ))}
        </div>
        <div className="text-center">
          <Link href="/questboard" className="text-amber-400 hover:text-amber-300 font-medium">
            View all quests &rarr;
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gray-900/50 border-t border-gray-800 py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-100 mb-3">How Tryhardly Works</h2>
            <p className="text-gray-400">Simple as posting a quest, powerful as a guild.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map(step => (
              <div key={step.step} className="text-center">
                <div className="text-4xl mb-4">{step.icon}</div>
                <div className="text-amber-500 font-mono text-sm mb-2">{step.step}</div>
                <h3 className="text-xl font-semibold text-gray-100 mb-2">{step.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-100 mb-3">Built for Adventurers</h2>
          <p className="text-gray-400">More than a marketplace. A world of leveling up.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(f => (
            <div key={f.title} className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-amber-500/30 transition-colors">
              <p className="text-3xl mb-3">{f.icon}</p>
              <h3 className="font-semibold text-gray-100 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-amber-500/10 to-amber-600/5 border-t border-amber-500/20 py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-gray-100 mb-4">
            Ready to Begin Your Quest?
          </h2>
          <p className="text-gray-400 mb-8 text-lg">
            Join thousands of adventurers earning gold and XP on Tryhardly.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/register"
              className="bg-amber-500 hover:bg-amber-600 text-black font-bold px-10 py-4 rounded-xl text-lg transition-colors"
            >
              Create Free Account
            </Link>
            <Link
              href="/post-quest"
              className="border border-amber-500 text-amber-400 hover:bg-amber-500/10 font-bold px-10 py-4 rounded-xl text-lg transition-colors"
            >
              Post a Quest
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

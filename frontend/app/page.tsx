import Link from 'next/link';

const stats = [
  { label: 'Active Quests', value: '2,400+', icon: '📜' },
  { label: 'Adventurers', value: '18,000+', icon: '🧙' },
  { label: 'Guilds', value: '340+', icon: '🏰' },
  { label: 'Gold Paid Out', value: '$1.2M+', icon: '💰' },
];

const features = [
  {
    icon: '📜',
    title: 'Epic Questboard',
    desc: 'Browse hundreds of quests filtered by difficulty, category, and reward. From side quests to legendary contracts.',
  },
  {
    icon: '⭐',
    title: 'Level Up & Earn XP',
    desc: 'Complete quests to gain experience, level up your adventurer class, and climb the hero leaderboard.',
  },
  {
    icon: '🏰',
    title: 'Join a Guild',
    desc: 'Team up with other adventurers, take on guild quests, and build your reputation as a legendary crew.',
  },
  {
    icon: '🛡️',
    title: 'Secure Escrow',
    desc: 'Quest rewards are locked in escrow until quest completion. Get paid fairly, every time.',
  },
  {
    icon: '👑',
    title: 'Adventurer Classes',
    desc: 'Specialize as a Warrior (dev), Mage (designer), Rogue (writer), or Cleric (consultant). Show your skills.',
  },
  {
    icon: '⚖️',
    title: 'Fair for Everyone',
    desc: "No race to the bottom. Quest Givers post at fair rates. Adventurers work with dignity. That's the guild code.",
  },
];

const difficultyColors: Record<string, string> = {
  NOVICE: 'text-green-400 bg-green-400/10',
  APPRENTICE: 'text-blue-400 bg-blue-400/10',
  JOURNEYMAN: 'text-yellow-400 bg-yellow-400/10',
  EXPERT: 'text-orange-400 bg-orange-400/10',
  MASTER: 'text-red-400 bg-red-400/10',
  LEGENDARY: 'text-purple-400 bg-purple-400/10',
};

export default function HomePage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-gray-900 via-gray-950 to-gray-950 py-24 px-4">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-900/20 via-transparent to-transparent" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 text-amber-400 text-sm font-medium mb-6">
            <span>⚔️</span>
            <span>The Guild-Inspired Gig Marketplace</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-white mb-6 leading-tight">
            Work is an{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">
              Adventure
            </span>
          </h1>
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
            Post quests, find adventurers, join guilds, earn XP. The freelance marketplace built for heroes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/questboard"
              className="bg-amber-500 hover:bg-amber-400 text-gray-900 font-black px-8 py-4 rounded-lg text-lg transition-all hover:scale-105"
            >
              Browse Questboard 📜
            </Link>
            <Link
              href="/auth/register"
              className="border border-amber-500/40 hover:border-amber-500 text-amber-400 hover:text-amber-300 font-bold px-8 py-4 rounded-lg text-lg transition-all"
            >
              Become an Adventurer 🧙
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-gray-900 border-y border-gray-800 py-8">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-3xl mb-1">{s.icon}</div>
                <div className="text-2xl font-black text-amber-400">{s.value}</div>
                <div className="text-gray-400 text-sm">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-black text-center text-white mb-4">Why Tryhardly?</h2>
          <p className="text-gray-400 text-center mb-12 max-w-xl mx-auto">We built a marketplace that respects both quest givers and adventurers.</p>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="bg-gray-900 border border-gray-800 hover:border-amber-500/40 rounded-xl p-6 transition-all">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="text-white font-bold text-lg mb-2">{f.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-gradient-to-r from-amber-900/20 to-orange-900/20 border-y border-amber-500/20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-black text-white mb-4">Ready to begin your quest?</h2>
          <p className="text-gray-400 mb-8">Join thousands of adventurers and quest givers on Tryhardly.</p>
          <div className="flex gap-4 justify-center">
            <Link href="/auth/register" className="bg-amber-500 hover:bg-amber-400 text-gray-900 font-black px-8 py-4 rounded-lg transition-all hover:scale-105">
              Create Free Account
            </Link>
            <Link href="/post-quest" className="border border-gray-700 hover:border-gray-500 text-gray-300 font-bold px-8 py-4 rounded-lg transition-all">
              Post a Quest
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

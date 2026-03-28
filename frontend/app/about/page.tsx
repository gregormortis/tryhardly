export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-950">
      {/* Hero Section */}
      <section className="relative py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-amber-400 via-orange-500 to-purple-600 bg-clip-text text-transparent">
            About Tryhardly
          </h1>
          <p className="text-xl text-gray-300 leading-relaxed">
            Transform freelance work into epic adventures. We're building the most gamified gig marketplace ever created.
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 px-4 bg-gray-900/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-8 text-amber-400">⚔️ Our Mission</h2>
          <p className="text-lg text-gray-300 leading-relaxed mb-6">
            Tryhardly reimagines freelance work as an RPG adventure. Every project is a quest, every skill earns XP, 
            and every freelancer is an adventurer leveling up through their career journey.
          </p>
          <p className="text-lg text-gray-300 leading-relaxed">
            We believe work should be engaging, rewarding, and fun. By gamifying the freelance experience, 
            we make professional growth more motivating and community-driven.
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center text-amber-400">✨ What Makes Us Different</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-800">
              <div className="text-4xl mb-4">⭐</div>
              <h3 className="text-xl font-bold mb-3 text-amber-400">Level Up System</h3>
              <p className="text-gray-300">
                Progress from Novice to Legendary Hero. Complete quests to earn XP and unlock better opportunities.
              </p>
            </div>
            <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-800">
              <h3 className="text-xl font-bold mb-3 text-amber-400">Guild System</h3>
              <p className="text-gray-300">
                Join or create guilds with other adventurers. Collaborate on epic quests and build your reputation.
              </p>
            </div>
            <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-800">
              <div className="text-4xl mb-4">💎</div>
              <h3 className="text-xl font-bold mb-3 text-amber-400">Quest Rewards</h3>
              <p className="text-gray-300">
                Fair payment in escrow until quest completion. Earn gold, gain experience, and build your legendary portfolio.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 bg-gray-900/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center text-amber-400">🎮 By The Numbers</h2>
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-amber-400 mb-2">2,400+</div>
              <div className="text-gray-400">Active Quests</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-purple-400 mb-2">18,000+</div>
              <div className="text-gray-400">Adventurers</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-400 mb-2">340+</div>
              <div className="text-gray-400">Guilds</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-green-400 mb-2">$1.2M+</div>
              <div className="text-gray-400">Gold Paid Out</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6 text-amber-400">Ready to Start Your Adventure?</h2>
          <p className="text-xl text-gray-300 mb-8">
            Join thousands of adventurers turning their skills into legendary quests.
          </p>
          <div className="flex gap-4 justify-center">
            <a 
              href="/auth/register"
              className="bg-amber-600 hover:bg-amber-700 text-black font-bold px-8 py-4 rounded-lg transition-colors"
            >
              Start Your Adventure
            </a>
            <a 
              href="/questboard"
              className="bg-gray-800 hover:bg-gray-700 text-gray-100 font-bold px-8 py-4 rounded-lg transition-colors"
            >
              Browse Quests
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

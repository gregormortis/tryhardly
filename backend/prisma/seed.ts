import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data (order matters for FK constraints)
  await prisma.notification.deleteMany();
  await prisma.userAchievement.deleteMany();
  await prisma.achievement.deleteMany();
  await prisma.message.deleteMany();
  await prisma.review.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.application.deleteMany();
  await prisma.quest.deleteMany();
  await prisma.guildMember.deleteMany();
  await prisma.user.updateMany({ data: { guildId: null } });
  await prisma.guild.deleteMany();
  await prisma.user.deleteMany();

  console.log('✅ Cleared existing data');

  const password = await bcrypt.hash('password123', 10);

  // ── Users ──────────────────────────────────────────────────────────────────

  const alice = await prisma.user.create({
    data: {
      email: 'alice@tryhardly.com',
      username: 'alice_warrior',
      passwordHash: password,
      displayName: 'Alice the Brave',
      bio: 'Full-stack developer with 5 years of experience. Love tackling complex challenges!',
      level: 15,
      xp: 12500,
      adventurerClass: 'WARRIOR',
      reputationScore: 450,
      totalQuestsCompleted: 47,
    },
  });

  const bob = await prisma.user.create({
    data: {
      email: 'bob@tryhardly.com',
      username: 'bob_mage',
      passwordHash: password,
      displayName: 'Bob the Designer',
      bio: 'UI/UX designer specializing in modern, clean interfaces',
      level: 12,
      xp: 9800,
      adventurerClass: 'MAGE',
      reputationScore: 380,
      totalQuestsCompleted: 35,
    },
  });

  const carol = await prisma.user.create({
    data: {
      email: 'carol@tryhardly.com',
      username: 'carol_rogue',
      passwordHash: password,
      displayName: 'Carol the Wordsmith',
      bio: 'Content writer and copywriter. Words are my weapons!',
      level: 10,
      xp: 7200,
      adventurerClass: 'ROGUE',
      reputationScore: 290,
      totalQuestsCompleted: 28,
    },
  });

  const david = await prisma.user.create({
    data: {
      email: 'david@tryhardly.com',
      username: 'david_client',
      passwordHash: password,
      displayName: 'David the Merchant',
      bio: 'Startup founder looking for talented adventurers',
      level: 5,
      xp: 1500,
      adventurerClass: 'WARRIOR',
      reputationScore: 120,
      totalQuestsPosted: 15,
    },
  });

  const eve = await prisma.user.create({
    data: {
      email: 'eve@tryhardly.com',
      username: 'eve_cleric',
      passwordHash: password,
      displayName: 'Eve the Sage',
      bio: 'Business consultant & coach. Helping teams level up since 2018.',
      level: 8,
      xp: 5400,
      adventurerClass: 'CLERIC',
      reputationScore: 210,
      totalQuestsCompleted: 19,
    },
  });

  const users = [alice, bob, carol, david, eve];
  console.log(`✅ Created ${users.length} users`);

  // ── Guilds ─────────────────────────────────────────────────────────────────

  const codeCrusaders = await prisma.guild.create({
    data: {
      name: 'CodeCrusaders',
      tag: 'CC',
      description: 'Elite developers conquering the toughest coding quests',
      isPublic: true,
      leaderId: alice.id,
      reputationScore: 420,
    },
  });

  const designDynasty = await prisma.guild.create({
    data: {
      name: 'DesignDynasty',
      tag: 'DD',
      description: 'Creative minds crafting beautiful digital experiences',
      isPublic: true,
      leaderId: bob.id,
      reputationScore: 310,
    },
  });

  console.log('✅ Created 2 guilds');

  // Guild memberships
  await prisma.guildMember.createMany({
    data: [
      { guildId: codeCrusaders.id, userId: alice.id, role: 'LEADER' },
      { guildId: codeCrusaders.id, userId: eve.id, role: 'MEMBER' },
      { guildId: designDynasty.id, userId: bob.id, role: 'LEADER' },
      { guildId: designDynasty.id, userId: carol.id, role: 'MEMBER' },
    ],
  });

  // Set guildId on users
  await prisma.user.update({ where: { id: alice.id }, data: { guildId: codeCrusaders.id } });
  await prisma.user.update({ where: { id: eve.id }, data: { guildId: codeCrusaders.id } });
  await prisma.user.update({ where: { id: bob.id }, data: { guildId: designDynasty.id } });
  await prisma.user.update({ where: { id: carol.id }, data: { guildId: designDynasty.id } });

  console.log('✅ Added guild members');

  // ── Quests ─────────────────────────────────────────────────────────────────

  const quest1 = await prisma.quest.create({
    data: {
      title: 'Build a REST API for E-commerce Platform',
      description: 'Need a robust Node.js/Express REST API with PostgreSQL database. Must include user authentication, product management, cart functionality, and payment integration with Stripe.',
      category: 'WEB_DEVELOPMENT',
      difficulty: 'EXPERT',
      reward: 2500,
      xpReward: 500,
      tags: ['Node.js', 'PostgreSQL', 'Stripe', 'REST'],
      status: 'OPEN',
      questGiverId: david.id,
    },
  });

  const quest2 = await prisma.quest.create({
    data: {
      title: 'Brand Identity Design for Artisan Bakery',
      description: 'Create a complete brand identity including logo, color palette, typography, and brand guidelines for a modern artisan bakery.',
      category: 'DESIGN',
      difficulty: 'JOURNEYMAN',
      reward: 800,
      xpReward: 250,
      tags: ['Figma', 'Branding', 'Logo'],
      status: 'OPEN',
      questGiverId: david.id,
    },
  });

  const quest3 = await prisma.quest.create({
    data: {
      title: 'Write 10 SEO-Optimized Blog Posts',
      description: 'Need 10 high-quality blog posts (1000-1500 words each) for a SaaS startup in the project management space.',
      category: 'WRITING',
      difficulty: 'APPRENTICE',
      reward: 400,
      xpReward: 100,
      tags: ['SEO', 'Content', 'SaaS'],
      status: 'OPEN',
      questGiverId: david.id,
    },
  });

  const quest4 = await prisma.quest.create({
    data: {
      title: 'Mobile App UI/UX Design (iOS & Android)',
      description: 'Design modern, intuitive UI/UX for a fitness tracking mobile app. Complete user flows, wireframes, and high-fidelity mockups.',
      category: 'DESIGN',
      difficulty: 'EXPERT',
      reward: 1800,
      xpReward: 500,
      tags: ['Figma', 'Mobile', 'UI/UX'],
      status: 'IN_PROGRESS',
      questGiverId: david.id,
      assignedAdventurerId: bob.id,
    },
  });

  const quest5 = await prisma.quest.create({
    data: {
      title: 'React Dashboard with Real-time Analytics',
      description: 'Build a responsive React dashboard with real-time analytics, charts, and data visualization. TypeScript required.',
      category: 'WEB_DEVELOPMENT',
      difficulty: 'MASTER',
      reward: 3200,
      xpReward: 1000,
      tags: ['React', 'TypeScript', 'D3', 'WebSocket'],
      status: 'OPEN',
      questGiverId: david.id,
    },
  });

  const quest6 = await prisma.quest.create({
    data: {
      title: 'Social Media Marketing Strategy',
      description: 'Develop comprehensive 3-month social media marketing strategy for new eco-friendly product line.',
      category: 'MARKETING',
      difficulty: 'JOURNEYMAN',
      reward: 950,
      xpReward: 250,
      tags: ['Social Media', 'Strategy', 'Content Calendar'],
      status: 'OPEN',
      questGiverId: david.id,
    },
  });

  const quest7 = await prisma.quest.create({
    data: {
      title: 'Python Data Pipeline for Analytics',
      description: 'Build ETL pipeline to ingest data from 3 APIs, transform, and load into a data warehouse. Include monitoring and error handling.',
      category: 'DATA_SCIENCE',
      difficulty: 'EXPERT',
      reward: 2200,
      xpReward: 500,
      tags: ['Python', 'ETL', 'Airflow', 'BigQuery'],
      status: 'OPEN',
      questGiverId: alice.id,
    },
  });

  const quest8 = await prisma.quest.create({
    data: {
      title: 'Landing Page Redesign',
      description: 'Redesign existing SaaS landing page for higher conversion. A/B test ready. Must be responsive and fast.',
      category: 'WEB_DEVELOPMENT',
      difficulty: 'APPRENTICE',
      reward: 600,
      xpReward: 100,
      tags: ['HTML', 'CSS', 'Conversion', 'Responsive'],
      status: 'COMPLETED',
      questGiverId: david.id,
      assignedAdventurerId: alice.id,
      completedAt: new Date('2026-03-20'),
    },
  });

  const quest9 = await prisma.quest.create({
    data: {
      title: 'Business Process Consulting',
      description: 'Review and optimize internal team workflows. Deliver recommendations doc and implementation roadmap.',
      category: 'OTHER',
      difficulty: 'JOURNEYMAN',
      reward: 1200,
      xpReward: 250,
      tags: ['Consulting', 'Process', 'Documentation'],
      status: 'OPEN',
      questGiverId: david.id,
    },
  });

  const quest10 = await prisma.quest.create({
    data: {
      title: 'Flutter Cross-Platform App MVP',
      description: 'Build MVP for a habit-tracking app using Flutter. Must work on iOS and Android with offline support.',
      category: 'MOBILE_DEV',
      difficulty: 'MASTER',
      reward: 4000,
      xpReward: 1000,
      tags: ['Flutter', 'Dart', 'Mobile', 'Firebase'],
      status: 'OPEN',
      questGiverId: alice.id,
    },
  });

  const quests = [quest1, quest2, quest3, quest4, quest5, quest6, quest7, quest8, quest9, quest10];
  console.log(`✅ Created ${quests.length} quests`);

  // ── Applications ───────────────────────────────────────────────────────────

  await prisma.application.createMany({
    data: [
      {
        questId: quest1.id,
        adventurerId: alice.id,
        coverLetter: 'I have 5+ years of experience building scalable REST APIs. I can deliver this within 2 weeks with clean, well-documented code.',
        proposedRate: 2400,
        status: 'PENDING',
      },
      {
        questId: quest2.id,
        adventurerId: bob.id,
        coverLetter: "Your bakery deserves a brand that reflects its artisan quality. I've created brand identities for 15+ food businesses.",
        proposedRate: 750,
        status: 'PENDING',
      },
      {
        questId: quest3.id,
        adventurerId: carol.id,
        coverLetter: "SEO-optimized content is my specialty. I've written for multiple SaaS companies and consistently rank on first page of Google.",
        proposedRate: 400,
        status: 'PENDING',
      },
      {
        questId: quest5.id,
        adventurerId: alice.id,
        coverLetter: "React dashboards are my bread and butter. Built 3 production analytics dashboards with D3 and real-time WebSocket feeds.",
        proposedRate: 3000,
        status: 'PENDING',
      },
      {
        questId: quest6.id,
        adventurerId: eve.id,
        coverLetter: "I've developed social media strategies for 10+ eco-brands. Let me bring that expertise to your product line.",
        proposedRate: 900,
        status: 'PENDING',
      },
    ],
  });

  console.log('✅ Created 5 applications');

  // ── Milestones ─────────────────────────────────────────────────────────────

  await prisma.milestone.createMany({
    data: [
      { questId: quest4.id, title: 'User research & wireframes', description: 'User interviews, competitor analysis, and low-fi wireframes', amount: 500 },
      { questId: quest4.id, title: 'High-fidelity mockups', description: 'Complete UI designs for all screens in Figma', amount: 800, status: 'COMPLETED', completedAt: new Date('2026-03-25') },
      { questId: quest4.id, title: 'Design system & handoff', description: 'Component library, style guide, and dev-ready specs', amount: 500 },
      { questId: quest1.id, title: 'API architecture & auth', description: 'Project setup, database schema, and JWT auth', amount: 800 },
      { questId: quest1.id, title: 'Core CRUD endpoints', description: 'Products, cart, orders endpoints with validation', amount: 900 },
      { questId: quest1.id, title: 'Payment integration & docs', description: 'Stripe integration, API docs, and deployment', amount: 800 },
    ],
  });

  console.log('✅ Created milestones');

  // ── Reviews ────────────────────────────────────────────────────────────────

  await prisma.review.create({
    data: {
      questId: quest8.id,
      reviewerId: david.id,
      rating: 5,
      comment: 'Alice delivered an incredible landing page. Fast, responsive, and conversion rate went up 40%. Highly recommended!',
    },
  });

  console.log('✅ Created reviews');

  // ── Achievements ───────────────────────────────────────────────────────────

  const achievements = await Promise.all([
    prisma.achievement.create({ data: { name: 'First Blood', description: 'Complete your first quest', icon: '🎯', xpReward: 50 } }),
    prisma.achievement.create({ data: { name: 'Quest Master', description: 'Complete 10 quests', icon: '⚔️', xpReward: 200 } }),
    prisma.achievement.create({ data: { name: 'Legendary Hero', description: 'Complete 50 quests', icon: '👑', xpReward: 500 } }),
    prisma.achievement.create({ data: { name: 'Guild Founder', description: 'Create a guild', icon: '🏰', xpReward: 100 } }),
    prisma.achievement.create({ data: { name: 'Social Butterfly', description: 'Join a guild', icon: '🦋', xpReward: 50 } }),
    prisma.achievement.create({ data: { name: 'Five Star', description: 'Receive a 5-star review', icon: '⭐', xpReward: 75 } }),
    prisma.achievement.create({ data: { name: 'Gold Rush', description: 'Earn $1,000+ from quests', icon: '💰', xpReward: 150 } }),
    prisma.achievement.create({ data: { name: 'Rising Star', description: 'Reach level 10', icon: '🌟', xpReward: 100 } }),
    prisma.achievement.create({ data: { name: 'Veteran', description: 'Reach level 25', icon: '🎖️', xpReward: 250 } }),
    prisma.achievement.create({ data: { name: 'Mentor', description: 'Post 10 quests as a quest giver', icon: '📋', xpReward: 150 } }),
  ]);

  console.log(`✅ Created ${achievements.length} achievements`);

  // Award achievements to users
  await prisma.userAchievement.createMany({
    data: [
      { userId: alice.id, achievementId: achievements[0].id },   // First Blood
      { userId: alice.id, achievementId: achievements[1].id },   // Quest Master
      { userId: alice.id, achievementId: achievements[3].id },   // Guild Founder
      { userId: alice.id, achievementId: achievements[5].id },   // Five Star
      { userId: alice.id, achievementId: achievements[7].id },   // Rising Star
      { userId: bob.id, achievementId: achievements[0].id },     // First Blood
      { userId: bob.id, achievementId: achievements[1].id },     // Quest Master
      { userId: bob.id, achievementId: achievements[3].id },     // Guild Founder
      { userId: bob.id, achievementId: achievements[7].id },     // Rising Star
      { userId: carol.id, achievementId: achievements[0].id },   // First Blood
      { userId: carol.id, achievementId: achievements[1].id },   // Quest Master
      { userId: carol.id, achievementId: achievements[7].id },   // Rising Star
      { userId: eve.id, achievementId: achievements[0].id },     // First Blood
      { userId: eve.id, achievementId: achievements[4].id },     // Social Butterfly
      { userId: david.id, achievementId: achievements[9].id },   // Mentor
    ],
  });

  console.log('✅ Awarded achievements');

  console.log('\n🎉 Database seeded successfully!');
  console.log('\n📊 Summary:');
  console.log(`   - ${users.length} users`);
  console.log('   - 2 guilds');
  console.log(`   - ${quests.length} quests`);
  console.log(`   - ${achievements.length} achievements`);
  console.log('\n🔐 Test credentials (all accounts):');
  console.log('   Password: password123');
  console.log('   Emails: alice@tryhardly.com, bob@tryhardly.com, carol@tryhardly.com, david@tryhardly.com, eve@tryhardly.com');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

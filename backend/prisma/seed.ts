import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data
  await prisma.notification.deleteMany();
  await prisma.userAchievement.deleteMany();
  await prisma.achievement.deleteMany();
  await prisma.message.deleteMany();
  await prisma.review.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.application.deleteMany();
  await prisma.quest.deleteMany();
  await prisma.guildMember.deleteMany();
  await prisma.guild.deleteMany();
  await prisma.user.deleteMany();

  console.log('✅ Cleared existing data');

  // Create Users
  const password = await bcrypt.hash('password123', 10);

  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'alice@tryhardly.com',
        username: 'alice_warrior',
        passwordHash: password,
        displayName: 'Alice the Brave',
        bio: 'Full-stack developer with 5 years of experience. Love tackling complex challenges!',
        level: 15,
        xp: 12500,
        class: 'WARRIOR',
        reputation: 450,
        questsCompleted: 47,
      },
    }),
    prisma.user.create({
      data: {
        email: 'bob@tryhardly.com',
        username: 'bob_mage',
        passwordHash: password,
        displayName: 'Bob the Designer',
        bio: 'UI/UX designer specializing in modern, clean interfaces',
        level: 12,
        xp: 9800,
        class: 'MAGE',
        reputation: 380,
        questsCompleted: 35,
      },
    }),
    prisma.user.create({
      data: {
        email: 'carol@tryhardly.com',
        username: 'carol_rogue',
        passwordHash: password,
        displayName: 'Carol the Wordsmith',
        bio: 'Content writer and copywriter. Words are my weapons!',
        level: 10,
        xp: 7200,
        class: 'ROGUE',
        reputation: 290,
        questsCompleted: 28,
      },
    }),
    prisma.user.create({
      data: {
        email: 'david@tryhardly.com',
        username: 'david_client',
        passwordHash: password,
        displayName: 'David the Merchant',
        bio: 'Startup founder looking for talented adventurers',
        level: 5,
        xp: 1500,
        class: 'WARRIOR',
        reputation: 120,
        questsPosted: 15,
      },
    }),
  ]);

  console.log(`✅ Created ${users.length} users`);

  // Create Guilds
  const guilds = await Promise.all([
    prisma.guild.create({
      data: {
        name: 'CodeCrusaders',
        description: 'Elite developers conquering the toughest coding quests',
        level: 8,
        xp: 8500,
        reputation: 420,
      },
    }),
    prisma.guild.create({
      data: {
        name: 'DesignDynasty',
        description: 'Creative minds crafting beautiful digital experiences',
        level: 6,
        xp: 5200,
        reputation: 310,
      },
    }),
    prisma.guild.create({
      data: {
        name: 'ContentCrafters',
        description: 'Master wordsmiths and content strategists',
        level: 5,
        xp: 3800,
        reputation: 250,
      },
    }),
  ]);

  console.log(`✅ Created ${guilds.length} guilds`);

  // Add members to guilds
  await prisma.guildMember.createMany({
    data: [
      { guildId: guilds[0].id, userId: users[0].id, role: 'LEADER' },
      { guildId: guilds[1].id, userId: users[1].id, role: 'LEADER' },
      { guildId: guilds[2].id, userId: users[2].id, role: 'LEADER' },
      { guildId: guilds[0].id, userId: users[1].id, role: 'MEMBER' },
    ],
  });

  console.log('✅ Added guild members');

  // Create Quests
  const quests = await Promise.all([
    prisma.quest.create({
      data: {
        title: 'Build a REST API for E-commerce Platform',
        description: 'Need a robust Node.js/Express REST API with PostgreSQL database. Must include user authentication, product management, cart functionality, and payment integration with Stripe. Clean code and documentation required.',
        category: 'WEB_DEVELOPMENT',
        difficulty: 'EXPERT',
        budget: 2500,
        xpReward: 500,
        status: 'OPEN',
        posterId: users[3].id,
      },
    }),
    prisma.quest.create({
      data: {
        title: 'Brand Identity Design for Artisan Bakery',
        description: 'Create a complete brand identity including logo, color palette, typography, and brand guidelines for a modern artisan bakery. Looking for warm, inviting designs that communicate quality and craftsmanship.',
        category: 'DESIGN',
        difficulty: 'JOURNEYMAN',
        budget: 800,
        xpReward: 200,
        status: 'OPEN',
        posterId: users[3].id,
      },
    }),
    prisma.quest.create({
      data: {
        title: 'Write 10 SEO-Optimized Blog Posts',
        description: 'Need 10 high-quality blog posts (1000-1500 words each) for a SaaS startup in the project management space. Must be SEO-optimized, engaging, and demonstrate expertise in productivity and team collaboration.',
        category: 'WRITING',
        difficulty: 'APPRENTICE',
        budget: 400,
        xpReward: 150,
        status: 'OPEN',
        posterId: users[3].id,
      },
    }),
    prisma.quest.create({
      data: {
        title: 'Mobile App UI/UX Design (iOS & Android)',
        description: 'Design modern, intuitive UI/UX for a fitness tracking mobile app. Need complete user flows, wireframes, and high-fidelity mockups for both iOS and Android platforms. Figma preferred.',
        category: 'DESIGN',
        difficulty: 'EXPERT',
        budget: 1800,
        xpReward: 400,
        status: 'IN_PROGRESS',
        posterId: users[3].id,
        takerId: users[1].id,
      },
    }),
    prisma.quest.create({
      data: {
        title: 'React Dashboard with Real-time Analytics',
        description: 'Build a responsive React dashboard with real-time analytics, charts (Chart.js or D3), and data visualization. TypeScript required, clean component architecture, and optimized performance.',
        category: 'WEB_DEVELOPMENT',
        difficulty: 'MASTER',
        budget: 3200,
        xpReward: 650,
        status: 'OPEN',
        posterId: users[3].id,
      },
    }),
    prisma.quest.create({
      data: {
        title: 'Social Media Marketing Strategy',
        description: 'Develop comprehensive 3-month social media marketing strategy for new eco-friendly product line. Includes content calendar, platform-specific strategies, and growth tactics.',
        category: 'MARKETING',
        difficulty: 'JOURNEYMAN',
        budget: 950,
        xpReward: 220,
        status: 'OPEN',
        posterId: users[3].id,
      },
    }),
  ]);

  console.log(`✅ Created ${quests.length} quests`);

  // Create Applications
  await prisma.application.createMany({
    data: [
      {
        questId: quests[0].id,
        applicantId: users[0].id,
        coverLetter: 'I have 5+ years of experience building scalable REST APIs. I can deliver this project within 2 weeks with clean, well-documented code.',
        proposedBudget: 2400,
        status: 'PENDING',
      },
      {
        questId: quests[1].id,
        applicantId: users[1].id,
        coverLetter: 'Your bakery deserves a brand that reflects its artisan quality. I\'ve created brand identities for 15+ food businesses. Let\'s make something beautiful!',
        proposedBudget: 750,
        status: 'PENDING',
      },
      {
        questId: quests[2].id,
        applicantId: users[2].id,
        coverLetter: 'SEO-optimized content is my specialty. I\'ve written for multiple SaaS companies and consistently rank on first page of Google. Ready to start immediately!',
        proposedBudget: 400,
        status: 'ACCEPTED',
      },
    ],
  });

  console.log('✅ Created applications');

  // Create Achievements
  const achievements = await Promise.all([
    prisma.achievement.create({
      data: {
        name: 'First Quest',
        description: 'Complete your first quest',
        icon: '🎯',
        xpReward: 50,
      },
    }),
    prisma.achievement.create({
      data: {
        name: 'Quest Master',
        description: 'Complete 10 quests',
        icon: '⚔️',
        xpReward: 200,
      },
    }),
    prisma.achievement.create({
      data: {
        name: 'Guild Founder',
        description: 'Create a guild',
        icon: '🏰',
        xpReward: 100,
      },
    }),
    prisma.achievement.create({
      data: {
        name: 'Legendary Adventurer',
        description: 'Reach level 20',
        icon: '👑',
        xpReward: 500,
      },
    }),
  ]);

  console.log(`✅ Created ${achievements.length} achievements`);

  // Award some achievements
  await prisma.userAchievement.createMany({
    data: [
      { userId: users[0].id, achievementId: achievements[0].id },
      { userId: users[0].id, achievementId: achievements[1].id },
      { userId: users[1].id, achievementId: achievements[0].id },
      { userId: users[2].id, achievementId: achievements[0].id },
    ],
  });

  console.log('✅ Awarded achievements to users');

  console.log('\n🎉 Database seeded successfully!');
  console.log('\n📊 Summary:');
  console.log(`   - ${users.length} users created`);
  console.log(`   - ${guilds.length} guilds created`);
  console.log(`   - ${quests.length} quests created`);
  console.log(`   - ${achievements.length} achievements created`);
  console.log('\n🔐 Test credentials:');
  console.log('   Email: alice@tryhardly.com');
  console.log('   Password: password123');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

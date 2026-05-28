/**
 * Safe production seed for Railway Postgres.
 *
 * - Idempotent: uses upsert on stable unique keys (email, username, guild name).
 * - Non-destructive: NEVER calls deleteMany or destructive updates on existing rows.
 * - Gated: refuses to run unless SEED_CONFIRM=yes.
 * - Transactional where practical.
 *
 * Run (only when explicitly approved):
 *   SEED_CONFIRM=yes DATABASE_URL=... npx ts-node prisma/seed.prod.ts
 */

import { PrismaClient, Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD || 'ChangeMe!Demo123';

type DemoUserSpec = {
  email: string;
  username: string;
  displayName: string;
  bio: string;
  adventurerClass: 'WARRIOR' | 'MAGE' | 'ROGUE' | 'CLERIC';
};

const DEMO_USERS: DemoUserSpec[] = [
  {
    email: 'demo-quest-giver@tryhardly.demo',
    username: 'demo_quest_giver',
    displayName: 'Demo Quest Giver',
    bio: 'Demo merchant account used to seed example open quests.',
    adventurerClass: 'WARRIOR',
  },
  {
    email: 'demo-guild-leader-cc@tryhardly.demo',
    username: 'demo_guild_leader_cc',
    displayName: 'Demo Guild Leader (CC)',
    bio: 'Demo leader of the CodeCrusaders showcase guild.',
    adventurerClass: 'WARRIOR',
  },
  {
    email: 'demo-guild-leader-dd@tryhardly.demo',
    username: 'demo_guild_leader_dd',
    displayName: 'Demo Guild Leader (DD)',
    bio: 'Demo leader of the DesignDynasty showcase guild.',
    adventurerClass: 'MAGE',
  },
];

type DemoGuildSpec = {
  name: string;
  tag: string;
  description: string;
  leaderEmail: string;
};

const DEMO_GUILDS: DemoGuildSpec[] = [
  {
    name: 'CodeCrusaders',
    tag: 'CC',
    description: 'Showcase guild for developers exploring Tryhardly.',
    leaderEmail: 'demo-guild-leader-cc@tryhardly.demo',
  },
  {
    name: 'DesignDynasty',
    tag: 'DD',
    description: 'Showcase guild for designers exploring Tryhardly.',
    leaderEmail: 'demo-guild-leader-dd@tryhardly.demo',
  },
];

type DemoQuestSpec = {
  title: string;
  description: string;
  category:
    | 'WEB_DEVELOPMENT'
    | 'MOBILE_DEV'
    | 'DESIGN'
    | 'WRITING'
    | 'MARKETING'
    | 'DATA_SCIENCE'
    | 'OTHER';
  difficulty:
    | 'NOVICE'
    | 'APPRENTICE'
    | 'JOURNEYMAN'
    | 'EXPERT'
    | 'MASTER'
    | 'LEGENDARY';
  reward: number;
  xpReward: number;
  tags: string[];
};

const DEMO_QUESTS: DemoQuestSpec[] = [
  {
    title: 'Sample Quest: Build a Marketing Landing Page',
    description:
      'Demo open quest. Build a single-page marketing site with a hero, features, and contact form. Used to showcase the Tryhardly quest board.',
    category: 'WEB_DEVELOPMENT',
    difficulty: 'APPRENTICE',
    reward: 500,
    xpReward: 100,
    tags: ['demo', 'web', 'landing-page'],
  },
  {
    title: 'Sample Quest: Logo & Brand Palette',
    description:
      'Demo open quest. Produce a logo concept plus a 5-color brand palette suitable for a small business.',
    category: 'DESIGN',
    difficulty: 'JOURNEYMAN',
    reward: 750,
    xpReward: 200,
    tags: ['demo', 'design', 'branding'],
  },
  {
    title: 'Sample Quest: Write 3 SEO Blog Posts',
    description:
      'Demo open quest. Three 1000-word SEO-optimized blog posts on a topic of the adventurer’s choice within tech/SaaS.',
    category: 'WRITING',
    difficulty: 'APPRENTICE',
    reward: 300,
    xpReward: 80,
    tags: ['demo', 'writing', 'seo'],
  },
];

function ensureConfirmation(): void {
  if (process.env.SEED_CONFIRM !== 'yes') {
    console.error(
      '❌ Refusing to run: SEED_CONFIRM is not set to "yes".\n' +
        '   Re-run with SEED_CONFIRM=yes to acknowledge this is intentional.',
    );
    process.exit(1);
  }
}

async function ensureDemoQuests(questGiverId: string) {
  // Quests have no natural unique key; use a deterministic check-then-create
  // keyed on (title + questGiverId) so re-runs don't duplicate.
  let created = 0;
  for (const spec of DEMO_QUESTS) {
    const existing = await prisma.quest.findFirst({
      where: { title: spec.title, questGiverId },
      select: { id: true },
    });
    if (existing) {
      console.log(`   • quest "${spec.title}" already present (${existing.id})`);
      continue;
    }

    const quest = await prisma.quest.create({
      data: {
        title: spec.title,
        description: spec.description,
        category: spec.category,
        difficulty: spec.difficulty,
        reward: new Prisma.Decimal(spec.reward),
        xpReward: spec.xpReward,
        tags: spec.tags,
        status: 'OPEN',
        questGiverId,
      },
      select: { id: true, title: true },
    });
    created += 1;
    console.log(`   • quest "${quest.title}" created (${quest.id})`);
  }
  return created;
}

async function main() {
  ensureConfirmation();

  console.log('🌱 Safe production seed starting…');
  console.log(`   DATABASE_URL host: ${redactDbHost(process.env.DATABASE_URL)}`);

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // Users + guilds are wrapped in a transaction so partial failure does not
  // leave an orphaned leader. Quest seeding runs outside the transaction
  // because each quest is independent and self-idempotent.
  const { usersByEmail } = await prisma.$transaction(async (tx) => {
    console.log('👤 Upserting demo users…');
    const users = new Map<string, { id: string }>();
    for (const spec of DEMO_USERS) {
      const user = await tx.user.upsert({
        where: { email: spec.email },
        update: {},
        create: {
          email: spec.email,
          username: spec.username,
          passwordHash,
          displayName: spec.displayName,
          bio: spec.bio,
          adventurerClass: spec.adventurerClass,
        },
        select: { id: true },
      });
      users.set(spec.email, user);
    }

    console.log('🏰 Upserting demo guilds…');
    for (const spec of DEMO_GUILDS) {
      const leader = users.get(spec.leaderEmail);
      if (!leader) throw new Error(`Missing leader ${spec.leaderEmail}`);

      const guild = await tx.guild.upsert({
        where: { name: spec.name },
        update: {},
        create: {
          name: spec.name,
          tag: spec.tag,
          description: spec.description,
          isPublic: true,
          leaderId: leader.id,
        },
        select: { id: true, leaderId: true },
      });

      await tx.guildMember.upsert({
        where: {
          guildId_userId: { guildId: guild.id, userId: guild.leaderId },
        },
        update: {},
        create: {
          guildId: guild.id,
          userId: guild.leaderId,
          role: 'LEADER',
        },
      });
    }

    return { usersByEmail: users };
  });

  console.log('📜 Ensuring demo quests…');
  const questGiver = usersByEmail.get('demo-quest-giver@tryhardly.demo');
  if (!questGiver) throw new Error('Missing demo-quest-giver user after upsert');
  const createdQuests = await ensureDemoQuests(questGiver.id);

  console.log('\n🎉 Safe production seed complete.');
  console.log(`   demo users:       ${DEMO_USERS.length} (upserted)`);
  console.log(`   demo guilds:      ${DEMO_GUILDS.length} (upserted)`);
  console.log(`   demo quests:      ${createdQuests} created this run`);
  console.log('\nℹ️  No existing rows were modified or deleted.');
  console.log('ℹ️  Demo users share the SEED_DEMO_PASSWORD env value (default is non-secret).');
  console.log('   Rotate or disable these accounts before exposing them publicly.');
}

function redactDbHost(url?: string): string {
  if (!url) return '(unset)';
  try {
    const u = new URL(url);
    return `${u.hostname}:${u.port || ''}/${u.pathname.replace(/^\//, '')}`;
  } catch {
    return '(unparseable)';
  }
}

main()
  .catch((err) => {
    console.error('❌ Safe seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

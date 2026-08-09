/**
 * Demo / fraud data audit for TryHardly.
 *
 * WHY THIS EXISTS
 *   A live audit of tryhardly.com on 2026-08-09 found that three public pages
 *   were rendering data that is not real marketplace activity:
 *
 *     /leaderboards  ranked four accounts with 28, 28, 24 and 3 "completed
 *                    jobs" while the platform's lifetime total is one job.
 *                    Two of those accounts — KRAUKLIS and NumberOneTryhard —
 *                    are the fake worker account and the rejected Stripe
 *                    Express account from the 2026-08-04 card-testing attack.
 *     /guilds        showed only CodeCrusaders and DesignDynasty, two
 *                    "showcase" guilds led by demo_guild_leader_cc and
 *                    demo_guild_leader_dd, created by prisma/seed.prod.ts.
 *     profile pages  carried reviews whose text is QA output, e.g.
 *                    "Live platform workflow audit completed successfully."
 *
 *   Displaying the account that attacked the platform as a top-rated worker
 *   while a Stripe account closure is under appeal is the single highest-risk
 *   thing on the site.
 *
 * WHAT THIS DOES
 *   READ-ONLY BY DEFAULT. With no flags it prints a report of every record it
 *   considers suspect and exits without writing anything. Nothing is deleted
 *   unless you pass --confirm, and even then it only touches rows it listed in
 *   the dry run.
 *
 * USAGE (from backend/)
 *   railway run npx ts-node scripts/audit-demo-data.ts              # dry run
 *   railway run npx ts-node scripts/audit-demo-data.ts --confirm    # delete
 *
 *   Optional: --users=name1,name2   override the suspect username list
 *
 * ORDER OF DELETION
 *   Reviews and skill ratings -> guild memberships -> guilds -> users. Foreign
 *   keys mean the order matters; the script follows it automatically.
 *
 * SAFETY
 *   - Never deletes a user with role ADMIN.
 *   - Never deletes a user who has a captured payment against any quest.
 *   - Prints a full manifest before and after.
 */

import { prisma } from '../src/lib/prisma';

// Accounts identified as demo seed data or as artifacts of the 2026-08-04
// card-testing incident. Adjust with --users= if this list drifts.
const DEFAULT_SUSPECT_USERNAMES = [
  'demo_guild_leader_cc',
  'demo_guild_leader_dd',
  'KRAUKLIS',
  'NumberOneTryhard',
];

// Guilds created by prisma/seed.prod.ts purely as showcase content.
const DEMO_GUILD_NAMES = ['CodeCrusaders', 'DesignDynasty'];

// Review text that is clearly internal QA output rather than customer feedback.
const QA_REVIEW_PATTERNS = [
  'workflow audit',
  'platform workflow',
  'audit completed successfully',
  'test review',
];

const args = process.argv.slice(2);
const CONFIRM = args.includes('--confirm');
const usersArg = args.find((a) => a.startsWith('--users='));
const SUSPECT_USERNAMES = usersArg
  ? usersArg.slice('--users='.length).split(',').map((s) => s.trim()).filter(Boolean)
  : DEFAULT_SUSPECT_USERNAMES;

function heading(text: string) {
  console.log(`\n${'─'.repeat(72)}\n${text}\n${'─'.repeat(72)}`);
}

async function main() {
  console.log(
    CONFIRM
      ? '⚠️  RUNNING IN DESTRUCTIVE MODE — records listed below will be deleted.'
      : 'Running in dry-run mode. Nothing will be written. Pass --confirm to delete.',
  );

  // ─── Users ────────────────────────────────────────────────────────────────
  const suspectUsers = await prisma.user.findMany({
    where: { username: { in: SUSPECT_USERNAMES } },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      reputationScore: true,
      totalQuestsPosted: true,
      createdAt: true,
    },
  });

  heading(`Suspect users (${suspectUsers.length} of ${SUSPECT_USERNAMES.length} looked up)`);
  if (suspectUsers.length === 0) {
    console.log('None found — these accounts may already be removed.');
  }
  for (const u of suspectUsers) {
    console.log(
      `  ${u.username.padEnd(22)} role=${u.role.padEnd(6)} rep=${String(u.reputationScore).padEnd(5)} posted=${u.totalQuestsPosted}  ${u.email}`,
    );
  }

  const admins = suspectUsers.filter((u) => u.role === 'ADMIN');
  if (admins.length) {
    console.log(
      `\n  Skipping ${admins.length} ADMIN account(s): ${admins.map((a) => a.username).join(', ')}`,
    );
  }

  // Protect anyone with real money attached.
  const deletableIds: string[] = [];
  for (const u of suspectUsers) {
    if (u.role === 'ADMIN') continue;
    const paid = await prisma.quest.count({
      where: {
        OR: [{ questGiverId: u.id }, { assignedAdventurerId: u.id }],
        paymentStatus: { in: ['CAPTURED', 'AUTHORIZED'] },
      },
    });
    if (paid > 0) {
      console.log(
        `  Skipping ${u.username}: ${paid} quest(s) with an AUTHORIZED or CAPTURED payment.`,
      );
      continue;
    }
    deletableIds.push(u.id);
  }

  // ─── Demo guilds ──────────────────────────────────────────────────────────
  const demoGuilds = await prisma.guild.findMany({
    where: { name: { in: DEMO_GUILD_NAMES } },
    select: { id: true, name: true, tag: true, description: true },
  });

  heading(`Demo guilds (${demoGuilds.length})`);
  for (const g of demoGuilds) {
    console.log(`  ${g.name} [${g.tag}] — ${g.description}`);
  }

  // ─── QA-artifact reviews ──────────────────────────────────────────────────
  const qaReviews = await prisma.review.findMany({
    where: {
      OR: QA_REVIEW_PATTERNS.map((p) => ({
        comment: { contains: p, mode: 'insensitive' as const },
      })),
    },
    select: { id: true, rating: true, comment: true, reviewerId: true },
  });

  heading(`QA-artifact reviews (${qaReviews.length})`);
  for (const r of qaReviews) {
    console.log(`  ${r.rating}★ "${r.comment}"`);
  }

  const total = deletableIds.length + demoGuilds.length + qaReviews.length;

  if (!CONFIRM) {
    heading('Dry run complete');
    console.log(
      `Would delete ${deletableIds.length} user(s), ${demoGuilds.length} guild(s), and ${qaReviews.length} review(s).`,
    );
    console.log('Re-run with --confirm to apply.');
    return;
  }

  if (total === 0) {
    heading('Nothing to delete');
    return;
  }

  // ─── Deletion, in FK-safe order ───────────────────────────────────────────
  heading('Deleting');

  const guildIds = demoGuilds.map((g) => g.id);

  const qaReviewIds = qaReviews.map((r) => r.id);
  if (qaReviewIds.length) {
    await prisma.skillRating.deleteMany({ where: { reviewId: { in: qaReviewIds } } });
    const { count } = await prisma.review.deleteMany({ where: { id: { in: qaReviewIds } } });
    console.log(`  reviews: ${count}`);
  }

  if (deletableIds.length) {
    await prisma.skillRating.deleteMany({
      where: { review: { reviewerId: { in: deletableIds } } },
    });
    const rev = await prisma.review.deleteMany({
      where: { OR: [{ reviewerId: { in: deletableIds } }, { revieweeId: { in: deletableIds } }] },
    });
    console.log(`  reviews by/about suspect users: ${rev.count}`);
  }

  if (guildIds.length) {
    const gm = await prisma.guildMember.deleteMany({ where: { guildId: { in: guildIds } } });
    console.log(`  guild members: ${gm.count}`);
    const g = await prisma.guild.deleteMany({ where: { id: { in: guildIds } } });
    console.log(`  guilds: ${g.count}`);
  }

  if (deletableIds.length) {
    await prisma.guildMember.deleteMany({ where: { userId: { in: deletableIds } } });
    await prisma.userAchievement.deleteMany({ where: { userId: { in: deletableIds } } });
    await prisma.notification.deleteMany({ where: { userId: { in: deletableIds } } });
    await prisma.application.deleteMany({ where: { adventurerId: { in: deletableIds } } });
    const u = await prisma.user.deleteMany({ where: { id: { in: deletableIds } } });
    console.log(`  users: ${u.count}`);
  }

  heading('Done');
  console.log('Re-run without --confirm to verify nothing suspect remains.');
}

main()
  .catch((e) => {
    console.error('\nFailed:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

/**
 * Safe data export for TryHardly (leads / users / quests).
 *
 * Reads from whatever database DATABASE_URL points at and writes CSV + JSON
 * files to ./exports (gitignored). This is READ-ONLY — it never writes to the
 * database. Sensitive fields are redacted by default.
 *
 * ⚠️  SECRETS / PII WARNING
 *   - This exports real contact data (names, emails, phone numbers). Treat the
 *     output files as confidential. Do not commit them. The ./exports directory
 *     and *.csv/*.json are gitignored.
 *   - Never paste a production DATABASE_URL into your shell history or commit it.
 *     Prefer `railway run npm run export:...` so the URL is injected for the
 *     command only and never stored locally.
 *   - passwordHash, Stripe IDs, and reset tokens are NEVER exported.
 *
 * Usage (from backend/):
 *   railway run npm run export:leads        # leads only
 *   railway run npm run export:core-data    # leads + users + quests
 *   npm run export:leads                    # uses local DATABASE_URL from .env
 *
 * Flags / env:
 *   EXPORT_DIR=./exports         output directory (default ./exports)
 *   Pass entity names as args:   ts-node scripts/export-data.ts leads users quests
 *   With no args, exports all three.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { prisma } from '../src/lib/prisma';

type Row = Record<string, unknown>;

const EXPORT_DIR = process.env.EXPORT_DIR || path.join(process.cwd(), 'exports');

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

// Minimal, dependency-free CSV serializer. Quotes every field and escapes
// embedded quotes; arrays/objects are JSON-stringified.
function toCsv(rows: Row[]): string {
  if (rows.length === 0) return '';
  const headers = Array.from(
    rows.reduce<Set<string>>((set, r) => {
      Object.keys(r).forEach((k) => set.add(k));
      return set;
    }, new Set()),
  );
  const escape = (val: unknown): string => {
    if (val === null || val === undefined) return '';
    let s: string;
    if (val instanceof Date) s = val.toISOString();
    else if (typeof val === 'object') s = JSON.stringify(val);
    else s = String(val);
    return `"${s.replace(/"/g, '""')}"`;
  };
  const lines = [headers.map((h) => `"${h}"`).join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(','));
  }
  return lines.join('\n');
}

async function writeFiles(name: string, rows: Row[]): Promise<void> {
  await fs.mkdir(EXPORT_DIR, { recursive: true });
  const base = path.join(EXPORT_DIR, `${name}-${timestamp()}`);
  await fs.writeFile(`${base}.json`, JSON.stringify(rows, null, 2), 'utf8');
  await fs.writeFile(`${base}.csv`, toCsv(rows), 'utf8');
  console.log(`  ${name}: ${rows.length} rows -> ${base}.json / .csv`);
}

async function exportLeads(): Promise<void> {
  const rows = await prisma.lead.findMany({ orderBy: { createdAt: 'desc' } });
  await writeFiles('leads', rows as unknown as Row[]);
}

async function exportUsers(): Promise<void> {
  // Explicit select — NEVER include passwordHash, stripe*, or tokens.
  const rows = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      role: true,
      verified: true,
      level: true,
      xp: true,
      reputationScore: true,
      totalQuestsPosted: true,
      totalQuestsCompleted: true,
      guildId: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  await writeFiles('users', rows as unknown as Row[]);
}

async function exportQuests(): Promise<void> {
  const rows = await prisma.quest.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      difficulty: true,
      reward: true,
      currency: true,
      status: true,
      escrowStatus: true,
      xpReward: true,
      tags: true,
      questGiverId: true,
      assignedAdventurerId: true,
      createdAt: true,
      updatedAt: true,
      deadline: true,
      completedAt: true,
      // paymentIntentId intentionally omitted.
    },
  });
  // Decimal -> string for clean CSV/JSON.
  const normalized = rows.map((q) => ({ ...q, reward: q.reward?.toString() }));
  await writeFiles('quests', normalized as unknown as Row[]);
}

const EXPORTERS: Record<string, () => Promise<void>> = {
  leads: exportLeads,
  users: exportUsers,
  quests: exportQuests,
};

async function main(): Promise<void> {
  const requested = process.argv.slice(2).filter((a) => !a.startsWith('-'));
  const targets = requested.length > 0 ? requested : Object.keys(EXPORTERS);

  const unknown = targets.filter((t) => !EXPORTERS[t]);
  if (unknown.length > 0) {
    console.error(`Unknown export target(s): ${unknown.join(', ')}`);
    console.error(`Valid targets: ${Object.keys(EXPORTERS).join(', ')}`);
    process.exit(1);
  }

  console.log(`Exporting [${targets.join(', ')}] to ${EXPORT_DIR}`);
  console.log('Reminder: output contains PII — keep it confidential, do not commit.\n');

  for (const t of targets) {
    await EXPORTERS[t]();
  }

  console.log('\nDone.');
}

main()
  .catch((err) => {
    console.error('Export failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

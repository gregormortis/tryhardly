import { prisma } from '../src/lib/prisma';

export const EXCLUSION_REASONS = {
  CARD_TESTING_ATTACK: 'card-testing-attack-2026-08-04',
  LEGACY_REMOTE: 'legacy-remote-prelaunch',
  INTERNAL_QA: 'internal-qa',
} as const;

const ATTACK_STATE_TAGS = new Set(['KY', 'NC', 'NE']);
const INTERNAL_QA_IDS = new Set([
  '300a389f-3b57-4e0b-bb13-86bf47cd15d3',
  '83623811-588e-485b-b77f-d9dccfa31286',
]);
const PROTECTED_REAL_QUEST_IDS = new Set([
  'b5a48e75-12ae-4de6-ba04-117b86ede29b',
  '2e679425-b35c-4eb4-ad6f-3848f4c32f1e',
  '87e75e52-f2f2-4e51-ab4b-68026ef522f8',
]);

export type ExclusionReason = (typeof EXCLUSION_REASONS)[keyof typeof EXCLUSION_REASONS];

/** Classify retained, non-real rows without reading or writing a database. */
export function classifyQuestExclusion(
  tags: string[],
  description: string,
  id?: string,
): ExclusionReason | null {
  if (tags.some((tag) => ATTACK_STATE_TAGS.has(tag))) {
    return EXCLUSION_REASONS.CARD_TESTING_ATTACK;
  }
  if (tags.includes('Remote') || description.startsWith('Location: Online / Remote')) {
    return EXCLUSION_REASONS.LEGACY_REMOTE;
  }
  if (id && INTERNAL_QA_IDS.has(id)) {
    return EXCLUSION_REASONS.INTERNAL_QA;
  }
  return null;
}

/** Replace only standalone 13- to 19-digit runs; all other text is retained. */
export function redactCardNumbers(value: string): string {
  return value.replace(/\b\d{13,19}\b/g, '[redacted]');
}

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const unexpectedArgs = args.filter((arg) => arg !== '--apply');

function printSummary(
  flagsByReason: Record<ExclusionReason, number>,
  redactedIds: string[],
  remainingCompleted: number,
): void {
  console.log('\nSummary');
  for (const reason of Object.values(EXCLUSION_REASONS)) {
    console.log(`  ${reason}: ${flagsByReason[reason]}`);
  }
  console.log(`  ids redacted: ${redactedIds.length ? redactedIds.join(', ') : 'none'}`);
  console.log(`  remaining COMPLETED quests with excludedFromStats = false: ${remainingCompleted}`);
}

async function main(): Promise<void> {
  if (unexpectedArgs.length) {
    throw new Error(`Unknown argument(s): ${unexpectedArgs.join(', ')}. Only --apply is supported.`);
  }

  console.log(APPLY ? 'Apply mode: planned changes will be written.' : 'Dry run: nothing will be written. Pass --apply to write changes.');

  const quests = await prisma.quest.findMany({
    select: {
      id: true,
      title: true,
      description: true,
      tags: true,
      status: true,
      excludedFromStats: true,
      excludedReason: true,
    },
  });

  const flagsByReason: Record<ExclusionReason, number> = {
    [EXCLUSION_REASONS.CARD_TESTING_ATTACK]: 0,
    [EXCLUSION_REASONS.LEGACY_REMOTE]: 0,
    [EXCLUSION_REASONS.INTERNAL_QA]: 0,
  };
  const redactedIds: string[] = [];
  const plannedChanges: Array<{
    id: string;
    reason: ExclusionReason | null;
    title: string | null;
    description: string | null;
  }> = [];

  for (const quest of quests) {
    const reason = classifyQuestExclusion(quest.tags, quest.description, quest.id);
    const title = redactCardNumbers(quest.title);
    const description = redactCardNumbers(quest.description);
    const redacted = title !== quest.title || description !== quest.description;
    const needsFlag = reason !== null && (!quest.excludedFromStats || quest.excludedReason !== reason);

    if (PROTECTED_REAL_QUEST_IDS.has(quest.id) && (reason !== null || redacted)) {
      throw new Error(`Protected real quest ${quest.id} would be changed; aborting without writes.`);
    }

    if (!needsFlag && !redacted) continue;

    if (needsFlag && reason) {
      flagsByReason[reason] += 1;
      console.log(`${APPLY ? 'FLAG' : 'WOULD FLAG'} ${quest.id} as ${reason}`);
    }
    if (redacted) {
      redactedIds.push(quest.id);
      console.log(`${APPLY ? 'REDACT' : 'WOULD REDACT'} ${quest.id}`);
    }
    plannedChanges.push({
      id: quest.id,
      reason: needsFlag ? reason : null,
      title: title !== quest.title ? title : null,
      description: description !== quest.description ? description : null,
    });
  }

  if (APPLY) {
    for (const change of plannedChanges) {
      await prisma.quest.update({
        where: { id: change.id },
        data: {
          ...(change.reason ? { excludedFromStats: true, excludedReason: change.reason } : {}),
          ...(change.title !== null ? { title: change.title } : {}),
          ...(change.description !== null ? { description: change.description } : {}),
        },
      });
    }
  }

  const remainingCompleted = APPLY
    ? await prisma.quest.count({ where: { status: 'COMPLETED', excludedFromStats: false } })
    : quests.filter((quest) =>
        quest.status === 'COMPLETED' &&
        !quest.excludedFromStats &&
        classifyQuestExclusion(quest.tags, quest.description, quest.id) === null,
      ).length;

  printSummary(flagsByReason, redactedIds, remainingCompleted);
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error('\nFailed:', error instanceof Error ? error.message : error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

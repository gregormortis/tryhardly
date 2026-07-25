import { prisma } from '../lib/prisma';

// Which of these quests has `reviewerId` already reviewed? Dashboards use this to
// decide between prompting for a review and showing it as already submitted —
// the Review model enforces one review per reviewer per quest, so a prompt that
// ignored this would just lead the user into a duplicate-review error.
export async function findQuestIdsReviewedBy(
  reviewerId: string,
  questIds: string[],
): Promise<Set<string>> {
  if (questIds.length === 0) return new Set();
  const reviews = await prisma.review.findMany({
    where: { reviewerId, questId: { in: [...new Set(questIds)] } },
    select: { questId: true },
  });
  return new Set(reviews.map((r) => r.questId));
}

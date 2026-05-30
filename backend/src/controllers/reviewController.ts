import { Request, Response } from 'express';
import { prisma } from '../app';
import { AuthRequest } from '../middleware/authMiddleware';
import { QuestStatus } from '@prisma/client';

// POST /api/quests/:questId/reviews  { rating, comment }
// Only the quest giver or the assigned adventurer may review, only once the
// quest is COMPLETED, and only once per reviewer. The reviewee is the
// counterparty on the quest.
export const createReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { questId } = req.params;
    const { rating, comment } = req.body as { rating?: number; comment?: string };
    const me = req.user!.id;

    const r = Number(rating);
    if (!Number.isInteger(r) || r < 1 || r > 5) {
      res.status(400).json({ error: 'Rating must be an integer from 1 to 5' });
      return;
    }
    if (!comment || !comment.trim()) {
      res.status(400).json({ error: 'A comment is required' });
      return;
    }

    const quest = await prisma.quest.findUnique({ where: { id: questId } });
    if (!quest) { res.status(404).json({ error: 'Quest not found' }); return; }
    if (quest.status !== QuestStatus.COMPLETED) {
      res.status(400).json({ error: 'Reviews can only be left on completed quests' });
      return;
    }

    const isGiver = quest.questGiverId === me;
    const isAdventurer = quest.assignedAdventurerId === me;
    if (!isGiver && !isAdventurer) {
      res.status(403).json({ error: 'Only quest participants can leave a review' });
      return;
    }

    // Counterparty is the other participant.
    const revieweeId = isGiver ? quest.assignedAdventurerId : quest.questGiverId;
    if (!revieweeId) {
      res.status(400).json({ error: 'No counterparty to review on this quest' });
      return;
    }

    const existing = await prisma.review.findUnique({
      where: { questId_reviewerId: { questId, reviewerId: me } },
    });
    if (existing) {
      res.status(400).json({ error: 'You have already reviewed this quest' });
      return;
    }

    const review = await prisma.review.create({
      data: { questId, reviewerId: me, revieweeId, rating: r, comment: comment.trim() },
      include: { reviewer: { select: { id: true, username: true, avatarUrl: true } } },
    });

    // Keep the reviewee's reputation score in rough sync (simple aggregate).
    const agg = await prisma.review.aggregate({
      where: { revieweeId },
      _avg: { rating: true },
      _count: true,
    });
    const avg = agg._avg.rating || 0;
    await prisma.user.update({
      where: { id: revieweeId },
      data: { reputationScore: Math.round(avg * 20) }, // 5★ -> 100
    });

    res.status(201).json(review);
  } catch (error) {
    console.error('createReview error:', error);
    res.status(500).json({ error: 'Failed to submit review' });
  }
};

// GET /api/quests/:questId/reviews  (public)
export const getQuestReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const reviews = await prisma.review.findMany({
      where: { questId: req.params.questId },
      orderBy: { createdAt: 'desc' },
      include: { reviewer: { select: { id: true, username: true, avatarUrl: true } } },
    });
    res.json(reviews);
  } catch (error) {
    console.error('getQuestReviews error:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
};

// GET /api/users/:userId/reviews  (public) — reviews received + aggregate rating
export const getUserReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.userId;
    const [reviews, agg] = await Promise.all([
      prisma.review.findMany({
        where: { revieweeId: userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          reviewer: { select: { id: true, username: true, avatarUrl: true } },
          quest: { select: { id: true, title: true } },
        },
      }),
      prisma.review.aggregate({
        where: { revieweeId: userId },
        _avg: { rating: true },
        _count: true,
      }),
    ]);
    res.json({
      reviews,
      averageRating: agg._avg.rating ? Number(agg._avg.rating.toFixed(2)) : null,
      reviewCount: agg._count,
    });
  } catch (error) {
    console.error('getUserReviews error:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
};

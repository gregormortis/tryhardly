import { Response } from 'express';
import { prisma } from '../app';
import { AuthRequest } from '../middleware/authMiddleware';

// GET /api/quests - List all quests with filters
export const getQuests = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { category, difficulty, status = 'OPEN', search, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = { status: status as string };
    if (category) where.category = category;
    if (difficulty) where.difficulty = difficulty;
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [quests, total] = await Promise.all([
      prisma.quest.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: { createdAt: 'desc' },
        include: {
          questGiver: { select: { id: true, username: true, avatarUrl: true, reputationScore: true } },
          _count: { select: { applications: true } },
        },
      }),
      prisma.quest.count({ where }),
    ]);

    res.json({ quests, total, page: parseInt(page as string), limit: parseInt(limit as string) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch quests' });
  }
};

// GET /api/quests/:id
export const getQuestById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const quest = await prisma.quest.findUnique({
      where: { id: req.params.id },
      include: {
        questGiver: { select: { id: true, username: true, avatarUrl: true, reputationScore: true, level: true } },
        applications: {
          include: { adventurer: { select: { id: true, username: true, avatarUrl: true, level: true, reputationScore: true } } },
        },
        milestones: true,
        _count: { select: { applications: true } },
      },
    });

    if (!quest) {
      res.status(404).json({ error: 'Quest not found' });
      return;
    }
    res.json(quest);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch quest' });
  }
};

// POST /api/quests
export const createQuest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, description, category, difficulty, reward, currency, xpReward, deadline, maxApplications, tags, milestones } = req.body;

    const quest = await prisma.quest.create({
      data: {
        title,
        description,
        category,
        difficulty,
        reward,
        currency: currency || 'USD',
        xpReward: xpReward || 100,
        deadline: deadline ? new Date(deadline) : null,
        maxApplications,
        tags: tags || [],
        questGiverId: req.user!.id,
        milestones: milestones ? { create: milestones } : undefined,
      },
      include: { questGiver: { select: { id: true, username: true } } },
    });

    res.status(201).json(quest);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create quest' });
  }
};

// PUT /api/quests/:id
export const updateQuest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const quest = await prisma.quest.findUnique({ where: { id: req.params.id } });
    if (!quest) { res.status(404).json({ error: 'Quest not found' }); return; }
    if (quest.questGiverId !== req.user!.id) { res.status(403).json({ error: 'Forbidden' }); return; }

    const updated = await prisma.quest.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update quest' });
  }
};

// DELETE /api/quests/:id
export const deleteQuest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const quest = await prisma.quest.findUnique({ where: { id: req.params.id } });
    if (!quest) { res.status(404).json({ error: 'Quest not found' }); return; }
    if (quest.questGiverId !== req.user!.id) { res.status(403).json({ error: 'Forbidden' }); return; }

    await prisma.quest.delete({ where: { id: req.params.id } });
    res.json({ message: 'Quest deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete quest' });
  }
};

// POST /api/quests/:id/complete
export const completeQuest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const quest = await prisma.quest.findUnique({ where: { id: req.params.id } });
    if (!quest) { res.status(404).json({ error: 'Quest not found' }); return; }
    if (quest.questGiverId !== req.user!.id) { res.status(403).json({ error: 'Forbidden' }); return; }

    const updated = await prisma.quest.update({
      where: { id: req.params.id },
      data: { status: 'COMPLETED' },
    });

    // Award XP to the accepted adventurer
    if (quest.assignedAdventurerId) {
      await prisma.user.update({
        where: { id: quest.assignedAdventurerId },
        data: {
          xp: { increment: quest.xpReward },
          totalQuestsCompleted: { increment: 1 },
        },
      });
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to complete quest' });
  }
};

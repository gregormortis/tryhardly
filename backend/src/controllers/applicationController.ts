import { Response } from 'express';
import { prisma } from '../app';
import { AuthRequest } from '../middleware/authMiddleware';

// POST /api/quests/:questId/apply
export const applyToQuest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { questId } = req.params;
    const { coverLetter, proposedRate } = req.body;

    const quest = await prisma.quest.findUnique({ where: { id: questId } });
    if (!quest) { res.status(404).json({ error: 'Quest not found' }); return; }
    if (quest.status !== 'OPEN') { res.status(400).json({ error: 'Quest is not open for applications' }); return; }
    if (quest.questGiverId === req.user!.id) { res.status(400).json({ error: 'Cannot apply to your own quest' }); return; }

    const existing = await prisma.application.findFirst({
      where: { questId, adventurerId: req.user!.id },
    });
    if (existing) { res.status(400).json({ error: 'Already applied to this quest' }); return; }

    const application = await prisma.application.create({
      data: { questId, adventurerId: req.user!.id, coverLetter, proposedRate },
      include: { adventurer: { select: { id: true, username: true, avatarUrl: true, level: true } } },
    });

    res.status(201).json(application);
  } catch (error) {
    res.status(500).json({ error: 'Failed to apply' });
  }
};

// GET /api/quests/:questId/applications
export const getQuestApplications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const quest = await prisma.quest.findUnique({ where: { id: req.params.questId } });
    if (!quest) { res.status(404).json({ error: 'Quest not found' }); return; }
    if (quest.questGiverId !== req.user!.id) { res.status(403).json({ error: 'Forbidden' }); return; }

    const applications = await prisma.application.findMany({
      where: { questId: req.params.questId },
      include: {
        adventurer: { select: { id: true, username: true, avatarUrl: true, level: true, reputationScore: true, adventurerClass: true } },
      },
      orderBy: { appliedAt: 'desc' },
    });
    res.json(applications);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
};

// PUT /api/applications/:id/accept
export const acceptApplication = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const application = await prisma.application.findUnique({
      where: { id: req.params.id },
      include: { quest: true },
    });
    if (!application) { res.status(404).json({ error: 'Application not found' }); return; }
    if (application.quest.questGiverId !== req.user!.id) { res.status(403).json({ error: 'Forbidden' }); return; }

    // Update application status and assign adventurer to quest
    const [updated] = await prisma.$transaction([
      prisma.application.update({ where: { id: req.params.id }, data: { status: 'ACCEPTED' } }),
      prisma.quest.update({
        where: { id: application.questId },
        data: { status: 'IN_PROGRESS', assignedAdventurerId: application.adventurerId },
      }),
      // Reject all other applications
      prisma.application.updateMany({
        where: { questId: application.questId, id: { not: req.params.id } },
        data: { status: 'REJECTED' },
      }),
    ]);

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to accept application' });
  }
};

// GET /api/users/me/applications - My applications as adventurer
export const getMyApplications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const applications = await prisma.application.findMany({
      where: { adventurerId: req.user!.id },
      include: { quest: { select: { id: true, title: true, category: true, difficulty: true, reward: true, status: true } } },
      orderBy: { appliedAt: 'desc' },
    });
    res.json(applications);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
};

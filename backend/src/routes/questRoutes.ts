import { Router } from 'express';
import { authenticate, optionalAuth } from '../middleware/authMiddleware';
import { getQuests, getQuestById, createQuest, updateQuest, deleteQuest, completeQuest } from '../controllers/questController';
import { applyToQuest, getQuestApplications } from '../controllers/applicationController';

const router = Router();

router.get('/', optionalAuth, getQuests);
router.get('/:id', getQuestById);
router.post('/', authenticate, createQuest);
router.put('/:id', authenticate, updateQuest);
router.delete('/:id', authenticate, deleteQuest);
router.post('/:id/complete', authenticate, completeQuest);

// Applications nested under quests
router.post('/:questId/apply', authenticate, applyToQuest);
router.get('/:questId/applications', authenticate, getQuestApplications);

export default router;

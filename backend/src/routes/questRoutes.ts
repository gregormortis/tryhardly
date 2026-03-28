import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import { getQuests, getQuestById, createQuest, updateQuest, deleteQuest, completeQuest } from '../controllers/questController';
import { applyToQuest, getQuestApplications } from '../controllers/applicationController';

const router = Router();

router.get('/', getQuests);
router.get('/:id', getQuestById);
router.post('/', authenticate, createQuest);
router.put('/:id', authenticate, updateQuest);
router.delete('/:id', authenticate, deleteQuest);
router.post('/:id/complete', authenticate, completeQuest);
router.post('/:questId/apply', authenticate, applyToQuest);
router.get('/:questId/applications', authenticate, getQuestApplications);

export default router;

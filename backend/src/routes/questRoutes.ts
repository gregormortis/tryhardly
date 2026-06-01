import { Router } from 'express';
import { authenticate, optionalAuth } from '../middleware/authMiddleware';
import { getQuests, getQuestById, createQuest, updateQuest, deleteQuest, completeQuest } from '../controllers/questController';
import { applyToQuest, getQuestApplications } from '../controllers/applicationController';
import { createReview, getQuestReviews } from '../controllers/reviewController';
import { submitCompletion, confirmCompletion, requestChanges } from '../controllers/completionController';

const router = Router();

router.get('/', optionalAuth, getQuests);
router.get('/:id', getQuestById);
router.post('/', authenticate, createQuest);
router.put('/:id', authenticate, updateQuest);
router.delete('/:id', authenticate, deleteQuest);
router.post('/:id/complete', authenticate, completeQuest);

// Work completion protocol (worker submits → giver confirms / requests changes)
router.post('/:id/completion/submit', authenticate, submitCompletion);
router.post('/:id/completion/confirm', authenticate, confirmCompletion);
router.post('/:id/completion/request-changes', authenticate, requestChanges);

// Applications nested under quests
router.post('/:questId/apply', authenticate, applyToQuest);
router.get('/:questId/applications', authenticate, getQuestApplications);

// Reviews nested under quests
router.get('/:questId/reviews', getQuestReviews);
router.post('/:questId/reviews', authenticate, createReview);

export default router;

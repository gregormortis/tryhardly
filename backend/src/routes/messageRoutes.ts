import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import { getQuestThread, sendQuestMessage, getMyThreads } from '../controllers/messageController';

const router = Router();

router.get('/threads', authenticate, getMyThreads);
router.get('/quest/:questId/with/:userId', authenticate, getQuestThread);
router.post('/quest/:questId', authenticate, sendQuestMessage);

export default router;

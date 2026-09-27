import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import {
  getQuestThread,
  sendQuestMessage,
  getMyThreads,
  sendDirectMessage,
  getDirectThread,
} from '../controllers/messageController';

const router = Router();

router.get('/threads', authenticate, getMyThreads);
// Direct (non-quest) threads must be registered before the quest routes so
// "/direct/..." is never mistaken for a quest id.
router.post('/direct', authenticate, sendDirectMessage);
router.get('/direct/with/:userId', authenticate, getDirectThread);
router.get('/quest/:questId/with/:userId', authenticate, getQuestThread);
router.post('/quest/:questId', authenticate, sendQuestMessage);

export default router;

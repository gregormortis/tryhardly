import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import { rateLimit } from '../middleware/rateLimit';
import {
  getQuestHandshake,
  proposeHandshake,
  agreeHandshake,
  declineHandshake,
  breakHandshake,
} from '../controllers/handshakeController';

const router = Router();

// Proposing terms writes a row and notifies the other party, so it is worth
// throttling. Generous enough for real back-and-forth negotiation.
const proposeLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  keyPrefix: 'handshake-propose',
  keyBy: 'user',
});

router.get('/quest/:questId', authenticate, getQuestHandshake);
router.post('/quest/:questId', authenticate, proposeLimiter, proposeHandshake);
router.post('/:id/agree', authenticate, agreeHandshake);
router.post('/:id/decline', authenticate, declineHandshake);
router.post('/:id/break', authenticate, breakHandshake);

export default router;

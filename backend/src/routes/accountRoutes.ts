import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import { rateLimit } from '../middleware/rateLimit';
import {
  requestAccountDeletion,
  getMyDeletionRequest,
  cancelMyDeletionRequest,
} from '../controllers/accountDeletionController';

const router = Router();

// Guard against accidental/abusive repeated submissions.
const deletionLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10, keyPrefix: 'account-deletion' });

router.get('/deletion-request', authenticate, getMyDeletionRequest);
router.post('/deletion-request', authenticate, deletionLimiter, requestAccountDeletion);
router.delete('/deletion-request', authenticate, deletionLimiter, cancelMyDeletionRequest);

export default router;

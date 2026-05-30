import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/authMiddleware';
import {
  getStats,
  listUsers,
  listQuests,
  cancelQuest,
  setUserVerified,
} from '../controllers/adminController';

const router = Router();

// All admin routes require an authenticated ADMIN-role user.
router.use(authenticate, requireAdmin);

router.get('/stats', getStats);
router.get('/users', listUsers);
router.get('/quests', listQuests);
router.put('/quests/:id/cancel', cancelQuest);
router.put('/users/:id/verify', setUserVerified);

export default router;

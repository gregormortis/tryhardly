import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import {
  getMyXP,
  getMyAchievements,
  getAchievementsCatalog,
  getLeaderboard,
  getReputation,
  getStats,
} from '../controllers/gamificationController';

const router = Router();

// Authenticated — user's own data
router.get('/xp', authenticate, getMyXP);
router.get('/achievements', authenticate, getMyAchievements);

// Public
router.get('/achievements/catalog', getAchievementsCatalog);
router.get('/leaderboard', getLeaderboard);
router.get('/reputation/:userId', getReputation);
router.get('/stats/:userId', getStats);

export default router;

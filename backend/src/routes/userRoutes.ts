import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import { getUserProfile, getMe, updateMe, getLeaderboard } from '../controllers/userController';
import { getMyApplications } from '../controllers/applicationController';

const router = Router();

router.get('/leaderboard', getLeaderboard);
router.get('/me', authenticate, getMe);
router.put('/me', authenticate, updateMe);
router.get('/me/applications', authenticate, getMyApplications);
router.get('/:username', getUserProfile);

export default router;

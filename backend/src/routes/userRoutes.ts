import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import { getUserProfile, getMe, updateMe, getLeaderboard } from '../controllers/userController';
import { getMyApplications, acceptApplication } from '../controllers/applicationController';

const router = Router();

// Public
router.get('/leaderboard', getLeaderboard);

// Authenticated — current user
router.get('/me', authenticate, getMe);
router.put('/me', authenticate, updateMe);
router.get('/me/applications', authenticate, getMyApplications);

// Application management (accept/reject)
router.put('/applications/:id/accept', authenticate, acceptApplication);

// Public profile by username (must be last to avoid catching /me, /leaderboard, etc.)
router.get('/:username', getUserProfile);

export default router;

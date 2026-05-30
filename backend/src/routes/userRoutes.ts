import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import { getUserProfile, getMe, updateMe, getLeaderboard } from '../controllers/userController';
import { getMyApplications, acceptApplication, rejectApplication } from '../controllers/applicationController';
import { getUserReviews } from '../controllers/reviewController';

const router = Router();

// Public
router.get('/leaderboard', getLeaderboard);
router.get('/:userId/reviews', getUserReviews);

// Authenticated — current user
router.get('/me', authenticate, getMe);
router.put('/me', authenticate, updateMe);
router.get('/me/applications', authenticate, getMyApplications);

// Application management (accept/reject)
router.put('/applications/:id/accept', authenticate, acceptApplication);
router.put('/applications/:id/reject', authenticate, rejectApplication);

// Public profile by username (must be last to avoid catching /me, /leaderboard, etc.)
router.get('/:username', getUserProfile);

export default router;

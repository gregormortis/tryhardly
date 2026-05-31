import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import { getUserProfile, getMe, updateMe, getLeaderboard } from '../controllers/userController';
import { getMyApplications, acceptApplication, rejectApplication } from '../controllers/applicationController';
import { getUserReviews } from '../controllers/reviewController';
import {
  listMyCredentials,
  createCredential,
  updateCredential,
  deleteCredential,
  getPublicCredentials,
} from '../controllers/credentialController';

const router = Router();

// Public
router.get('/leaderboard', getLeaderboard);
router.get('/:userId/reviews', getUserReviews);
router.get('/:username/credentials', getPublicCredentials);

// Authenticated — current user
router.get('/me', authenticate, getMe);
router.put('/me', authenticate, updateMe);
router.get('/me/applications', authenticate, getMyApplications);

// Authenticated — current user's professional credentials (owner-scoped CRUD).
// These literal `/me/credentials` paths are declared before the `/:username`
// catch-all below so they aren't shadowed by it.
router.get('/me/credentials', authenticate, listMyCredentials);
router.post('/me/credentials', authenticate, createCredential);
router.put('/me/credentials/:id', authenticate, updateCredential);
router.delete('/me/credentials/:id', authenticate, deleteCredential);

// Application management (accept/reject)
router.put('/applications/:id/accept', authenticate, acceptApplication);
router.put('/applications/:id/reject', authenticate, rejectApplication);

// Public profile by username (must be last to avoid catching /me, /leaderboard, etc.)
router.get('/:username', getUserProfile);

export default router;

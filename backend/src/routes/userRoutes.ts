import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import { getUserProfile, getMe, updateMe, getLeaderboard } from '../controllers/userController';
import { getMyApplications, acceptApplication, rejectApplication } from '../controllers/applicationController';
import { getUserReviews, getUserSkillBadges } from '../controllers/reviewController';
import { updateFavoriteSkills } from '../controllers/progressionController';
import {
  listMyCredentials,
  createCredential,
  updateCredential,
  deleteCredential,
  getPublicCredentials,
} from '../controllers/credentialController';
import {
  listMyProof,
  createProof,
  updateProof,
  deleteProof,
  getPublicProof,
} from '../controllers/proofController';
import {
  getMyPledge,
  pledgeCodeOfCraft,
  withdrawPledge,
  getVerifiedPro,
} from '../controllers/professionalismController';

const router = Router();

// Public
router.get('/leaderboard', getLeaderboard);
router.get('/:userId/reviews', getUserReviews);
router.get('/:userId/skill-badges', getUserSkillBadges);
router.get('/:userId/verified-pro', getVerifiedPro);
router.get('/:username/credentials', getPublicCredentials);
router.get('/:username/proof', getPublicProof);

// Authenticated — current user
router.get('/me', authenticate, getMe);
router.put('/me', authenticate, updateMe);
router.put('/me/favorite-skills', authenticate, updateFavoriteSkills);
router.get('/me/applications', authenticate, getMyApplications);

// Authenticated — current user's professional credentials (owner-scoped CRUD).
// These literal `/me/credentials` paths are declared before the `/:username`
// catch-all below so they aren't shadowed by it.
router.get('/me/credentials', authenticate, listMyCredentials);
router.post('/me/credentials', authenticate, createCredential);
router.put('/me/credentials/:id', authenticate, updateCredential);
router.delete('/me/credentials/:id', authenticate, deleteCredential);

// Authenticated — Code of Craft pledge (owner-scoped). Literal `/me/pledge`
// paths declared before the `/:username` catch-all so they aren't shadowed.
router.get('/me/pledge', authenticate, getMyPledge);
router.post('/me/pledge', authenticate, pledgeCodeOfCraft);
router.delete('/me/pledge', authenticate, withdrawPledge);

// Authenticated — proof-of-work gallery (owner-scoped CRUD).
router.get('/me/proof', authenticate, listMyProof);
router.post('/me/proof', authenticate, createProof);
router.put('/me/proof/:id', authenticate, updateProof);
router.delete('/me/proof/:id', authenticate, deleteProof);

// Application management (accept/reject)
router.put('/applications/:id/accept', authenticate, acceptApplication);
router.put('/applications/:id/reject', authenticate, rejectApplication);

// Public profile by username (must be last to avoid catching /me, /leaderboard, etc.)
router.get('/:username', getUserProfile);

export default router;

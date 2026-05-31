import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/authMiddleware';
import {
  getStats,
  listUsers,
  listQuests,
  cancelQuest,
  setUserVerified,
  getAchievementCatalogForAdmin,
  awardUserAchievement,
  revokeUserAchievement,
} from '../controllers/adminController';
import { listReports, updateReport } from '../controllers/reportController';
import { listLeads, updateLead, convertLead } from '../controllers/leadController';
import { listCredentialsForReview, reviewCredential } from '../controllers/credentialController';

const router = Router();

// All admin routes require an authenticated ADMIN-role user.
router.use(authenticate, requireAdmin);

router.get('/stats', getStats);
router.get('/users', listUsers);
router.get('/quests', listQuests);
router.put('/quests/:id/cancel', cancelQuest);
router.put('/users/:id/verify', setUserVerified);
router.get('/achievements/catalog', getAchievementCatalogForAdmin);
router.post('/users/:id/achievements', awardUserAchievement);
router.delete('/users/:id/achievements/:key', revokeUserAchievement);
router.get('/reports', listReports);
router.put('/reports/:id', updateReport);
router.get('/leads', listLeads);
router.put('/leads/:id', updateLead);
router.post('/leads/:id/convert', convertLead);
router.get('/credentials', listCredentialsForReview);
router.put('/credentials/:id', reviewCredential);

export default router;

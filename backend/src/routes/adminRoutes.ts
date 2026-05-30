import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/authMiddleware';
import {
  getStats,
  listUsers,
  listQuests,
  cancelQuest,
  setUserVerified,
} from '../controllers/adminController';
import { listReports, updateReport } from '../controllers/reportController';
import { listLeads, updateLead, convertLead } from '../controllers/leadController';

const router = Router();

// All admin routes require an authenticated ADMIN-role user.
router.use(authenticate, requireAdmin);

router.get('/stats', getStats);
router.get('/users', listUsers);
router.get('/quests', listQuests);
router.put('/quests/:id/cancel', cancelQuest);
router.put('/users/:id/verify', setUserVerified);
router.get('/reports', listReports);
router.put('/reports/:id', updateReport);
router.get('/leads', listLeads);
router.put('/leads/:id', updateLead);
router.post('/leads/:id/convert', convertLead);

export default router;

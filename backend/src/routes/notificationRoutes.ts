import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import { getNotifications, markRead, markAllRead } from '../controllers/notificationController';

const router = Router();

router.get('/', authenticate, getNotifications);
router.put('/read-all', authenticate, markAllRead);
router.put('/:id/read', authenticate, markRead);

export default router;

import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import { getGuilds, getGuildById, createGuild, joinGuild, leaveGuild } from '../controllers/guildController';

const router = Router();

router.get('/', getGuilds);
router.get('/:id', getGuildById);
router.post('/', authenticate, createGuild);
router.post('/:id/join', authenticate, joinGuild);
router.delete('/:id/leave', authenticate, leaveGuild);

export default router;

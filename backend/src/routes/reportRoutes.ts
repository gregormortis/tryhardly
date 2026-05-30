import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import { rateLimit } from '../middleware/rateLimit';
import { createReport } from '../controllers/reportController';

const router = Router();

// Basic abuse guard so the report endpoint can't be spammed.
const reportLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 20, keyPrefix: 'report' });

router.post('/', authenticate, reportLimiter, createReport);

export default router;

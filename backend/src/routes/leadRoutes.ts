import { Router } from 'express';
import { rateLimit } from '../middleware/rateLimit';
import { createJobRequest, createWorkerAlert } from '../controllers/leadController';

const router = Router();

// Public, no-auth acquisition endpoints. Rate-limited per IP as a basic abuse
// guard since these accept anonymous submissions.
const leadLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 15, keyPrefix: 'lead' });

router.post('/job-request', leadLimiter, createJobRequest);
router.post('/worker-alert', leadLimiter, createWorkerAlert);

export default router;

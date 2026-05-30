import { Router } from 'express';
import { rateLimit } from '../middleware/rateLimit';
import {
  createJobRequest,
  createWorkerAlert,
  getLeadByClaimToken,
  updateLeadByClaimToken,
  resendClaimLink,
} from '../controllers/leadController';

const router = Router();

// Public, no-auth acquisition endpoints. Rate-limited per IP as a basic abuse
// guard since these accept anonymous submissions.
const leadLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 15, keyPrefix: 'lead' });

router.post('/job-request', leadLimiter, createJobRequest);
router.post('/worker-alert', leadLimiter, createWorkerAlert);

// Public no-account claim/manage flow. The token in the query is the only
// credential, so rate-limit to blunt brute-force guessing of token values.
const claimLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 60, keyPrefix: 'lead-claim' });
const resendLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, keyPrefix: 'lead-claim-resend' });

router.get('/claim', claimLimiter, getLeadByClaimToken);
router.put('/claim', claimLimiter, updateLeadByClaimToken);
router.post('/claim/resend', resendLimiter, resendClaimLink);

export default router;

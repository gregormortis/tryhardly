import { Router } from 'express';
import { register, login, getCurrentUser } from '../controllers/authController';
import { requestPasswordReset, resetPassword } from '../controllers/passwordResetController';
import { verifyEmail, resendVerification } from '../controllers/emailVerificationController';
import { authenticate } from '../middleware/authMiddleware';
import { rateLimit } from '../middleware/rateLimit';

const router = Router();

// Basic abuse guards on credential + reset endpoints (per-instance, in-memory).
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, keyPrefix: 'auth' });
const resetLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, keyPrefix: 'reset' });
const verifyLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10, keyPrefix: 'verify' });

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/forgot-password', resetLimiter, requestPasswordReset);
router.post('/reset-password', resetLimiter, resetPassword);
router.post('/verify-email', verifyLimiter, verifyEmail);
router.post('/resend-verification', authenticate, verifyLimiter, resendVerification);
router.get('/me', authenticate, getCurrentUser);

export default router;

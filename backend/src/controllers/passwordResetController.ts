import { Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../app';
import { sendEmail, emailTemplates } from '../services/mailerService';

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function frontendUrl(): string {
  return (process.env.FRONTEND_URL || 'http://localhost:3000').split(',')[0].trim();
}

// POST /api/auth/forgot-password  { email }
// Always returns a generic success to avoid leaking which emails are registered.
export const requestPasswordReset = async (req: Request, res: Response): Promise<void> => {
  const generic = {
    message: 'If an account exists for that email, a reset link has been sent.',
  };
  try {
    const { email } = req.body as { email?: string };
    if (!email || typeof email !== 'string') {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });

    if (user) {
      // Invalidate any outstanding tokens for this user, then issue a fresh one.
      await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });

      const rawToken = crypto.randomBytes(32).toString('hex');
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(rawToken),
          expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
        },
      });

      const resetUrl = `${frontendUrl()}/auth/reset-password?token=${rawToken}`;
      await sendEmail(emailTemplates.passwordReset(user.email, resetUrl));

      // Outside production, surface the link in logs to make dev testing easy.
      if (process.env.NODE_ENV !== 'production') {
        console.log(`🔑 [password-reset] ${user.email} -> ${resetUrl}`);
      }
    }

    res.json(generic);
  } catch (error) {
    console.error('requestPasswordReset error:', error);
    // Still return generic success so timing/behaviour doesn't leak account state.
    res.json(generic);
  }
};

// POST /api/auth/reset-password  { token, password }
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, password } = req.body as { token?: string; password?: string };
    if (!token || !password) {
      res.status(400).json({ error: 'Token and password are required' });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' });
      return;
    }

    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(token) },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      res.status(400).json({ error: 'This reset link is invalid or has expired.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      // Invalidate any other outstanding tokens for this user.
      prisma.passwordResetToken.deleteMany({
        where: { userId: record.userId, usedAt: null, id: { not: record.id } },
      }),
    ]);

    res.json({ message: 'Your password has been reset. You can now sign in.' });
  } catch (error) {
    console.error('resetPassword error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};

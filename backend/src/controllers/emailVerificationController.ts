import { Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../app';
import { AuthRequest } from '../middleware/authMiddleware';
import { sendEmail, emailTemplates } from '../services/mailerService';

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function frontendUrl(): string {
  return (process.env.FRONTEND_URL || 'http://localhost:3000').split(',')[0].trim();
}

/**
 * Issue a fresh verification token for a user and email it. Shared by
 * registration (auto-send) and the resend endpoint. Invalidates any
 * outstanding tokens first so only the newest link works.
 */
export async function issueVerificationEmail(userId: string, email: string): Promise<void> {
  await prisma.emailVerificationToken.deleteMany({ where: { userId, usedAt: null } });

  const rawToken = crypto.randomBytes(32).toString('hex');
  await prisma.emailVerificationToken.create({
    data: {
      userId,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    },
  });

  const verifyUrl = `${frontendUrl()}/auth/verify-email?token=${rawToken}`;
  await sendEmail(emailTemplates.verifyEmail(email, verifyUrl));

  if (process.env.NODE_ENV !== 'production') {
    console.log(`✉️  [email-verify] ${email} -> ${verifyUrl}`);
  }
}

// POST /api/auth/verify-email  { token }
export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.body as { token?: string };
    if (!token) {
      res.status(400).json({ error: 'Token is required' });
      return;
    }

    const record = await prisma.emailVerificationToken.findUnique({
      where: { tokenHash: hashToken(token) },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      res.status(400).json({ error: 'This verification link is invalid or has expired.' });
      return;
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { emailVerifiedAt: new Date() } as any,
      }),
      prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      prisma.emailVerificationToken.deleteMany({
        where: { userId: record.userId, usedAt: null, id: { not: record.id } },
      }),
    ]);

    res.json({ message: 'Email verified. You can now post jobs, apply to work, and get paid.' });
  } catch (error) {
    console.error('verifyEmail error:', error);
    res.status(500).json({ error: 'Failed to verify email' });
  }
};

// POST /api/auth/resend-verification  (authenticated)
export const resendVerification = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    if ((user as any).emailVerifiedAt) {
      res.json({ message: 'Your email is already verified.' });
      return;
    }

    await issueVerificationEmail(user.id, user.email);
    res.json({ message: 'Verification email sent. Check your inbox.' });
  } catch (error) {
    console.error('resendVerification error:', error);
    res.status(500).json({ error: 'Failed to resend verification email' });
  }
};

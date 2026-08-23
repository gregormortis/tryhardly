import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../app';
import { AuthRequest } from '../middleware/authMiddleware';
import { issueVerificationEmail } from './emailVerificationController';

// POST /api/auth/register
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, username, displayName, password, adventurerClass } = req.body;

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });

    if (existingUser) {
      res.status(400).json({ error: 'User already exists' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        username,
        displayName: displayName || username,
        passwordHash,
        adventurerClass: adventurerClass || 'WARRIOR',
      },
    });

    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: expiresIn as any },
    );

    // Fire off the verification email without blocking/failing registration if
    // it errors (e.g. mail provider hiccup) — the user can always resend via
    // POST /api/auth/resend-verification. Email verification gates Stripe
    // Connect account creation, not registration/login itself.
    issueVerificationEmail(user.id, user.email).catch((err) => {
      console.error('Failed to send verification email on register:', err);
    });

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        level: user.level,
        xp: user.xp,
        adventurerClass: user.adventurerClass,
      },
      token,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

// POST /api/auth/login
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // A finalized account deletion disables login. The credential row is retained
    // only so historical quests/reviews/payments keep their references; the
    // account itself must not be able to authenticate. Return the same generic
    // 401 as bad credentials so we don't disclose that an account was deleted.
    if (user.deletedAt || user.accountStatus === 'DELETED') {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: expiresIn as any },
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        level: user.level,
        xp: user.xp,
        adventurerClass: user.adventurerClass,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

// GET /api/auth/me
export const getCurrentUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        level: true,
        xp: true,
        adventurerClass: true,
        reputationScore: true,
        verified: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            questsCompleted: { where: { status: 'COMPLETED', excludedFromStats: false } },
            questsGiven: { where: { excludedFromStats: false } },
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      ...user,
      totalQuestsCompleted: user._count.questsCompleted,
      totalQuestsPosted: user._count.questsGiven,
      _count: undefined,
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
};

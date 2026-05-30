import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../app';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
    role: string;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized', message: 'No token provided' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { userId: string };

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) {
      res.status(401).json({ error: 'Unauthorized', message: 'User not found' });
      return;
    }

    req.user = { id: user.id, email: user.email, username: user.username, role: user.role };
    next();
  } catch (_error) {
    res.status(401).json({ error: 'Unauthorized', message: 'Invalid token' });
  }
};

// Gate a route to ADMIN-role users. Must run after `authenticate`.
export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  if (req.user.role !== 'ADMIN') {
    res.status(403).json({ error: 'Forbidden', message: 'Admin access required' });
    return;
  }
  next();
};

export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { userId: string };
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (user) {
      req.user = { id: user.id, email: user.email, username: user.username, role: user.role };
    }
    next();
  } catch {
    next();
  }
};

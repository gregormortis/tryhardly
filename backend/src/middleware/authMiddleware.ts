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
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) {
      res.status(401).json({ error: 'Unauthorized', message: 'User not found' });
      return;
    }

    req.user = { id: user.id, email: user.email, username: user.username, role: user.role };
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized', message: 'Invalid token' });
  }
};

export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (user) {
      req.user = { id: user.id, email: user.email, username: user.username, role: user.role };
    }
    next();
  } catch {
    next();
  }
};

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/authRoutes';
import questRoutes from './routes/questRoutes';
import userRoutes from './routes/userRoutes';
import guildRoutes from './routes/guildRoutes';
import gamificationRoutes from './routes/gamificationRoutes';
import paymentRoutes from './routes/paymentRoutes';
import messageRoutes from './routes/messageRoutes';
import notificationRoutes from './routes/notificationRoutes';
import adminRoutes from './routes/adminRoutes';
import reportRoutes from './routes/reportRoutes';
import leadRoutes from './routes/leadRoutes';
import progressionRoutes from './routes/progressionRoutes';
import accountRoutes from './routes/accountRoutes';
import { reportError } from './lib/errorReporting';

// Initialize Prisma Client
export const prisma = new PrismaClient();

// Create Express app
const app: Application = express();

// Middleware
app.use(helmet()); // Security headers

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no Origin (server-to-server, curl, health checks)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  }),
);

// Stripe webhook needs raw body for signature verification — must come before express.json()
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(morgan('dev')); // HTTP request logger

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Root
app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: '🏰 Welcome to Tryhardly API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      quests: '/api/quests',
      users: '/api/users',
      guilds: '/api/guilds',
      payments: '/api/payments',
      gamification: '/api/gamification',
      messages: '/api/messages',
      notifications: '/api/notifications',
      admin: '/api/admin',
      reports: '/api/reports',
      leads: '/api/leads',
      account: '/api/account',
    },
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/quests', questRoutes);
app.use('/api/users', userRoutes);
app.use('/api/guilds', guildRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/progression', progressionRoutes);
app.use('/api/account', accountRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err);
  // Optional error reporting; safe no-op unless SENTRY_DSN + @sentry/node are present.
  reportError(err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

export default app;

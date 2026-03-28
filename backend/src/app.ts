import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/authRoutes';
import questRoutes from './routes/questRoutes';
import userRoutes from './routes/userRoutes';
import guildRoutes from './routes/guildRoutes';

// Initialize Prisma Client
export const prisma = new PrismaClient();

// Create Express app
const app: Application = express();

// Middleware
app.use(helmet()); // Security headers
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(morgan('dev')); // HTTP request logger

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Root
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: '🏰 Welcome to Tryhardly API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      quests: '/api/quests',
      users: '/api/users',
      guilds: '/api/guilds',
    },
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/quests', questRoutes);
app.use('/api/users', userRoutes);
app.use('/api/guilds', guildRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

export default app;

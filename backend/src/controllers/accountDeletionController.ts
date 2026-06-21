import { Response } from 'express';
import { prisma } from '../app';
import { AuthRequest } from '../middleware/authMiddleware';
import { DeletionRequestStatus } from '@prisma/client';
import { sendEmail, emailTemplates } from '../services/mailerService';

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@tryhardly.com';
const VALID_STATUSES = new Set(Object.values(DeletionRequestStatus));

// POST /api/account/deletion-request  { reason? }
// A logged-in user asks for their account and data to be deleted. We record the
// request (idempotent while one is PENDING) and notify support so it can be
// actioned. We do not hard-delete inline: the user is referenced by quests,
// reviews, messages, and payment records, so removal happens out of band.
export const requestAccountDeletion = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { reason } = req.body as { reason?: string };

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, username: true },
    });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const existing = await prisma.accountDeletionRequest.findFirst({
      where: { userId, status: DeletionRequestStatus.PENDING },
    });
    if (existing) {
      res.status(200).json({
        id: existing.id,
        status: existing.status,
        alreadyRequested: true,
      });
      return;
    }

    const request = await prisma.accountDeletionRequest.create({
      data: {
        userId,
        email: user.email,
        reason: reason?.trim() || null,
      },
    });

    // Fire-and-forget notifications; sending must never block the request.
    void sendEmail(emailTemplates.accountDeletionRequested(user.email, user.username));
    void sendEmail(
      emailTemplates.accountDeletionSupportAlert(SUPPORT_EMAIL, user.username, user.email, request.id),
    );

    res.status(201).json({ id: request.id, status: request.status, alreadyRequested: false });
  } catch (error) {
    console.error('requestAccountDeletion error:', error);
    res.status(500).json({ error: 'Failed to submit deletion request' });
  }
};

// GET /api/account/deletion-request  -> current user's pending request, if any.
export const getMyDeletionRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const request = await prisma.accountDeletionRequest.findFirst({
      where: { userId: req.user!.id, status: DeletionRequestStatus.PENDING },
      orderBy: { createdAt: 'desc' },
    });
    res.json(request ? { id: request.id, status: request.status, createdAt: request.createdAt } : null);
  } catch (error) {
    console.error('getMyDeletionRequest error:', error);
    res.status(500).json({ error: 'Failed to fetch deletion request' });
  }
};

// GET /api/admin/deletion-requests?status=PENDING  (admin only)
export const listDeletionRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const statusRaw = (req.query.status as string)?.toUpperCase();
    const where = statusRaw && VALID_STATUSES.has(statusRaw as DeletionRequestStatus)
      ? { status: statusRaw as DeletionRequestStatus }
      : {};

    const requests = await prisma.accountDeletionRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        user: { select: { id: true, username: true, email: true } },
        handledBy: { select: { id: true, username: true } },
      },
    });
    res.json(requests);
  } catch (error) {
    console.error('listDeletionRequests error:', error);
    res.status(500).json({ error: 'Failed to fetch deletion requests' });
  }
};

// PUT /api/admin/deletion-requests/:id  { status, handlerNote? }  (admin only)
export const updateDeletionRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, handlerNote } = req.body as { status?: string; handlerNote?: string };
    const normStatus = (status || '').toUpperCase();
    if (!VALID_STATUSES.has(normStatus as DeletionRequestStatus)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }

    const request = await prisma.accountDeletionRequest.findUnique({ where: { id: req.params.id } });
    if (!request) {
      res.status(404).json({ error: 'Deletion request not found' });
      return;
    }

    const isTerminal =
      normStatus === DeletionRequestStatus.COMPLETED || normStatus === DeletionRequestStatus.CANCELLED;
    const updated = await prisma.accountDeletionRequest.update({
      where: { id: req.params.id },
      data: {
        status: normStatus as DeletionRequestStatus,
        handlerNote: handlerNote?.trim() ?? request.handlerNote,
        handledById: isTerminal ? req.user!.id : null,
        handledAt: isTerminal ? new Date() : null,
      },
    });
    res.json(updated);
  } catch (error) {
    console.error('updateDeletionRequest error:', error);
    res.status(500).json({ error: 'Failed to update deletion request' });
  }
};

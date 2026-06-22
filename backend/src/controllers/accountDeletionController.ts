import { Response } from 'express';
import { prisma } from '../app';
import { AuthRequest } from '../middleware/authMiddleware';
import { DeletionRequestStatus } from '@prisma/client';
import { sendEmail, emailTemplates } from '../services/mailerService';

// Optional internal alert recipient. Email is best-effort only: the admin queue
// (GET /api/admin/deletion-requests) is the source of truth for actioning
// deletions, so we never depend on this address being deliverable. Left unset
// until a real, MX-backed inbox exists — see backend/.env.example.
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL?.trim() || '';
const VALID_STATUSES = new Set(Object.values(DeletionRequestStatus));

// Best-effort send that records the outcome without ever logging email contents
// (which may include the user's address/PII). label identifies which message it
// was; ok/failed is enough to debug delivery without exposing the payload.
function notify(label: string, message: Parameters<typeof sendEmail>[0]): void {
  void sendEmail(message)
    .then(() => console.log(`[account-deletion] notification "${label}" dispatched to provider`))
    .catch((err) =>
      console.error(
        `[account-deletion] notification "${label}" failed: ${err instanceof Error ? err.message : 'unknown error'}`,
      ),
    );
}

// POST /api/account/deletion-request  { reason? }
// A logged-in user asks for their account and data to be deleted. We record the
// request (idempotent while one is PENDING); the admin deletion queue is the
// source of truth for actioning it. Email is a best-effort courtesy only. We do
// not hard-delete inline: the user is referenced by quests, reviews, messages,
// and payment records, so removal happens out of band after review.
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
        createdAt: existing.createdAt,
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

    // The request is now queued for admin review (the source of truth). Email is
    // a best-effort courtesy on top and must never block or fail the request.
    console.log(`[account-deletion] request ${request.id} queued for admin review`);
    notify('user-confirmation', emailTemplates.accountDeletionRequested(user.email, user.username));
    if (SUPPORT_EMAIL) {
      notify(
        'support-alert',
        emailTemplates.accountDeletionSupportAlert(SUPPORT_EMAIL, user.username, user.email, request.id),
      );
    }

    res.status(201).json({
      id: request.id,
      status: request.status,
      createdAt: request.createdAt,
      alreadyRequested: false,
    });
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

// DELETE /api/account/deletion-request  -> the user withdraws their own pending
// request (e.g. they changed their mind). Only their own PENDING request can be
// cancelled; admin-actioned terminal states are left untouched.
export const cancelMyDeletionRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const existing = await prisma.accountDeletionRequest.findFirst({
      where: { userId, status: DeletionRequestStatus.PENDING },
      orderBy: { createdAt: 'desc' },
    });
    if (!existing) {
      res.status(404).json({ error: 'No pending deletion request to cancel' });
      return;
    }

    await prisma.accountDeletionRequest.update({
      where: { id: existing.id },
      data: { status: DeletionRequestStatus.CANCELLED },
    });
    console.log(`[account-deletion] request ${existing.id} withdrawn by user`);
    res.status(204).end();
  } catch (error) {
    console.error('cancelMyDeletionRequest error:', error);
    res.status(500).json({ error: 'Failed to cancel deletion request' });
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

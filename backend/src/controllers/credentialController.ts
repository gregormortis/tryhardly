import { Response } from 'express';
import { prisma } from '../app';
import { AuthRequest } from '../middleware/authMiddleware';
import { CredentialType, CredentialStatus, NotificationType } from '@prisma/client';
import { createNotification } from '../services/notificationService';

const VALID_TYPES = new Set(Object.values(CredentialType));
const VALID_STATUSES = new Set(Object.values(CredentialStatus));

// Fields a user may freely set/edit on their own credential.
interface CredentialInput {
  type?: string;
  title?: string;
  issuer?: string;
  credentialNumber?: string;
  jurisdiction?: string;
  expirationDate?: string;
  proofUrl?: string;
  notes?: string;
}

function clean(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t.length ? t : null;
}

// Parse a user-supplied date into a Date, or null if absent/invalid.
function parseDate(v: unknown): Date | null {
  const s = clean(v);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Public-safe projection for credentials shown on a profile.
const PUBLIC_SELECT = {
  id: true,
  type: true,
  title: true,
  issuer: true,
  jurisdiction: true,
  expirationDate: true,
  status: true,
  verifiedAt: true,
} as const;

// Fuller projection for the owner managing their own credentials.
const OWNER_SELECT = {
  id: true,
  type: true,
  title: true,
  issuer: true,
  credentialNumber: true,
  jurisdiction: true,
  expirationDate: true,
  proofUrl: true,
  notes: true,
  status: true,
  verifiedAt: true,
  rejectionReason: true,
  createdAt: true,
  updatedAt: true,
} as const;

// ─── Owner self-service ───────────────────────────────────────────────────────

// GET /api/users/me/credentials — all of the current user's credentials.
export const listMyCredentials = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const credentials = await prisma.professionalCredential.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      select: OWNER_SELECT,
    });
    res.json(credentials);
  } catch (error) {
    console.error('listMyCredentials error:', error);
    res.status(500).json({ error: 'Failed to fetch credentials' });
  }
};

// POST /api/users/me/credentials — create a new credential (defaults to PENDING).
export const createCredential = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const body = req.body as CredentialInput;
    const normType = (body.type || '').toUpperCase() as CredentialType;
    if (!VALID_TYPES.has(normType)) {
      res.status(400).json({ error: 'Invalid credential type' });
      return;
    }
    const title = clean(body.title);
    if (!title) {
      res.status(400).json({ error: 'title is required' });
      return;
    }

    const credential = await prisma.professionalCredential.create({
      data: {
        userId: req.user!.id,
        type: normType,
        title,
        issuer: clean(body.issuer),
        credentialNumber: clean(body.credentialNumber),
        jurisdiction: clean(body.jurisdiction),
        expirationDate: parseDate(body.expirationDate),
        proofUrl: clean(body.proofUrl),
        notes: clean(body.notes),
        // status defaults to PENDING at the DB layer.
      },
      select: OWNER_SELECT,
    });
    res.status(201).json(credential);
  } catch (error) {
    console.error('createCredential error:', error);
    res.status(500).json({ error: 'Failed to create credential' });
  }
};

// PUT /api/users/me/credentials/:id — edit a credential the caller owns.
// Editing any substantive field resets a VERIFIED/REJECTED credential back to
// PENDING (a re-review is required). Touching only `notes` does not.
export const updateCredential = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const existing = await prisma.professionalCredential.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.userId !== req.user!.id) {
      res.status(404).json({ error: 'Credential not found' });
      return;
    }

    const body = req.body as CredentialInput;

    let type = existing.type;
    if (body.type !== undefined) {
      const normType = (body.type || '').toUpperCase() as CredentialType;
      if (!VALID_TYPES.has(normType)) {
        res.status(400).json({ error: 'Invalid credential type' });
        return;
      }
      type = normType;
    }

    let title = existing.title;
    if (body.title !== undefined) {
      const t = clean(body.title);
      if (!t) {
        res.status(400).json({ error: 'title cannot be empty' });
        return;
      }
      title = t;
    }

    const next = {
      type,
      title,
      issuer: body.issuer !== undefined ? clean(body.issuer) : existing.issuer,
      credentialNumber:
        body.credentialNumber !== undefined ? clean(body.credentialNumber) : existing.credentialNumber,
      jurisdiction: body.jurisdiction !== undefined ? clean(body.jurisdiction) : existing.jurisdiction,
      expirationDate:
        body.expirationDate !== undefined ? parseDate(body.expirationDate) : existing.expirationDate,
      proofUrl: body.proofUrl !== undefined ? clean(body.proofUrl) : existing.proofUrl,
      notes: body.notes !== undefined ? clean(body.notes) : existing.notes,
    };

    // Did anything beyond `notes` change? If so, a reviewed credential must be
    // re-reviewed, so we send it back to PENDING and clear the review trail.
    const substantiveChanged =
      next.type !== existing.type ||
      next.title !== existing.title ||
      next.issuer !== existing.issuer ||
      next.credentialNumber !== existing.credentialNumber ||
      next.jurisdiction !== existing.jurisdiction ||
      (next.expirationDate?.getTime() ?? null) !== (existing.expirationDate?.getTime() ?? null) ||
      next.proofUrl !== existing.proofUrl;

    const wasReviewed =
      existing.status === CredentialStatus.VERIFIED || existing.status === CredentialStatus.REJECTED;

    const resetReview = substantiveChanged && wasReviewed;

    const updated = await prisma.professionalCredential.update({
      where: { id: existing.id },
      data: {
        ...next,
        ...(resetReview
          ? {
              status: CredentialStatus.PENDING,
              verifiedAt: null,
              verifiedById: null,
              rejectionReason: null,
            }
          : {}),
      },
      select: OWNER_SELECT,
    });
    res.json(updated);
  } catch (error) {
    console.error('updateCredential error:', error);
    res.status(500).json({ error: 'Failed to update credential' });
  }
};

// DELETE /api/users/me/credentials/:id — remove a credential the caller owns.
export const deleteCredential = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const existing = await prisma.professionalCredential.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.userId !== req.user!.id) {
      res.status(404).json({ error: 'Credential not found' });
      return;
    }
    await prisma.professionalCredential.delete({ where: { id: existing.id } });
    res.status(204).end();
  } catch (error) {
    console.error('deleteCredential error:', error);
    res.status(500).json({ error: 'Failed to delete credential' });
  }
};

// ─── Public ─────────────────────────────────────────────────────────────────

// GET /api/users/:username/credentials — only VERIFIED credentials, for public
// display. Pending/rejected/expired are never exposed here.
export const getPublicCredentials = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { username: req.params.username },
      select: { id: true },
    });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const credentials = await prisma.professionalCredential.findMany({
      where: { userId: user.id, status: CredentialStatus.VERIFIED },
      orderBy: { verifiedAt: 'desc' },
      select: PUBLIC_SELECT,
    });
    res.json(credentials);
  } catch (error) {
    console.error('getPublicCredentials error:', error);
    res.status(500).json({ error: 'Failed to fetch credentials' });
  }
};

// ─── Admin review ─────────────────────────────────────────────────────────────

// GET /api/admin/credentials?status=PENDING — review queue (admin only).
export const listCredentialsForReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const statusRaw = (req.query.status as string)?.toUpperCase();
    const where = statusRaw && VALID_STATUSES.has(statusRaw as CredentialStatus)
      ? { status: statusRaw as CredentialStatus }
      : {};

    const credentials = await prisma.professionalCredential.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        user: { select: { id: true, username: true, displayName: true } },
        verifiedBy: { select: { id: true, username: true } },
      },
    });
    res.json(credentials);
  } catch (error) {
    console.error('listCredentialsForReview error:', error);
    res.status(500).json({ error: 'Failed to fetch credentials' });
  }
};

// PUT /api/admin/credentials/:id  { status, rejectionReason? }  (admin only)
// Admin sets VERIFIED, REJECTED, EXPIRED, or back to PENDING.
export const reviewCredential = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, rejectionReason } = req.body as { status?: string; rejectionReason?: string };
    const normStatus = (status || '').toUpperCase();
    if (!VALID_STATUSES.has(normStatus as CredentialStatus)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }

    const credential = await prisma.professionalCredential.findUnique({ where: { id: req.params.id } });
    if (!credential) {
      res.status(404).json({ error: 'Credential not found' });
      return;
    }

    const isVerified = normStatus === CredentialStatus.VERIFIED;
    const isRejected = normStatus === CredentialStatus.REJECTED;

    const updated = await prisma.professionalCredential.update({
      where: { id: credential.id },
      data: {
        status: normStatus as CredentialStatus,
        verifiedById: isVerified ? req.user!.id : null,
        verifiedAt: isVerified ? new Date() : null,
        rejectionReason: isRejected ? clean(rejectionReason) : null,
      },
      include: {
        user: { select: { id: true, username: true, displayName: true } },
        verifiedBy: { select: { id: true, username: true } },
      },
    });

    // Notify the owner on a terminal review outcome. Fire-and-forget.
    if (isVerified) {
      void createNotification({
        userId: credential.userId,
        type: NotificationType.CREDENTIAL_VERIFIED,
        title: 'Credential verified',
        message: `Your credential "${credential.title}" has been verified.`,
      });
    } else if (isRejected) {
      void createNotification({
        userId: credential.userId,
        type: NotificationType.CREDENTIAL_REJECTED,
        title: 'Credential not verified',
        message: `Your credential "${credential.title}" was not verified${
          updated.rejectionReason ? `: ${updated.rejectionReason}` : '.'
        }`,
      });
    }

    res.json(updated);
  } catch (error) {
    console.error('reviewCredential error:', error);
    res.status(500).json({ error: 'Failed to update credential' });
  }
};

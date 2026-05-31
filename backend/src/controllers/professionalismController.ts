import { Response } from 'express';
import { prisma } from '../app';
import { AuthRequest } from '../middleware/authMiddleware';
import { getVerifiedProStatus } from '../services/verifiedProService';

// ─── Code of Craft pledge ──────────────────────────────────────────────────────
// A worker may pledge to the public Code of Craft. The pledge is honest: we only
// ever record a real, deliberate action by the worker, and the public profile
// shows "Code of Craft pledged" only when codeOfCraftPledgedAt is actually set.

// GET /api/users/me/pledge — the caller's own pledge status.
export const getMyPledge = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.user!.id },
      select: { codeOfCraftPledgedAt: true },
    });
    res.json({
      pledged: user.codeOfCraftPledgedAt != null,
      pledgedAt: user.codeOfCraftPledgedAt,
    });
  } catch (error) {
    console.error('getMyPledge error:', error);
    res.status(500).json({ error: 'Failed to fetch pledge status' });
  }
};

// POST /api/users/me/pledge — pledge to the Code of Craft. Idempotent: an
// existing pledge timestamp is preserved rather than reset, so the original
// pledge date stays honest.
export const pledgeCodeOfCraft = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const existing = await prisma.user.findUniqueOrThrow({
      where: { id: req.user!.id },
      select: { codeOfCraftPledgedAt: true },
    });
    if (existing.codeOfCraftPledgedAt) {
      res.json({ pledged: true, pledgedAt: existing.codeOfCraftPledgedAt });
      return;
    }
    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: { codeOfCraftPledgedAt: new Date() },
      select: { codeOfCraftPledgedAt: true },
    });
    res.status(201).json({ pledged: true, pledgedAt: updated.codeOfCraftPledgedAt });
  } catch (error) {
    console.error('pledgeCodeOfCraft error:', error);
    res.status(500).json({ error: 'Failed to record pledge' });
  }
};

// DELETE /api/users/me/pledge — withdraw the pledge. Honest in both directions:
// a worker who no longer wishes to display the pledge can remove it.
export const withdrawPledge = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { codeOfCraftPledgedAt: null },
      select: { id: true },
    });
    res.json({ pledged: false, pledgedAt: null });
  } catch (error) {
    console.error('withdrawPledge error:', error);
    res.status(500).json({ error: 'Failed to withdraw pledge' });
  }
};

// ─── Verified Pro ──────────────────────────────────────────────────────────────

// GET /api/users/:userId/verified-pro  (public) — a worker's Verified Pro
// checklist + eligibility, derived from real signals. Never mutates state.
export const getVerifiedPro = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const status = await getVerifiedProStatus(req.params.userId);
    res.json(status);
  } catch (error: any) {
    if (error?.code === 'P2025') {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    console.error('getVerifiedPro error:', error);
    res.status(500).json({ error: 'Failed to fetch Verified Pro status' });
  }
};

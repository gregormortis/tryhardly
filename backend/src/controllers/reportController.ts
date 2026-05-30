import { Response } from 'express';
import { prisma } from '../app';
import { AuthRequest } from '../middleware/authMiddleware';
import { ReportTargetType, ReportReason, ReportStatus } from '@prisma/client';

const VALID_TARGETS = new Set(Object.values(ReportTargetType));
const VALID_REASONS = new Set(Object.values(ReportReason));
const VALID_STATUSES = new Set(Object.values(ReportStatus));

// POST /api/reports  { targetType, targetId, reason, details? }
export const createReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { targetType, targetId, reason, details } = req.body as {
      targetType?: string;
      targetId?: string;
      reason?: string;
      details?: string;
    };

    const normType = (targetType || '').toUpperCase() as ReportTargetType;
    const normReason = (reason || '').toUpperCase() as ReportReason;

    if (!VALID_TARGETS.has(normType)) {
      res.status(400).json({ error: 'Invalid targetType' });
      return;
    }
    if (!targetId) {
      res.status(400).json({ error: 'targetId is required' });
      return;
    }
    if (!VALID_REASONS.has(normReason)) {
      res.status(400).json({ error: 'Invalid reason' });
      return;
    }

    const report = await prisma.report.create({
      data: {
        reporterId: req.user!.id,
        targetType: normType,
        targetId,
        reason: normReason,
        details: details?.trim() || null,
      },
    });

    res.status(201).json({ id: report.id, status: report.status });
  } catch (error) {
    console.error('createReport error:', error);
    res.status(500).json({ error: 'Failed to submit report' });
  }
};

// GET /api/admin/reports?status=OPEN  (admin only)
export const listReports = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const statusRaw = (req.query.status as string)?.toUpperCase();
    const where = statusRaw && VALID_STATUSES.has(statusRaw as ReportStatus)
      ? { status: statusRaw as ReportStatus }
      : {};

    const reports = await prisma.report.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        reporter: { select: { id: true, username: true } },
        resolvedBy: { select: { id: true, username: true } },
      },
    });
    res.json(reports);
  } catch (error) {
    console.error('listReports error:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
};

// PUT /api/admin/reports/:id  { status, resolutionNote? }  (admin only)
export const updateReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, resolutionNote } = req.body as { status?: string; resolutionNote?: string };
    const normStatus = (status || '').toUpperCase();
    if (!VALID_STATUSES.has(normStatus as ReportStatus)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }

    const report = await prisma.report.findUnique({ where: { id: req.params.id } });
    if (!report) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }

    const isTerminal = normStatus === ReportStatus.RESOLVED || normStatus === ReportStatus.DISMISSED;
    const updated = await prisma.report.update({
      where: { id: req.params.id },
      data: {
        status: normStatus as ReportStatus,
        resolutionNote: resolutionNote?.trim() ?? report.resolutionNote,
        resolvedById: isTerminal ? req.user!.id : null,
        resolvedAt: isTerminal ? new Date() : null,
      },
    });
    res.json(updated);
  } catch (error) {
    console.error('updateReport error:', error);
    res.status(500).json({ error: 'Failed to update report' });
  }
};

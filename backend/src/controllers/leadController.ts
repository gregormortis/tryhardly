import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { LeadType, LeadStatus, QuestCategory, QuestDifficulty } from '@prisma/client';
import { AuthRequest } from '../middleware/authMiddleware';
import { sendEmail, emailTemplates } from '../services/mailerService';

const VALID_STATUSES = new Set(Object.values(LeadStatus));
const VALID_TYPES = new Set(Object.values(LeadType));

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Trim a value to a string or undefined. Caps length to keep payloads sane and
// guard against oversized submissions on the public (unauthenticated) endpoints.
function str(v: unknown, max = 2000): string | undefined {
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  if (!t) return undefined;
  return t.slice(0, max);
}

// Normalize an array of strings (e.g. photo URLs, skills) from the request body.
function strArray(v: unknown, maxItems = 20, maxLen = 500): string[] {
  if (!Array.isArray(v)) {
    // Allow comma/newline-separated strings as a convenience for simple forms.
    const single = str(v, maxLen * maxItems);
    if (!single) return [];
    return single
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, maxItems);
  }
  return v
    .filter((x): x is string => typeof x === 'string')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, maxItems)
    .map((s) => s.slice(0, maxLen));
}

// POST /api/leads/job-request  (public, no auth)
// Body: { title, description?, category?, location?, budget?, timeline?,
//         name, email, phone?, photoUrls?[] }
export const createJobRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const title = str(req.body?.title, 200);
    const name = str(req.body?.name, 120);
    const email = str(req.body?.email, 254);

    if (!title) { res.status(400).json({ error: 'A short job title is required' }); return; }
    if (!name) { res.status(400).json({ error: 'Your name is required' }); return; }
    if (!email || !EMAIL_RE.test(email)) {
      res.status(400).json({ error: 'A valid email is required' });
      return;
    }

    const lead = await prisma.lead.create({
      data: {
        type: LeadType.JOB_REQUEST,
        name,
        email: email.toLowerCase(),
        phone: str(req.body?.phone, 40) ?? null,
        location: str(req.body?.location, 200) ?? null,
        title,
        description: str(req.body?.description, 5000) ?? null,
        category: str(req.body?.category, 80) ?? null,
        budget: str(req.body?.budget, 120) ?? null,
        timeline: str(req.body?.timeline, 200) ?? null,
        photoUrls: strArray(req.body?.photoUrls),
      },
      select: { id: true, status: true },
    });

    // Fire-and-forget confirmation; sendEmail never throws and is a safe no-op
    // when no real provider is configured.
    void sendEmail(emailTemplates.jobRequestReceived(email, name, title));

    res.status(201).json({ id: lead.id, status: lead.status });
  } catch (error) {
    console.error('createJobRequest error:', error);
    res.status(500).json({ error: 'Failed to submit request' });
  }
};

// POST /api/leads/worker-alert  (public, no auth)
// Body: { name, email, phone?, location?, skills?[], availability?, hasTools? }
export const createWorkerAlert = async (req: Request, res: Response): Promise<void> => {
  try {
    const name = str(req.body?.name, 120);
    const email = str(req.body?.email, 254);

    if (!name) { res.status(400).json({ error: 'Your name is required' }); return; }
    if (!email || !EMAIL_RE.test(email)) {
      res.status(400).json({ error: 'A valid email is required' });
      return;
    }

    const lead = await prisma.lead.create({
      data: {
        type: LeadType.WORKER_ALERT,
        name,
        email: email.toLowerCase(),
        phone: str(req.body?.phone, 40) ?? null,
        location: str(req.body?.location, 200) ?? null,
        skills: strArray(req.body?.skills),
        availability: str(req.body?.availability, 200) ?? null,
        hasTools: req.body?.hasTools === true || req.body?.hasTools === 'true',
      },
      select: { id: true, status: true },
    });

    void sendEmail(emailTemplates.workerAlertReceived(email, name));

    res.status(201).json({ id: lead.id, status: lead.status });
  } catch (error) {
    console.error('createWorkerAlert error:', error);
    res.status(500).json({ error: 'Failed to sign up' });
  }
};

// GET /api/admin/leads?type=JOB_REQUEST&status=NEW  (admin only)
export const listLeads = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const typeRaw = (req.query.type as string)?.toUpperCase();
    const statusRaw = (req.query.status as string)?.toUpperCase();

    const where: { type?: LeadType; status?: LeadStatus } = {};
    if (typeRaw && VALID_TYPES.has(typeRaw as LeadType)) where.type = typeRaw as LeadType;
    if (statusRaw && VALID_STATUSES.has(statusRaw as LeadStatus)) where.status = statusRaw as LeadStatus;

    const leads = await prisma.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json(leads);
  } catch (error) {
    console.error('listLeads error:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
};

// PUT /api/admin/leads/:id  { status, adminNote? }  (admin only)
export const updateLead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const statusRaw = (req.body?.status as string || '').toUpperCase();
    if (!VALID_STATUSES.has(statusRaw as LeadStatus)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }

    const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
    if (!lead) { res.status(404).json({ error: 'Lead not found' }); return; }

    const adminNote = typeof req.body?.adminNote === 'string'
      ? req.body.adminNote.trim().slice(0, 2000)
      : undefined;

    const updated = await prisma.lead.update({
      where: { id: req.params.id },
      data: {
        status: statusRaw as LeadStatus,
        adminNote: adminNote ?? lead.adminNote,
        handledById: req.user!.id,
        handledAt: new Date(),
      },
    });
    res.json(updated);
  } catch (error) {
    console.error('updateLead error:', error);
    res.status(500).json({ error: 'Failed to update lead' });
  }
};

// POST /api/admin/leads/:id/convert  { reward?, difficulty? }  (admin only)
// Turns a JOB_REQUEST lead into a real Quest owned by the converting admin and
// marks the lead CONVERTED. Worker-alert leads cannot be converted.
export const convertLead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
    if (!lead) { res.status(404).json({ error: 'Lead not found' }); return; }
    if (lead.type !== LeadType.JOB_REQUEST) {
      res.status(400).json({ error: 'Only job-request leads can be converted to a quest' });
      return;
    }
    if (lead.convertedQuestId) {
      res.status(409).json({ error: 'Lead already converted', questId: lead.convertedQuestId });
      return;
    }

    // Parse a numeric reward from the request or the lead's free-form budget.
    const rewardRaw = req.body?.reward ?? lead.budget;
    const rewardNum = Number(String(rewardRaw ?? '').replace(/[^0-9.]/g, ''));
    const reward = Number.isFinite(rewardNum) && rewardNum > 0 ? rewardNum : 0;

    const difficultyRaw = (req.body?.difficulty as string || '').toUpperCase();
    const difficulty = (Object.values(QuestDifficulty) as string[]).includes(difficultyRaw)
      ? (difficultyRaw as QuestDifficulty)
      : QuestDifficulty.NOVICE;

    // Conversion: create the quest and flip the lead atomically.
    const result = await prisma.$transaction(async (tx) => {
      const quest = await tx.quest.create({
        data: {
          title: lead.title || 'Untitled job',
          description: lead.description || lead.title || 'Imported from a help request.',
          category: QuestCategory.OTHER,
          difficulty,
          reward,
          xpReward: 0,
          tags: lead.category ? [lead.category] : [],
          questGiverId: req.user!.id,
        },
        select: { id: true },
      });

      const updatedLead = await tx.lead.update({
        where: { id: lead.id },
        data: {
          status: LeadStatus.CONVERTED,
          convertedQuestId: quest.id,
          handledById: req.user!.id,
          handledAt: new Date(),
        },
      });

      return { quest, updatedLead };
    });

    res.status(201).json({ questId: result.quest.id, lead: result.updatedLead });
  } catch (error) {
    console.error('convertLead error:', error);
    res.status(500).json({ error: 'Failed to convert lead' });
  }
};

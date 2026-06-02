import { Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { LeadType, LeadStatus, QuestCategory, QuestDifficulty, RecurrenceCadence } from '@prisma/client';
import { AuthRequest } from '../middleware/authMiddleware';
import { sendEmail, emailTemplates } from '../services/mailerService';
import { notifyMatchingWorkers } from '../services/workerMatchService';
import {
  normalizeRecurrence,
  computeNextOccurrence,
  RecurrenceValidationError,
} from '../services/recurrenceService';

const VALID_STATUSES = new Set(Object.values(LeadStatus));
const VALID_TYPES = new Set(Object.values(LeadType));

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Claim tokens let a requester view/edit their own JOB_REQUEST lead without an
// account. Only the SHA-256 hash is stored; the raw token lives only in the
// emailed link. 30-day window keeps the link useful while a job is being lined
// up without being effectively permanent.
const CLAIM_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function frontendUrl(): string {
  return (process.env.FRONTEND_URL || 'http://localhost:3000').split(',')[0].trim();
}

function claimManageUrl(rawToken: string): string {
  return `${frontendUrl()}/request-help/manage?token=${rawToken}`;
}

// Issues a fresh claim token for a lead, persists its hash + expiry, and returns
// the raw token (caller emails it). Kept separate so it can be reused by resend.
async function issueClaimToken(leadId: string): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString('hex');
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      claimTokenHash: hashToken(rawToken),
      claimTokenExpiresAt: new Date(Date.now() + CLAIM_TOKEN_TTL_MS),
    },
  });
  return rawToken;
}

// Sanitized view of a lead exposed via the public claim link. Deliberately omits
// admin-only fields (adminNote, handledById/At) and never echoes the token hash.
function publicLeadView(lead: {
  id: string;
  status: LeadStatus;
  name: string;
  email: string;
  phone: string | null;
  location: string | null;
  title: string | null;
  description: string | null;
  category: string | null;
  budget: string | null;
  timeline: string | null;
  photoUrls: string[];
  isRecurring?: boolean;
  recurrenceCadence?: RecurrenceCadence | null;
  recurrenceInterval?: number;
  recurrenceEndDate?: Date | null;
  recurrenceCount?: number | null;
  convertedQuestId: string | null;
  createdAt: Date;
}) {
  return {
    id: lead.id,
    status: lead.status,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    location: lead.location,
    title: lead.title,
    description: lead.description,
    category: lead.category,
    budget: lead.budget,
    timeline: lead.timeline,
    photoUrls: lead.photoUrls,
    isRecurring: lead.isRecurring ?? false,
    recurrenceCadence: lead.recurrenceCadence ?? null,
    recurrenceInterval: lead.recurrenceInterval ?? 1,
    recurrenceEndDate: lead.recurrenceEndDate ?? null,
    recurrenceCount: lead.recurrenceCount ?? null,
    convertedQuestId: lead.convertedQuestId,
    createdAt: lead.createdAt,
  };
}

// Resolve a JOB_REQUEST lead from a raw claim token, enforcing type + expiry.
// Returns null for any invalid/expired/non-job-request token so callers can
// respond with a single generic error (no enumeration of which leads exist).
async function findLeadByClaimToken(rawToken: string | undefined) {
  if (!rawToken || typeof rawToken !== 'string') return null;
  const lead = await prisma.lead.findUnique({ where: { claimTokenHash: hashToken(rawToken) } });
  if (!lead) return null;
  if (lead.type !== LeadType.JOB_REQUEST) return null;
  if (!lead.claimTokenExpiresAt || lead.claimTokenExpiresAt < new Date()) return null;
  return lead;
}

// Trim a value to a string or undefined. Caps length to keep payloads sane and
// guard against oversized submissions on the public (unauthenticated) endpoints.
function str(v: unknown, max = 2000): string | undefined {
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  if (!t) return undefined;
  return t.slice(0, max);
}

// UTM/ref attribution params we accept from the public lead forms. Kept to a
// fixed allowlist so we never persist arbitrary client-supplied keys.
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'ref'] as const;

// Extract acquisition attribution from a request body. `source` is the primary
// launch-channel label (?source=...); `utm` is a small object of the allowlisted
// UTM/ref params that were actually present. Every value is trimmed and length-
// capped so the public (unauthenticated) endpoints can't be used to store bulky
// or arbitrary data. Returns { source: undefined, utm: undefined } when nothing
// usable was supplied, so leads without attribution are stored unchanged.
function sourceData(body: any): { source: string | undefined; utm: Record<string, string> | undefined } {
  const source = str(body?.source, 120);

  const utm: Record<string, string> = {};
  for (const key of UTM_KEYS) {
    const v = str(body?.[key], 200);
    if (v) utm[key] = v;
  }

  return { source, utm: Object.keys(utm).length > 0 ? utm : undefined };
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

    const normalizedEmail = email.toLowerCase();

    // Optional recurrence intent (e.g. weekly mowing). Scheduling/visibility only
    // — nothing here charges or holds money; an admin later carries this into the
    // recurring quest template at conversion. Reuses the same validation as the
    // quest recurrence path so cadence/interval/end-date/count rules stay in sync.
    let recurrence;
    try {
      recurrence = normalizeRecurrence(req.body);
    } catch (e) {
      if (e instanceof RecurrenceValidationError) {
        res.status(400).json({ error: e.message });
        return;
      }
      throw e;
    }

    // Generate the claim token up-front so it can be stored atomically with the
    // lead. Only the hash is persisted; the raw token is emailed below.
    const rawClaimToken = crypto.randomBytes(32).toString('hex');

    const { source, utm } = sourceData(req.body);

    const lead = await prisma.lead.create({
      data: {
        type: LeadType.JOB_REQUEST,
        name,
        email: normalizedEmail,
        phone: str(req.body?.phone, 40) ?? null,
        location: str(req.body?.location, 200) ?? null,
        title,
        description: str(req.body?.description, 5000) ?? null,
        category: str(req.body?.category, 80) ?? null,
        budget: str(req.body?.budget, 120) ?? null,
        timeline: str(req.body?.timeline, 200) ?? null,
        photoUrls: strArray(req.body?.photoUrls),
        ...recurrence,
        source: source ?? null,
        utm: utm ?? undefined,
        claimTokenHash: hashToken(rawClaimToken),
        claimTokenExpiresAt: new Date(Date.now() + CLAIM_TOKEN_TTL_MS),
      },
      select: {
        id: true,
        status: true,
        title: true,
        location: true,
        category: true,
        budget: true,
        timeline: true,
      },
    });

    // Fire-and-forget emails; sendEmail never throws and is a safe no-op when no
    // real provider is configured. Confirmation + private manage link.
    void sendEmail(emailTemplates.jobRequestReceived(normalizedEmail, name, title));
    void sendEmail(
      emailTemplates.jobRequestClaimLink(normalizedEmail, name, title, claimManageUrl(rawClaimToken)),
    );

    // Best-effort: email worker-alert leads whose city + skills match this job.
    // notifyMatchingWorkers never throws, so it can't block or fail the
    // submission; if it errors internally it just logs and emails no one.
    void notifyMatchingWorkers(lead);

    // Outside production, surface the manage link in logs for easy dev testing.
    if (process.env.NODE_ENV !== 'production') {
      console.log(`🔗 [lead-claim] ${normalizedEmail} -> ${claimManageUrl(rawClaimToken)}`);
    }

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

    const { source, utm } = sourceData(req.body);

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
        source: source ?? null,
        utm: utm ?? undefined,
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
      // Surface how many worker-alert leads were emailed about each job request
      // so admins can see the /work-alerts matching at work in the inbox.
      include: { _count: { select: { jobNotifications: true } } },
    });

    const withCounts = leads.map(({ _count, ...lead }) => ({
      ...lead,
      workerAlertsNotified: _count.jobNotifications,
    }));

    // Attribution summary: counts by source across ALL leads matching the same
    // type/status filter (not just the 200-row page), so admins can see at a
    // glance which launch channels are driving leads. Leads with no source are
    // bucketed under '(none)'.
    const grouped = await prisma.lead.groupBy({
      by: ['source'],
      where,
      _count: { _all: true },
      orderBy: { _count: { source: 'desc' } },
    });
    const sourceSummary = grouped.map((g) => ({
      source: g.source ?? '(none)',
      count: g._count._all,
    }));

    res.json({ leads: withCounts, sourceSummary });
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

    // Recurrence for the resulting quest. An admin can explicitly set it on the
    // request body; if they don't, we carry over the recurrence intent the
    // homeowner captured on the public help request so a "weekly mowing" lead
    // converts straight into a recurring quest template. Scheduling/visibility
    // only — no money is charged or held; each occurrence pays out per-task as
    // normal. Reuses normalizeRecurrence so validation rules stay in sync.
    const bodyHasRecurrence = req.body != null && 'isRecurring' in req.body;
    const recurrenceSource = bodyHasRecurrence
      ? req.body
      : {
          isRecurring: lead.isRecurring,
          recurrenceCadence: lead.recurrenceCadence,
          recurrenceInterval: lead.recurrenceInterval,
          recurrenceEndDate: lead.recurrenceEndDate,
          recurrenceCount: lead.recurrenceCount,
        };
    let recurrence;
    try {
      recurrence = normalizeRecurrence(recurrenceSource);
    } catch (e) {
      if (e instanceof RecurrenceValidationError) {
        res.status(400).json({ error: e.message });
        return;
      }
      throw e;
    }
    const nextOccurrenceAt =
      recurrence.isRecurring && recurrence.recurrenceCadence
        ? computeNextOccurrence(
            new Date(),
            recurrence.recurrenceCadence,
            recurrence.recurrenceInterval,
            recurrence.recurrenceEndDate,
          )
        : null;

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
          ...recurrence,
          nextOccurrenceAt,
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

// ─── Public no-account claim/manage flow ──────────────────────────────────────

const INVALID_TOKEN_MSG = 'This link is invalid or has expired.';

// GET /api/leads/claim?token=...  (public, no auth)
// Validates a claim token and returns a sanitized view of the requester's own
// JOB_REQUEST lead. Marks the lead claimed on first successful view. A single
// generic error is used for all failure modes to avoid leaking lead existence.
export const getLeadByClaimToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = typeof req.query.token === 'string' ? req.query.token : undefined;
    const lead = await findLeadByClaimToken(token);
    if (!lead) { res.status(404).json({ error: INVALID_TOKEN_MSG }); return; }

    // Record first claim for light audit; never blocks viewing afterwards.
    if (!lead.claimedAt) {
      await prisma.lead.update({ where: { id: lead.id }, data: { claimedAt: new Date() } });
    }

    res.json({ lead: publicLeadView(lead) });
  } catch (error) {
    console.error('getLeadByClaimToken error:', error);
    res.status(500).json({ error: 'Failed to load request' });
  }
};

// PUT /api/leads/claim?token=...  { phone?, location?, timeline?, note? }  (public)
// Lets the requester lightly edit their own submission. Intentionally narrow:
// contact/scheduling details and an appended note only — never status, email,
// admin fields, or the token. Locked once an admin has converted the lead.
export const updateLeadByClaimToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = typeof req.query.token === 'string' ? req.query.token : undefined;
    const lead = await findLeadByClaimToken(token);
    if (!lead) { res.status(404).json({ error: INVALID_TOKEN_MSG }); return; }

    if (lead.status === LeadStatus.CONVERTED || lead.convertedQuestId) {
      res.status(409).json({ error: 'This request has been picked up and can no longer be edited here.' });
      return;
    }

    const data: {
      phone?: string | null;
      location?: string | null;
      timeline?: string | null;
      description?: string | null;
    } = {};

    if ('phone' in (req.body ?? {})) data.phone = str(req.body?.phone, 40) ?? null;
    if ('location' in (req.body ?? {})) data.location = str(req.body?.location, 200) ?? null;
    if ('timeline' in (req.body ?? {})) data.timeline = str(req.body?.timeline, 200) ?? null;
    if ('description' in (req.body ?? {})) data.description = str(req.body?.description, 5000) ?? null;

    if (Object.keys(data).length === 0) {
      res.status(400).json({ error: 'No editable fields provided' });
      return;
    }

    const updated = await prisma.lead.update({ where: { id: lead.id }, data });
    res.json({ lead: publicLeadView(updated) });
  } catch (error) {
    console.error('updateLeadByClaimToken error:', error);
    res.status(500).json({ error: 'Failed to update request' });
  }
};

// POST /api/leads/claim/resend  { email }  (public, no auth)
// Re-issues a fresh manage link for the most recent active JOB_REQUEST lead with
// the given email. Always returns a generic success to avoid email enumeration.
export const resendClaimLink = async (req: Request, res: Response): Promise<void> => {
  const generic = {
    message: 'If we have a request for that email, a fresh manage link is on its way.',
  };
  try {
    const email = str(req.body?.email, 254);
    if (!email || !EMAIL_RE.test(email)) {
      // Mirror the generic response so behaviour doesn't leak validity either.
      res.json(generic);
      return;
    }

    const lead = await prisma.lead.findFirst({
      where: { type: LeadType.JOB_REQUEST, email: email.toLowerCase() },
      orderBy: { createdAt: 'desc' },
    });

    if (lead) {
      const rawToken = await issueClaimToken(lead.id);
      void sendEmail(
        emailTemplates.jobRequestClaimLink(
          lead.email,
          lead.name,
          lead.title || 'your request',
          claimManageUrl(rawToken),
        ),
      );
      if (process.env.NODE_ENV !== 'production') {
        console.log(`🔗 [lead-claim:resend] ${lead.email} -> ${claimManageUrl(rawToken)}`);
      }
    }

    res.json(generic);
  } catch (error) {
    console.error('resendClaimLink error:', error);
    // Still generic so timing/behaviour doesn't leak account state.
    res.json(generic);
  }
};

import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { QuestStatus, QuestCategory } from "@prisma/client";
import { createNotification } from "../services/notificationService";
import { awardCompletionXp } from "../services/progressionService";
import {
  normalizeRecurrence,
  computeNextOccurrence,
  advance,
  RecurrenceValidationError,
} from "../services/recurrenceService";

const VALID_CATEGORIES = new Set(Object.values(QuestCategory));
const VALID_STATUSES = new Set(Object.values(QuestStatus));

// Map UI category ids (e.g. "yard", "ODD_JOBS") to the Prisma QuestCategory enum.
// Anything not recognised falls through to OTHER so query params can never 500.
const UI_CATEGORY_TO_ENUM: Record<string, QuestCategory> = {
  yard:     QuestCategory.OTHER,
  hauling:  QuestCategory.OTHER,
  moving:   QuestCategory.OTHER,
  handyman: QuestCategory.OTHER,
  cleaning: QuestCategory.OTHER,
  painting: QuestCategory.OTHER,
  pressure: QuestCategory.OTHER,
  odd_jobs: QuestCategory.OTHER,
  other:    QuestCategory.OTHER,
};

function normalizeCategory(raw: string): QuestCategory | undefined {
  if (!raw) return undefined;
  const upper = raw.toUpperCase();
  if (VALID_CATEGORIES.has(upper as QuestCategory)) return upper as QuestCategory;
  const mapped = UI_CATEGORY_TO_ENUM[raw.toLowerCase()];
  return mapped;
}

function normalizeStatus(raw: string): QuestStatus | undefined {
  if (!raw) return undefined;
  const upper = raw.toUpperCase();
  return VALID_STATUSES.has(upper as QuestStatus) ? (upper as QuestStatus) : undefined;
}

export async function getQuests(req: Request, res: Response) {
  try {
    const {
      category,
      status,
      mine,
      sort = "newest",
      page = "1",
      limit = "20",
      minReward,
      maxReward,
      recurringOnly,
      q,
    } = req.query as Record<string, string>;

    const take = Math.min(parseInt(limit) || 20, 100);
    const skip = (Math.max(parseInt(page) || 1, 1) - 1) * take;

    const where: any = {};

    // Budget range filter. Reward is a Decimal; Prisma accepts numbers for gte/lte.
    // Silently ignore non-positive / non-numeric bounds so a bad query can't 500.
    const min = Number(minReward);
    const max = Number(maxReward);
    if (Number.isFinite(min) && min > 0) where.reward = { ...where.reward, gte: min };
    if (Number.isFinite(max) && max > 0) where.reward = { ...where.reward, lte: max };

    // Recurring-only toggle: surface just the recurring booking templates.
    if (recurringOnly === "true") where.isRecurring = true;

    // Free-text search on the title (case-insensitive). Description carries a
    // machine-formatted "Location:/Pay:" line, so title-only keeps results clean.
    const term = typeof q === "string" ? q.trim().slice(0, 100) : "";
    if (term) where.title = { contains: term, mode: "insensitive" };

    // Status: default to OPEN to preserve existing public board behavior; allow
    // explicit override (any|all disables the filter so callers can list their own).
    if (status === "any" || status === "all") {
      // no status filter
    } else {
      const normStatus = normalizeStatus(status);
      where.status = normStatus ?? QuestStatus.OPEN;
    }

    // Category: silently drop unknown values rather than 500ing on enum mismatch.
    const normCategory = normalizeCategory(category);
    if (normCategory) where.category = normCategory;

    // mine=true scopes the result to the authenticated user's posted quests.
    const userId = (req as any).user?.id as string | undefined;
    if (mine === "true" && userId) {
      where.questGiverId = userId;
      // When scoped to "mine", drop the default OPEN filter unless caller asked for one.
      if (!status) delete where.status;
    }

    const orderBy: any = (() => {
      switch (sort) {
        case "highest_pay": return { reward: "desc" };
        case "lowest_pay":  return { reward: "asc" };
        case "newest":
        default:            return { createdAt: "desc" };
      }
    })();

    const [quests, total] = await prisma.$transaction([
      prisma.quest.findMany({
        where,
        orderBy,
        take,
        skip,
        include: {
          questGiver: { select: { id: true, username: true, avatarUrl: true, level: true } },
          _count: { select: { applications: true } },
        },
      }),
      prisma.quest.count({ where }),
    ]);

    res.json({
      data: quests,
      quests, // legacy shape for older clients
      meta: { total, page: parseInt(page) || 1, limit: take, totalPages: Math.ceil(total / take) },
    });
  } catch (error) {
    console.error("getQuests error:", error);
    res.status(500).json({ error: "Failed to fetch quests" });
  }
}

export async function getQuestById(req: Request, res: Response) {
  try {
    const quest = await prisma.quest.findUnique({
      where: { id: req.params.id },
      include: {
        questGiver: { select: { id: true, username: true, avatarUrl: true, level: true } },
        _count: { select: { applications: true } },
      },
    });
    if (!quest) return res.status(404).json({ error: "Quest not found" });
    res.json(quest);
  } catch (error) {
    console.error("getQuestById error:", error);
    res.status(500).json({ error: "Failed to fetch quest" });
  }
}

// Recurrence + relation fields are set by the server from validated input, never
// taken raw from the request body (prevents a client from attaching a quest to an
// arbitrary recurrence parent or forcing nextOccurrenceAt).
const PROTECTED_QUEST_FIELDS = [
  "isRecurring",
  "recurrenceCadence",
  "recurrenceInterval",
  "recurrenceEndDate",
  "recurrenceCount",
  "nextOccurrenceAt",
  "recurrenceParentId",
  "questGiverId",
] as const;

function stripProtected(body: any) {
  const clean = { ...body };
  for (const f of PROTECTED_QUEST_FIELDS) delete clean[f];
  return clean;
}

export async function createQuest(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const body = stripProtected(req.body);

    // Coerce category to a valid enum value to prevent 500s from unsupported UI ids.
    const normCategory = normalizeCategory(body.category);
    body.category = normCategory ?? QuestCategory.OTHER;

    let recurrence;
    try {
      recurrence = normalizeRecurrence(req.body);
    } catch (e) {
      if (e instanceof RecurrenceValidationError) {
        return res.status(400).json({ error: e.message });
      }
      throw e;
    }

    // nextOccurrenceAt is advisory: seed it from the deadline if present, else the
    // creation time, so the questboard can surface "next visit ~<date>". Never used
    // to auto-post or auto-charge.
    let nextOccurrenceAt: Date | null = null;
    if (recurrence.isRecurring && recurrence.recurrenceCadence) {
      const base = body.deadline ? new Date(body.deadline) : new Date();
      nextOccurrenceAt = computeNextOccurrence(
        base,
        recurrence.recurrenceCadence,
        recurrence.recurrenceInterval,
        recurrence.recurrenceEndDate,
      );
    }

    const quest = await prisma.quest.create({
      data: {
        ...body,
        questGiverId: user.id,
        ...recurrence,
        nextOccurrenceAt,
      },
    });
    res.status(201).json(quest);
  } catch (error) {
    console.error("createQuest error:", error);
    res.status(500).json({ error: "Failed to create quest" });
  }
}

export async function updateQuest(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const quest = await prisma.quest.findUnique({ where: { id: req.params.id } });
    if (!quest) return res.status(404).json({ error: "Quest not found" });
    if (quest.questGiverId !== user.id) return res.status(403).json({ error: "Forbidden" });

    const body = stripProtected(req.body);
    if (body.category !== undefined) {
      const normCategory = normalizeCategory(body.category);
      body.category = normCategory ?? QuestCategory.OTHER;
    }

    // Only touch recurrence fields when the caller explicitly sent isRecurring,
    // so ordinary edits leave an existing series untouched.
    if (req.body?.isRecurring !== undefined) {
      let recurrence;
      try {
        recurrence = normalizeRecurrence(req.body);
      } catch (e) {
        if (e instanceof RecurrenceValidationError) {
          return res.status(400).json({ error: e.message });
        }
        throw e;
      }
      Object.assign(body, recurrence);
      if (recurrence.isRecurring && recurrence.recurrenceCadence) {
        const base = body.deadline
          ? new Date(body.deadline)
          : quest.deadline ?? new Date();
        body.nextOccurrenceAt = computeNextOccurrence(
          base,
          recurrence.recurrenceCadence,
          recurrence.recurrenceInterval,
          recurrence.recurrenceEndDate,
        );
      } else {
        body.nextOccurrenceAt = null;
      }
    }

    const updated = await prisma.quest.update({ where: { id: req.params.id }, data: body });
    res.json(updated);
  } catch (error) {
    console.error("updateQuest error:", error);
    res.status(500).json({ error: "Failed to update quest" });
  }
}

export async function deleteQuest(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const quest = await prisma.quest.findUnique({ where: { id: req.params.id } });
    if (!quest) return res.status(404).json({ error: "Quest not found" });
    if (quest.questGiverId !== user.id) return res.status(403).json({ error: "Forbidden" });
    await prisma.quest.delete({ where: { id: req.params.id } });
    res.json({ message: "Quest deleted" });
  } catch (error) {
    console.error("deleteQuest error:", error);
    res.status(500).json({ error: "Failed to delete quest" });
  }
}

// POST /quests/:id/next-occurrence  (owner only)
// Manually spins up the next occurrence of a recurring template as a fresh OPEN
// quest, linked back to the template. This is the safe, deliberate foundation:
// nothing auto-posts or auto-charges. The new occurrence is paid out per-task on
// the normal completion flow, exactly like any other quest.
export async function generateNextOccurrence(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const template = await prisma.quest.findUnique({ where: { id: req.params.id } });
    if (!template) return res.status(404).json({ error: "Quest not found" });
    if (template.questGiverId !== user.id) return res.status(403).json({ error: "Forbidden" });
    if (!template.isRecurring || !template.recurrenceCadence) {
      return res.status(400).json({ error: "This quest is not set up as recurring." });
    }

    // Enforce the optional occurrence cap. The template itself counts as the first
    // occurrence, so existing children + 1 (template) must stay under the limit.
    if (template.recurrenceCount != null) {
      const childCount = await prisma.quest.count({
        where: { recurrenceParentId: template.id },
      });
      if (childCount + 1 >= template.recurrenceCount) {
        return res.status(409).json({
          error: "This recurring series has reached its scheduled number of occurrences.",
        });
      }
    }

    // Base the next occurrence on the template's advisory nextOccurrenceAt (or its
    // deadline / now as a fallback) and respect the optional end date.
    const base =
      template.nextOccurrenceAt ?? template.deadline ?? new Date();
    if (template.recurrenceEndDate && base.getTime() > template.recurrenceEndDate.getTime()) {
      return res.status(409).json({
        error: "This recurring series has passed its scheduled end date.",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const occurrence = await tx.quest.create({
        data: {
          title: template.title,
          description: template.description,
          category: template.category,
          difficulty: template.difficulty,
          reward: template.reward,
          currency: template.currency,
          xpReward: template.xpReward,
          tags: template.tags,
          maxApplications: template.maxApplications,
          questGiverId: template.questGiverId,
          status: QuestStatus.OPEN,
          deadline: base,
          // An occurrence is a concrete job, not itself a template.
          isRecurring: false,
          recurrenceParentId: template.id,
        },
      });

      // Advance the template's advisory next-occurrence pointer for next time.
      const advanced = advance(
        base,
        template.recurrenceCadence!,
        template.recurrenceInterval,
      );
      const nextAfter =
        template.recurrenceEndDate && advanced.getTime() > template.recurrenceEndDate.getTime()
          ? null
          : advanced;

      await tx.quest.update({
        where: { id: template.id },
        data: { nextOccurrenceAt: nextAfter },
      });

      return occurrence;
    });

    res.status(201).json(result);
  } catch (error) {
    console.error("generateNextOccurrence error:", error);
    res.status(500).json({ error: "Failed to generate the next occurrence" });
  }
}

export async function completeQuest(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const quest = await prisma.quest.findUnique({ where: { id: req.params.id } });
    if (!quest) return res.status(404).json({ error: "Quest not found" });
    if (quest.questGiverId !== user.id) return res.status(403).json({ error: "Forbidden" });
    if (quest.status === QuestStatus.COMPLETED) {
      return res.status(400).json({ error: "Quest is already completed" });
    }
    const updated = await prisma.quest.update({
      where: { id: req.params.id },
      data: { status: QuestStatus.COMPLETED, completedAt: new Date() },
    });

    if (quest.assignedAdventurerId) {
      // Increment the worker's completed-jobs counter and award balanced
      // completion XP (quality-independent portion — rating XP is layered on
      // later when a review arrives). Additive to existing notification flow.
      await prisma.user.update({
        where: { id: quest.assignedAdventurerId },
        data: { totalQuestsCompleted: { increment: 1 } },
      });
      try {
        await awardCompletionXp(req.params.id);
      } catch (e) {
        // XP is non-critical to completion; never fail the request over it.
        console.error("awardCompletionXp error:", e);
      }

      await createNotification({
        userId: quest.assignedAdventurerId,
        type: "QUEST_COMPLETED",
        title: "Quest completed",
        message: `"${quest.title}" was marked complete. Nice work, adventurer!`,
      });
    }

    res.json(updated);
  } catch (error) {
    console.error("completeQuest error:", error);
    res.status(500).json({ error: "Failed to complete quest" });
  }
}

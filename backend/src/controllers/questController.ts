import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { QuestStatus, QuestCategory } from "@prisma/client";

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
    } = req.query as Record<string, string>;

    const take = Math.min(parseInt(limit) || 20, 100);
    const skip = (Math.max(parseInt(page) || 1, 1) - 1) * take;

    const where: any = {};

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

export async function createQuest(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const body = { ...req.body } as any;

    // Coerce category to a valid enum value to prevent 500s from unsupported UI ids.
    const normCategory = normalizeCategory(body.category);
    body.category = normCategory ?? QuestCategory.OTHER;

    const quest = await prisma.quest.create({
      data: { ...body, questGiverId: user.id },
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

    const body = { ...req.body } as any;
    if (body.category !== undefined) {
      const normCategory = normalizeCategory(body.category);
      body.category = normCategory ?? QuestCategory.OTHER;
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

export async function completeQuest(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const quest = await prisma.quest.findUnique({ where: { id: req.params.id } });
    if (!quest) return res.status(404).json({ error: "Quest not found" });
    if (quest.questGiverId !== user.id) return res.status(403).json({ error: "Forbidden" });
    const updated = await prisma.quest.update({
      where: { id: req.params.id },
      data: { status: QuestStatus.COMPLETED },
    });
    res.json(updated);
  } catch (error) {
    console.error("completeQuest error:", error);
    res.status(500).json({ error: "Failed to complete quest" });
  }
}

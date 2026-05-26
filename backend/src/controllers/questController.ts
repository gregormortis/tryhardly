import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { QuestStatus } from "@prisma/client";

export async function getQuests(req: Request, res: Response) {
  try {
    const {
      city,
      category,
      sort = "newest",
      page = "1",
      limit = "20",
    } = req.query as Record<string, string>;

    const take = Math.min(parseInt(limit) || 20, 100);
    const skip = (Math.max(parseInt(page) || 1, 1) - 1) * take;

    const where: any = {
      status: QuestStatus.OPEN,
      ...(city && { city: { equals: city, mode: "insensitive" } }),
      ...(category && { category: { equals: category, mode: "insensitive" } }),
    };

    const orderBy: any = (() => {
      switch (sort) {
        case "highest_pay": return { reward: "desc" };
        case "lowest_pay":  return { reward: "asc" };
        case "newest":
        default:            return { createdAt: "desc" };
      }
    })();

    const [quests, total] = await prisma.$transaction([
      prisma.quest.findMany({ where, orderBy, take, skip }),
      prisma.quest.count({ where }),
    ]);

    res.json({
      data: quests,
      meta: { total, page: parseInt(page), limit: take, totalPages: Math.ceil(total / take) },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch quests" });
  }
}

export async function getQuestById(req: Request, res: Response) {
  try {
    const quest = await prisma.quest.findUnique({ where: { id: req.params.id } });
    if (!quest) return res.status(404).json({ error: "Quest not found" });
    res.json(quest);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch quest" });
  }
}

export async function createQuest(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const quest = await prisma.quest.create({
      data: { ...req.body, questGiverId: user.id },
    });
    res.status(201).json(quest);
  } catch (error) {
    res.status(500).json({ error: "Failed to create quest" });
  }
}

export async function updateQuest(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const quest = await prisma.quest.findUnique({ where: { id: req.params.id } });
    if (!quest) return res.status(404).json({ error: "Quest not found" });
    if (quest.questGiverId !== user.id) return res.status(403).json({ error: "Forbidden" });
    const updated = await prisma.quest.update({ where: { id: req.params.id }, data: req.body });
    res.json(updated);
  } catch (error) {
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
    res.status(500).json({ error: "Failed to complete quest" });
  }
}

import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

export async function getQuests(req: Request, res: Response) {
  const {
    city,
    category,
    sort = "newest",
    page = "1",
    limit = "20",
  } = req.query as Record<string, string>;

  const take = Math.min(parseInt(limit) || 20, 100);
  const skip = (Math.max(parseInt(page) || 1, 1) - 1) * take;

  const where = {
    status: "open",
    ...(city     && { city:     { equals: city,     mode: "insensitive" as const } }),
    ...(category && { category: { equals: category, mode: "insensitive" as const } }),
  };

  const orderBy = (() => {
    switch (sort) {
      case "highest_pay": return { reward: "desc" as const };
      case "lowest_pay":  return { reward: "asc"  as const };
      case "newest":
      default:            return { createdAt: "desc" as const };
    }
  })();

  const [quests, total] = await prisma.$transaction([
    prisma.quest.findMany({ where, orderBy, take, skip }),
    prisma.quest.count({ where }),
  ]);

  res.json({
    data: quests,
    meta: {
      total,
      page:       parseInt(page),
      limit:      take,
      totalPages: Math.ceil(total / take),
    },
  });
}

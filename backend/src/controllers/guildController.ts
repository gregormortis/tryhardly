import { Response } from 'express';
import { prisma } from '../app';
import { AuthRequest } from '../middleware/authMiddleware';

// GET /api/guilds
export const getGuilds = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { search, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const where: any = {};
    if (search) where.name = { contains: search as string, mode: 'insensitive' };

    const [guilds, total] = await Promise.all([
      prisma.guild.findMany({
        where, skip, take: parseInt(limit as string),
        orderBy: { reputationScore: 'desc' },
        include: {
          leader: { select: { id: true, username: true, avatarUrl: true } },
          _count: { select: { members: true } },
        },
      }),
      prisma.guild.count({ where }),
    ]);
    res.json({ guilds, total });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch guilds' });
  }
};

// GET /api/guilds/:id
export const getGuildById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const guild = await prisma.guild.findUnique({
      where: { id: req.params.id },
      include: {
        leader: { select: { id: true, username: true, avatarUrl: true, level: true } },
        members: {
          include: { user: { select: { id: true, username: true, avatarUrl: true, level: true, adventurerClass: true } } },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });
    if (!guild) { res.status(404).json({ error: 'Guild not found' }); return; }
    res.json(guild);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch guild' });
  }
};

// POST /api/guilds
export const createGuild = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, tag, description, badgeUrl, isPublic } = req.body;

    const existing = await prisma.guild.findFirst({ where: { OR: [{ name }, { tag }] } });
    if (existing) { res.status(400).json({ error: 'Guild name or tag already taken' }); return; }

    const guild = await prisma.guild.create({
      data: {
        name, tag, description, badgeUrl,
        isPublic: isPublic !== false,
        leaderId: req.user!.id,
        members: { create: { userId: req.user!.id, role: 'LEADER' } },
      },
    });

    // Update user's guildId
    await prisma.user.update({ where: { id: req.user!.id }, data: { guildId: guild.id } });

    res.status(201).json(guild);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create guild' });
  }
};

// POST /api/guilds/:id/join
export const joinGuild = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const guild = await prisma.guild.findUnique({ where: { id: req.params.id } });
    if (!guild) { res.status(404).json({ error: 'Guild not found' }); return; }

    const alreadyMember = await prisma.guildMember.findFirst({
      where: { guildId: req.params.id, userId: req.user!.id },
    });
    if (alreadyMember) { res.status(400).json({ error: 'Already a member' }); return; }

    await prisma.guildMember.create({ data: { guildId: req.params.id, userId: req.user!.id, role: 'MEMBER' } });
    await prisma.user.update({ where: { id: req.user!.id }, data: { guildId: req.params.id } });

    res.json({ message: 'Joined guild successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to join guild' });
  }
};

// DELETE /api/guilds/:id/leave
export const leaveGuild = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.guildMember.deleteMany({ where: { guildId: req.params.id, userId: req.user!.id } });
    await prisma.user.update({ where: { id: req.user!.id }, data: { guildId: null } });
    res.json({ message: 'Left guild successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to leave guild' });
  }
};

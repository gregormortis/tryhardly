import { Response } from 'express';
import { prisma } from '../app';
import { AuthRequest } from '../middleware/authMiddleware';

// ─── Proof-of-work gallery ─────────────────────────────────────────────────────
// A worker-curated, honest gallery of past work surfaced on the public profile.
// We store only URLs (no file storage), mirroring the credential model. Images
// are always worker-supplied — the platform never fabricates proof. An optional
// questId links an item to a real quest the worker actually worked on.

const MAX_IMAGE_URLS = 8;
const MAX_SKILL_TAGS = 12;

interface ProofInput {
  title?: string;
  description?: string;
  imageUrls?: unknown;
  skillTags?: unknown;
  questId?: string | null;
  visible?: boolean;
}

function clean(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t.length ? t : null;
}

// Accept a string[] or a single string; trim, drop blanks, de-dupe, cap length.
function cleanStringArray(v: unknown, cap: number): string[] {
  const raw = Array.isArray(v) ? v : typeof v === 'string' ? [v] : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    const s = clean(item);
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
    if (out.length >= cap) break;
  }
  return out;
}

// Owner-facing projection (includes hidden items and the quest link).
const OWNER_SELECT = {
  id: true,
  title: true,
  description: true,
  imageUrls: true,
  skillTags: true,
  visible: true,
  questId: true,
  quest: { select: { id: true, title: true } },
  createdAt: true,
  updatedAt: true,
} as const;

// Public projection — visible items only; same shape minus the visible flag.
const PUBLIC_SELECT = {
  id: true,
  title: true,
  description: true,
  imageUrls: true,
  skillTags: true,
  questId: true,
  quest: { select: { id: true, title: true } },
  createdAt: true,
} as const;

// ─── Owner self-service ───────────────────────────────────────────────────────

// GET /api/users/me/proof — all of the caller's proof items (incl. hidden).
export const listMyProof = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const items = await prisma.proofOfWork.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      select: OWNER_SELECT,
    });
    res.json(items);
  } catch (error) {
    console.error('listMyProof error:', error);
    res.status(500).json({ error: 'Failed to fetch proof of work' });
  }
};

// Resolve an optional questId the caller claims to have worked on. We only allow
// linking to a quest the caller actually gave or was assigned to — never an
// arbitrary quest, so the link can't be used to fake association.
async function resolveQuestLink(userId: string, questId: string | null): Promise<string | null> {
  if (!questId) return null;
  const quest = await prisma.quest.findFirst({
    where: {
      id: questId,
      OR: [{ assignedAdventurerId: userId }, { questGiverId: userId }],
    },
    select: { id: true },
  });
  return quest?.id ?? null;
}

// POST /api/users/me/proof — add a gallery item.
export const createProof = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const body = req.body as ProofInput;
    const title = clean(body.title);
    if (!title) {
      res.status(400).json({ error: 'title is required' });
      return;
    }

    const questId = await resolveQuestLink(req.user!.id, clean(body.questId));

    const item = await prisma.proofOfWork.create({
      data: {
        userId: req.user!.id,
        title,
        description: clean(body.description),
        imageUrls: cleanStringArray(body.imageUrls, MAX_IMAGE_URLS),
        skillTags: cleanStringArray(body.skillTags, MAX_SKILL_TAGS),
        questId,
        visible: body.visible === undefined ? true : !!body.visible,
      },
      select: OWNER_SELECT,
    });
    res.status(201).json(item);
  } catch (error) {
    console.error('createProof error:', error);
    res.status(500).json({ error: 'Failed to create proof of work' });
  }
};

// PUT /api/users/me/proof/:id — edit a gallery item the caller owns.
export const updateProof = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const existing = await prisma.proofOfWork.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.userId !== req.user!.id) {
      res.status(404).json({ error: 'Proof item not found' });
      return;
    }

    const body = req.body as ProofInput;

    let title = existing.title;
    if (body.title !== undefined) {
      const t = clean(body.title);
      if (!t) {
        res.status(400).json({ error: 'title cannot be empty' });
        return;
      }
      title = t;
    }

    const questId =
      body.questId !== undefined
        ? await resolveQuestLink(req.user!.id, clean(body.questId))
        : existing.questId;

    const updated = await prisma.proofOfWork.update({
      where: { id: existing.id },
      data: {
        title,
        description: body.description !== undefined ? clean(body.description) : existing.description,
        imageUrls:
          body.imageUrls !== undefined
            ? cleanStringArray(body.imageUrls, MAX_IMAGE_URLS)
            : existing.imageUrls,
        skillTags:
          body.skillTags !== undefined
            ? cleanStringArray(body.skillTags, MAX_SKILL_TAGS)
            : existing.skillTags,
        questId,
        visible: body.visible !== undefined ? !!body.visible : existing.visible,
      },
      select: OWNER_SELECT,
    });
    res.json(updated);
  } catch (error) {
    console.error('updateProof error:', error);
    res.status(500).json({ error: 'Failed to update proof of work' });
  }
};

// DELETE /api/users/me/proof/:id — remove a gallery item the caller owns.
export const deleteProof = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const existing = await prisma.proofOfWork.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.userId !== req.user!.id) {
      res.status(404).json({ error: 'Proof item not found' });
      return;
    }
    await prisma.proofOfWork.delete({ where: { id: existing.id } });
    res.status(204).end();
  } catch (error) {
    console.error('deleteProof error:', error);
    res.status(500).json({ error: 'Failed to delete proof of work' });
  }
};

// ─── Public ─────────────────────────────────────────────────────────────────

// GET /api/users/:username/proof — visible gallery items for public display.
export const getPublicProof = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { username: req.params.username },
      select: { id: true },
    });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const items = await prisma.proofOfWork.findMany({
      where: { userId: user.id, visible: true },
      orderBy: { createdAt: 'desc' },
      select: PUBLIC_SELECT,
    });
    res.json(items);
  } catch (error) {
    console.error('getPublicProof error:', error);
    res.status(500).json({ error: 'Failed to fetch proof of work' });
  }
};

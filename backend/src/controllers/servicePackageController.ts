import { Response } from 'express';
import { prisma } from '../app';
import { AuthRequest } from '../middleware/authMiddleware';
import { Prisma, ServicePriceType } from '@prisma/client';

const VALID_PRICE_TYPES = new Set(Object.values(ServicePriceType));

// Fields a worker may freely set/edit on their own package. A package is a
// listing only — nothing here charges, holds, or authorizes money.
interface ServicePackageInput {
  title?: string;
  category?: string;
  description?: string;
  priceType?: string;
  startingPrice?: number | string | null;
  currency?: string;
  includedScope?: string;
  addOns?: string;
  exclusions?: string;
  materialsPolicy?: string;
  serviceArea?: string;
  availability?: string;
  toolsProvided?: string;
  imageUrl?: string;
  active?: boolean;
}

function clean(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t.length ? t : null;
}

// Parse a user-supplied price into a Prisma.Decimal, or null if absent/invalid.
// Negative values are clamped out (null) — a listing never advertises a
// negative price.
function parsePrice(v: unknown): Prisma.Decimal | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).trim());
  if (!Number.isFinite(n) || n < 0) return null;
  return new Prisma.Decimal(n);
}

function normalizePriceType(v: unknown): ServicePriceType | null {
  const s = (typeof v === 'string' ? v : '').toUpperCase();
  return VALID_PRICE_TYPES.has(s as ServicePriceType) ? (s as ServicePriceType) : null;
}

// Projection shared by owner and public reads. A package holds no private
// fields, so the same shape is safe to expose publicly.
const PACKAGE_SELECT = {
  id: true,
  userId: true,
  title: true,
  category: true,
  description: true,
  priceType: true,
  startingPrice: true,
  currency: true,
  includedScope: true,
  addOns: true,
  exclusions: true,
  materialsPolicy: true,
  serviceArea: true,
  availability: true,
  toolsProvided: true,
  imageUrl: true,
  active: true,
  createdAt: true,
  updatedAt: true,
} as const;

// Public reads also include a lightweight worker summary for card display.
const PUBLIC_INCLUDE = {
  user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
} as const;

// ─── Owner self-service ───────────────────────────────────────────────────────

// GET /api/service-packages/me — all of the current worker's packages.
export const listMyServicePackages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const packages = await prisma.servicePackage.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      select: PACKAGE_SELECT,
    });
    res.json(packages);
  } catch (error) {
    console.error('listMyServicePackages error:', error);
    res.status(500).json({ error: 'Failed to fetch service packages' });
  }
};

// POST /api/service-packages/me — create a new package (defaults to inactive).
export const createServicePackage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const body = req.body as ServicePackageInput;

    const title = clean(body.title);
    if (!title) {
      res.status(400).json({ error: 'title is required' });
      return;
    }
    const category = clean(body.category);
    if (!category) {
      res.status(400).json({ error: 'category is required' });
      return;
    }

    let priceType: ServicePriceType = ServicePriceType.STARTING_AT;
    if (body.priceType !== undefined) {
      const pt = normalizePriceType(body.priceType);
      if (!pt) {
        res.status(400).json({ error: 'Invalid price type' });
        return;
      }
      priceType = pt;
    }

    // QUOTE_NEEDED listings intentionally carry no price.
    const startingPrice =
      priceType === ServicePriceType.QUOTE_NEEDED ? null : parsePrice(body.startingPrice);

    const pkg = await prisma.servicePackage.create({
      data: {
        userId: req.user!.id,
        title,
        category: category.toLowerCase(),
        description: clean(body.description),
        priceType,
        startingPrice,
        currency: clean(body.currency)?.toUpperCase() || 'USD',
        includedScope: clean(body.includedScope),
        addOns: clean(body.addOns),
        exclusions: clean(body.exclusions),
        materialsPolicy: clean(body.materialsPolicy),
        serviceArea: clean(body.serviceArea),
        availability: clean(body.availability),
        toolsProvided: clean(body.toolsProvided),
        imageUrl: clean(body.imageUrl),
        active: body.active === true,
      },
      select: PACKAGE_SELECT,
    });
    res.status(201).json(pkg);
  } catch (error) {
    console.error('createServicePackage error:', error);
    res.status(500).json({ error: 'Failed to create service package' });
  }
};

// PUT /api/service-packages/me/:id — edit a package the caller owns.
export const updateServicePackage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const existing = await prisma.servicePackage.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.userId !== req.user!.id) {
      res.status(404).json({ error: 'Service package not found' });
      return;
    }

    const body = req.body as ServicePackageInput;

    let title = existing.title;
    if (body.title !== undefined) {
      const t = clean(body.title);
      if (!t) {
        res.status(400).json({ error: 'title cannot be empty' });
        return;
      }
      title = t;
    }

    let category = existing.category;
    if (body.category !== undefined) {
      const c = clean(body.category);
      if (!c) {
        res.status(400).json({ error: 'category cannot be empty' });
        return;
      }
      category = c.toLowerCase();
    }

    let priceType = existing.priceType;
    if (body.priceType !== undefined) {
      const pt = normalizePriceType(body.priceType);
      if (!pt) {
        res.status(400).json({ error: 'Invalid price type' });
        return;
      }
      priceType = pt;
    }

    // Resolve the price against the (possibly new) price type: QUOTE_NEEDED
    // always clears it; otherwise honor an explicit update or keep the existing.
    let startingPrice = existing.startingPrice;
    if (priceType === ServicePriceType.QUOTE_NEEDED) {
      startingPrice = null;
    } else if (body.startingPrice !== undefined) {
      startingPrice = parsePrice(body.startingPrice);
    }

    const updated = await prisma.servicePackage.update({
      where: { id: existing.id },
      data: {
        title,
        category,
        priceType,
        startingPrice,
        description: body.description !== undefined ? clean(body.description) : existing.description,
        currency:
          body.currency !== undefined ? clean(body.currency)?.toUpperCase() || 'USD' : existing.currency,
        includedScope:
          body.includedScope !== undefined ? clean(body.includedScope) : existing.includedScope,
        addOns: body.addOns !== undefined ? clean(body.addOns) : existing.addOns,
        exclusions: body.exclusions !== undefined ? clean(body.exclusions) : existing.exclusions,
        materialsPolicy:
          body.materialsPolicy !== undefined ? clean(body.materialsPolicy) : existing.materialsPolicy,
        serviceArea: body.serviceArea !== undefined ? clean(body.serviceArea) : existing.serviceArea,
        availability: body.availability !== undefined ? clean(body.availability) : existing.availability,
        toolsProvided:
          body.toolsProvided !== undefined ? clean(body.toolsProvided) : existing.toolsProvided,
        imageUrl: body.imageUrl !== undefined ? clean(body.imageUrl) : existing.imageUrl,
        active: body.active !== undefined ? body.active === true : existing.active,
      },
      select: PACKAGE_SELECT,
    });
    res.json(updated);
  } catch (error) {
    console.error('updateServicePackage error:', error);
    res.status(500).json({ error: 'Failed to update service package' });
  }
};

// DELETE /api/service-packages/me/:id — remove a package the caller owns.
export const deleteServicePackage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const existing = await prisma.servicePackage.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.userId !== req.user!.id) {
      res.status(404).json({ error: 'Service package not found' });
      return;
    }
    await prisma.servicePackage.delete({ where: { id: existing.id } });
    res.status(204).end();
  } catch (error) {
    console.error('deleteServicePackage error:', error);
    res.status(500).json({ error: 'Failed to delete service package' });
  }
};

// ─── Public ─────────────────────────────────────────────────────────────────

// GET /api/service-packages — public browse list. Only active packages.
// Optional ?category= filter and ?q= title/description search; capped result.
export const browseServicePackages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const category = clean(req.query.category)?.toLowerCase();
    const q = clean(req.query.q);

    const where: Prisma.ServicePackageWhereInput = { active: true };
    if (category) where.category = category;
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { serviceArea: { contains: q, mode: 'insensitive' } },
      ];
    }

    const packages = await prisma.servicePackage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { ...PACKAGE_SELECT, ...PUBLIC_INCLUDE },
    });
    res.json(packages);
  } catch (error) {
    console.error('browseServicePackages error:', error);
    res.status(500).json({ error: 'Failed to fetch service packages' });
  }
};

// GET /api/service-packages/user/:username — a worker's active packages, for
// their public profile. Inactive packages are never exposed here.
export const getPublicServicePackages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { username: req.params.username },
      select: { id: true },
    });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const packages = await prisma.servicePackage.findMany({
      where: { userId: user.id, active: true },
      orderBy: { createdAt: 'desc' },
      select: { ...PACKAGE_SELECT, ...PUBLIC_INCLUDE },
    });
    res.json(packages);
  } catch (error) {
    console.error('getPublicServicePackages error:', error);
    res.status(500).json({ error: 'Failed to fetch service packages' });
  }
};

// GET /api/service-packages/:id — a single active package (public detail).
export const getServicePackage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pkg = await prisma.servicePackage.findUnique({
      where: { id: req.params.id },
      select: { ...PACKAGE_SELECT, ...PUBLIC_INCLUDE },
    });
    // Only active packages are publicly visible. The owner uses the /me list to
    // see their own drafts.
    if (!pkg || !pkg.active) {
      res.status(404).json({ error: 'Service package not found' });
      return;
    }
    res.json(pkg);
  } catch (error) {
    console.error('getServicePackage error:', error);
    res.status(500).json({ error: 'Failed to fetch service package' });
  }
};

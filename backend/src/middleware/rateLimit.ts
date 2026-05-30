import { Request, Response, NextFunction } from 'express';

/**
 * Minimal in-memory rate limiter. No external dependency, no Redis required —
 * suitable as a basic abuse guard for auth/password-reset/report endpoints.
 *
 * Caveat: state is per-process, so on multi-instance deploys (Railway scaling)
 * limits apply per instance. That is acceptable as a first line of defense; a
 * shared store (Redis) is the follow-up for strict global limits.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

export function rateLimit(opts: { windowMs: number; max: number; keyPrefix?: string }) {
  const { windowMs, max, keyPrefix = '' } = opts;
  const buckets = new Map<string, Bucket>();

  // Periodically evict expired buckets so the map can't grow unbounded.
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }, windowMs);
  // Don't keep the event loop alive just for the sweeper.
  if (typeof sweep.unref === 'function') sweep.unref();

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      req.socket.remoteAddress ||
      'unknown';
    const key = `${keyPrefix}:${ip}`;
    const now = Date.now();

    const bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    bucket.count += 1;
    if (bucket.count > max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      res.status(429).json({
        error: 'Too many requests',
        message: `Please try again in ${retryAfter}s.`,
      });
      return;
    }
    next();
  };
}

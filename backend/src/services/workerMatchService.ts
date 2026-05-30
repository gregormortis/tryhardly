/**
 * Worker-match alerts.
 *
 * When a new JOB_REQUEST lead is created, find WORKER_ALERT leads that plausibly
 * match (by city + skill/category) and email each one once. This makes the
 * /work-alerts signup useful instead of a dead list.
 *
 * Design goals:
 *   - Conservative matching: it is better to email no one than to spam an
 *     irrelevant or far-away worker. Blank/broad worker locations don't match.
 *   - No spam: a hard cap per job request, and a unique (jobLeadId, workerLeadId)
 *     row guarantees a worker is never emailed twice for the same job.
 *   - Never blocks the job-request submission. All work here is best-effort and
 *     all failures are swallowed/logged.
 *
 * The pure matching helpers (normalizeCity, cityMatches, skillMatches,
 * matchesWorker) are exported separately so they can be unit-tested without a DB.
 */

import { prisma as defaultPrisma } from '../lib/prisma';
import {
  sendEmail as defaultSendEmail,
  emailTemplates as defaultTemplates,
} from './mailerService';
import { LeadType } from '@prisma/client';

// Curated category slugs the product knows about. Kept in sync with the
// frontend's lib/jobCategories.ts. "other" is the catch-all bucket. The labels
// are only used to make emails read nicely.
export const KNOWN_CATEGORY_LABELS: Record<string, string> = {
  yard: 'Lawn & Yard Work',
  hauling: 'Hauling & Junk Removal',
  moving: 'Moving Help',
  handyman: 'Handyman Jobs',
  cleaning: 'Cleaning',
  painting: 'Painting',
  pressure: 'Pressure Washing',
  errands: 'Errands',
  other: 'Odd Jobs',
};

// Hard cap on how many worker leads we email for a single job request. Keeps a
// single submission from blasting the entire list. Overridable via env for ops.
export const DEFAULT_MAX_WORKER_EMAILS = 20;

export function maxWorkerEmails(): number {
  const raw = Number(process.env.WORKER_ALERT_MAX_EMAILS);
  if (Number.isFinite(raw) && raw > 0) return Math.floor(raw);
  return DEFAULT_MAX_WORKER_EMAILS;
}

// US state abbreviations we strip off the tail of a location so "Redding, CA"
// normalizes to "redding".
const STATE_ABBR = new Set<string>([
  'al', 'ak', 'az', 'ar', 'ca', 'co', 'ct', 'de', 'fl', 'ga', 'hi', 'id', 'il',
  'in', 'ia', 'ks', 'ky', 'la', 'me', 'md', 'ma', 'mi', 'mn', 'ms', 'mo', 'mt',
  'ne', 'nv', 'nh', 'nj', 'nm', 'ny', 'nc', 'nd', 'oh', 'ok', 'or', 'pa', 'ri',
  'sc', 'sd', 'tn', 'tx', 'ut', 'vt', 'va', 'wa', 'wv', 'wi', 'wy', 'dc', 'usa',
]);

// Full state names (single token only — multi-word states like "new york" and
// "north carolina" are handled below) so "Redding California" -> "redding".
const STATE_NAMES = new Set<string>([
  'alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado',
  'connecticut', 'delaware', 'florida', 'georgia', 'hawaii', 'idaho', 'illinois',
  'indiana', 'iowa', 'kansas', 'kentucky', 'louisiana', 'maine', 'maryland',
  'massachusetts', 'michigan', 'minnesota', 'mississippi', 'missouri', 'montana',
  'nebraska', 'nevada', 'ohio', 'oklahoma', 'oregon', 'pennsylvania', 'tennessee',
  'texas', 'utah', 'vermont', 'virginia', 'washington', 'wisconsin', 'wyoming',
]);

const STATE_TOKENS = new Set<string>([...STATE_ABBR, ...STATE_NAMES]);

/**
 * Normalize a free-form location into a comparable city token.
 *
 * Strategy:
 *   - lowercase, strip ZIP codes and punctuation, collapse whitespace
 *   - if there's a comma, take the part before the first comma (the city)
 *   - drop a trailing state token (abbrev) so "Redding CA" -> "redding"
 *
 * Returns '' when nothing usable remains (e.g. blank, just a ZIP, or a single
 * state). Callers treat '' as "no usable city — do not match".
 */
export function normalizeCity(raw: string | null | undefined): string {
  if (!raw || typeof raw !== 'string') return '';

  let s = raw.toLowerCase().trim();
  if (!s) return '';

  // If a comma is present, the city is almost always before the first comma.
  if (s.includes(',')) s = s.split(',')[0];

  // Strip ZIP codes and any non letter/space characters.
  s = s.replace(/\b\d{5}(?:-\d{4})?\b/g, ' ');
  s = s.replace(/[^a-z\s]/g, ' ');

  let tokens = s.split(/\s+/).filter(Boolean);

  // Drop a single trailing state token (e.g. "redding ca" -> "redding"), but
  // only if it isn't the only token (so "ca" alone normalizes to '' / no city).
  if (tokens.length > 1 && STATE_TOKENS.has(tokens[tokens.length - 1])) {
    tokens = tokens.slice(0, -1);
  }

  // If all that's left is a lone state token, there's no real city.
  if (tokens.length === 1 && STATE_TOKENS.has(tokens[0])) return '';

  return tokens.join(' ');
}

/**
 * Two locations match when both yield the same non-empty normalized city.
 * A blank or broad (state-only / unparseable) worker location never matches —
 * we'd rather miss than email someone a job two states away.
 */
export function cityMatches(
  jobLocation: string | null | undefined,
  workerLocation: string | null | undefined,
): boolean {
  const job = normalizeCity(jobLocation);
  const worker = normalizeCity(workerLocation);
  if (!job || !worker) return false;
  return job === worker;
}

function normalizeSlug(s: string): string {
  return s.toLowerCase().trim();
}

/**
 * Skill/category match.
 *
 * - If the job has a category, the worker must have that category in their
 *   skills (case-insensitive). Workers who opted into "other" are treated as
 *   open to anything, so they also match.
 * - If the job has NO category, only workers who opted into "other" match
 *   (handled by the caller, which also applies a tighter cap in that case).
 */
export function skillMatches(
  jobCategory: string | null | undefined,
  workerSkills: string[] | null | undefined,
): boolean {
  const skills = (workerSkills ?? []).map(normalizeSlug).filter(Boolean);
  if (skills.length === 0) return false;

  const cat = jobCategory ? normalizeSlug(jobCategory) : '';
  if (!cat) {
    // No job category: only the broad "other" opt-in is a safe match.
    return skills.includes('other');
  }
  return skills.includes(cat) || skills.includes('other');
}

export interface JobLeadLike {
  location?: string | null;
  category?: string | null;
}

export interface WorkerLeadLike {
  location?: string | null;
  skills?: string[] | null;
}

/**
 * A worker matches a job when BOTH the city matches AND the skill/category
 * matches. Pure and side-effect free for easy unit testing.
 */
export function matchesWorker(job: JobLeadLike, worker: WorkerLeadLike): boolean {
  return cityMatches(job.location, worker.location) && skillMatches(job.category, worker.skills);
}

interface NotifyDeps {
  prisma?: typeof defaultPrisma;
  sendEmail?: typeof defaultSendEmail;
  emailTemplates?: typeof defaultTemplates;
}

export interface NotifyResult {
  matched: number;
  notified: number;
}

/**
 * Find worker-alert leads matching a freshly-created job-request lead and email
 * each match once. Best-effort: never throws, so the caller can fire-and-forget
 * without risking the job-request submission.
 *
 * Dedupe is enforced by the unique (jobLeadId, workerLeadId) constraint: we
 * create the LeadMatchNotification row first and only email on a successful
 * insert, so a duplicate insert (worker already notified for this job) is
 * skipped and never re-emails.
 */
export async function notifyMatchingWorkers(
  jobLead: {
    id: string;
    title?: string | null;
    location?: string | null;
    category?: string | null;
    budget?: string | null;
    timeline?: string | null;
  },
  deps: NotifyDeps = {},
): Promise<NotifyResult> {
  const prisma = deps.prisma ?? defaultPrisma;
  const sendEmail = deps.sendEmail ?? defaultSendEmail;
  const emailTemplates = deps.emailTemplates ?? defaultTemplates;

  const result: NotifyResult = { matched: 0, notified: 0 };

  try {
    // Pull active worker-alert leads. Capped generously so the in-memory match
    // filter has enough candidates without scanning an unbounded table.
    const workers = await prisma.lead.findMany({
      where: { type: LeadType.WORKER_ALERT, status: { not: 'IGNORED' } },
      orderBy: { createdAt: 'desc' },
      take: 500,
      select: { id: true, name: true, email: true, location: true, skills: true },
    });

    const cap = maxWorkerEmails();
    // When the job has no category we can only do a broad "other" match, which
    // is fuzzier — apply a tighter cap to limit blast radius in that case.
    const effectiveCap = jobLead.category ? cap : Math.min(cap, 5);

    const matches = workers.filter((w) =>
      matchesWorker({ location: jobLead.location, category: jobLead.category }, w),
    );
    result.matched = matches.length;

    const categoryLabel = jobLead.category
      ? KNOWN_CATEGORY_LABELS[jobLead.category.toLowerCase()] ?? null
      : null;

    for (const worker of matches) {
      if (result.notified >= effectiveCap) break;
      if (!worker.email) continue;

      // Create the dedupe row first. The unique constraint makes a repeat insert
      // throw, which we treat as "already notified" and skip — no second email.
      try {
        await prisma.leadMatchNotification.create({
          data: {
            jobLeadId: jobLead.id,
            workerLeadId: worker.id,
            email: worker.email,
            status: 'SENT',
            sentAt: new Date(),
          },
        });
      } catch {
        // Unique violation (already notified) or any insert error: skip safely.
        continue;
      }

      // sendEmail never throws (it swallows provider errors internally).
      await sendEmail(
        emailTemplates.newLocalJobForWorker(worker.email, worker.name, {
          title: jobLead.title || 'New local job',
          location: jobLead.location,
          budget: jobLead.budget,
          timeline: jobLead.timeline,
          category: jobLead.category,
          categoryLabel,
        }),
      );
      result.notified += 1;
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(
        `🔔 [worker-match] job ${jobLead.id}: ${result.matched} matched, ${result.notified} emailed (cap ${effectiveCap})`,
      );
    }
  } catch (error) {
    // Best-effort only — never let alert matching affect the submission.
    console.error('notifyMatchingWorkers error:', error);
  }

  return result;
}

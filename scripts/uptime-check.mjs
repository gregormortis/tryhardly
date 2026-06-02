#!/usr/bin/env node
/**
 * Dependency-free uptime check for TryHardly.
 *
 * Probes the public surfaces that matter for launch and exits non-zero if any
 * one of them is unhealthy. Built for both local use and GitHub Actions.
 *
 * Config via environment variables (all optional):
 *   FRONTEND_URL  Base URL of the deployed frontend  (default http://localhost:3000)
 *   BACKEND_URL   Base URL of the deployed backend    (default http://localhost:4000)
 *   TIMEOUT_MS    Per-request timeout in ms           (default 15000)
 *   RETRIES       Extra attempts per check on failure (default 2)
 *
 * A check passes when the response status is within its accepted set. By
 * default that's any 2xx; some pages may legitimately redirect, so a check can
 * also accept 3xx. We never follow redirects automatically — an unexpected
 * redirect (e.g. to a login wall or an error page) should be visible, not hidden.
 *
 * Usage:
 *   FRONTEND_URL=https://www.tryhardly.com BACKEND_URL=https://tryhardly-production.up.railway.app node scripts/uptime-check.mjs
 */

const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
const BACKEND_URL = (process.env.BACKEND_URL || 'http://localhost:4000').replace(/\/+$/, '');
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS || 15000);
const RETRIES = Number(process.env.RETRIES || 2);

/** @typedef {{ name: string, url: string, accept: (status: number) => boolean, expectJson?: string }} Check */

const ok2xx = (s) => s >= 200 && s < 300;
const ok2xxOr3xx = (s) => (s >= 200 && s < 400);

/** @type {Check[]} */
const checks = [
  { name: 'Frontend homepage', url: `${FRONTEND_URL}/`, accept: ok2xx },
  { name: 'Frontend /request-help', url: `${FRONTEND_URL}/request-help`, accept: ok2xxOr3xx },
  { name: 'Frontend /work-alerts', url: `${FRONTEND_URL}/work-alerts`, accept: ok2xxOr3xx },
  { name: 'Backend /health', url: `${BACKEND_URL}/health`, accept: ok2xx, expectJson: 'ok' },
];

async function probe(check) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const started = Date.now();
  try {
    const res = await fetch(check.url, {
      method: 'GET',
      redirect: 'manual', // surface unexpected redirects instead of following them
      signal: controller.signal,
      headers: { 'user-agent': 'tryhardly-uptime-check' },
    });
    const ms = Date.now() - started;

    if (!check.accept(res.status)) {
      return { ok: false, ms, detail: `unexpected status ${res.status}` };
    }

    if (check.expectJson) {
      let body = '';
      try {
        body = await res.text();
      } catch {
        /* ignore body read errors */
      }
      if (!body.includes(check.expectJson)) {
        return { ok: false, ms, detail: `status ${res.status} but body missing "${check.expectJson}"` };
      }
    }

    return { ok: true, ms, detail: `status ${res.status}` };
  } catch (err) {
    const ms = Date.now() - started;
    const msg = err && err.name === 'AbortError' ? `timeout after ${TIMEOUT_MS}ms` : String(err && err.message ? err.message : err);
    return { ok: false, ms, detail: msg };
  } finally {
    clearTimeout(timer);
  }
}

async function probeWithRetries(check) {
  let last;
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    last = await probe(check);
    if (last.ok) return last;
    if (attempt < RETRIES) {
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
    }
  }
  return last;
}

async function main() {
  console.log(`TryHardly uptime check`);
  console.log(`  frontend: ${FRONTEND_URL}`);
  console.log(`  backend:  ${BACKEND_URL}`);
  console.log('');

  const results = [];
  for (const check of checks) {
    const r = await probeWithRetries(check);
    results.push({ check, r });
    const mark = r.ok ? 'PASS' : 'FAIL';
    console.log(`  [${mark}] ${check.name} — ${check.url} (${r.detail}, ${r.ms}ms)`);
  }

  const failed = results.filter((x) => !x.r.ok);
  console.log('');
  if (failed.length > 0) {
    console.error(`${failed.length} of ${results.length} checks FAILED`);
    process.exit(1);
  }
  console.log(`All ${results.length} checks passed`);
}

main().catch((err) => {
  console.error('uptime-check crashed:', err);
  process.exit(1);
});

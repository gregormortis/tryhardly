# Monitoring & Error Reporting

This guide covers launch-time monitoring for TryHardly: uptime checks, hosting
alerts (Railway/Vercel), and optional error reporting (Sentry). Nothing here
touches payment/escrow logic or production data — it is observability only.

---

## 1. Uptime checks (GitHub Actions)

A scheduled GitHub Actions workflow probes the public surfaces that matter for
launch and **fails visibly** if any endpoint is down or returns an unexpected
status.

- Workflow: [`.github/workflows/uptime.yml`](../.github/workflows/uptime.yml)
- Script: [`scripts/uptime-check.mjs`](../scripts/uptime-check.mjs) (dependency-free, Node 20+)

### What it checks

| Endpoint                | Accepted status |
| ----------------------- | --------------- |
| Frontend `/`            | 2xx             |
| Frontend `/request-help`| 2xx or 3xx      |
| Frontend `/work-alerts` | 2xx or 3xx      |
| Backend `/health`       | 2xx + JSON body contains `ok` |

The script uses `redirect: 'manual'` so an **unexpected** redirect (e.g. to a
login wall or error page) surfaces as a failure rather than being silently
followed. It performs only safe `GET` requests — it never submits a lead,
mutates data, or calls a payment endpoint.

### Configure the URLs

The workflow reads URLs in this order: manual-dispatch input → repository
variable → safe default. Set repository variables so the schedule probes the
right hosts:

1. GitHub repo → **Settings → Secrets and variables → Actions → Variables**
2. Add:
   - `FRONTEND_URL` = `https://tryhardly.com` (your real frontend URL)
   - `BACKEND_URL`  = `https://api.tryhardly.com` (your real backend URL)

### Run it locally

```bash
# Against production
FRONTEND_URL=https://tryhardly.com BACKEND_URL=https://api.tryhardly.com \
  node scripts/uptime-check.mjs

# Against local dev servers (defaults)
node scripts/uptime-check.mjs
```

Exit code is non-zero if any check fails — usable in any external cron/monitor.

### Get notified on failure

GitHub emails the repo owner on a failed scheduled workflow by default. To tune:
**Settings → Notifications → Actions**, or add a notification step to the
workflow (Slack/Discord webhook) later if email is too noisy.

### Cadence / noise

Runs every 15 minutes (`cron: '7,22,37,52 * * * *'`). The off-the-hour minutes
avoid the top-of-hour stampede. Increase the interval if it's too chatty. The
`concurrency` block cancels overlapping runs so failures don't pile up.

---

## 2. Railway alerts (backend host)

Railway hosts the backend (see `backend/railway.json`). Set up alerts in the
Railway dashboard — no code change required:

1. Open the backend service → **Settings → Health Check**.
   - Path: `/health`
   - This lets Railway restart the service if it stops responding.
2. **Observability / Metrics**: watch CPU, memory, and restart count.
3. **Notifications** (project → Settings → Notifications): connect email/Slack
   so you're alerted on deploy failures and crashes.
4. Keep `DATABASE_URL`, `JWT_SECRET`, and `STRIPE_*` as Railway variables — never
   commit them.

---

## 3. Vercel alerts (frontend host)

Vercel hosts the Next.js frontend:

1. Project → **Settings → Notifications**: enable deployment failure and error
   alerts to email/Slack.
2. Vercel **Web Analytics / Speed Insights** (optional) for traffic and Core
   Web Vitals.
3. **Log Drains** (Pro) can forward runtime logs to an external collector if you
   want centralized logging.

---

## 4. Error reporting with Sentry (optional)

Error reporting is **off by default**. The backend includes a dependency-light
hook ([`backend/src/lib/errorReporting.ts`](../backend/src/lib/errorReporting.ts))
that is a complete no-op unless **both**:

1. `SENTRY_DSN` is set, **and**
2. the optional `@sentry/node` package is installed.

We deliberately do **not** add `@sentry/node` to `package.json` so the default
install stays lean and the build is unaffected.

### Enable backend Sentry

```bash
cd backend
npm install @sentry/node      # adds the optional dependency
```

Then set on the backend host (Railway variables):

```
SENTRY_DSN=https://<key>@<org>.ingest.sentry.io/<project>
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0      # raise (e.g. 0.1) only if you want tracing
```

On boot you'll see `[errorReporting] Sentry initialized`. Unhandled errors that
reach the Express error handler are then captured automatically via
`reportError(err)` in `backend/src/app.ts`. If the DSN is set but the package is
missing, the app logs a one-line warning and continues normally.

### Enable frontend Sentry (docs only — not pre-wired)

The frontend does not bundle Sentry to keep the build config untouched. To add
it when ready:

```bash
cd frontend
npx @sentry/wizard@latest -i nextjs
```

The wizard creates `sentry.client.config.ts` / `sentry.server.config.ts` and
wraps `next.config.js`. Provide:

```
NEXT_PUBLIC_SENTRY_DSN=https://<key>@<org>.ingest.sentry.io/<project>
SENTRY_ENVIRONMENT=production
```

Set `NEXT_PUBLIC_SENTRY_DSN` as a Vercel environment variable.

---

## Remaining manual setup checklist

- [ ] Set `FRONTEND_URL` / `BACKEND_URL` GitHub Actions **variables** to real URLs.
- [ ] Confirm uptime workflow runs green once (use **Run workflow** to trigger manually).
- [ ] Configure Railway health check + notifications.
- [ ] Configure Vercel deployment/error notifications.
- [ ] (Optional) `npm install @sentry/node` in backend and set `SENTRY_DSN`.
- [ ] (Optional) Run the Sentry Next.js wizard for the frontend and set `NEXT_PUBLIC_SENTRY_DSN`.

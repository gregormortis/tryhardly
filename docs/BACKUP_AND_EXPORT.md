# Backup & Data Export

How to safely back up and export TryHardly data (leads, users, quests) from
Railway Postgres. These routines are **read-only** and do not change production
data. Run them deliberately — never as part of an automated deploy in this repo.

> ⚠️ **Do not run a production export from a feature branch or CI.** Exports
> contain real PII (names, emails, phone numbers). Run them locally or via
> `railway run`, store output securely, and delete it when you're done.

---

## 1. Secrets & PII rules

- **Never commit** export output. `exports/` and `*.export.json` are gitignored.
- **Never hard-code** a production `DATABASE_URL` in a script, commit, or shell
  history. Prefer `railway run`, which injects the service's env vars for a
  single command without exposing them.
- The export script **never** emits `passwordHash`, Stripe IDs, or password-reset
  tokens. Users are exported with an explicit allow-list of safe fields.
- Treat any export file as confidential. Encrypt it at rest if you must keep it.

---

## 2. Application-level export (Prisma, CSV + JSON)

Script: [`backend/scripts/export-data.ts`](../backend/scripts/export-data.ts).
It writes timestamped `.json` and `.csv` files to `backend/exports/`.

```bash
cd backend

# Leads only (no account contacts captured via /request-help and /work-alerts)
railway run npm run export:leads

# Leads + users + quests
railway run npm run export:core-data

# Single entity, ad hoc
railway run npx ts-node scripts/export-data.ts users
```

Running without `railway run` uses the `DATABASE_URL` from your local
`backend/.env` (typically your dev database) — handy for testing the script
safely without touching production.

Output example:

```
backend/exports/leads-2026-05-30T12-00-00-000Z.json
backend/exports/leads-2026-05-30T12-00-00-000Z.csv
```

### What each export contains

| Export   | Fields                                                                 |
| -------- | ---------------------------------------------------------------------- |
| `leads`  | All Lead fields (type, status, name, email, phone, location, job/worker details, admin triage fields). |
| `users`  | id, email, username, displayName, role, verified, level/xp, reputation, quest counts, timestamps. **No** passwordHash / Stripe / tokens. |
| `quests` | id, title, description, category, difficulty, reward, status, escrowStatus, tags, owner/assignee ids, timestamps. **No** paymentIntentId. |

---

## 3. Full database backup (Railway Postgres)

For a complete point-in-time backup, use Postgres native tooling against the
Railway database URL.

### Option A — Railway-managed backups (recommended)

Railway Postgres plugins support automated backups in the dashboard:

1. Railway project → Postgres service → **Backups**.
2. Enable scheduled backups and verify the retention window.
3. Practice a restore into a staging database at least once before launch.

### Option B — Manual `pg_dump`

```bash
# Get the connection string WITHOUT printing it to history:
#   railway run bash -c 'pg_dump "$DATABASE_URL" -Fc -f backup.dump'
railway run bash -c 'pg_dump "$DATABASE_URL" -Fc -f tryhardly-$(date +%F).dump'
```

- `-Fc` produces a compressed custom-format dump suitable for `pg_restore`.
- Store the `.dump` securely (it contains everything, including hashes). It is
  **not** covered by the repo `.gitignore` if you place it elsewhere — keep it
  out of the repo.

Restore into a **non-production** database to verify:

```bash
pg_restore --no-owner --clean --if-exists -d "$STAGING_DATABASE_URL" tryhardly-2026-05-30.dump
```

> Never restore over production unless you have a separate, verified backup and
> a clear reason. Restores are destructive.

---

## 4. Suggested cadence

- **Before each launch milestone / deploy:** run `pg_dump` (Option B) once.
- **Daily/automated:** rely on Railway managed backups (Option A).
- **On demand for analysis:** use the Prisma CSV/JSON export (section 2).

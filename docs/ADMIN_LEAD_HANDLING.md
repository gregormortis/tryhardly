# Admin Lead Handling (No-Account Flow)

TryHardly lets people submit work without creating an account:

- **`/request-help`** — a client describes a job they need done (`JOB_REQUEST`).
- **`/work-alerts`** — a worker signs up to be alerted about local jobs (`WORKER_ALERT`).

Both submit to public, rate-limited endpoints and land in a single **lead
inbox** that admins triage. This doc explains the end-to-end flow and the manual
steps for launch.

---

## 1. How a lead is captured

| Source          | Endpoint                       | Lead type     |
| --------------- | ------------------------------ | ------------- |
| `/request-help` | `POST /api/leads/job-request`  | `JOB_REQUEST` |
| `/work-alerts`  | `POST /api/leads/worker-alert` | `WORKER_ALERT`|

- No authentication required.
- Rate limited to 15 submissions/hour per IP (`leadLimiter` in
  `backend/src/routes/leadRoutes.ts`).
- On success, a confirmation email is sent via the mailer abstraction
  (`sendEmail` / `emailTemplates.jobRequestReceived` /
  `workerAlertReceived`). Email is a safe no-op unless a provider is configured
  (see "Deliverability" below).
- Leads are stored in the `Lead` table with `status = NEW`.

---

## 2. The admin lead inbox

UI: **`/admin`** (requires a user with `role = "ADMIN"`). The page lists leads
newest-first and is also available via the API:

| Action            | API                                   | Notes |
| ----------------- | ------------------------------------- | ----- |
| List leads        | `GET /api/admin/leads?type=&status=`  | Optional `type` / `status` filters. Returns up to 200. |
| Update status     | `PUT /api/admin/leads/:id`            | Body `{ status, adminNote? }`. Records `handledById` + `handledAt`. |
| Convert to quest  | `POST /api/admin/leads/:id/convert`   | `JOB_REQUEST` only. Body `{ reward?, difficulty? }`. Creates a Quest owned by the admin and sets the lead `CONVERTED`. |

All admin routes require `authenticate` + `requireAdmin`
(`backend/src/routes/adminRoutes.ts`).

### Lead lifecycle

```
NEW ──contact the person──▶ CONTACTED ──turn into a posted quest──▶ CONVERTED
  └────────────────── not a fit / spam ──────────────────▶ IGNORED
```

- **NEW** — just submitted, not yet handled.
- **CONTACTED** — an admin has reached out (email/phone).
- **CONVERTED** — a `JOB_REQUEST` lead became a real Quest. Worker-alert leads
  are not converted; mark them `CONTACTED` once they're on the alert list.
- **IGNORED** — spam, duplicate, or out of scope.

---

## 3. Admin triage runbook

1. Open **`/admin`** as an admin user. New submissions appear under **Leads**.
2. For a **job request**:
   - Reach out to the contact (email/phone on the lead) to confirm scope/budget.
   - Click **Mark contacted**.
   - When ready, click **Convert to quest** (optionally set reward/difficulty
     via the API). The new quest is owned by you (the admin) so applicants can
     be managed normally.
3. For a **worker alert**:
   - Add them to your local alert list / outreach.
   - Click **Mark contacted**. (No conversion — these aren't jobs.)
4. Mark spam or out-of-scope leads **Ignored**.

> During launch testing, do **not** submit production test leads from a feature
> branch. Live submissions should be made against the deployed site by the
> launch operator, then triaged here.

---

## 4. Granting admin access

A user needs `role = "ADMIN"` to see the inbox. Set it directly on the user
record (do this carefully, against the right database):

```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'you@yourdomain.com';
```

Prefer `railway run psql "$DATABASE_URL"` so the connection string is never
stored locally. Verify the email is verified as well if your flow requires it
(`/api/admin/users/:id/verify`).

---

## 5. Deliverability (manual setup)

Lead confirmation and notification emails go through the mailer abstraction
(`backend/src/services/mailerService.ts`). It is intentionally safe by default:

- `EMAIL_PROVIDER=log` (dev) writes emails to logs; `noop` (prod default) drops
  them. **No real email is sent until a provider is configured.**
- To send real email, set `EMAIL_PROVIDER=resend` and `RESEND_API_KEY`, with a
  verified sending domain, and `EMAIL_FROM` using that domain.

To maximize inbox placement once a provider is live:

- [ ] Verify the sending domain (SPF, DKIM, and a DMARC record).
- [ ] Use a real reply-to / from address on the verified domain (e.g.
      `support@tryhardly.com` rather than a bare no-reply where possible).
- [ ] Send test emails to **Gmail, Yahoo, and Outlook** test addresses and
      confirm they land in the inbox (not spam). Record which provider
      addresses were used so deliverability can be re-checked after DNS changes.
- [ ] Warm up gradually — avoid sending a large first batch from a cold domain.

The actual Yahoo/Outlook test addresses and provider credentials are operator
secrets and are **not** stored in this repo.

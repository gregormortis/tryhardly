-- Household accounts: a parent or guardian holds the account and their
-- under-18 household members do the work. A minor never holds their own login.
--
-- Approval is required PER JOB, not once at signup, and is invalidated when the
-- approved address or schedule changes.
--
-- TryHardly performs no sex offender registry check. Penal Code 290.46(j)(2)(H)
-- makes registry data a prohibited basis for services provided by a business
-- establishment. The parent is shown the address and linked to the official
-- state site; the judgement is theirs. See src/config/youthPolicy.ts.
--
-- Additive and fully nullable/defaulted: existing adult accounts are untouched.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "dateOfBirth"        TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isHouseholdAccount" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS "User_isHouseholdAccount_idx" ON "User"("isHouseholdAccount");

CREATE TABLE "HouseholdMinor" (
  "id"           TEXT NOT NULL,
  "accountId"    TEXT NOT NULL,
  -- First name only. No reason to hold a minor's full legal name to let them
  -- mow a neighbour's lawn.
  "firstName"    TEXT NOT NULL,
  "dateOfBirth"  TIMESTAMP(3) NOT NULL,
  -- Deactivated rather than deleted, so completed-job history survives when
  -- they turn 18.
  "active"       BOOLEAN NOT NULL DEFAULT true,
  "consentTerms" TEXT NOT NULL,
  "consentAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HouseholdMinor_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HouseholdMinor_accountId_idx" ON "HouseholdMinor"("accountId");
CREATE INDEX "HouseholdMinor_active_idx"    ON "HouseholdMinor"("active");

ALTER TABLE "HouseholdMinor" ADD CONSTRAINT "HouseholdMinor_accountId_fkey"
  FOREIGN KEY ("accountId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "MinorJobApproval" (
  "id"                     TEXT NOT NULL,
  "minorId"                TEXT NOT NULL,
  "questId"                TEXT NOT NULL,
  "approvedById"           TEXT NOT NULL,
  "approvedAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- What the parent was actually looking at when they said yes. Approval is for
  -- a specific place and time; if either changes, it is invalidated.
  "addressAtApproval"      TEXT NOT NULL,
  "scheduleAtApproval"     TIMESTAMP(3),
  "scheduleNoteAtApproval" TEXT,
  "customerNameAtApproval" TEXT NOT NULL,
  "amountCentsAtApproval"  INTEGER,
  -- Records that the parent was shown the address and the official registry
  -- link. NOT a screening result: TryHardly performs no check.
  "safetyInfoShownAt"      TIMESTAMP(3),
  "revokedAt"              TIMESTAMP(3),
  "revokedReason"          TEXT,
  "createdAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"              TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MinorJobApproval_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MinorJobApproval_minorId_questId_key" ON "MinorJobApproval"("minorId", "questId");
CREATE INDEX "MinorJobApproval_questId_idx"      ON "MinorJobApproval"("questId");
CREATE INDEX "MinorJobApproval_approvedById_idx" ON "MinorJobApproval"("approvedById");

ALTER TABLE "MinorJobApproval" ADD CONSTRAINT "MinorJobApproval_minorId_fkey"
  FOREIGN KEY ("minorId") REFERENCES "HouseholdMinor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MinorJobApproval" ADD CONSTRAINT "MinorJobApproval_questId_fkey"
  FOREIGN KEY ("questId") REFERENCES "Quest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MinorJobApproval" ADD CONSTRAINT "MinorJobApproval_approvedById_fkey"
  FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

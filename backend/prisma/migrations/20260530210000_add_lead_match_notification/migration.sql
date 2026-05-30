-- Worker-alert matching: record which worker-alert leads were emailed about a
-- given job-request lead. Fully additive and backward-compatible — introduces a
-- new table plus enum and does not alter the existing Lead table or any flow.
-- The unique (jobLeadId, workerLeadId) pair enforces per-job dedupe so a worker
-- is never emailed twice for the same job request, even under retries/races.

-- CreateEnum
CREATE TYPE "LeadMatchStatus" AS ENUM ('SENT', 'FAILED');

-- CreateTable
CREATE TABLE "LeadMatchNotification" (
    "id" TEXT NOT NULL,
    "jobLeadId" TEXT NOT NULL,
    "workerLeadId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" "LeadMatchStatus" NOT NULL DEFAULT 'SENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "LeadMatchNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeadMatchNotification_jobLeadId_idx" ON "LeadMatchNotification"("jobLeadId");

-- CreateIndex
CREATE INDEX "LeadMatchNotification_workerLeadId_idx" ON "LeadMatchNotification"("workerLeadId");

-- CreateIndex
CREATE UNIQUE INDEX "LeadMatchNotification_jobLeadId_workerLeadId_key" ON "LeadMatchNotification"("jobLeadId", "workerLeadId");

-- AddForeignKey
ALTER TABLE "LeadMatchNotification" ADD CONSTRAINT "LeadMatchNotification_jobLeadId_fkey" FOREIGN KEY ("jobLeadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadMatchNotification" ADD CONSTRAINT "LeadMatchNotification_workerLeadId_fkey" FOREIGN KEY ("workerLeadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

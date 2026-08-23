ALTER TABLE "LeadMatchNotification" ALTER COLUMN "jobLeadId" DROP NOT NULL;
ALTER TABLE "LeadMatchNotification" ADD COLUMN "questId" TEXT;
ALTER TABLE "LeadMatchNotification" ADD CONSTRAINT "LeadMatchNotification_questId_fkey" FOREIGN KEY ("questId") REFERENCES "Quest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "LeadMatchNotification_questId_workerLeadId_key" ON "LeadMatchNotification"("questId", "workerLeadId");
CREATE INDEX "LeadMatchNotification_questId_idx" ON "LeadMatchNotification"("questId");

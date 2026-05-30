-- AlterTable: add optional quest link to Message so messages can be grouped
-- into per-quest threads. Nullable to preserve existing rows.
ALTER TABLE "Message" ADD COLUMN "questId" TEXT;

-- CreateIndex
CREATE INDEX "Message_questId_idx" ON "Message"("questId");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_questId_fkey" FOREIGN KEY ("questId") REFERENCES "Quest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

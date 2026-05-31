-- Per-skill ratings and worker "favorite skills".
--
-- Clients rate each individual skill a worker performed on a completed job
-- (e.g. mowing, fencing, hauling). These rows are aggregated to derive per-skill
-- badge tiers (Bronze/Silver/Gold/Platinum) on the worker's public profile.
-- Badge tiers are always computed from this table, never denormalized, so they
-- cannot go stale or be faked.
--
-- Fully additive and backward-compatible:
--   * The new User."favoriteSkills" column has a default of an empty array, so
--     every existing row gets a valid value with no backfill required.
--   * The new "SkillRating" table is net-new and touches no existing rows.
--   * No existing column, constraint, or enum is altered or dropped.

-- AlterTable
ALTER TABLE "User" ADD COLUMN "favoriteSkills" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "SkillRating" (
    "id" TEXT NOT NULL,
    "questId" TEXT NOT NULL,
    "reviewId" TEXT,
    "raterId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "skillSlug" TEXT NOT NULL,
    "skillName" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkillRating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SkillRating_workerId_idx" ON "SkillRating"("workerId");

-- CreateIndex
CREATE INDEX "SkillRating_workerId_skillSlug_idx" ON "SkillRating"("workerId", "skillSlug");

-- CreateIndex
CREATE INDEX "SkillRating_questId_idx" ON "SkillRating"("questId");

-- CreateIndex
CREATE UNIQUE INDEX "SkillRating_questId_raterId_skillSlug_key" ON "SkillRating"("questId", "raterId", "skillSlug");

-- AddForeignKey
ALTER TABLE "SkillRating" ADD CONSTRAINT "SkillRating_questId_fkey" FOREIGN KEY ("questId") REFERENCES "Quest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillRating" ADD CONSTRAINT "SkillRating_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillRating" ADD CONSTRAINT "SkillRating_raterId_fkey" FOREIGN KEY ("raterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillRating" ADD CONSTRAINT "SkillRating_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

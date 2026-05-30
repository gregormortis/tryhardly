-- Low-friction acquisition: capture poster/worker intent before account creation.
-- Fully additive and backward-compatible — introduces a single Lead table that
-- backs the public /request-help and /work-alerts forms and the admin inbox.

-- CreateEnum
CREATE TYPE "LeadType" AS ENUM ('JOB_REQUEST', 'WORKER_ALERT');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'CONVERTED', 'IGNORED');

-- CreateTable: Lead
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "type" "LeadType" NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "location" TEXT,
    "title" TEXT,
    "description" TEXT,
    "category" TEXT,
    "budget" TEXT,
    "timeline" TEXT,
    "photoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "availability" TEXT,
    "hasTools" BOOLEAN NOT NULL DEFAULT false,
    "payload" JSONB,
    "handledById" TEXT,
    "handledAt" TIMESTAMP(3),
    "adminNote" TEXT,
    "convertedQuestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Lead_type_status_idx" ON "Lead"("type", "status");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");

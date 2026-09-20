-- MVP growth engine: campaigns, conversation stages, attribution, agent config

-- Enums
CREATE TYPE "CampaignObjective" AS ENUM ('MORE_ORDERS', 'MORE_LEADS', 'MORE_BOOKINGS', 'MORE_MESSAGES');
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'READY', 'ASSISTED_LAUNCH', 'SIMULATED', 'ACTIVE', 'PAUSED', 'ARCHIVED');
CREATE TYPE "ConversionStage" AS ENUM ('NEW', 'DISCOVERY', 'QUALIFICATION', 'CONSIDERATION', 'PURCHASE_INTENT', 'DATA_COLLECTION', 'CONVERTED', 'HUMAN_HANDOFF');
CREATE TYPE "ActorType" AS ENUM ('AI', 'HUMAN', 'SYSTEM');
CREATE TYPE "SocialConnectionStatus" AS ENUM ('CONNECTED', 'SIMULATION', 'DISCONNECTED', 'ERROR');

ALTER TYPE "ConversationChannel" ADD VALUE IF NOT EXISTS 'WHATSAPP';
ALTER TYPE "ConversationChannel" ADD VALUE IF NOT EXISTS 'TIKTOK';

-- Campaigns
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "objective" "CampaignObjective" NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "offer" TEXT NOT NULL,
    "audienceDescription" TEXT NOT NULL,
    "budget" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "valueProposition" TEXT,
    "suggestedMessaging" TEXT,
    "suggestedCta" TEXT,
    "suggestedCreative" TEXT,
    "channel" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "campaigns_businessId_createdAt_idx" ON "campaigns"("businessId", "createdAt");

ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Conversation extensions
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "campaignId" TEXT;
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "mode" TEXT NOT NULL DEFAULT 'AI';
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "conversionStage" "ConversionStage" NOT NULL DEFAULT 'NEW';
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "handoffReason" TEXT;
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "aiSummary" TEXT;

CREATE INDEX IF NOT EXISTS "conversations_campaignId_idx" ON "conversations"("campaignId");
ALTER TABLE "conversations" DROP CONSTRAINT IF EXISTS "conversations_campaignId_fkey";
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Message meta
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "meta" JSONB;

-- Lead / Order attribution
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "campaignId" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "createdBy" "ActorType" NOT NULL DEFAULT 'AI';
CREATE INDEX IF NOT EXISTS "leads_campaignId_idx" ON "leads"("campaignId");
ALTER TABLE "leads" DROP CONSTRAINT IF EXISTS "leads_campaignId_fkey";
ALTER TABLE "leads" ADD CONSTRAINT "leads_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "campaignId" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "createdBy" "ActorType" NOT NULL DEFAULT 'AI';
CREATE INDEX IF NOT EXISTS "orders_campaignId_idx" ON "orders"("campaignId");
ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_campaignId_fkey";
ALTER TABLE "orders" ADD CONSTRAINT "orders_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Social status
ALTER TABLE "social_accounts" ADD COLUMN IF NOT EXISTS "status" "SocialConnectionStatus" NOT NULL DEFAULT 'SIMULATION';
ALTER TABLE "social_accounts" ADD COLUMN IF NOT EXISTS "metadata" JSONB;

-- AI agent config
ALTER TABLE "ai_agents" ADD COLUMN IF NOT EXISTS "tone" TEXT NOT NULL DEFAULT 'FRIENDLY';
ALTER TABLE "ai_agents" ADD COLUMN IF NOT EXISTS "instructions" TEXT;
ALTER TABLE "ai_agents" ADD COLUMN IF NOT EXISTS "handoffEnabled" BOOLEAN NOT NULL DEFAULT true;

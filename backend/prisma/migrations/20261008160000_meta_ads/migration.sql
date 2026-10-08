ALTER TYPE "CampaignStatus" ADD VALUE IF NOT EXISTS 'PUBLISHING';
ALTER TYPE "CampaignStatus" ADD VALUE IF NOT EXISTS 'PAUSED_ON_META';
ALTER TYPE "CampaignStatus" ADD VALUE IF NOT EXISTS 'FAILED';
ALTER TYPE "CampaignStatus" ADD VALUE IF NOT EXISTS 'IN_REVIEW';
ALTER TYPE "CampaignStatus" ADD VALUE IF NOT EXISTS 'REJECTED';
ALTER TYPE "CampaignStatus" ADD VALUE IF NOT EXISTS 'COMPLETED';

ALTER TABLE "businesses"
  ADD COLUMN "metaAdAccountId" TEXT,
  ADD COLUMN "metaAdAccountName" TEXT,
  ADD COLUMN "metaAdAccountCurrency" TEXT,
  ADD COLUMN "metaAdAccountTimezone" TEXT,
  ADD COLUMN "metaAdsTokenEnc" TEXT,
  ADD COLUMN "metaAdsNeedsReconnect" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "pending_meta_connections"
  ADD COLUMN "adAccountsJson" JSONB NOT NULL DEFAULT '[]';

ALTER TABLE "campaigns"
  ADD COLUMN "metaCampaignId" TEXT,
  ADD COLUMN "metaAdsetId" TEXT,
  ADD COLUMN "metaAdId" TEXT,
  ADD COLUMN "metaCreativeId" TEXT,
  ADD COLUMN "metaImageHash" TEXT,
  ADD COLUMN "metaAudienceIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "publishStep" TEXT,
  ADD COLUMN "metaError" TEXT,
  ADD COLUMN "metaErrorUserMsg" TEXT,
  ADD COLUMN "effectiveStatus" TEXT,
  ADD COLUMN "audienceNote" TEXT;

CREATE INDEX "campaigns_metaAdId_idx" ON "campaigns"("metaAdId");

CREATE TABLE "campaign_insights" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "spend" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "impressions" INTEGER NOT NULL DEFAULT 0,
  "clicks" INTEGER NOT NULL DEFAULT 0,
  "actions" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "campaign_insights_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "campaign_insights_campaignId_date_key" ON "campaign_insights"("campaignId", "date");
CREATE INDEX "campaign_insights_campaignId_idx" ON "campaign_insights"("campaignId");

ALTER TABLE "campaign_insights"
  ADD CONSTRAINT "campaign_insights_campaignId_fkey"
  FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

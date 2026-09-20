-- Channel foundation: connection lifecycle, pending OAuth, webhook idempotency

ALTER TYPE "SocialConnectionStatus" ADD VALUE IF NOT EXISTS 'CONNECTING';
ALTER TYPE "SocialConnectionStatus" ADD VALUE IF NOT EXISTS 'REAUTH_REQUIRED';

ALTER TABLE "social_accounts" ADD COLUMN IF NOT EXISTS "provider" TEXT NOT NULL DEFAULT 'META';
ALTER TABLE "social_accounts" ADD COLUMN IF NOT EXISTS "webhookSubscribedAt" TIMESTAMP(3);
ALTER TABLE "social_accounts" ADD COLUMN IF NOT EXISTS "parentExternalId" TEXT;
ALTER TABLE "social_accounts" ADD COLUMN IF NOT EXISTS "capabilities" TEXT[] DEFAULT ARRAY[]::TEXT[];

CREATE INDEX IF NOT EXISTS "social_accounts_provider_externalId_idx" ON "social_accounts"("provider", "externalId");

CREATE TABLE IF NOT EXISTS "pending_meta_connections" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userAccessTokenEnc" TEXT NOT NULL,
    "pagesJson" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pending_meta_connections_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "pending_meta_connections_businessId_idx" ON "pending_meta_connections"("businessId");

CREATE TABLE IF NOT EXISTS "webhook_events" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalEventId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "webhook_events_provider_externalEventId_key" ON "webhook_events"("provider", "externalEventId");
CREATE INDEX IF NOT EXISTS "webhook_events_createdAt_idx" ON "webhook_events"("createdAt");

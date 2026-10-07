-- AlterEnum
ALTER TYPE "PlanTier" ADD VALUE 'PRO';

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'PAUSED', 'CANCELED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "BillingRegion" AS ENUM ('EG', 'SA', 'AE');

-- CreateEnum
CREATE TYPE "UsageMeter" AS ENUM ('CONVERSATION', 'WHATSAPP_MESSAGE', 'AI_ACTION', 'ORDER', 'API_REQUEST');

-- CreateEnum
CREATE TYPE "CreditKind" AS ENUM ('WHATSAPP', 'AI');

-- CreateEnum
CREATE TYPE "PaymentPurpose" AS ENUM ('SUBSCRIPTION', 'CREDITS');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "BillingEventType" AS ENUM ('CHECKOUT_CREATED', 'PAYMENT_SUCCEEDED', 'PAYMENT_FAILED', 'SUBSCRIPTION_ACTIVATED', 'SUBSCRIPTION_CANCELED', 'SUBSCRIPTION_PAUSED', 'SUBSCRIPTION_RESUMED', 'TRIAL_STARTED', 'TRIAL_EXPIRED', 'USAGE_WARNING', 'CREDIT_PURCHASED', 'PLAN_CHANGE_SCHEDULED');

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "plan" "PlanTier" NOT NULL DEFAULT 'GROWTH',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
    "interval" "BillingInterval" NOT NULL DEFAULT 'MONTHLY',
    "region" "BillingRegion" NOT NULL DEFAULT 'EG',
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "amount" INTEGER NOT NULL DEFAULT 0,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "trialEndsAt" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "pastDueAt" TIMESTAMP(3),
    "scheduledPlan" "PlanTier",
    "scheduledInterval" "BillingInterval",
    "provider" TEXT,
    "providerCustomerId" TEXT,
    "providerSubscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "purpose" "PaymentPurpose" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL,
    "providerReference" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "plan" "PlanTier",
    "interval" "BillingInterval",
    "creditPackId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_records" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "type" "UsageMeter" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "externalReference" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_summaries" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "conversations" INTEGER NOT NULL DEFAULT 0,
    "whatsappMessages" INTEGER NOT NULL DEFAULT 0,
    "whatsappUsageCost" INTEGER NOT NULL DEFAULT 0,
    "aiActions" INTEGER NOT NULL DEFAULT 0,
    "orders" INTEGER NOT NULL DEFAULT 0,
    "apiRequests" INTEGER NOT NULL DEFAULT 0,
    "warningFlags" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usage_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_wallets" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "whatsappCredits" INTEGER NOT NULL DEFAULT 0,
    "aiCredits" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credit_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_transactions" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "kind" "CreditKind" NOT NULL,
    "delta" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "externalReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "paymentId" TEXT,
    "number" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_events" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "type" "BillingEventType" NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_businessId_key" ON "subscriptions"("businessId");

-- CreateIndex
CREATE INDEX "payments_businessId_createdAt_idx" ON "payments"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "payments_providerReference_idx" ON "payments"("providerReference");

-- CreateIndex
CREATE INDEX "usage_records_businessId_type_createdAt_idx" ON "usage_records"("businessId", "type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "usage_summaries_businessId_periodKey_key" ON "usage_summaries"("businessId", "periodKey");

-- CreateIndex
CREATE UNIQUE INDEX "credit_wallets_businessId_key" ON "credit_wallets"("businessId");

-- CreateIndex
CREATE INDEX "credit_transactions_businessId_createdAt_idx" ON "credit_transactions"("businessId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_paymentId_key" ON "invoices"("paymentId");

-- CreateIndex
CREATE INDEX "invoices_businessId_createdAt_idx" ON "invoices"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "billing_events_businessId_createdAt_idx" ON "billing_events"("businessId", "createdAt");

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_summaries" ADD CONSTRAINT "usage_summaries_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_wallets" ADD CONSTRAINT "credit_wallets_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_events" ADD CONSTRAINT "billing_events_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Existing merchants start a 7-day trial when billing ships, instead of inheriting a permanent free plan.
INSERT INTO "subscriptions" (
    "id",
    "businessId",
    "plan",
    "status",
    "interval",
    "region",
    "currency",
    "amount",
    "currentPeriodStart",
    "currentPeriodEnd",
    "trialEndsAt",
    "cancelAtPeriodEnd",
    "createdAt",
    "updatedAt"
)
SELECT
    gen_random_uuid()::text,
    "id",
    'GROWTH',
    'TRIALING',
    'MONTHLY',
    'EG',
    'EGP',
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP + INTERVAL '7 days',
    CURRENT_TIMESTAMP + INTERVAL '7 days',
    false,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "businesses";

INSERT INTO "credit_wallets" ("id", "businessId", "whatsappCredits", "aiCredits", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, "id", 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "businesses";

INSERT INTO "billing_events" ("id", "businessId", "type", "payload", "createdAt")
SELECT gen_random_uuid()::text, "id", 'TRIAL_STARTED', '{"source":"migration"}'::jsonb, CURRENT_TIMESTAMP
FROM "businesses";

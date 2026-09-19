-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('FREE', 'STARTER', 'GROWTH');

-- AlterTable
ALTER TABLE "businesses" ADD COLUMN "plan" "PlanTier" NOT NULL DEFAULT 'FREE';

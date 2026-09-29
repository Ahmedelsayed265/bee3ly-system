-- CreateEnum
CREATE TYPE "ShippingPricingMode" AS ENUM ('GOVERNORATE', 'LOCAL_AREA');

-- AlterTable
ALTER TABLE "businesses" ADD COLUMN "shippingPricingMode" "ShippingPricingMode" NOT NULL DEFAULT 'GOVERNORATE';

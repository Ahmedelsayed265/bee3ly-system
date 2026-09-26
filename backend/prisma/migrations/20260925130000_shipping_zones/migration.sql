ALTER TABLE "products" DROP COLUMN IF EXISTS "shippingEgp";
ALTER TABLE "order_items" DROP COLUMN IF EXISTS "shippingEgp";

ALTER TABLE "businesses" ADD COLUMN "shippingZones" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "orders" ADD COLUMN "governorate" TEXT;
ALTER TABLE "orders" ADD COLUMN "shippingEgp" INTEGER;

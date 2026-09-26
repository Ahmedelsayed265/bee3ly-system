ALTER TYPE "OrderStatus" ADD VALUE 'RETURNED';

ALTER TABLE "products" ADD COLUMN "costEgp" INTEGER;
ALTER TABLE "products" ADD COLUMN "shippingEgp" INTEGER;

ALTER TABLE "order_items" ADD COLUMN "costEgp" INTEGER;
ALTER TABLE "order_items" ADD COLUMN "shippingEgp" INTEGER;

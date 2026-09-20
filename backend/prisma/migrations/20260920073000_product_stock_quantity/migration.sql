-- AlterTable
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "stockQuantity" INTEGER;

-- Backfill inventory-style rows
UPDATE "products"
SET "stockQuantity" = CASE WHEN "inStock" THEN 1 ELSE 0 END
WHERE "stockQuantity" IS NULL;

-- Listings / made-to-order use available/unavailable only
UPDATE "products" AS p
SET "stockQuantity" = NULL
FROM "businesses" AS b
WHERE p."businessId" = b."id"
  AND b."type" IN ('REAL_ESTATE', 'RESTAURANT', 'CAFE');

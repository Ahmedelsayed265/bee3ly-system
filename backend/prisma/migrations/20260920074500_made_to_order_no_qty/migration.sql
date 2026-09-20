-- Made-to-order businesses should not track unit quantity
UPDATE "products" AS p
SET "stockQuantity" = NULL
FROM "businesses" AS b
WHERE p."businessId" = b."id"
  AND b."type" IN ('REAL_ESTATE', 'RESTAURANT', 'CAFE');

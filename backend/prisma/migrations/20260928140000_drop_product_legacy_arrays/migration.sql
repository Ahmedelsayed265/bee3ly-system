-- Sizes/colors live in attributes JSON and variants.axes only.
ALTER TABLE "products" DROP COLUMN IF EXISTS "sizes";
ALTER TABLE "products" DROP COLUMN IF EXISTS "colors";

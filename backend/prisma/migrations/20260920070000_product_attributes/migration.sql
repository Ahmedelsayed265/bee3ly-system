-- AlterTable
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "attributes" JSONB NOT NULL DEFAULT '{}';

-- Backfill flexible attributes from legacy sizes/colors columns
UPDATE "products"
SET "attributes" = jsonb_strip_nulls(
  COALESCE("attributes", '{}'::jsonb) || jsonb_build_object(
    'sizes', CASE WHEN cardinality("sizes") > 0 THEN to_jsonb("sizes") ELSE NULL END,
    'colors', CASE WHEN cardinality("colors") > 0 THEN to_jsonb("colors") ELSE NULL END
  )
)
WHERE "attributes" = '{}'::jsonb
   OR NOT ("attributes" ? 'sizes' OR "attributes" ? 'colors');

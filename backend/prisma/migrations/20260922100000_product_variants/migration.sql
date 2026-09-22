-- AlterTable
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "variants" JSONB NOT NULL DEFAULT '{"axes":[],"skus":[]}';

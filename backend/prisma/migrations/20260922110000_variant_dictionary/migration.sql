-- AlterTable
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "variantDictionary" JSONB NOT NULL DEFAULT '[]';

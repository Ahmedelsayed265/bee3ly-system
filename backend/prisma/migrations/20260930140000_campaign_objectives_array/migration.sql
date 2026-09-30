-- Allow multiple campaign goals; keep `objective` as primary for metrics.
ALTER TABLE "campaigns" ADD COLUMN "objectives" "CampaignObjective"[] NOT NULL DEFAULT ARRAY[]::"CampaignObjective"[];

UPDATE "campaigns"
SET "objectives" = ARRAY["objective"]::"CampaignObjective"[]
WHERE cardinality("objectives") = 0;

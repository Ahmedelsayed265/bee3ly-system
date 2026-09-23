-- Campaign goals from the campaigns design. Existing values stay valid.
ALTER TYPE "CampaignObjective" ADD VALUE IF NOT EXISTS 'AWARENESS';
ALTER TYPE "CampaignObjective" ADD VALUE IF NOT EXISTS 'TRAFFIC';
ALTER TYPE "CampaignObjective" ADD VALUE IF NOT EXISTS 'ENGAGEMENT';
ALTER TYPE "CampaignObjective" ADD VALUE IF NOT EXISTS 'RETARGETING';

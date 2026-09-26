import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';
import { CampaignObjective, CampaignStatus } from '@prisma/client';

export class CreateCampaignDto {
  @IsString()
  @MinLength(2)
  offer!: string;

  @IsEnum(CampaignObjective)
  objective!: CampaignObjective;

  @IsString()
  @MinLength(2)
  audienceDescription!: string;

  @IsInt()
  @Min(50)
  budget!: number;

  @IsOptional()
  @IsString()
  valueProposition?: string;

  @IsOptional()
  @IsString()
  channel?: string;

  @IsOptional()
  @IsString()
  adCopy?: string;
}

export class DraftAdCopyDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsUUID()
  productId!: string;
}

export class LaunchCampaignDto {
  @IsEnum(CampaignStatus)
  status!: CampaignStatus;
}

import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { CampaignObjective, CampaignStatus } from '@prisma/client';

export class CreateCampaignDto {
  @IsString()
  @MinLength(2)
  offer!: string;

  @ValidateIf((dto: CreateCampaignDto) => !dto.objectives?.length)
  @IsEnum(CampaignObjective)
  objective?: CampaignObjective;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(CampaignObjective, { each: true })
  objectives?: CampaignObjective[];

  @IsString()
  @MinLength(2)
  audienceDescription!: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  audiences?: string[];

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

  @IsOptional()
  @IsEnum(CampaignObjective)
  objective?: CampaignObjective;

  @IsOptional()
  @IsString()
  audienceDescription?: string;

  @IsOptional()
  @IsInt()
  @Min(50)
  budget?: number;

  @IsOptional()
  @IsString()
  valueProposition?: string;

  @IsOptional()
  @IsString()
  locale?: string;
}

export class LaunchCampaignDto {
  @IsEnum(CampaignStatus)
  status!: CampaignStatus;
}

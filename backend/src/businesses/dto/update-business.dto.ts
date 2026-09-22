import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { BusinessGoal, BusinessType, PlanTier } from '@prisma/client';

export class VariantDictionaryOptionDto {
  @IsString()
  @MinLength(1)
  id!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsArray()
  @IsString({ each: true })
  values!: string[];
}

export class UpdateBusinessDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsEnum(BusinessType)
  type?: BusinessType;

  @IsOptional()
  @IsEnum(PlanTier)
  plan?: PlanTier;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  averagePriceEgp?: number;

  @IsOptional()
  @IsString()
  operatingArea?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  contactChannels?: string[];

  @IsOptional()
  @IsEnum(BusinessGoal)
  primaryGoal?: BusinessGoal;

  @IsOptional()
  @IsString()
  deliveryInfo?: string;

  @IsOptional()
  @IsString()
  workingHours?: string;

  @IsOptional()
  @IsString()
  paymentInfo?: string;

  @IsOptional()
  @IsString()
  faqs?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantDictionaryOptionDto)
  variantDictionary?: VariantDictionaryOptionDto[];

  @IsOptional()
  @IsBoolean()
  completeOnboarding?: boolean;
}

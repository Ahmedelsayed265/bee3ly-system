import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { BusinessGoal, BusinessType, PlanTier } from '@prisma/client';
import { GOVERNORATE_IDS } from '../shipping-zones';

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

export class ShippingZoneDto {
  @IsString()
  @MinLength(1)
  id!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsArray()
  @IsIn(GOVERNORATE_IDS, { each: true })
  governorates!: string[];

  @Type(() => Number)
  @IsInt()
  @Min(0)
  priceEgp!: number;
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
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShippingZoneDto)
  shippingZones?: ShippingZoneDto[];

  @IsOptional()
  @IsBoolean()
  completeOnboarding?: boolean;
}

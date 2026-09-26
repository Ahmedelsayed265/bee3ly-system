import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

function optionalMoney(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return value;
  return Math.floor(parsed);
}

export class VariantAxisDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsArray()
  @IsString({ each: true })
  values!: string[];
}

export class VariantSkuDto {
  @IsOptional()
  @IsString()
  key?: string;

  @IsObject()
  options!: Record<string, string>;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  priceEgp!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  stockQuantity!: number;
}

export class ProductVariantsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantAxisDto)
  axes!: VariantAxisDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantSkuDto)
  skus!: VariantSkuDto[];
}

export class CreateProductDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  priceEgp!: number;

  @IsOptional()
  @Transform(({ value }) => optionalMoney(value))
  @IsInt()
  @Min(0)
  costEgp?: number | null;

  /** Flexible details: { material: "…", area_m2: 120, … } */
  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;

  /** Variant axes + SKU matrix with per-combination price/qty */
  @IsOptional()
  @ValidateNested()
  @Type(() => ProductVariantsDto)
  variants?: ProductVariantsDto;

  /** @deprecated Prefer attributes.sizes / variants — kept for compatibility */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sizes?: string[];

  /** @deprecated Prefer attributes.colors / variants — kept for compatibility */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  colors?: string[];

  /** Inventory count when no variant matrix. Ignored/overwritten when variants.skus exist. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stockQuantity?: number;

  /** Available/unavailable for listings (real estate). Derived from stockQuantity for inventory. */
  @IsOptional()
  @IsBoolean()
  inStock?: boolean;
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  priceEgp?: number;

  @IsOptional()
  @Transform(({ value }) => optionalMoney(value))
  @IsInt()
  @Min(0)
  costEgp?: number | null;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;

  @IsOptional()
  @ValidateNested()
  @Type(() => ProductVariantsDto)
  variants?: ProductVariantsDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sizes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  colors?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stockQuantity?: number;

  @IsOptional()
  @IsBoolean()
  inStock?: boolean;
}

import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

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

  /** Flexible details: { sizes: [], flavor: "…", area_m2: 120, … } */
  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;

  /** @deprecated Prefer attributes.sizes — kept for compatibility */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sizes?: string[];

  /** @deprecated Prefer attributes.colors — kept for compatibility */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  colors?: string[];

  /** Inventory count for sellable units (t-shirts, bottles…). Ignored for real estate. */
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
  @IsObject()
  attributes?: Record<string, unknown>;

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

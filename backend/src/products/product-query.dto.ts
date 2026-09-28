import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../common/pagination.dto';

export const PRODUCT_STOCK_FILTERS = [
  'in_stock',
  'out_of_stock',
  'low_stock',
] as const;

export type ProductStockFilter = (typeof PRODUCT_STOCK_FILTERS)[number];

export class ProductQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  q?: string;

  @IsOptional()
  @IsIn(PRODUCT_STOCK_FILTERS)
  stock?: ProductStockFilter;
}

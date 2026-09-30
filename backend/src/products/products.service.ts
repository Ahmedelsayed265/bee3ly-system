import { Injectable, NotFoundException } from '@nestjs/common';
import { AiContextCacheService } from '../ai/context/ai-context-cache.service';
import { Prisma } from '@prisma/client';
import { BusinessAccessService } from '../common/business-access.service';
import { pageMeta, pageWindow } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { asAttributes, syncLegacyArrays } from './product-attributes';
import {
  asVariants,
  axisValuesByKind,
  hasVariantMatrix,
  rebuildVariantSkus,
  variantsFirstPrice,
  variantsTotalStock,
  type ProductVariants,
} from './product-variants';
import { resolveInStock, usesQuantityStock } from './stock-mode';
import type { ProductStockFilter } from './product-query.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: BusinessAccessService,
    private readonly aiContextCache: AiContextCacheService,
  ) {}

  private async businessType(businessId: string) {
    const business = await this.prisma.business.findUniqueOrThrow({
      where: { id: businessId },
      select: { type: true },
    });
    return business.type;
  }

  private normalizeVariants(
    raw: unknown,
    defaultPriceEgp: number,
    defaultStockQuantity?: number,
    defaultCostEgp?: number | null,
  ): ProductVariants {
    const parsed = asVariants(raw);
    if (!parsed.axes.length) return { axes: [], skus: [] };
    return rebuildVariantSkus({
      axes: parsed.axes,
      previousSkus: parsed.skus,
      defaultPriceEgp,
      defaultCostEgp,
      defaultStockQuantity: defaultStockQuantity ?? 0,
    });
  }

  private applyVariantDerived(input: {
    type: string;
    attributes: ReturnType<typeof asAttributes>;
    variants: ProductVariants;
    priceEgp: number;
    stockQuantity?: number | null;
    inStock?: boolean;
  }) {
    const fromAxes = axisValuesByKind(input.variants);
    const attributes = { ...input.attributes };
    if (fromAxes.sizes.length) attributes.sizes = fromAxes.sizes;
    if (fromAxes.colors.length) attributes.colors = fromAxes.colors;
    const legacy = syncLegacyArrays(attributes);
    if (!legacy.sizes.length && fromAxes.sizes.length) {
      legacy.sizes.push(...fromAxes.sizes);
    }
    if (!legacy.colors.length && fromAxes.colors.length) {
      legacy.colors.push(...fromAxes.colors);
    }

    if (hasVariantMatrix(input.variants)) {
      const total = variantsTotalStock(input.variants);
      const firstPrice = variantsFirstPrice(input.variants);
      const stock = resolveInStock({
        type: input.type,
        stockQuantity: total,
        inStock: total > 0,
      });
      return {
        attributes,
        legacy,
        variants: input.variants,
        priceEgp: firstPrice ?? input.priceEgp,
        stockQuantity: stock.stockQuantity,
        inStock: stock.inStock,
      };
    }

    const stock = resolveInStock({
      type: input.type,
      stockQuantity: input.stockQuantity,
      inStock: input.inStock,
    });
    return {
      attributes,
      legacy,
      variants: { axes: [], skus: [] } as ProductVariants,
      priceEgp: input.priceEgp,
      stockQuantity: stock.stockQuantity,
      inStock: stock.inStock,
    };
  }

  async list(
    userId: string,
    page = 1,
    limit = 10,
    filters: { q?: string; stock?: ProductStockFilter } = {},
  ) {
    const businessId = await this.access.requireBusinessId(userId);
    const type = await this.businessType(businessId);
    const window = pageWindow(page, limit);
    const where = this.productWhere(businessId, type, filters);
    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: window.skip,
        take: window.limit,
      }),
      this.prisma.product.count({ where }),
    ]);
    return { products, ...pageMeta(total, window.page, window.limit) };
  }

  private productWhere(
    businessId: string,
    businessType: string,
    filters: { q?: string; stock?: ProductStockFilter },
  ): Prisma.ProductWhereInput {
    const q = filters.q?.trim();
    const quantityMode = usesQuantityStock(businessType);
    let stockClause: Prisma.ProductWhereInput = {};
    if (filters.stock === 'in_stock') {
      stockClause = quantityMode
        ? { stockQuantity: { gt: 0 } }
        : { inStock: true };
    } else if (filters.stock === 'out_of_stock') {
      stockClause = quantityMode
        ? { OR: [{ stockQuantity: { lte: 0 } }, { stockQuantity: null }] }
        : { inStock: false };
    } else if (filters.stock === 'low_stock' && quantityMode) {
      stockClause = { stockQuantity: { gt: 0, lte: 5 } };
    }
    return {
      businessId,
      ...stockClause,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { description: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }

  async create(userId: string, dto: CreateProductDto) {
    const businessId = await this.access.requireBusinessId(userId);
    const type = await this.businessType(businessId);
    const attributes = asAttributes(dto.attributes);
    const variants = this.normalizeVariants(
      dto.variants,
      dto.priceEgp,
      dto.stockQuantity,
      dto.costEgp ?? null,
    );
    const derived = this.applyVariantDerived({
      type,
      attributes,
      variants,
      priceEgp: dto.priceEgp,
      stockQuantity: dto.stockQuantity,
      inStock: dto.inStock,
    });

    const created = await this.prisma.product.create({
      data: {
        businessId,
        name: dto.name.trim(),
        description: dto.description?.trim(),
        priceEgp: derived.priceEgp,
        costEgp: hasVariantMatrix(derived.variants)
          ? null
          : (dto.costEgp ?? null),
        attributes: derived.attributes,
        variants: derived.variants,
        stockQuantity: derived.stockQuantity,
        inStock: derived.inStock,
      },
    });
    this.aiContextCache.invalidate(businessId);
    return { product: created };
  }

  async update(userId: string, id: string, dto: UpdateProductDto) {
    const businessId = await this.access.requireBusinessId(userId);
    const type = await this.businessType(businessId);
    const existing = await this.prisma.product.findFirst({
      where: { id, businessId },
    });
    if (!existing) throw new NotFoundException('Product not found');

    const shouldTouchAttributes = dto.attributes !== undefined;

    let attributes = asAttributes(existing.attributes);
    if (shouldTouchAttributes) {
      attributes = asAttributes(dto.attributes);
    }

    const existingVariants = asVariants(existing.variants);
    const variants =
      dto.variants !== undefined
        ? this.normalizeVariants(
            dto.variants,
            dto.priceEgp ?? existing.priceEgp,
            dto.stockQuantity ?? existing.stockQuantity ?? 0,
            dto.costEgp !== undefined ? dto.costEgp : existing.costEgp,
          )
        : existingVariants;

    const shouldTouchStock =
      dto.stockQuantity !== undefined ||
      dto.inStock !== undefined ||
      dto.variants !== undefined;

    const derived = this.applyVariantDerived({
      type,
      attributes,
      variants,
      priceEgp: dto.priceEgp ?? existing.priceEgp,
      stockQuantity: shouldTouchStock
        ? dto.stockQuantity !== undefined
          ? dto.stockQuantity
          : existing.stockQuantity
        : existing.stockQuantity,
      inStock: dto.inStock !== undefined ? dto.inStock : existing.inStock,
    });

    const product = await this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description.trim() }
          : {}),
        priceEgp: derived.priceEgp,
        ...(dto.costEgp !== undefined || dto.variants !== undefined
          ? {
              costEgp: hasVariantMatrix(derived.variants)
                ? null
                : dto.costEgp !== undefined
                  ? dto.costEgp
                  : existing.costEgp,
            }
          : {}),
        ...(shouldTouchAttributes || dto.variants !== undefined
          ? { attributes: derived.attributes }
          : {}),
        ...(dto.variants !== undefined
          ? {
              variants: derived.variants,
            }
          : {}),
        ...(shouldTouchStock || dto.variants !== undefined
          ? {
              stockQuantity: derived.stockQuantity,
              inStock: derived.inStock,
            }
          : {}),
      },
    });
    this.aiContextCache.invalidate(businessId);
    return { product };
  }

  async remove(userId: string, id: string) {
    const businessId = await this.access.requireBusinessId(userId);
    const existing = await this.prisma.product.findFirst({
      where: { id, businessId },
    });
    if (!existing) throw new NotFoundException('Product not found');
    await this.prisma.product.delete({ where: { id } });
    this.aiContextCache.invalidate(businessId);
    return { success: true };
  }
}

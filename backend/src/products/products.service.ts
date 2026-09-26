import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BusinessAccessService } from '../common/business-access.service';
import { pageMeta, pageWindow } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import {
  asAttributes,
  mergeLegacyIntoAttributes,
  syncLegacyArrays,
} from './product-attributes';
import {
  asVariants,
  axisValuesByKind,
  hasVariantMatrix,
  rebuildVariantSkus,
  variantsFirstPrice,
  variantsTotalStock,
  type ProductVariants,
} from './product-variants';
import { resolveInStock } from './stock-mode';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: BusinessAccessService,
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
  ): ProductVariants {
    const parsed = asVariants(raw);
    if (!parsed.axes.length) return { axes: [], skus: [] };
    return rebuildVariantSkus({
      axes: parsed.axes,
      previousSkus: parsed.skus,
      defaultPriceEgp,
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
    let attributes = { ...input.attributes };
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

  async list(userId: string, page = 1, limit = 10) {
    const businessId = await this.access.requireBusinessId(userId);
    const window = pageWindow(page, limit);
    const where = { businessId };
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

  async create(userId: string, dto: CreateProductDto) {
    const businessId = await this.access.requireBusinessId(userId);
    const type = await this.businessType(businessId);
    const attributes = mergeLegacyIntoAttributes(
      asAttributes(dto.attributes),
      dto.sizes,
      dto.colors,
    );
    const variants = this.normalizeVariants(
      dto.variants,
      dto.priceEgp,
      dto.stockQuantity,
    );
    const derived = this.applyVariantDerived({
      type,
      attributes,
      variants,
      priceEgp: dto.priceEgp,
      stockQuantity: dto.stockQuantity,
      inStock: dto.inStock,
    });

    const product = await this.prisma.product.create({
      data: {
        businessId,
        name: dto.name.trim(),
        description: dto.description?.trim(),
        priceEgp: derived.priceEgp,
        costEgp: dto.costEgp ?? null,
        attributes: derived.attributes,
        variants: derived.variants as unknown as Prisma.InputJsonValue,
        sizes: derived.legacy.sizes,
        colors: derived.legacy.colors,
        stockQuantity: derived.stockQuantity,
        inStock: derived.inStock,
      },
    });
    return { product };
  }

  async update(userId: string, id: string, dto: UpdateProductDto) {
    const businessId = await this.access.requireBusinessId(userId);
    const type = await this.businessType(businessId);
    const existing = await this.prisma.product.findFirst({
      where: { id, businessId },
    });
    if (!existing) throw new NotFoundException('Product not found');

    const shouldTouchAttributes =
      dto.attributes !== undefined ||
      dto.sizes !== undefined ||
      dto.colors !== undefined;

    let attributes = asAttributes(existing.attributes);
    if (shouldTouchAttributes) {
      attributes = mergeLegacyIntoAttributes(
        dto.attributes !== undefined
          ? asAttributes(dto.attributes)
          : attributes,
        dto.sizes,
        dto.colors,
      );
    }

    const existingVariants = asVariants(existing.variants);
    const variants =
      dto.variants !== undefined
        ? this.normalizeVariants(
            dto.variants,
            dto.priceEgp ?? existing.priceEgp,
            dto.stockQuantity ?? existing.stockQuantity ?? 0,
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
      inStock:
        dto.inStock !== undefined ? dto.inStock : existing.inStock,
    });

    const product = await this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description.trim() }
          : {}),
        priceEgp: derived.priceEgp,
        ...(dto.costEgp !== undefined ? { costEgp: dto.costEgp } : {}),
        ...(shouldTouchAttributes || dto.variants !== undefined
          ? {
              attributes: derived.attributes,
              sizes: derived.legacy.sizes,
              colors: derived.legacy.colors,
            }
          : {}),
        ...(dto.variants !== undefined
          ? {
              variants: derived.variants as unknown as Prisma.InputJsonValue,
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
    return { product };
  }

  async remove(userId: string, id: string) {
    const businessId = await this.access.requireBusinessId(userId);
    const existing = await this.prisma.product.findFirst({
      where: { id, businessId },
    });
    if (!existing) throw new NotFoundException('Product not found');
    await this.prisma.product.delete({ where: { id } });
    return { success: true };
  }
}

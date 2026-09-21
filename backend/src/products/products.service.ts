import { Injectable, NotFoundException } from '@nestjs/common';
import { BusinessAccessService } from '../common/business-access.service';
import { pageMeta, pageWindow } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import {
  asAttributes,
  mergeLegacyIntoAttributes,
  syncLegacyArrays,
} from './product-attributes';
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
    const legacy = syncLegacyArrays(attributes);
    const stock = resolveInStock({
      type,
      stockQuantity: dto.stockQuantity,
      inStock: dto.inStock,
    });

    const product = await this.prisma.product.create({
      data: {
        businessId,
        name: dto.name.trim(),
        description: dto.description?.trim(),
        priceEgp: dto.priceEgp,
        attributes: attributes,
        sizes: legacy.sizes,
        colors: legacy.colors,
        stockQuantity: stock.stockQuantity,
        inStock: stock.inStock,
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
    const legacy = syncLegacyArrays(attributes);

    const shouldTouchStock =
      dto.stockQuantity !== undefined || dto.inStock !== undefined;
    const stock = shouldTouchStock
      ? resolveInStock({
          type,
          stockQuantity:
            dto.stockQuantity !== undefined
              ? dto.stockQuantity
              : existing.stockQuantity,
          inStock: dto.inStock !== undefined ? dto.inStock : existing.inStock,
        })
      : null;

    const product = await this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description.trim() }
          : {}),
        ...(dto.priceEgp !== undefined ? { priceEgp: dto.priceEgp } : {}),
        ...(shouldTouchAttributes
          ? {
              attributes: attributes,
              sizes: legacy.sizes,
              colors: legacy.colors,
            }
          : {}),
        ...(stock
          ? {
              stockQuantity: stock.stockQuantity,
              inStock: stock.inStock,
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

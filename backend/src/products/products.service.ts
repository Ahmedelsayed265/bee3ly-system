import { Injectable, NotFoundException } from '@nestjs/common';
import { BusinessAccessService } from '../common/business-access.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: BusinessAccessService,
  ) {}

  async list(userId: string) {
    const businessId = await this.access.requireBusinessId(userId);
    const products = await this.prisma.product.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
    });
    return { products };
  }

  async create(userId: string, dto: CreateProductDto) {
    const businessId = await this.access.requireBusinessId(userId);
    const product = await this.prisma.product.create({
      data: {
        businessId,
        name: dto.name.trim(),
        description: dto.description?.trim(),
        priceEgp: dto.priceEgp,
        sizes: dto.sizes ?? [],
        colors: dto.colors ?? [],
        inStock: dto.inStock ?? true,
      },
    });
    return { product };
  }

  async update(userId: string, id: string, dto: UpdateProductDto) {
    const businessId = await this.access.requireBusinessId(userId);
    const existing = await this.prisma.product.findFirst({
      where: { id, businessId },
    });
    if (!existing) throw new NotFoundException('Product not found');

    const product = await this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description.trim() }
          : {}),
        ...(dto.priceEgp !== undefined ? { priceEgp: dto.priceEgp } : {}),
        ...(dto.sizes !== undefined ? { sizes: dto.sizes } : {}),
        ...(dto.colors !== undefined ? { colors: dto.colors } : {}),
        ...(dto.inStock !== undefined ? { inStock: dto.inStock } : {}),
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

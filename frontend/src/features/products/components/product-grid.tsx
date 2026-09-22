import type { BusinessType, Product } from '@/features/business/api';
import { ProductCard } from '@/features/products/components/product-card';

type StockUpdate =
  { id: string; stockQuantity: number } | { id: string; inStock: boolean };

type ProductGridProps = {
  products: Product[];
  businessType: BusinessType;
  quantityMode: boolean;
  isUpdatingStock: boolean;
  onUpdateStock: (input: StockUpdate) => void;
  onDelete: (product: { id: string; name: string }) => void;
};

export function ProductGrid({
  products,
  businessType,
  quantityMode,
  isUpdatingStock,
  onUpdateStock,
  onDelete,
}: ProductGridProps) {
  return (
    <div className="grid w-full gap-3 md:grid-cols-2 xl:grid-cols-3">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          businessType={businessType}
          quantityMode={quantityMode}
          isUpdatingStock={isUpdatingStock}
          onUpdateStock={onUpdateStock}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

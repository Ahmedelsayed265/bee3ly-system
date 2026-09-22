import { Plus } from 'lucide-react';
import { PageLayout } from '@/components/layout/page-layout';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PaginationBar } from '@/components/ui/pagination-bar';
import { ProductEmptyState } from '@/features/products/components/product-empty-state';
import { ProductFormDialog } from '@/features/products/components/product-form-dialog';
import { ProductGrid } from '@/features/products/components/product-grid';
import { useProducts } from '@/features/products/hooks/use-products';
import { useLocale } from '@/features/i18n/locale-context';

export function ProductsPageView() {
  const { t } = useLocale();
  const products = useProducts();

  return (
    <PageLayout
      title={t('navProducts')}
      description={t('productsIntro')}
      actions={
        <Button onClick={() => products.setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          {t('addProduct')}
        </Button>
      }
    >
      <ProductFormDialog
        open={products.open}
        onOpenChange={products.setDialogOpen}
        quantityMode={products.quantityMode}
        template={products.template}
        formHint={products.formHint}
        name={products.name}
        onNameChange={products.setName}
        priceEgp={products.priceEgp}
        onPriceChange={products.setPriceEgp}
        description={products.description}
        onDescriptionChange={products.setDescription}
        stockQuantity={products.stockQuantity}
        onStockQuantityChange={products.setStockQuantity}
        listingAvailable={products.listingAvailable}
        onListingAvailableChange={products.setListingAvailable}
        templateValues={products.templateValues}
        onTemplateValuesChange={products.setTemplateValues}
        customRows={products.customRows}
        onCustomRowsChange={products.setCustomRows}
        isPending={products.isCreating}
        onSubmit={products.submit}
      />

      {products.total === 0 && !products.isLoading ? (
        <ProductEmptyState onAdd={() => products.setDialogOpen(true)} />
      ) : (
        <ProductGrid
          products={products.products}
          businessType={products.businessType}
          quantityMode={products.quantityMode}
          isUpdatingStock={products.isUpdatingStock}
          onUpdateStock={products.updateStock}
          onDelete={products.setPendingDelete}
        />
      )}
      <PaginationBar
        page={products.page}
        totalPages={products.totalPages}
        fetching={products.isFetching}
        previousLabel={t('previous')}
        nextLabel={t('next')}
        pageLabel={t('pageOf', {
          page: String(products.page),
          total: String(products.totalPages),
        })}
        onPage={products.setPage}
      />
      <ConfirmDialog
        open={Boolean(products.pendingDelete)}
        title={t('confirmDeleteTitle')}
        description={t('confirmDeleteBody', {
          name: products.pendingDelete?.name ?? '',
        })}
        confirmLabel={t('delete')}
        cancelLabel={t('cancel')}
        pending={products.isDeleting}
        onOpenChange={(open) => {
          if (!open) products.setPendingDelete(null);
        }}
        onConfirm={() => {
          if (products.pendingDelete)
            products.deleteProduct(products.pendingDelete.id);
        }}
      />
    </PageLayout>
  );
}

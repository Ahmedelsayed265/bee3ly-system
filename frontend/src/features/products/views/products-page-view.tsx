import { Plus, Tags } from 'lucide-react';
import { PageLayout } from '@/components/layout/page-layout';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PaginationBar } from '@/components/ui/pagination-bar';
import { ProductEmptyState } from '@/features/products/components/product-empty-state';
import { ProductFormDialog } from '@/features/products/components/product-form-dialog';
import { ProductsTable } from '@/features/products/components/products-table';
import { VariantDictionaryDialog } from '@/features/products/components/variant-dictionary-dialog';
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
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => products.setDictOpen(true)}>
            <Tags className="h-4 w-4" />
            {t('variantDictManage')}
          </Button>
          <Button onClick={products.openCreate}>
            <Plus className="h-4 w-4" />
            {t('addProduct')}
          </Button>
        </div>
      }
    >
      <VariantDictionaryDialog
        open={products.dictOpen}
        onOpenChange={products.setDictOpen}
        businessType={products.businessType}
        initial={products.dictionary}
        products={products.products}
        onSaved={products.onDictionarySaved}
      />

      <ProductFormDialog
        open={products.open}
        onOpenChange={products.setDialogOpen}
        mode={products.mode}
        quantityMode={products.quantityMode}
        variantsEnabled={products.variantsEnabled}
        onVariantsEnabledChange={products.setVariantsEnabled}
        dictionary={products.dictionary}
        onOpenDictionary={() => products.setDictOpen(true)}
        productSku={products.productSku}
        name={products.name}
        onNameChange={products.setName}
        priceEgp={products.priceEgp}
        onPriceChange={products.setPriceEgp}
        costEgp={products.costEgp}
        onCostChange={products.setCostEgp}
        description={products.description}
        onDescriptionChange={products.setDescription}
        stockQuantity={products.stockQuantity}
        onStockQuantityChange={products.setStockQuantity}
        listingAvailable={products.listingAvailable}
        onListingAvailableChange={products.setListingAvailable}
        variantAxes={products.variantAxes}
        onVariantAxesChange={products.setVariantAxes}
        variantSkus={products.variantSkus}
        onSkuChange={products.onSkuChange}
        onApplyDefaults={products.applyBasePriceToSkus}
        isPending={products.isSaving}
        onSubmit={products.submit}
      />

      {products.total === 0 && !products.isLoading ? (
        <ProductEmptyState onAdd={products.openCreate} />
      ) : (
        <ProductsTable
          products={products.products}
          businessType={products.businessType}
          quantityMode={products.quantityMode}
          onEdit={products.openEdit}
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

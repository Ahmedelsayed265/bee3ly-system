import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/auth-context';
import {
  createProduct,
  deleteProduct,
  fetchProducts,
  updateProduct,
  type BusinessType,
  type Product,
  type VariantDictionaryOption,
} from '@/features/business/api';
import { useLocale } from '@/features/i18n/locale-context';
import { usesQuantityStock } from '@/features/products/attribute-templates';
import type { VariantAxisDraft } from '@/features/products/components/product-variants-editor';
import {
  asVariants,
  hasVariantMatrix,
  rebuildVariantSkus,
  type ProductVariantSku,
  type ProductVariants,
} from '@/features/products/product-variants';
import { asVariantDictionary } from '@/features/products/variant-dictionary';

const PAGE_SIZE = 10;

function generateProductSku(): string {
  const part = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `PRD-${part}`;
}

function readExistingSku(product: Product): string | null {
  const raw = product.attributes?.sku;
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  return null;
}

function axesFromProduct(
  product: Product,
  dictionary: VariantDictionaryOption[],
): VariantAxisDraft[] {
  const existing = asVariants(product.variants);
  if (hasVariantMatrix(existing)) {
    return existing.axes.map((axis) => {
      const match =
        dictionary.find((d) => d.name === axis.name) ??
        dictionary.find((d) => axis.values.every((v) => d.values.includes(v)));
      return {
        dictionaryId: match?.id ?? `legacy_${axis.name}`,
        name: axis.name,
        selectedValues: axis.values,
      };
    });
  }

  const attrs = product.attributes ?? {};
  const drafts: VariantAxisDraft[] = [];
  const pushIf = (names: string[], values: string[]) => {
    if (!values.length) return;
    const match = dictionary.find((d) =>
      names.some((n) => d.name.toLowerCase() === n.toLowerCase()),
    );
    drafts.push({
      dictionaryId: match?.id ?? `legacy_${names[0]}`,
      name: match?.name ?? names[0]!,
      selectedValues: values,
    });
  };

  const sizes = product.sizes?.length
    ? product.sizes
    : Array.isArray(attrs.sizes)
      ? attrs.sizes.map(String)
      : [];
  const colors = product.colors?.length
    ? product.colors
    : Array.isArray(attrs.colors)
      ? attrs.colors.map(String)
      : [];
  const flavors = Array.isArray(attrs.flavors) ? attrs.flavors.map(String) : [];

  pushIf(['مقاس', 'Size', 'sizes'], sizes);
  pushIf(['لون', 'Color', 'colors'], colors);
  pushIf(['نكهة', 'Flavor', 'flavors'], flavors);
  return drafts;
}

export function useProducts() {
  const { t } = useLocale();
  const { business, refreshMe } = useAuth();
  const qc = useQueryClient();
  const businessType = (business?.type ?? 'OTHER') as BusinessType;
  const quantityMode = usesQuantityStock(businessType);
  const [dictionary, setDictionary] = useState<VariantDictionaryOption[]>(() =>
    asVariantDictionary(business?.variantDictionary),
  );

  useEffect(() => {
    setDictionary(asVariantDictionary(business?.variantDictionary));
  }, [business?.variantDictionary]);

  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [dictOpen, setDictOpen] = useState(false);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [productSku, setProductSku] = useState(() => generateProductSku());
  const [preservedAttributes, setPreservedAttributes] = useState<
    Record<string, string | number | boolean | string[]>
  >({});
  const [name, setName] = useState('');
  const [priceEgp, setPriceEgp] = useState('');
  const [costEgp, setCostEgp] = useState('');
  const [description, setDescription] = useState('');
  const [stockQuantity, setStockQuantity] = useState('10');
  const [listingAvailable, setListingAvailable] = useState(true);
  const [variantsEnabled, setVariantsEnabled] = useState(false);
  const [variantAxes, setVariantAxes] = useState<VariantAxisDraft[]>([]);
  const [variantSkus, setVariantSkus] = useState<ProductVariantSku[]>([]);

  const productsQuery = useQuery({
    queryKey: ['products', page, PAGE_SIZE],
    queryFn: () => fetchProducts(page, PAGE_SIZE),
    placeholderData: keepPreviousData,
  });
  const products = productsQuery.data?.products ?? [];
  const total = productsQuery.data?.total ?? 0;
  const totalPages = productsQuery.data?.totalPages ?? 1;

  useEffect(() => {
    if (productsQuery.isSuccess && page > totalPages) {
      setPage(totalPages);
    }
  }, [productsQuery.isSuccess, page, totalPages]);

  useEffect(() => {
    if (!variantsEnabled) {
      setVariantSkus([]);
      return;
    }
    setVariantSkus((prev) => {
      const next = rebuildVariantSkus({
        axes: variantAxes.map((axis) => ({
          name: axis.name,
          valuesInput: axis.selectedValues.join(', '),
        })),
        previousSkus: prev,
        defaultPriceEgp: Number(priceEgp) || 0,
        defaultStockQuantity: Number(stockQuantity) || 0,
      });
      const prevKeys = prev.map((s) => s.key).join('\0');
      const nextKeys = next.skus.map((s) => s.key).join('\0');
      if (prevKeys === nextKeys) return prev;
      return next.skus;
    });
  }, [variantAxes, priceEgp, stockQuantity, variantsEnabled]);

  const hasVariants = variantsEnabled && variantSkus.length > 0;

  const resetForm = () => {
    setEditingId(null);
    setProductSku(generateProductSku());
    setPreservedAttributes({});
    setName('');
    setPriceEgp('');
    setCostEgp('');
    setDescription('');
    setStockQuantity('10');
    setListingAvailable(true);
    setVariantsEnabled(false);
    setVariantAxes([]);
    setVariantSkus([]);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (product: Product) => {
    const existing = asVariants(product.variants);
    const axes = axesFromProduct(product, dictionary);
    const attrs = { ...(product.attributes ?? {}) };
    delete attrs.sizes;
    delete attrs.colors;
    delete attrs.flavors;
    const sku = readExistingSku(product) ?? generateProductSku();
    setEditingId(product.id);
    setProductSku(sku);
    setPreservedAttributes(attrs);
    setName(product.name);
    setPriceEgp(String(product.priceEgp));
    setCostEgp(product.costEgp == null ? '' : String(product.costEgp));
    setDescription(product.description ?? '');
    setStockQuantity(String(product.stockQuantity ?? 0));
    setListingAvailable(product.inStock);
    setVariantsEnabled(hasVariantMatrix(existing) || axes.length > 0);
    setVariantAxes(axes);
    setVariantSkus(existing.skus);
    setOpen(true);
  };

  const createMut = useMutation({
    mutationFn: createProduct,
    onSuccess: async () => {
      resetForm();
      setOpen(false);
      toast.success(t('profileSaved'));
      await qc.invalidateQueries({ queryKey: ['products'] });
    },
    onError: () => toast.error(t('saveFailed')),
  });

  const updateMut = useMutation({
    mutationFn: ({
      id,
      ...input
    }: {
      id: string;
      name: string;
      priceEgp: number;
      costEgp: number | null;
      description?: string;
      attributes: Record<string, string | number | boolean | string[]>;
      variants: ProductVariants;
      stockQuantity?: number;
      inStock?: boolean;
    }) => updateProduct(id, input),
    onSuccess: async () => {
      resetForm();
      setOpen(false);
      toast.success(t('profileSaved'));
      await qc.invalidateQueries({ queryKey: ['products'] });
    },
    onError: () => toast.error(t('saveFailed')),
  });

  const deleteMut = useMutation({
    mutationFn: deleteProduct,
    onSuccess: async () => {
      setPendingDelete(null);
      await qc.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const onSkuChange = (key: string, patch: Partial<ProductVariantSku>) => {
    setVariantSkus((prev) =>
      prev.map((sku) => (sku.key === key ? { ...sku, ...patch } : sku)),
    );
  };

  const applyBasePriceToSkus = () => {
    const price = Math.max(0, Math.floor(Number(priceEgp) || 0));
    setVariantSkus((prev) => prev.map((sku) => ({ ...sku, priceEgp: price })));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !priceEgp) return;
    const attributes = {
      ...preservedAttributes,
      sku: productSku,
    };
    const variants = variantsEnabled
      ? rebuildVariantSkus({
          axes: variantAxes.map((axis) => ({
            name: axis.name,
            valuesInput: axis.selectedValues.join(', '),
          })),
          previousSkus: variantSkus,
          defaultPriceEgp: Number(priceEgp) || 0,
          defaultStockQuantity: Number(stockQuantity) || 0,
        })
      : { axes: [], skus: [] };
    const payload = {
      name: name.trim(),
      priceEgp: Number(priceEgp),
      costEgp:
        costEgp === '' ? null : Math.max(0, Math.floor(Number(costEgp) || 0)),
      description: description.trim() || undefined,
      attributes,
      variants,
      ...(quantityMode
        ? {
            stockQuantity: hasVariantMatrix(variants)
              ? variants.skus.reduce((s, sku) => s + sku.stockQuantity, 0)
              : Math.max(0, Number(stockQuantity) || 0),
          }
        : { inStock: listingAvailable }),
    };
    if (editingId) {
      updateMut.mutate({ id: editingId, ...payload });
      return;
    }
    createMut.mutate(payload);
  };

  const setDialogOpen = (next: boolean) => {
    setOpen(next);
    if (!next) resetForm();
  };

  const onDictionarySaved = async (next: VariantDictionaryOption[]) => {
    setDictionary(next);
    await refreshMe();
  };

  return {
    businessType,
    quantityMode,
    dictionary,
    dictOpen,
    setDictOpen,
    onDictionarySaved,
    page,
    setPage,
    totalPages,
    products,
    total,
    isLoading: productsQuery.isLoading,
    isFetching: productsQuery.isFetching,
    pendingDelete,
    setPendingDelete,
    open,
    mode: (editingId ? 'edit' : 'create') as 'create' | 'edit',
    openCreate,
    openEdit,
    setDialogOpen,
    productSku,
    name,
    setName,
    priceEgp,
    setPriceEgp,
    costEgp,
    setCostEgp,
    description,
    setDescription,
    stockQuantity,
    setStockQuantity,
    listingAvailable,
    setListingAvailable,
    variantsEnabled,
    setVariantsEnabled,
    variantAxes,
    setVariantAxes,
    variantSkus,
    onSkuChange,
    applyBasePriceToSkus,
    hasVariants,
    submit,
    isSaving: createMut.isPending || updateMut.isPending,
    isDeleting: deleteMut.isPending,
    deleteProduct: deleteMut.mutate,
  };
}

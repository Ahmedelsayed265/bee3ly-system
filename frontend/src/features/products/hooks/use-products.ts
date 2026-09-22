import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/auth-context';
import {
  createProduct,
  deleteProduct,
  fetchProducts,
  updateProduct,
  type BusinessType,
} from '@/features/business/api';
import { useLocale } from '@/features/i18n/locale-context';
import {
  ATTRIBUTE_TEMPLATES,
  buildAttributesFromForm,
  usesQuantityStock,
} from '@/features/products/attribute-templates';

const PAGE_SIZE = 9;

export function useProducts() {
  const { t } = useLocale();
  const { business } = useAuth();
  const qc = useQueryClient();
  const businessType = (business?.type ?? 'OTHER') as BusinessType;
  const template =
    ATTRIBUTE_TEMPLATES[businessType] ?? ATTRIBUTE_TEMPLATES.OTHER;
  const quantityMode = usesQuantityStock(businessType);

  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [priceEgp, setPriceEgp] = useState('');
  const [description, setDescription] = useState('');
  const [stockQuantity, setStockQuantity] = useState('10');
  const [listingAvailable, setListingAvailable] = useState(true);
  const [templateValues, setTemplateValues] = useState<Record<string, string>>(
    {},
  );
  const [customRows, setCustomRows] = useState<
    Array<{ key: string; value: string }>
  >([]);

  const productsQuery = useQuery({
    queryKey: ['products', page, PAGE_SIZE],
    queryFn: () => fetchProducts(page, PAGE_SIZE),
  });
  const products = productsQuery.data?.products ?? [];
  const total = productsQuery.data?.total ?? 0;
  const totalPages = productsQuery.data?.totalPages ?? 1;

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const resetForm = () => {
    setName('');
    setPriceEgp('');
    setDescription('');
    setStockQuantity('10');
    setListingAvailable(true);
    setTemplateValues({});
    setCustomRows([]);
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

  const deleteMut = useMutation({
    mutationFn: deleteProduct,
    onSuccess: async () => {
      setPendingDelete(null);
      await qc.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const updateStockMut = useMutation({
    mutationFn: (
      input:
        | { id: string; stockQuantity: number }
        | { id: string; inStock: boolean },
    ) => {
      const { id, ...patch } = input;
      return updateProduct(id, patch);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !priceEgp) return;
    const attributes = buildAttributesFromForm({
      template,
      templateValues,
      customRows,
    });
    createMut.mutate({
      name: name.trim(),
      priceEgp: Number(priceEgp),
      description: description.trim() || undefined,
      attributes,
      ...(quantityMode
        ? { stockQuantity: Math.max(0, Number(stockQuantity) || 0) }
        : { inStock: listingAvailable }),
    });
  };

  const setDialogOpen = (next: boolean) => {
    setOpen(next);
    if (!next) resetForm();
  };

  return {
    businessType,
    template,
    quantityMode,
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
    setDialogOpen,
    name,
    setName,
    priceEgp,
    setPriceEgp,
    description,
    setDescription,
    stockQuantity,
    setStockQuantity,
    listingAvailable,
    setListingAvailable,
    templateValues,
    setTemplateValues,
    customRows,
    setCustomRows,
    formHint: t('productDetailsHint'),
    submit,
    isCreating: createMut.isPending,
    isDeleting: deleteMut.isPending,
    isUpdatingStock: updateStockMut.isPending,
    updateStock: updateStockMut.mutate,
    deleteProduct: deleteMut.mutate,
  };
}

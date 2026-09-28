import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  fetchOrders,
  fetchProducts,
  updateOrderStatus,
  type OrderRow,
} from '@/features/business/api';
import { useLocale } from '@/features/i18n/locale-context';
import {
  EMPTY_ORDER_COUNTS,
  type OrderStatusAction,
  type OrderStatusFilter,
} from '@/features/orders/constants';

const PAGE_SIZE = 10;

export function canConfirm(status: string) {
  return status === 'PENDING';
}

export function canComplete(status: string) {
  return status === 'CONFIRMED';
}

export function canCancel(status: string) {
  return status === 'PENDING' || status === 'CONFIRMED';
}

export function canReturn(status: string) {
  return status === 'CONFIRMED' || status === 'COMPLETED';
}

export function useOrders() {
  const { locale } = useLocale();
  const qc = useQueryClient();
  const [params] = useSearchParams();
  const campaignId = params.get('campaignId') ?? '';
  const [page, setPage] = useState(1);
  const [status, setStatusState] = useState<OrderStatusFilter | ''>('');
  const [productId, setProductIdState] = useState('');
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [viewing, setViewing] = useState<OrderRow | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    order: OrderRow;
    status: OrderStatusAction;
  } | null>(null);
  const skipSearchReset = useRef(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setPage(1);
  }, [campaignId]);

  useEffect(() => {
    if (skipSearchReset.current) {
      skipSearchReset.current = false;
      return;
    }
    setPage(1);
  }, [search, status, productId]);

  const productOptionsQuery = useQuery({
    queryKey: ['products', 'order-filter', 200],
    queryFn: () => fetchProducts(1, 200),
    staleTime: 60_000,
  });

  const ordersQuery = useQuery({
    queryKey: [
      'orders',
      page,
      PAGE_SIZE,
      campaignId,
      status,
      search,
      productId,
    ],
    queryFn: () =>
      fetchOrders({
        page,
        limit: PAGE_SIZE,
        campaignId: campaignId || undefined,
        status: status || undefined,
        q: search || undefined,
        productId: productId || undefined,
      }),
    placeholderData: keepPreviousData,
  });

  const orders = ordersQuery.data?.orders ?? [];
  const counts = ordersQuery.data?.counts ?? EMPTY_ORDER_COUNTS;
  const total = ordersQuery.data?.total ?? 0;
  const totalPages = ordersQuery.data?.totalPages ?? 1;
  const productOptions = productOptionsQuery.data?.products ?? [];

  useEffect(() => {
    if (ordersQuery.isSuccess && page > totalPages) {
      setPage(totalPages);
    }
  }, [ordersQuery.isSuccess, page, totalPages]);

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateOrderStatus(id, status),
    onSuccess: async () => {
      setPendingAction(null);
      await qc.invalidateQueries({ queryKey: ['orders'] });
      await qc.invalidateQueries({ queryKey: ['overview'] });
      await qc.invalidateQueries({ queryKey: ['campaigns'] });
      await qc.invalidateQueries({ queryKey: ['campaign'] });
      await qc.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const money = (value: number) =>
    `${value.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US')} ج.م`;

  const ask = (order: OrderRow, next: OrderStatusAction) => {
    setViewing(null);
    setPendingAction({ order, status: next });
  };

  const hasFilters = Boolean(status || productId || search);

  return {
    locale,
    page,
    setPage,
    orders,
    counts,
    total,
    totalPages,
    isLoading: ordersQuery.isLoading,
    isFetching: ordersQuery.isFetching,
    viewing,
    setViewing,
    pendingAction,
    setPendingAction,
    isStatusPending: statusMut.isPending,
    updateStatus: statusMut.mutate,
    money,
    ask,
    status,
    setStatus: (next: OrderStatusFilter | '') => {
      setStatusState(next);
      setPage(1);
    },
    productId,
    setProductId: (next: string) => {
      setProductIdState(next);
      setPage(1);
    },
    query,
    setQuery,
    productOptions,
    hasFilters,
    clearFilters: () => {
      setStatusState('');
      setProductIdState('');
      setQuery('');
      setSearch('');
      setPage(1);
    },
  };
}

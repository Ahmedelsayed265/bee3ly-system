import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  fetchOrders,
  updateOrderGovernorate,
  updateOrderStatus,
  type OrderRow,
} from '@/features/business/api';
import { useLocale } from '@/features/i18n/locale-context';

const PAGE_SIZE = 10;

export function canConfirm(status: string) {
  return status === 'PENDING';
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
  const [viewing, setViewing] = useState<OrderRow | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    order: OrderRow;
    status: 'CONFIRMED' | 'CANCELLED' | 'RETURNED';
  } | null>(null);

  const ordersQuery = useQuery({
    queryKey: ['orders', page, PAGE_SIZE, campaignId],
    queryFn: () => fetchOrders(page, PAGE_SIZE, campaignId || undefined),
    placeholderData: keepPreviousData,
  });

  const orders = ordersQuery.data?.orders ?? [];
  const total = ordersQuery.data?.total ?? 0;
  const totalPages = ordersQuery.data?.totalPages ?? 1;

  useEffect(() => {
    setPage(1);
  }, [campaignId]);

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

  const placeMut = useMutation({
    mutationFn: ({ id, governorate }: { id: string; governorate: string }) =>
      updateOrderGovernorate(id, governorate),
    onSuccess: async (order) => {
      setViewing(order);
      await qc.invalidateQueries({ queryKey: ['orders'] });
      await qc.invalidateQueries({ queryKey: ['overview'] });
      await qc.invalidateQueries({ queryKey: ['campaigns'] });
      await qc.invalidateQueries({ queryKey: ['campaign'] });
    },
  });

  const money = (value: number) =>
    `${value.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US')} ج.م`;

  const ask = (
    order: OrderRow,
    status: 'CONFIRMED' | 'CANCELLED' | 'RETURNED',
  ) => {
    setViewing(null);
    setPendingAction({ order, status });
  };

  return {
    locale,
    page,
    setPage,
    orders,
    total,
    totalPages,
    isLoading: ordersQuery.isLoading,
    isFetching: ordersQuery.isFetching,
    viewing,
    setViewing,
    pendingAction,
    setPendingAction,
    isStatusPending: statusMut.isPending,
    isPlacing: placeMut.isPending,
    updateStatus: statusMut.mutate,
    setGovernorate: (order: OrderRow, governorate: string) =>
      placeMut.mutate({ id: order.id, governorate }),
    money,
    ask,
  };
}

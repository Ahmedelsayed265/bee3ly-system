import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  fetchOrders,
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

export function useOrders() {
  const { locale } = useLocale();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<OrderRow | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    order: OrderRow;
    status: 'CONFIRMED' | 'CANCELLED';
  } | null>(null);

  const ordersQuery = useQuery({
    queryKey: ['orders', page, PAGE_SIZE],
    queryFn: () => fetchOrders(page, PAGE_SIZE),
  });

  const orders = ordersQuery.data?.orders ?? [];
  const total = ordersQuery.data?.total ?? 0;
  const totalPages = ordersQuery.data?.totalPages ?? 1;

  if (page > totalPages) {
    setPage(totalPages);
  }

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateOrderStatus(id, status),
    onSuccess: async () => {
      setPendingAction(null);
      await qc.invalidateQueries({ queryKey: ['orders'] });
      await qc.invalidateQueries({ queryKey: ['overview'] });
    },
  });

  const money = (value: number) =>
    `${value.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US')} ج.م`;

  const ask = (order: OrderRow, status: 'CONFIRMED' | 'CANCELLED') => {
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
    updateStatus: statusMut.mutate,
    money,
    ask,
  };
}

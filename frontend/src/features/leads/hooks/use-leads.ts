import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { fetchLeads, updateLeadStatus } from '@/features/business/api';
import {
  LEADS_PAGE_SIZE,
  type LeadStatus,
  type PendingLeadStatus,
} from '@/features/leads/constants';

export function useLeads() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [pendingStatus, setPendingStatus] = useState<PendingLeadStatus | null>(
    null,
  );

  const leadsQuery = useQuery({
    queryKey: ['leads', page, LEADS_PAGE_SIZE],
    queryFn: () => fetchLeads(page, LEADS_PAGE_SIZE),
    placeholderData: keepPreviousData,
  });
  const leads = leadsQuery.data?.leads ?? [];
  const total = leadsQuery.data?.total ?? 0;
  const totalPages = leadsQuery.data?.totalPages ?? 1;

  useEffect(() => {
    if (leadsQuery.isSuccess && page > totalPages) {
      setPage(totalPages);
    }
  }, [leadsQuery.isSuccess, page, totalPages]);

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateLeadStatus(id, status),
    onSuccess: async () => {
      setPendingStatus(null);
      await qc.invalidateQueries({ queryKey: ['leads'] });
      await qc.invalidateQueries({ queryKey: ['overview'] });
    },
  });

  return {
    leads,
    total,
    page,
    setPage,
    totalPages,
    isLoading: leadsQuery.isLoading,
    isFetching: leadsQuery.isFetching,
    isStatusPending: statusMut.isPending,
    pendingStatus,
    requestStatusChange: (pending: PendingLeadStatus) =>
      setPendingStatus(pending),
    clearPendingStatus: () => setPendingStatus(null),
    confirmStatusChange: () => {
      if (!pendingStatus) return;
      statusMut.mutate({
        id: pendingStatus.id,
        status: pendingStatus.status,
      });
    },
  };
}

export type { LeadStatus };

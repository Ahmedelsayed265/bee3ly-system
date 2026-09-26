import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  deleteLeads,
  fetchLeads,
  updateLeadStatus,
  updateLeadsStatus,
} from '@/features/business/api';
import {
  EMPTY_LEAD_COUNTS,
  LEADS_PAGE_SIZE,
  type LeadStatus,
  type PendingLeadStatus,
} from '@/features/leads/constants';

export function useLeads() {
  const qc = useQueryClient();
  const [params] = useSearchParams();
  const campaignId = params.get('campaignId') ?? '';
  const [page, setPage] = useState(1);
  const [status, setStatusState] = useState<LeadStatus | ''>('');
  const [intent, setIntentState] = useState('');
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [pendingStatus, setPendingStatus] = useState<PendingLeadStatus | null>(
    null,
  );
  const [pendingBulk, setPendingBulk] = useState<{
    ids: string[];
    status: LeadStatus;
  } | null>(null);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(
    null,
  );
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
    setSelected([]);
  }, [search]);

  const leadsQuery = useQuery({
    queryKey: [
      'leads',
      page,
      LEADS_PAGE_SIZE,
      status,
      intent,
      search,
      campaignId,
    ],
    queryFn: () =>
      fetchLeads({
        page,
        limit: LEADS_PAGE_SIZE,
        status: status || undefined,
        intent: intent || undefined,
        q: search || undefined,
        campaignId: campaignId || undefined,
      }),
    placeholderData: keepPreviousData,
  });
  const leads = leadsQuery.data?.leads ?? [];
  const counts = leadsQuery.data?.counts ?? EMPTY_LEAD_COUNTS;
  const intents = leadsQuery.data?.intents ?? [];
  const total = leadsQuery.data?.total ?? 0;
  const totalPages = leadsQuery.data?.totalPages ?? 1;

  useEffect(() => {
    if (leadsQuery.isSuccess && page > totalPages) {
      setPage(totalPages);
    }
  }, [leadsQuery.isSuccess, page, totalPages]);

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ['leads'] });
    await qc.invalidateQueries({ queryKey: ['overview'] });
  };

  const statusMut = useMutation({
    mutationFn: ({ id, status: next }: { id: string; status: string }) =>
      updateLeadStatus(id, next),
    onSuccess: async () => {
      setPendingStatus(null);
      await refresh();
    },
  });

  const bulkMut = useMutation({
    mutationFn: ({ ids, status: next }: { ids: string[]; status: string }) =>
      updateLeadsStatus(ids, next),
    onSuccess: async () => {
      setPendingBulk(null);
      setSelected([]);
      await refresh();
    },
  });

  const deleteMut = useMutation({
    mutationFn: (ids: string[]) => deleteLeads(ids),
    onSuccess: async () => {
      setPendingDeleteIds(null);
      setSelected([]);
      await refresh();
    },
  });

  const resetPage = () => {
    setPage(1);
    setSelected([]);
  };

  return {
    leads,
    counts,
    intents,
    total,
    page,
    setPage,
    totalPages,
    status,
    setStatus: (next: LeadStatus | '') => {
      if (next === status) return;
      setStatusState(next);
      resetPage();
    },
    intent,
    setIntent: (next: string) => {
      if (next === intent) return;
      setIntentState(next);
      resetPage();
    },
    hasFilters: Boolean(
      status || intent || query.trim() || search || campaignId,
    ),
    query,
    setQuery,
    clearFilters: () => {
      setStatusState('');
      setIntentState('');
      setQuery('');
      setSearch('');
      resetPage();
    },
    selected,
    toggleSelected: (id: string, on: boolean) => {
      setSelected((current) =>
        on
          ? current.includes(id)
            ? current
            : [...current, id]
          : current.filter((item) => item !== id),
      );
    },
    togglePage: (ids: string[], on: boolean) => {
      setSelected((current) => {
        if (on) return [...new Set([...current, ...ids])];
        const drop = new Set(ids);
        return current.filter((id) => !drop.has(id));
      });
    },
    clearSelected: () => setSelected([]),
    isLoading: leadsQuery.isLoading,
    isFetching: leadsQuery.isFetching,
    isBusy: statusMut.isPending || bulkMut.isPending || deleteMut.isPending,
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
    pendingBulk,
    requestBulkStatus: (next: LeadStatus) => {
      if (selected.length === 0) return;
      setPendingBulk({ ids: selected, status: next });
    },
    clearPendingBulk: () => setPendingBulk(null),
    confirmBulkStatus: () => {
      if (!pendingBulk) return;
      bulkMut.mutate(pendingBulk);
    },
    pendingDeleteCount: pendingDeleteIds?.length ?? 0,
    requestDelete: () => {
      if (selected.length === 0) return;
      setPendingDeleteIds(selected);
    },
    clearPendingDelete: () => setPendingDeleteIds(null),
    confirmDelete: () => {
      if (!pendingDeleteIds?.length) return;
      deleteMut.mutate(pendingDeleteIds);
    },
  };
}

export type { LeadStatus };

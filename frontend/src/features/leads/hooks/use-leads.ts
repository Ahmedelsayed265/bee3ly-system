import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect, useState } from 'react';
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
import { adjustPageToTotal, useScopedListPage } from '@/lib/list-pagination';

export function useLeads() {
  const qc = useQueryClient();
  const [params] = useSearchParams();
  const campaignId = params.get('campaignId') ?? '';
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
  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const listScope = `${campaignId}\0${status}\0${intent}\0${search}`;
  const [page, setPage] = useScopedListPage(listScope);
  const [selectionScope, setSelectionScope] = useState(listScope);
  if (listScope !== selectionScope) {
    setSelectionScope(listScope);
    setSelected([]);
  }

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

  adjustPageToTotal(page, setPage, totalPages, leadsQuery.isSuccess);

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
    },
    intent,
    setIntent: (next: string) => {
      if (next === intent) return;
      setIntentState(next);
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

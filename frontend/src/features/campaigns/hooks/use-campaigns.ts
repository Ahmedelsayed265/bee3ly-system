import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  createCampaign,
  fetchCampaigns,
  launchCampaign,
  type Campaign,
} from '@/features/business/api';
import type { CampaignObjective } from '@/features/campaigns/constants';

const PAGE_SIZE = 10;

export function useCampaigns() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const listQuery = useQuery({
    queryKey: ['campaigns', page, PAGE_SIZE],
    queryFn: () => fetchCampaigns(page, PAGE_SIZE),
  });
  const campaigns = listQuery.data?.campaigns ?? [];
  const total = listQuery.data?.total ?? 0;
  const totalPages = listQuery.data?.totalPages ?? 1;
  const [step, setStep] = useState(0);
  const [offer, setOffer] = useState('');
  const [objective, setObjective] = useState<CampaignObjective>('MORE_ORDERS');
  const [audience, setAudience] = useState('');
  const [budget, setBudget] = useState('500');
  const [valueProp, setValueProp] = useState('');
  const [created, setCreated] = useState<Campaign | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingLaunch, setPendingLaunch] = useState<{
    id: string;
    status: 'ASSISTED_LAUNCH' | 'SIMULATED';
  } | null>(null);

  if (page > totalPages) {
    setPage(totalPages);
  }

  const createMut = useMutation({
    mutationFn: createCampaign,
    onSuccess: async (data) => {
      setCreated(data.campaign);
      setStep(5);
      await qc.invalidateQueries({ queryKey: ['campaigns'] });
      await qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const launchMut = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: 'ASSISTED_LAUNCH' | 'SIMULATED';
    }) => launchCampaign(id, status),
    onSuccess: async (data) => {
      setPendingLaunch(null);
      setNotice(data.notice);
      setCreated(data.campaign);
      await qc.invalidateQueries({ queryKey: ['campaigns'] });
      await qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const resetWizard = () => {
    setStep(0);
    setOffer('');
    setAudience('');
    setBudget('500');
    setValueProp('');
    setCreated(null);
    setNotice(null);
  };

  const generate = () =>
    createMut.mutate({
      offer: offer.trim(),
      objective,
      audienceDescription: audience.trim(),
      budget: Number(budget),
      valueProposition: valueProp.trim() || undefined,
    });

  return {
    page,
    setPage,
    campaigns,
    total,
    totalPages,
    isFetching: listQuery.isFetching,
    step,
    setStep,
    offer,
    setOffer,
    objective,
    setObjective,
    audience,
    setAudience,
    budget,
    setBudget,
    valueProp,
    setValueProp,
    created,
    notice,
    pendingLaunch,
    setPendingLaunch,
    isCreating: createMut.isPending,
    isLaunching: launchMut.isPending,
    launch: launchMut.mutate,
    generate,
    resetWizard,
  };
}

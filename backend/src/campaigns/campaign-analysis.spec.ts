import { analyzeCampaignMetrics } from './campaign-analysis';

describe('analyzeCampaignMetrics', () => {
  const base = {
    locale: 'ar' as const,
    name: 'Test',
    objective: 'MORE_ORDERS' as const,
    status: 'SIMULATED' as const,
    budget: 1000,
    conversations: 10,
    leads: 5,
    orders: 2,
    revenueEgp: 5000,
    costOfGoodsEgp: 1500,
    shippingEgp: 200,
    returnShippingEgp: 0,
    spendEgp: null as number | null,
  };

  it('asks to launch when campaign is READY', () => {
    const r = analyzeCampaignMetrics({ ...base, status: 'READY', orders: 0 });
    expect(r.verdict).toBe('NEEDS_DATA');
    expect(r.actions.some((a) => a.id === 'launch_or_simulate')).toBe(true);
  });

  it('recommends scale on strong ROAS', () => {
    const r = analyzeCampaignMetrics(base);
    expect(r.verdict).toBe('SCALE');
    expect(r.figures.roas).toBe(5);
  });

  it('recommends pause when ROAS below 1', () => {
    const r = analyzeCampaignMetrics({
      ...base,
      revenueEgp: 500,
      orders: 1,
    });
    expect(['PAUSE', 'STOP', 'REDUCE_SPEND']).toContain(r.verdict);
  });
});

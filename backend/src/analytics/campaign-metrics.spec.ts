import { computeMetrics, type ComputedMetric } from './campaign-metrics';

function value(metrics: ComputedMetric[], id: ComputedMetric['id']) {
  return metrics.find((metric) => metric.id === id);
}

describe('campaign metrics', () => {
  const winter = computeMetrics(
    {
      conversations: 500,
      leads: 100,
      orders: 30,
      revenueEgp: 20_000,
      costOfGoodsEgp: null,
    },
    {
      spendEgp: 5_000,
      impressions: 100_000,
      clicks: 2_000,
      reach: 40_000,
      engagements: 3_000,
      landingPageViews: 1_500,
    },
    'MORE_ORDERS',
  );

  it('matches the winter collection formulas', () => {
    expect(value(winter.metrics, 'ctr')?.value).toBe(2);
    expect(value(winter.metrics, 'cpc')?.value).toBe(2.5);
    expect(value(winter.metrics, 'cpm')?.value).toBe(50);
    expect(value(winter.metrics, 'costPerConversation')?.value).toBe(10);
    expect(value(winter.metrics, 'cpl')?.value).toBe(50);
    expect(value(winter.metrics, 'cpa')?.value).toBe(166.7);
    expect(value(winter.metrics, 'roas')?.value).toBe(4);
    expect(value(winter.metrics, 'frequency')?.value).toBe(2.5);
    expect(value(winter.metrics, 'engagementRate')?.value).toBe(3);
    expect(value(winter.metrics, 'costPerEngagement')?.value).toBe(1.7);
    expect(value(winter.metrics, 'leadConversionRate')?.value).toBe(5);
    expect(value(winter.metrics, 'conversationToLeadRate')?.value).toBe(20);
    expect(value(winter.metrics, 'leadToOrderRate')?.value).toBe(30);
  });

  it('headlines a sales campaign with ROAS when spend exists', () => {
    expect(winter.headline).toEqual({ id: 'roas', value: 4, unit: 'multiple' });
  });

  it('does not invent profit without cost of goods', () => {
    expect(value(winter.metrics, 'profit')).toMatchObject({
      value: null,
      gap: 'missing_cost',
    });
  });

  it('computes profit only from revenue, actual spend, and cost of goods', () => {
    const report = computeMetrics(
      {
        conversations: 500,
        leads: 100,
        orders: 30,
        revenueEgp: 20_000,
        costOfGoodsEgp: 8_000,
      },
      {
        spendEgp: 5_000,
        impressions: 100_000,
        clicks: 2_000,
        reach: null,
        engagements: null,
        landingPageViews: null,
      },
      'MORE_ORDERS',
    );
    expect(value(report.metrics, 'profit')?.value).toBe(7_000);
  });

  it('keeps ad ratios empty when delivery is not connected', () => {
    const report = computeMetrics(
      {
        conversations: 4,
        leads: 2,
        orders: 1,
        revenueEgp: 300,
        costOfGoodsEgp: null,
      },
      {
        spendEgp: null,
        impressions: null,
        clicks: null,
        reach: null,
        engagements: null,
        landingPageViews: null,
      },
      'MORE_ORDERS',
    );

    expect(value(report.metrics, 'roas')?.gap).toBe('missing_spend');
    expect(value(report.metrics, 'cpa')?.gap).toBe('missing_spend');
    expect(value(report.metrics, 'ctr')?.gap).toBe('missing_impressions');
    expect(value(report.metrics, 'revenue')?.value).toBe(300);
    expect(value(report.metrics, 'leadToOrderRate')?.value).toBe(50);
    expect(report.headline).toEqual({
      id: 'revenue',
      value: 300,
      unit: 'egp',
    });
  });

  it('does not report a rate when the denominator is zero', () => {
    const report = computeMetrics(
      {
        conversations: 0,
        leads: 0,
        orders: 0,
        revenueEgp: 0,
        costOfGoodsEgp: null,
      },
      {
        spendEgp: 5_000,
        impressions: 0,
        clicks: 0,
        reach: null,
        engagements: null,
        landingPageViews: null,
      },
      'TRAFFIC',
    );

    expect(value(report.metrics, 'ctr')?.gap).toBe('divide_by_zero');
    expect(value(report.metrics, 'conversationToLeadRate')?.gap).toBe(
      'divide_by_zero',
    );
    expect(value(report.metrics, 'cpm')?.gap).toBe('divide_by_zero');
  });
});

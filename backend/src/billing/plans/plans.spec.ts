import { PLAN_LIMITS, TRIAL_LIMITS, usageLevel } from './limits';
import { PLAN_PRICES, priceFor } from './plans';
import { trivialKind, trivialReply } from '../trivial-message';

describe('plan prices', () => {
  it('prices every plan in USD', () => {
    expect(priceFor('STARTER', 'MONTHLY')).toEqual({ amount: 9, currency: 'USD' });
    expect(priceFor('GROWTH', 'MONTHLY')).toEqual({ amount: 19, currency: 'USD' });
    expect(priceFor('PRO', 'MONTHLY')).toEqual({ amount: 39, currency: 'USD' });
  });

  it('keeps annual billing at ten months of the monthly price', () => {
    for (const plan of ['STARTER', 'GROWTH', 'PRO'] as const) {
      expect(PLAN_PRICES[plan].ANNUAL).toBe(PLAN_PRICES[plan].MONTHLY * 10);
    }
  });

  it('does not give the trial unlimited AI or WhatsApp', () => {
    expect(TRIAL_LIMITS.aiActions).toBe(50);
    expect(TRIAL_LIMITS.whatsappMessages).toBe(100);
    expect(TRIAL_LIMITS.apiRequestsPerDay).toBe(0);
    expect(PLAN_LIMITS.STARTER.apiRequestsPerDay).toBe(0);
    expect(PLAN_LIMITS.GROWTH.apiRequestsPerDay).toBe(1000);
  });
});

describe('usage warnings', () => {
  it('flags 70, 90, and 100 percent', () => {
    expect(usageLevel(699, 1000)).toBe(0);
    expect(usageLevel(700, 1000)).toBe(70);
    expect(usageLevel(900, 1000)).toBe(90);
    expect(usageLevel(1000, 1000)).toBe(100);
  });
});

describe('trivial messages', () => {
  it('does not send greetings to the model', () => {
    expect(trivialKind('Hi')).toBe('hi');
    expect(trivialKind('شكراً')).toBe('thanks');
    expect(trivialKind('تمام')).toBe('ok');
    expect(trivialKind('بكام المنتج؟')).toBeNull();
    expect(trivialReply('Thanks')).toBe("You're welcome.");
  });
});

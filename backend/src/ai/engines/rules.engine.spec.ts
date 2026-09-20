import { RulesEngine } from './rules.engine';

describe('RulesEngine intent detection', () => {
  const engine = new RulesEngine({} as never);

  it('detects price inquiry', () => {
    expect(engine.detectIntent('بكام البروتين؟')).toBe('PRICE_INQUIRY');
  });

  it('detects purchase intent', () => {
    expect(engine.detectIntent('عايز أطلب')).toBe('PURCHASE_INTENT');
  });

  it('detects human request', () => {
    expect(engine.detectIntent('عايز أكلم موظف')).toBe('HUMAN_REQUEST');
  });

  it('extracts Egyptian phone and name', () => {
    const info = engine.extractCustomerInfo('أحمد - 01012345678', []);
    expect(info.phone).toBe('01012345678');
    expect(info.name).toContain('أحمد');
  });
});

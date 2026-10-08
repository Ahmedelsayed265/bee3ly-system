import {
  dailyBudgetMinor,
  extractMetaAdId,
  hashPhones,
  isCustomAudienceTermsError,
  mapObjective,
  normalizeE164Digits,
  sha256Phone,
} from './meta-ads.mapping';

describe('meta ads mapping', () => {
  it('maps Bee3ly goals to Meta outcomes', () => {
    expect(mapObjective('TRAFFIC').objective).toBe('OUTCOME_TRAFFIC');
    expect(mapObjective('MORE_LEADS').objective).toBe('OUTCOME_LEADS');
    expect(mapObjective('MORE_MESSAGES').objective).toBe('OUTCOME_ENGAGEMENT');
    expect(mapObjective('RETARGETING').messaging).toBe(true);
  });

  it('converts major budget to minor units and rejects the minimum', () => {
    expect(dailyBudgetMinor(50, 'EGP')).toBe(5000);
    expect(dailyBudgetMinor(10, 'USD')).toBe(1000);
    expect(() => dailyBudgetMinor(10, 'EGP')).toThrow(/minimum/);
  });

  it('hashes Egypt phones without keeping the raw number', () => {
    expect(normalizeE164Digits('01001234567')).toBe('201001234567');
    const hash = sha256Phone('01001234567');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toContain('0100');
    expect(hashPhones(['01001234567', '+20 100 123 4567'])).toEqual([hash]);
  });

  it('reads ad_id from a messaging referral', () => {
    expect(extractMetaAdId({ message: { referral: { ad_id: '2381' } } })).toBe(
      '2381',
    );
  });

  it('recognizes the custom audience terms error', () => {
    expect(
      isCustomAudienceTermsError(
        new Error('{"error":{"message":"Custom Audience terms not accepted"}}'),
      ),
    ).toBe(true);
  });
});

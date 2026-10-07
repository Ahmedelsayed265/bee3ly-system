import { egpFromUsd } from './usd-egp';

describe('egpFromUsd', () => {
  it('rounds the dollar amount to whole pounds', () => {
    expect(egpFromUsd(9, 50)).toBe(450);
    expect(egpFromUsd(19, 48.2)).toBe(916);
    expect(egpFromUsd(0.2, 1)).toBe(1);
  });
});

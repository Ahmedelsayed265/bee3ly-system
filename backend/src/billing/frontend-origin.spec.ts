import { billingReturnOrigin } from './frontend-origin';

const configured = 'https://bee3ly-system.vercel.app,http://localhost:5173';

describe('billingReturnOrigin', () => {
  it('returns the site the merchant checked out from', () => {
    expect(billingReturnOrigin(configured, 'http://localhost:5173')).toBe(
      'http://localhost:5173',
    );
    expect(
      billingReturnOrigin(configured, 'https://bee3ly-system.vercel.app'),
    ).toBe('https://bee3ly-system.vercel.app');
  });

  it('uses the first configured site when the request has no origin', () => {
    expect(billingReturnOrigin(configured, undefined)).toBe(
      'https://bee3ly-system.vercel.app',
    );
  });
});

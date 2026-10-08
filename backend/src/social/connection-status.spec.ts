import { buildConnectionChecklist } from './connection-status';

describe('buildConnectionChecklist', () => {
  const base = {
    accounts: [] as Array<{ platform: string; status: string }>,
    metaAdAccountId: null as string | null,
    metaAdsNeedsReconnect: false,
  };

  it('marks everything missing when nothing is stored', () => {
    const status = buildConnectionChecklist(base);
    expect(status.facebook.state).toBe('missing');
    expect(status.instagram.state).toBe('missing');
    expect(status.whatsapp.state).toBe('missing');
    expect(status.adAccount.state).toBe('missing');
    expect(status.adsPermissions.state).toBe('missing');
  });

  it('marks a channel connected only when status is CONNECTED', () => {
    const status = buildConnectionChecklist({
      ...base,
      accounts: [
        { platform: 'FACEBOOK', status: 'CONNECTED' },
        { platform: 'INSTAGRAM', status: 'DISCONNECTED' },
        { platform: 'WHATSAPP', status: 'CONNECTED' },
      ],
    });
    expect(status.facebook.state).toBe('connected');
    expect(status.instagram.state).toBe('missing');
    expect(status.whatsapp.state).toBe('connected');
  });

  it('asks for reconnect when the ad token is stale', () => {
    const status = buildConnectionChecklist({
      ...base,
      accounts: [{ platform: 'FACEBOOK', status: 'CONNECTED' }],
      metaAdAccountId: 'act_1',
      metaAdsNeedsReconnect: true,
    });
    expect(status.adAccount.state).toBe('reconnect');
    expect(status.adsPermissions.state).toBe('reconnect');
  });

  it('treats a saved ad account as ads permission granted', () => {
    const status = buildConnectionChecklist({
      ...base,
      metaAdAccountId: 'act_1',
    });
    expect(status.adAccount.state).toBe('connected');
    expect(status.adsPermissions.state).toBe('connected');
  });
});

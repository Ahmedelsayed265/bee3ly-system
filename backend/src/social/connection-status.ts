export type ConnectionState = 'connected' | 'missing' | 'reconnect';

export type ConnectionChecklist = {
  facebook: { state: ConnectionState };
  instagram: { state: ConnectionState };
  whatsapp: { state: ConnectionState };
  adAccount: { state: ConnectionState };
  adsPermissions: { state: ConnectionState };
};

type AccountRow = { platform: string; status: string };

/** Stored Bee3ly state only. Does not call Meta. */
export function buildConnectionChecklist(input: {
  accounts: AccountRow[];
  metaAdAccountId: string | null;
  metaAdsNeedsReconnect: boolean;
}): ConnectionChecklist {
  const linked = (platform: string) =>
    input.accounts.some(
      (account) =>
        account.platform === platform && account.status === 'CONNECTED',
    );
  const hasAdAccount = Boolean(input.metaAdAccountId);
  return {
    facebook: { state: linked('FACEBOOK') ? 'connected' : 'missing' },
    instagram: { state: linked('INSTAGRAM') ? 'connected' : 'missing' },
    whatsapp: { state: linked('WHATSAPP') ? 'connected' : 'missing' },
    adAccount: {
      state: !hasAdAccount
        ? 'missing'
        : input.metaAdsNeedsReconnect
          ? 'reconnect'
          : 'connected',
    },
    adsPermissions: {
      state: input.metaAdsNeedsReconnect
        ? 'reconnect'
        : hasAdAccount
          ? 'connected'
          : 'missing',
    },
  };
}

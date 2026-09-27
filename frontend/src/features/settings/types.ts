export type SettingsTab = 'social' | 'delivery' | 'knowledge';
export type ChannelId = 'FACEBOOK' | 'INSTAGRAM' | 'WHATSAPP';

export type SocialAccount = {
  id: string;
  platform: string;
  displayName: string | null;
  status?: string;
  webhookSubscribedAt?: string | null;
};

export type SettingsTab = 'social' | 'knowledge' | 'shipping';
export type ChannelId = 'FACEBOOK' | 'INSTAGRAM' | 'WHATSAPP';

export type SocialAccount = {
  id: string;
  platform: string;
  displayName: string | null;
  status?: string;
  webhookSubscribedAt?: string | null;
};

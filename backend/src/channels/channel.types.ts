export type ChannelProvider = 'META' | 'WHATSAPP' | 'TIKTOK';

export type ChannelType = 'FACEBOOK' | 'INSTAGRAM' | 'WHATSAPP' | 'TIKTOK';

export type InboundMessageEvent = {
  provider: ChannelProvider;
  channel: ChannelType;
  externalAccountId: string;
  externalSenderId: string;
  externalMessageId?: string;
  text: string;
  timestamp?: number;
  raw?: unknown;
};

export type InboundIngestResult = {
  businessId: string;
  conversationId: string;
  customerId: string;
  messageId: string;
  duplicate: boolean;
};

export type AiEngineInboundPayload = {
  businessId: string;
  conversationId: string;
  customerId: string;
  channel: string;
  messageId: string;
  text: string;
  customer: {
    name: string | null;
    phone: string | null;
    externalId: string | null;
  };
};

export type AiEngineInboundResponse = {
  reply?: string | null;
  mode?: 'external' | 'dev_fallback' | 'none';
};

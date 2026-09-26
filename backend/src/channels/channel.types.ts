export type ChannelProvider = 'META' | 'WHATSAPP' | 'TIKTOK';

export type ChannelType = 'FACEBOOK' | 'INSTAGRAM' | 'WHATSAPP' | 'TIKTOK';

export type InboundMessageEvent = {
  provider: ChannelProvider;
  channel: ChannelType;
  externalAccountId: string;
  externalSenderId: string;
  externalMessageId?: string;
  senderName?: string;
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
  channel: ChannelType;
  messageId: string;
  text: string;
  /** Signed JWT authorizing the AI service to access this merchant's data. */
  authorizationToken: string;
  customer: {
    name: string | null;
    phone: string | null;
    externalId: string | null;
  };
  /** Conversation history (newest first is fine — AI Engine will order as needed). */
  history?: Array<{
    role: 'CUSTOMER' | 'AI' | 'HUMAN' | 'SYSTEM';
    content: string;
    createdAt: string;
  }>;
  /** Optional agent configuration to inform tone/goals. */
  agent?: {
    primaryGoal?: string | null;
    secondaryGoals?: string[];
    tone?: string | null;
    instructions?: string | null;
  };
};

export type AiEngineInboundResponse = {
  reply?: string | null;
  mode?: 'external' | 'dev_fallback' | 'fixed_fallback' | 'none';
  /** Error classification when mode === 'none' so callers can react. */
  error?:
    | 'CHANNEL_NOT_FOUND'
    | 'MERCHANT_NOT_FOUND'
    | 'INVALID_TOKEN'
    | 'TOKEN_EXPIRED'
    | 'SERVICE_UNAVAILABLE'
    | 'TIMEOUT'
    | 'PRODUCTS_UNAVAILABLE'
    | 'INVALID_RESPONSE'
    | string;
};

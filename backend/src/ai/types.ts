export type AiIntent =
  | 'PRICE_INQUIRY'
  | 'PRODUCT_QUESTION'
  | 'AVAILABILITY'
  | 'DELIVERY_QUESTION'
  | 'GENERAL_QUESTION'
  | 'PURCHASE_INTENT'
  | 'ORDER_STATUS'
  | 'COMPLAINT'
  | 'HUMAN_REQUEST'
  | 'LEAD_INTENT'
  | 'BOOKING_INTENT';

export type ToolName =
  | 'getProduct'
  | 'checkStock'
  | 'getDeliveryInfo'
  | 'getBusinessInfo'
  | 'getFAQ'
  | 'createOrder'
  | 'getOrderStatus'
  | 'createLead'
  | 'notifyOwner'
  | 'transferToHuman';

export type ConversionStageName =
  | 'NEW'
  | 'DISCOVERY'
  | 'QUALIFICATION'
  | 'CONSIDERATION'
  | 'PURCHASE_INTENT'
  | 'DATA_COLLECTION'
  | 'CONVERTED'
  | 'HUMAN_HANDOFF';

export type AiStructuredResult = {
  intent: AiIntent;
  confidence: number;
  response: string;
  requiresTool: boolean;
  toolName?: ToolName;
  toolArgs?: Record<string, unknown>;
  extractedData?: Record<string, unknown>;
  conversionStage: ConversionStageName;
  requiresHuman: boolean;
  handoffReason?: string;
};

export type AiEngineResult = {
  reply: string;
  intent: string;
  toolsUsed: ToolName[];
  order: unknown;
  lead: unknown;
  needsHuman: boolean;
  conversionStage: ConversionStageName;
  handoffReason?: string;
  mode: 'llm' | 'rules';
  confidence?: number;
};

export type BusinessContext = {
  businessId: string;
  conversationId: string;
  customerId: string;
  campaignId: string | null;
  mode: string;
  conversionStage: ConversionStageName;
  channel: string;
  business: {
    name: string;
    type: string;
    description: string | null;
    operatingArea: string | null;
    workingHours: string | null;
    deliveryInfo: string | null;
    paymentInfo: string | null;
    faqs: string | null;
    primaryGoal: string | null;
  };
  agent: {
    isActive: boolean;
    primaryGoal: string;
    tone: string;
    instructions: string | null;
    handoffEnabled: boolean;
  };
  products: Array<{
    id: string;
    name: string;
    description: string | null;
    priceEgp: number;
    attributes: Record<string, string | number | boolean | string[]>;
    sizes: string[];
    colors: string[];
    stockQuantity: number | null;
    inStock: boolean;
    variantsSummary?: string;
  }>;
  customer: {
    name: string | null;
    phone: string | null;
  };
  campaign: {
    id: string;
    name: string;
    objective: string;
    offer: string;
    audienceDescription: string;
  } | null;
  history: Array<{ role: string; content: string }>;
  latestCustomerMessage: string;
};

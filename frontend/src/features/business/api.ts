import { api } from '@/lib/api'

export type BusinessType =
  | 'RESTAURANT'
  | 'CAFE'
  | 'FASHION'
  | 'PERFUME'
  | 'BEAUTY'
  | 'ECOMMERCE'
  | 'REAL_ESTATE'
  | 'OTHER'

export type BusinessGoal =
  | 'MORE_MESSAGES'
  | 'MORE_LEADS'
  | 'MORE_ORDERS'
  | 'BOOK_APPOINTMENTS'
  | 'INCREASE_SALES'

export type PlanTier = 'FREE' | 'STARTER' | 'GROWTH'

export type Business = {
  id: string
  name: string
  type: BusinessType
  plan: PlanTier
  description: string | null
  averagePriceEgp: number | null
  operatingArea: string | null
  contactChannels: string[]
  primaryGoal: BusinessGoal | null
  deliveryInfo: string | null
  workingHours: string | null
  paymentInfo: string | null
  faqs: string | null
  onboardingCompletedAt: string | null
}

export type Product = {
  id: string
  name: string
  description: string | null
  priceEgp: number
  sizes: string[]
  colors: string[]
  inStock: boolean
}

export async function fetchBusiness() {
  const { data } = await api.get<{ business: Business }>('/businesses/me')
  return data.business
}

export async function updateBusiness(
  input: Partial<Business> & { completeOnboarding?: boolean },
) {
  const { data } = await api.patch<{ business: Business }>('/businesses/me', input)
  return data.business
}

export async function updateProfile(input: { name: string }) {
  const { data } = await api.patch<{ user: { id: string; email: string; name: string; createdAt: string } }>(
    '/auth/profile',
    input,
  )
  return data.user
}

export async function changePassword(input: {
  currentPassword: string
  newPassword: string
}) {
  const { data } = await api.patch<{ success: boolean; message: string }>(
    '/auth/password',
    input,
  )
  return data
}

export async function fetchProducts() {
  const { data } = await api.get<{ products: Product[] }>('/products')
  return data.products
}

export async function createProduct(input: {
  name: string
  priceEgp: number
  description?: string
  sizes?: string[]
  colors?: string[]
  inStock?: boolean
}) {
  const { data } = await api.post<{ product: Product }>('/products', input)
  return data.product
}

export async function updateProduct(
  id: string,
  input: Partial<{
    name: string
    priceEgp: number
    description: string
    sizes: string[]
    colors: string[]
    inStock: boolean
  }>,
) {
  const { data } = await api.patch<{ product: Product }>(`/products/${id}`, input)
  return data.product
}

export async function deleteProduct(id: string) {
  await api.delete(`/products/${id}`)
}

export async function fetchOrders() {
  const { data } = await api.get<{
    orders: Array<{
      id: string
      orderNumber: number
      status: string
      totalEgp: number
      customerName: string | null
      customerPhone: string | null
      createdAt: string
      items: Array<{ name: string; size: string | null; quantity: number; priceEgp: number }>
    }>
  }>('/orders')
  return data.orders
}

export async function updateOrderStatus(id: string, status: string) {
  const { data } = await api.patch(`/orders/${id}/status`, { status })
  return data
}

export async function fetchConversations() {
  const { data } = await api.get<{
    conversations: Array<{
      id: string
      channel: string
      needsHuman: boolean
      mode?: string
      conversionStage?: string
      lastMessageAt: string
      customer: { name: string | null; phone: string | null }
      messages: Array<{ content: string; role: string; intent?: string | null }>
      leads?: Array<{ status: string; intent: string | null }>
      campaign?: { id: string; name: string } | null
    }>
  }>('/conversations')
  return data.conversations
}

export async function fetchConversation(id: string) {
  const { data } = await api.get<{
    conversation: {
      id: string
      channel: string
      needsHuman: boolean
      mode?: string
      conversionStage?: string
      handoffReason?: string | null
      aiSummary?: string | null
      customer: { name: string | null; phone: string | null }
      campaign?: { id: string; name: string } | null
      messages: Array<{
        id: string
        role: string
        content: string
        intent: string | null
        createdAt: string
      }>
      leads?: Array<{ id: string; status: string; intent: string | null }>
    }
    orders?: Array<{
      id: string
      orderNumber: number
      status: string
      totalEgp: number
    }>
  }>(`/conversations/${id}`)
  return data
}

export async function simulateMessage(content: string, conversationId?: string) {
  const { data } = await api.post<{
    conversationId: string
    reply: string | null
    intent: string
    toolsUsed: string[]
    order: unknown
    mode: string
    paused?: boolean
    needsHuman?: boolean
    notice?: string
  }>('/ai/simulate-message', { content, conversationId })
  return data
}

export async function fetchLeads() {
  const { data } = await api.get<{
    leads: Array<{
      id: string
      status: string
      intent: string | null
      createdAt: string
      customer: { name: string | null; phone: string | null }
    }>
  }>('/leads')
  return data.leads
}

export async function fetchNotifications() {
  const { data } = await api.get<{
    notifications: Array<{
      id: string
      type: string
      title: string
      body: string
      readAt: string | null
      createdAt: string
    }>
    unreadCount: number
  }>('/notifications')
  return data
}

export async function markNotificationRead(id: string) {
  await api.patch(`/notifications/${id}/read`)
}

export async function markAllNotificationsRead() {
  await api.post('/notifications/read-all')
}

export async function fetchOverview() {
  const { data } = await api.get<{
    metrics: {
      salesEgp: number
      orders: number
      leads: number
      conversations: number
      unreadNotifications: number
      aiHandled?: number
      humanHandoffs?: number
      conversions?: number
      conversionRate?: number | null
    }
    salesByDay: Array<{ day: string; value: number }>
    campaigns?: Array<{
      id: string
      name: string
      status: string
      objective: string
      budget: number
      conversations: number
      leads: number
      orders: number
      revenueEgp: number
    }>
    enoughData?: boolean
  }>('/analytics/overview')
  return data
}

export async function fetchSocial() {
  const { data } = await api.get<{
    accounts: Array<{
      id: string
      provider?: string
      platform: string
      displayName: string | null
      status?: string
      webhookSubscribedAt?: string | null
      connectedAt: string
    }>
    metaConfigured: boolean
    oauthUrl: string | null
    connectLabel?: string
  }>('/social')
  return data
}

export async function startMetaConnect() {
  const { data } = await api.post<{ oauthUrl: string }>('/social/meta/connect')
  return data
}

export async function fetchMetaPending(pendingId: string) {
  const { data } = await api.get<{
    pendingId: string
    pages: Array<{ id: string; name: string; hasInstagram: boolean }>
  }>(`/social/meta/pending/${pendingId}`)
  return data
}

export async function selectMetaPage(pendingId: string, pageId: string) {
  const { data } = await api.post<{
    facebook: { id: string; displayName: string | null; status: string }
    instagram: { id: string; displayName: string | null; status: string } | null
    notice: string
  }>('/social/meta/select-page', { pendingId, pageId })
  return data
}

export async function connectSocialDemo(platform: 'FACEBOOK' | 'INSTAGRAM') {
  const { data } = await api.post('/social/connect-demo', { platform })
  return data
}

export async function disconnectSocial(platform: 'FACEBOOK' | 'INSTAGRAM') {
  const { data } = await api.delete('/social/disconnect', {
    data: { platform },
  })
  return data
}

export async function fetchAiAgent() {
  const { data } = await api.get<{
    agent: {
      id: string
      primaryGoal: string
      secondaryGoals: string[]
      isActive: boolean
      tone?: string
      instructions?: string | null
      handoffEnabled?: boolean
    }
  }>('/ai/agent')
  return data.agent
}

export async function updateAiAgent(input: {
  primaryGoal?: string
  secondaryGoals?: string[]
  isActive?: boolean
  tone?: string
  instructions?: string | null
  handoffEnabled?: boolean
}) {
  const { data } = await api.patch('/ai/agent', input)
  return data.agent
}

export async function setConversationMode(
  conversationId: string,
  mode: 'AI' | 'HUMAN',
) {
  const { data } = await api.patch(`/ai/conversations/${conversationId}/mode`, {
    mode,
  })
  return data
}

export async function sendHumanMessage(conversationId: string, content: string) {
  const { data } = await api.post(
    `/conversations/${conversationId}/human-message`,
    { content },
  )
  return data
}

export async function updateLeadStatus(id: string, status: string) {
  const { data } = await api.patch(`/leads/${id}/status`, { status })
  return data
}

export type Campaign = {
  id: string
  name: string
  objective: string
  status: string
  offer: string
  audienceDescription: string
  budget: number
  currency: string
  valueProposition: string | null
  suggestedMessaging: string | null
  suggestedCta: string | null
  suggestedCreative: string | null
  channel: string | null
  createdAt: string
}

export async function fetchCampaigns() {
  const { data } = await api.get<{ campaigns: Campaign[] }>('/campaigns')
  return data.campaigns
}

export async function createCampaign(input: {
  offer: string
  objective: string
  audienceDescription: string
  budget: number
  valueProposition?: string
  channel?: string
}) {
  const { data } = await api.post<{ campaign: Campaign; recommendation: unknown }>(
    '/campaigns',
    input,
  )
  return data
}

export async function launchCampaign(
  id: string,
  status: 'ASSISTED_LAUNCH' | 'SIMULATED' | 'PAUSED',
) {
  const { data } = await api.patch<{
    campaign: Campaign
    published: boolean
    notice: string
  }>(`/campaigns/${id}/launch`, { status })
  return data
}

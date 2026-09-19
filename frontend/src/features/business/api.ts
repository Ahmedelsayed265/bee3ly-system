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
      lastMessageAt: string
      customer: { name: string | null; phone: string | null }
      messages: Array<{ content: string; role: string }>
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
      customer: { name: string | null; phone: string | null }
      messages: Array<{
        id: string
        role: string
        content: string
        intent: string | null
        createdAt: string
      }>
    }
  }>(`/conversations/${id}`)
  return data.conversation
}

export async function simulateMessage(content: string, conversationId?: string) {
  const { data } = await api.post<{
    conversationId: string
    reply: string
    intent: string
    toolsUsed: string[]
    order: unknown
    mode: string
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
    }
    salesByDay: Array<{ day: string; value: number }>
  }>('/analytics/overview')
  return data
}

export async function fetchSocial() {
  const { data } = await api.get<{
    accounts: Array<{
      id: string
      platform: string
      displayName: string | null
      connectedAt: string
    }>
    metaConfigured: boolean
    oauthUrl: string | null
  }>('/social')
  return data
}

export async function connectSocialDemo(platform: 'FACEBOOK' | 'INSTAGRAM') {
  const { data } = await api.post('/social/connect-demo', { platform })
  return data
}

export async function fetchAiAgent() {
  const { data } = await api.get<{
    agent: {
      id: string
      primaryGoal: string
      secondaryGoals: string[]
      isActive: boolean
    }
  }>('/ai/agent')
  return data.agent
}

export async function updateAiAgent(input: {
  primaryGoal?: string
  secondaryGoals?: string[]
  isActive?: boolean
}) {
  const { data } = await api.patch('/ai/agent', input)
  return data.agent
}

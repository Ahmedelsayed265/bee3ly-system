import { api } from '@/lib/api';

export type AdminOverview = {
  users: number;
  businesses: number;
  ordersLast30Days: number;
  revenueEgpLast30Days: number;
  openConversations: number;
  needsHuman: number;
  messagesLast30Days: number;
  connectedChannels: number;
  billing: {
    mrr: number;
    arr: number;
    arpu: number;
    payingCustomers: number;
    trialing: number;
    trialToPaid: number | null;
    canceled: number;
  };
  alerts: AdminUsageRow[];
  plans: Array<{ plan: string; count: number }>;
  sales: Array<{ day: string; orders: number; revenueEgp: number }>;
  recentBusinesses: Array<{
    id: string;
    name: string;
    plan: string;
    status: string | null;
    orders: number;
    createdAt: string;
  }>;
};

export type AdminBusiness = {
  id: string;
  name: string;
  type: string;
  plan: string;
  subscriptionStatus: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  orders: number;
  conversations: number;
  products: number;
  createdAt: string;
};

export type AdminBusinessDetail = {
  id: string;
  name: string;
  type: string;
  plan: string;
  subscriptionStatus: string | null;
  amount: number | null;
  currency: string;
  interval: string | null;
  periodEnd: string | null;
  trialEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
  usage: {
    conversations: AdminMeter;
    whatsapp: AdminMeter;
    ai: AdminMeter;
    orders: AdminMeter;
  };
  messages: Record<string, number>;
  conversationStatuses: Array<{ status: string; count: number }>;
  conversationChannels: Array<{ channel: string; count: number }>;
  members: Array<{ role: string; name: string; email: string }>;
  channels: Array<{
    platform: string;
    status: string;
    displayName: string | null;
  }>;
  recentOrders: Array<{
    id: string;
    orderNumber: number;
    status: string;
    totalEgp: number;
    customerName: string | null;
    createdAt: string;
  }>;
  orders: number;
  conversations: number;
  products: number;
  campaigns: number;
  createdAt: string;
};

export type AdminMeter = {
  used: number;
  limit: number | null;
  level: number;
};

export type AdminUsageRow = {
  id: string;
  name: string;
  plan: string;
  status: string | null;
  conversations: AdminMeter;
  whatsapp: AdminMeter;
  ai: AdminMeter;
  orders: AdminMeter;
  level: number;
};

export type AdminSubscriptions = {
  billing: AdminOverview['billing'];
  rows: Array<{
    id: string;
    businessId: string;
    businessName: string;
    type: string;
    plan: string;
    status: string;
    interval: string;
    amount: number;
    currency: string;
    periodEnd: string;
    trialEndsAt: string | null;
    cancelAtPeriodEnd: boolean;
  }>;
};

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  isPlatformAdmin: boolean;
  createdAt: string;
  businesses: string[];
};

export function fetchAdminOverview() {
  return api.get<AdminOverview>('/admin/overview').then((res) => res.data);
}

export function fetchAdminBusinesses(search: string) {
  return api
    .get<AdminBusiness[]>('/admin/businesses', { params: { search } })
    .then((res) => res.data);
}

export function fetchAdminBusiness(id: string) {
  return api
    .get<AdminBusinessDetail>(`/admin/businesses/${id}`)
    .then((res) => res.data);
}

export function fetchAdminUsers(search: string) {
  return api
    .get<AdminUser[]>('/admin/users', { params: { search } })
    .then((res) => res.data);
}

export function fetchAdminSubscriptions() {
  return api
    .get<AdminSubscriptions>('/admin/subscriptions')
    .then((res) => res.data);
}

export function fetchAdminUsage() {
  return api.get<AdminUsageRow[]>('/admin/usage').then((res) => res.data);
}

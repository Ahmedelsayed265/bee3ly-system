/** Central path constants — use these instead of string literals in routes/nav. */
export const paths = {
  home: '/',
  privacyPolicy: '/privacy',
  terms: '/terms',
  contact: '/contact',
  help: '/help',
  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  adminBusiness: '/app/businesses',
  adminUsers: '/app/users',
  adminSubscriptions: '/app/subscriptions',
  adminUsage: '/app/usage',
  app: '/app',
  inbox: '/app/inbox',
  leads: '/app/leads',
  orders: '/app/orders',
  products: '/app/products',
  ai: '/app/ai',
  profile: '/app/profile',
  billing: '/app/billing',
  settings: '/app/settings',
  campaigns: '/app/campaigns',
  guide: '/app/guide',
} as const;

export type AppPath = (typeof paths)[keyof typeof paths];

/** Central path constants — use these instead of string literals in routes/nav. */
export const paths = {
  home: '/',
  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  app: '/app',
  onboarding: '/app/onboarding',
  inbox: '/app/inbox',
  leads: '/app/leads',
  orders: '/app/orders',
  products: '/app/products',
  ai: '/app/ai',
  profile: '/app/profile',
  billing: '/app/billing',
  settings: '/app/settings',
  campaigns: '/app/campaigns',
  analytics: '/app/analytics',
} as const;

export type AppPath = (typeof paths)[keyof typeof paths];

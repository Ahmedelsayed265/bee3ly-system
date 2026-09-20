export const salesSpark = [
  { day: '12', value: 18 },
  { day: '13', value: 24 },
  { day: '14', value: 21 },
  { day: '15', value: 32 },
  { day: '16', value: 28 },
  { day: '17', value: 36 },
  { day: '18', value: 42 },
]

export const campaigns = [
  {
    id: '1',
    nameKey: 'campaignSummer' as const,
    platform: 'facebook' as const,
    status: 'excellent' as const,
    spend: '4,200',
    roas: '4.6x',
  },
  {
    id: '2',
    nameKey: 'campaignBlackFriday' as const,
    platform: 'instagram' as const,
    status: 'attention' as const,
    spend: '6,800',
    roas: '1.9x',
  },
  {
    id: '3',
    nameKey: 'campaignNewArrivals' as const,
    platform: 'facebook' as const,
    status: 'good' as const,
    spend: '2,150',
    roas: '3.2x',
  },
]

export const recentSales = [
  { id: '1', name: 'سارة أحمد', amount: '1,250', product: 'تيشيرت أسود' },
  { id: '2', name: 'محمد علي', amount: '890', product: 'عطر' },
  { id: '3', name: 'نور حسن', amount: '2,100', product: 'سنيكرز' },
]

export const recentOrders = [
  {
    id: '#1042',
    product: 'تيشيرت أسود',
    tone: '#0F172A',
  },
  {
    id: '#1041',
    product: 'عطر فاخر',
    tone: '#6366F1',
  },
  {
    id: '#1040',
    product: 'سنيكرز أسود',
    tone: '#4F46E5',
  },
]

export const recentChats = [
  {
    id: '1',
    name: 'عمر خالد',
    preview: 'هل المقاس متوفر؟',
    time: '2د',
    initials: 'عخ',
  },
  {
    id: '2',
    name: 'ليلى حسن',
    preview: 'عايزة أطلب قطعتين',
    time: '8د',
    initials: 'لح',
  },
  {
    id: '3',
    name: 'كريم يوسف',
    preview: 'تم الدفع، متى الشحن؟',
    time: '15د',
    initials: 'كي',
  },
]

export const metrics = [
  {
    key: 'sales' as const,
    value: '32,450',
    suffix: 'ج.م',
    delta: '+18.4%',
  },
  {
    key: 'orders' as const,
    value: '47',
    suffix: '',
    delta: '+22.1%',
  },
  {
    key: 'leads' as const,
    value: '183',
    suffix: '',
    delta: '+34.7%',
  },
  {
    key: 'roas' as const,
    value: '3.8x',
    suffix: '',
    delta: '+12.3%',
  },
]

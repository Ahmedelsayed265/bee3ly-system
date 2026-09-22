import ar from './ar.json';
import en from './en.json';

export type Locale = 'ar' | 'en';

export const messages = {
  ar,
  en,
} as const;

export type MessageKey = keyof typeof messages.ar;

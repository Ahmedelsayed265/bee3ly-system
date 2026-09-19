import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { DirectionProvider } from '@radix-ui/react-direction'
import { messages, type Locale, type MessageKey } from '@/features/i18n/messages'

const STORAGE_KEY = 'bee3ly_locale'

type LocaleContextValue = {
  locale: Locale
  dir: 'rtl' | 'ltr'
  setLocale: (locale: Locale) => void
  t: (key: MessageKey, params?: Record<string, string>) => string
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

function readStoredLocale(): Locale {
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === 'en' || stored === 'ar' ? stored : 'ar'
}

function applyDocumentLocale(locale: Locale) {
  const dir = locale === 'ar' ? 'rtl' : 'ltr'
  document.documentElement.lang = locale
  document.documentElement.dir = dir
  document.title = messages[locale].appTitle
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const initial = readStoredLocale()
    applyDocumentLocale(initial)
    return initial
  })

  useEffect(() => {
    applyDocumentLocale(locale)
    localStorage.setItem(STORAGE_KEY, locale)
  }, [locale])

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
  }, [])

  const t = useCallback(
    (key: MessageKey, params?: Record<string, string>) => {
      let value: string = messages[locale][key]
      if (params) {
        for (const [param, replacement] of Object.entries(params)) {
          value = value.replace(`{${param}}`, replacement)
        }
      }
      return value
    },
    [locale],
  )

  const dir = (locale === 'ar' ? 'rtl' : 'ltr') as 'rtl' | 'ltr'

  const value = useMemo(
    () => ({
      locale,
      dir,
      setLocale,
      t,
    }),
    [locale, dir, setLocale, t],
  )

  return (
    <LocaleContext.Provider value={value}>
      <DirectionProvider dir={dir}>{children}</DirectionProvider>
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider')
  return ctx
}

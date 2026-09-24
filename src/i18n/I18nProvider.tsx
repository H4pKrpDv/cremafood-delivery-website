/**
 * i18n/I18nProvider.tsx
 * ------------------------------------------------------------------
 * Порт js/i18n.js (нативная версия) на React-контекст — по выбору
 * пользователя (см. переписку): один URL, переключение языка на клиенте,
 * БЕЗ next-intl и без локализованных путей /ru /ro /en. Язык хранится в
 * localStorage под тем же ключом "crema_lang", что и в нативной версии.
 *
 * В отличие от нативной версии (which walked the DOM for [data-i18n-key]
 * on every language switch), здесь компоненты сами вызывают t('key') —
 * React перерисовывает то, что реально подписано на контекст, без
 * ручного обхода DOM.
 * ------------------------------------------------------------------
 */

'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_LANG, I18N_DATA, isLang, resolveKey, type Lang } from '@/lib/i18nCore';

const STORAGE_KEY = 'crema_lang';

interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);

  // Восстановление выбранного языка из localStorage — только на клиенте,
  // после монтирования (на сервере/первом рендере всегда DEFAULT_LANG, как
  // и в нативной версии до применения applyLanguage()).
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (isLang(stored)) setLangState(stored);
    } catch {
      /* localStorage недоступен (приватный режим и т.п.) — не критично */
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('lang', lang);
    const title = resolveKey(I18N_DATA[lang], 'meta.title') ?? resolveKey(I18N_DATA[DEFAULT_LANG], 'meta.title');
    if (title) document.title = title;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* не критично — просто не сохраняем выбор между визитами */
    }
  }, []);

  const t = useCallback(
    (key: string): string => {
      const text = resolveKey(I18N_DATA[lang], key);
      if (text !== undefined) return text;
      return resolveKey(I18N_DATA[DEFAULT_LANG], key) ?? '';
    },
    [lang]
  );

  const value = useMemo<I18nContextValue>(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n() must be used within <I18nProvider>');
  return ctx;
}

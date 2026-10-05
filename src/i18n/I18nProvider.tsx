/**
 * i18n/I18nProvider.tsx
 * ------------------------------------------------------------------
 * Порт js/i18n.js (нативная версия) на React-контекст, без next-intl.
 *
 * 05.10.2026 — ПЕРЕРАБОТАН под локализованные пути (/, /ro, /en — см.
 * lib/i18nConfig.ts и proxy.ts). Раньше сайт был на одном URL, язык жил в
 * состоянии браузера (localStorage "crema_lang") и переключался на
 * клиенте — поисковики видели только русскую версию. Теперь ЯЗЫК — это
 * часть адреса: его определяет сегмент [lang] (app/[lang]/layout.tsx) и
 * передаёт сюда пропсом, поэтому сервер сразу отдаёт HTML на нужном языке
 * (title, description, hreflang, JSON-LD, <html lang> — всё на сервере),
 * а не подменяет текст после загрузки скриптов.
 *
 * Что убрано: состояние языка, setLang(), чтение/запись localStorage,
 * ручная смена document.title и атрибута lang у <html> — всё это теперь
 * делает сервер через metadata и <html lang={lang}>. Переключение языка в
 * шапке — обычные ссылки на /, /ro, /en (components/Header.tsx).
 *
 * Компоненты по-прежнему вызывают t('key') — резолвер тот же
 * (lib/i18nCore.ts), с тем же фолбэком на русский для отсутствующих ключей.
 * ------------------------------------------------------------------
 */

'use client';

import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { DEFAULT_LANG, I18N_DATA, resolveKey, type Lang } from '@/lib/i18nCore';

// Ключ localStorage из прежней клиентской схемы (до 05.10.2026) — язык
// теперь определяется адресом, старое значение никем не читается, поэтому
// просто убираем его у тех, у кого оно осталось.
const LEGACY_STORAGE_KEY = 'crema_lang';

interface I18nContextValue {
  lang: Lang;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      /* localStorage недоступен (приватный режим и т.п.) — не критично */
    }
  }, []);

  const value = useMemo<I18nContextValue>(() => {
    const t = (key: string): string => {
      const text = resolveKey(I18N_DATA[lang], key);
      if (text !== undefined) return text;
      return resolveKey(I18N_DATA[DEFAULT_LANG], key) ?? '';
    };
    return { lang, t };
  }, [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n() must be used within <I18nProvider>');
  return ctx;
}

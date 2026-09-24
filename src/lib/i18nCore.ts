/**
 * lib/i18nCore.ts
 * ------------------------------------------------------------------
 * Общий (без React) резолвер i18n-ключей вида "cart.title"/"items.<id>.name" —
 * тот же паттерн resolveKey(), что дублировался в нативной версии в каждом
 * js-файле (main.js/menu.js/cart.js/checkout.js). Используется:
 *   - i18n/I18nProvider.tsx — создаёт t() для клиентских компонентов;
 *   - app/api/orders/route.ts — создаёт t() на сервере (по присланному
 *     клиентом lang) для тех же ключей "items.<id>.name" при пересчёте
 *     суммы заказа и сборке сообщения в Telegram.
 * ------------------------------------------------------------------
 */

import ru from '@/data/i18n/ru.json';
import ro from '@/data/i18n/ro.json';
import en from '@/data/i18n/en.json';

export type Lang = 'ru' | 'ro' | 'en';
export const DEFAULT_LANG: Lang = 'ru';
export const LANGS: Lang[] = ['ru', 'ro', 'en'];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const I18N_DATA: Record<Lang, any> = { ru, ro, en };

export function isLang(value: unknown): value is Lang {
  return typeof value === 'string' && (LANGS as string[]).includes(value);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function resolveKey(langData: any, key: string): string | undefined {
  const parts = key.split('.');
  let value = langData;
  for (const part of parts) {
    if (value == null) return undefined;
    value = value[part];
  }
  return typeof value === 'string' ? value : undefined;
}

export function createTranslator(lang: Lang): (key: string) => string {
  const langData = I18N_DATA[lang] || I18N_DATA[DEFAULT_LANG];
  const fallbackData = I18N_DATA[DEFAULT_LANG];
  return function t(key: string): string {
    const text = resolveKey(langData, key);
    if (text !== undefined) return text;
    const fallback = resolveKey(fallbackData, key);
    return fallback ?? '';
  };
}

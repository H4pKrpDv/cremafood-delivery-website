/**
 * lib/i18nConfig.ts
 * ------------------------------------------------------------------
 * 05.10.2026. Единая конфигурация языков и локализованных путей сайта.
 * Файл НАМЕРЕННО без импорта словарей (ru/ro/en.json) и без React — его
 * импортирует proxy.ts (должен быть лёгким), серверные и клиентские
 * компоненты, sitemap.ts. Словари и резолвер ключей — в lib/i18nCore.ts
 * (он реэкспортирует всё отсюда, так что старые импорты продолжают
 * работать).
 *
 * Схема путей (решение пользователя, нужна для SEO):
 *   русский (по умолчанию) — БЕЗ префикса:  /        /#menu
 *   румынский                              /ro      /ro#menu
 *   английский                             /en      /en#menu
 * Адрес с префиксом языка по умолчанию (/ru) не существует — proxy.ts
 * делает с него постоянный редирект (308) на тот же адрес без префикса,
 * чтобы у русской версии не было двух адресов (дубль для поисковиков).
 * ------------------------------------------------------------------
 */

export type Lang = 'ru' | 'ro' | 'en';

export const LANGS: readonly Lang[] = ['ru', 'ro', 'en'];
export const DEFAULT_LANG: Lang = 'ru';

export function isLang(value: unknown): value is Lang {
  return typeof value === 'string' && (LANGS as readonly string[]).includes(value);
}

/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  ВАЖНО — НЕ ЗАБЫТЬ (05.10.2026, решение пользователя)            ║
 * ║                                                                  ║
 * ║  Сейчас ro.json и en.json — это КОПИЯ ru.json (текст на          ║
 * ║  русском). Поэтому страницы /ro и /en закрыты от индексации      ║
 * ║  (<meta name="robots" content="noindex, follow">, не попадают в  ║
 * ║  sitemap.xml, hreflang не выводится) — иначе Google увидел бы    ║
 * ║  три одинаковые русские страницы (дубли).                        ║
 * ║                                                                  ║
 * ║  КОГДА РУМЫНСКИЙ/АНГЛИЙСКИЙ ПЕРЕВЕДЕНЫ — добавить язык в         ║
 * ║  INDEXABLE_LANGS ниже (['ru', 'ro', 'en']). Одна эта правка      ║
 * ║  снимает noindex, добавляет страницы в sitemap.xml и включает    ║
 * ║  hreflang-теги (ru / ro / en / x-default) на всех страницах.     ║
 * ║  После этого — отправить sitemap.xml заново в Google Search      ║
 * ║  Console / Bing Webmaster Tools.                                 ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */
export const INDEXABLE_LANGS: readonly Lang[] = ['ru'];

export function isIndexableLang(lang: Lang): boolean {
  return INDEXABLE_LANGS.includes(lang);
}

// Код языка для hreflang / <html lang> / og:locale.
export const HREFLANG: Record<Lang, string> = { ru: 'ru', ro: 'ro', en: 'en' };
export const OG_LOCALE: Record<Lang, string> = { ru: 'ru_RU', ro: 'ro_MD', en: 'en_US' };

/**
 * Локализованный путь: localizedPath('ro') → '/ro', localizedPath('ru') →
 * '/', localizedPath('ro', '/#menu') → '/ro#menu', localizedPath('ru',
 * '/#menu') → '/#menu'. path — внутренний путь БЕЗ префикса языка (может
 * содержать ?query и #hash).
 */
export function localizedPath(lang: Lang, path: string = '/'): string {
  const match = /^([^?#]*)(.*)$/.exec(path);
  const pathname = match ? match[1] : path;
  const suffix = match ? match[2] : '';
  const base = pathname === '/' || pathname === '' ? '' : pathname;
  const prefix = lang === DEFAULT_LANG ? '' : `/${lang}`;
  return `${prefix}${base}` === '' ? `/${suffix}` : `${prefix}${base}${suffix}`;
}

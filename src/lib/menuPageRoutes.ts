/**
 * lib/menuPageRoutes.ts
 * ------------------------------------------------------------------
 * 09.10.2026. Адрес страницы «Полное меню». Раньше «Полное меню» было
 * четвёртой вкладкой главной с плашкой-ссылкой на PDF; теперь это отдельная
 * страница (решение пользователя), а пилюля «Полное меню» — обычная ссылка
 * на неё. Слаг один на все языки (как у разделов /drinks, /food, /promo):
 * ru /full-menu, ro /ro/full-menu, en /en/full-menu.
 *
 * 10.10.2026: адрес сменён с /menu на /full-menu (решение пользователя: слово
 * «menu» само по себе путает — разделы лежат на /drinks, /food, /promo). Старые
 * адреса /menu, /ro/menu, /en/menu — 301 на новые, см. data/redirects.ts.
 *
 * Статический сегмент app/[lang]/full-menu имеет приоритет над динамическим
 * [section], поэтому конфликта с разделами нет.
 *
 * Файл без React и серверных API — его используют серверные компоненты
 * (страница, sitemap, SEO) и клиентские (Header, CategoryNav).
 * ------------------------------------------------------------------
 */

import { isLang, localizedPath, type Lang } from '@/lib/i18nConfig';

/** id «категории» Полное меню в menu.json (она же — id пилюли). */
export const FULL_MENU_CATEGORY_ID = 'full-menu';

/** Внутренний путь БЕЗ префикса языка. */
export const MENU_PAGE_INTERNAL_PATH = '/full-menu';

/** Публичный путь: ru → '/full-menu', ro → '/ro/full-menu'. */
export function getMenuPagePathname(lang: Lang): string {
  return localizedPath(lang, MENU_PAGE_INTERNAL_PATH);
}

/** Это адрес страницы «Полное меню» (любой язык, слэш в конце допустим)? */
export function isMenuPagePathname(pathname: string): boolean {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length > 0 && isLang(segments[0])) segments.shift();
  return segments.length === 1 && segments[0] === MENU_PAGE_INTERNAL_PATH.slice(1);
}

/**
 * lib/menuLinks.ts
 * ------------------------------------------------------------------
 * 10.10.2026. Список ссылок на страницы разделов меню в порядке menu.json:
 * Спец. предложения (/promo), Напитки (/drinks), Блюда (/food), Полное меню
 * (/full-menu). Единый источник для бургер-меню (мобильные, раскрывающийся
 * список «Меню»), футера (десктоп, колонка «Меню») и ряда пилюль на
 * страницах разделов (CategoryNav) — чтобы состав и порядок не расходились.
 * Подпись — i18n-ключ categories.<id>. Раздел без страницы пропускается.
 * ------------------------------------------------------------------
 */

import { menuData } from '@/lib/data';
import { getCategoryPathname } from '@/lib/categoryRoutes';
import { FULL_MENU_CATEGORY_ID, getMenuPagePathname } from '@/lib/menuPageRoutes';
import type { Lang } from '@/lib/i18nConfig';

export interface MenuLink {
  /** id категории в menu.json (у «Полного меню» — 'full-menu'). */
  id: string;
  /** Ключ подписи в data/i18n/*.json. */
  labelKey: string;
  /** Публичный путь страницы раздела с префиксом языка. */
  href: string;
}

export function getMenuLinks(lang: Lang): MenuLink[] {
  const links: MenuLink[] = [];
  for (const category of menuData.categories) {
    const href =
      category.id === FULL_MENU_CATEGORY_ID ? getMenuPagePathname(lang) : getCategoryPathname(lang, category.id);
    if (href) links.push({ id: category.id, labelKey: `categories.${category.id}`, href });
  }
  return links;
}

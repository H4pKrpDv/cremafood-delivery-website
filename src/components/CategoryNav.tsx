/**
 * components/CategoryNav.tsx
 * ------------------------------------------------------------------
 * 09.10.2026. Пилюли разделов меню — НАСТОЯЩИЕ ССЫЛКИ (раньше были
 * кнопками-вкладками на главной, из-за чего адрес не менялся и на раздел
 * нельзя было направить трафик): Спец. предложения → /promo, Напитки →
 * /drinks, Блюда → /food, Полное меню → /menu. Переход обычный
 * (мягкая навигация Next), поэтому ряд на страницах разделов ощущается как
 * вкладки, хотя у каждого раздела свой адрес.
 *
 * activeId — какая пилюля подсвечена. current=true (страницы разделов и
 * /menu): активная пилюля помечается aria-current="page". На главной
 * (current=false) подсвечены «Напитки» только визуально — главная не
 * совпадает с адресом раздела.
 * ------------------------------------------------------------------
 */

'use client';

import Link from 'next/link';
import { useI18n } from '@/i18n/I18nProvider';
import { getCategoryPathname } from '@/lib/categoryRoutes';
import { FULL_MENU_CATEGORY_ID, getMenuPagePathname } from '@/lib/menuPageRoutes';
import { menuData } from '@/lib/data';
import type { Lang } from '@/lib/i18nConfig';

function pillHref(lang: Lang, categoryId: string): string | null {
  if (categoryId === FULL_MENU_CATEGORY_ID) return getMenuPagePathname(lang);
  return getCategoryPathname(lang, categoryId);
}

export function CategoryNav({ activeId, current = true }: { activeId?: string; current?: boolean }) {
  const { t, lang } = useI18n();
  return (
    <nav className="category-tabs" aria-label={t('menu.categoryTabsLabel')}>
      {menuData.categories.map((category) => {
        const href = pillHref(lang, category.id);
        if (!href) return null;
        const active = category.id === activeId;
        return (
          <Link
            key={category.id}
            href={href}
            className={`category-tab${active ? ' category-tab--active' : ''}`}
            aria-current={active && current ? 'page' : undefined}
          >
            {t(`categories.${category.id}`)}
          </Link>
        );
      })}
    </nav>
  );
}

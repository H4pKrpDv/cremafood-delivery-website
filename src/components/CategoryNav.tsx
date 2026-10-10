/**
 * components/CategoryNav.tsx
 * ------------------------------------------------------------------
 * 09.10.2026. Ряд пилюль разделов меню — НАСТОЯЩИЕ ССЫЛКИ: Спец.
 * предложения → /promo, Напитки → /drinks, Блюда → /food, Полное меню →
 * /menu. Переход обычный (мягкая навигация Next), поэтому ряд ощущается как
 * вкладки, хотя у каждого раздела свой адрес. Список — lib/menuLinks.ts.
 *
 * 10.10.2026: с главной ряд убран (там все разделы идут подряд), остался на
 * страницах разделов и /menu. activeId — подсвеченная пилюля
 * (aria-current="page").
 * ------------------------------------------------------------------
 */

'use client';

import Link from 'next/link';
import { useI18n } from '@/i18n/I18nProvider';
import { getMenuLinks } from '@/lib/menuLinks';

export function CategoryNav({ activeId }: { activeId?: string }) {
  const { t, lang } = useI18n();
  return (
    <nav className="category-tabs" aria-label={t('menu.categoryTabsLabel')}>
      {getMenuLinks(lang).map((link) => {
        const active = link.id === activeId;
        return (
          <Link
            key={link.id}
            href={link.href}
            className={`category-tab${active ? ' category-tab--active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            {t(link.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}

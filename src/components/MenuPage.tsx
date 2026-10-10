/**
 * components/MenuPage.tsx
 * ------------------------------------------------------------------
 * 09.10.2026. Страница «Полное меню» (/full-menu; до 10.10.2026 — /menu).
 * Серверная обёртка — app/[lang]/full-menu/page.tsx. Здесь: крошки, пилюли
 * разделов, ключевой H1 с вступлением, онлайн-просмотр страниц меню
 * (MenuViewer) и кнопки «Заказать напитки / блюда». SEO-текст (SeoText,
 * ключ page:full-menu) передаётся как children и выводится под контентом.
 *
 * 10.10.2026: вместо плашек-оглавления по разделам и плашки со ссылкой на PDF
 * — слайдер страниц меню (как на andys.md/restaurantmenu); переходы по
 * разделам остались в пилюлях (CategoryNav).
 * ------------------------------------------------------------------
 */

'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import { getCategoryPathname } from '@/lib/categoryRoutes';
import { FULL_MENU_CATEGORY_ID } from '@/lib/menuPageRoutes';
import { Breadcrumbs } from './Breadcrumbs';
import { CategoryNav } from './CategoryNav';
import { MenuViewer } from './MenuViewer';

export function MenuPage({ children }: { children?: ReactNode }) {
  const { t, lang } = useI18n();
  const drinksHref = getCategoryPathname(lang, 'cafe');
  const foodHref = getCategoryPathname(lang, 'kitchen');

  return (
    <main className="sub-page category-page menu-page">
      <div className="container">
        <Breadcrumbs items={[{ label: t('menuPage.crumb') }]} />
        <CategoryNav activeId={FULL_MENU_CATEGORY_ID} />
        <h1 className="category-group__title">{t('menuPage.h1')}</h1>
        <p className="menu-page__intro">{t('menuPage.intro')}</p>

        <MenuViewer />

        <section className="menu-page__order" aria-labelledby="menu-order-title">
          <h2 className="menu-page__order-title" id="menu-order-title">
            {t('fullMenu.orderTitle')}
          </h2>
          <div className="menu-page__order-actions">
            {drinksHref ? (
              <Link href={drinksHref} className="btn btn--primary menu-page__order-btn">
                {t('fullMenu.orderDrinks')}
              </Link>
            ) : null}
            {foodHref ? (
              <Link href={foodHref} className="btn btn--primary menu-page__order-btn">
                {t('fullMenu.orderFood')}
              </Link>
            ) : null}
          </div>
        </section>
      </div>
      {children}
    </main>
  );
}

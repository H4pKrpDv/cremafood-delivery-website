/**
 * components/SubcategoryPage.tsx
 * ------------------------------------------------------------------
 * 08.10.2026. Страница подкатегории меню (/drinks/kofe и т.д.). Серверная
 * обёртка — app/[lang]/[section]/[subcategory]/page.tsx.
 *
 * Состав: хлебные крошки (Главная → Раздел → Подкатегория) → h1 + описание
 * → сетка позиций (те же ItemCard, что раньше жили на главной). Header и
 * Footer — общие из layout. Баннер подкатегории на странице не повторяется
 * (он служит плиткой-ссылкой на главной).
 *
 * 09.10.2026 (SEO этап 3): h1 — ключевой («Доставка кофе в Бельцах», i18n
 * subcategorySeo.<id>.h1; в крошках и на баннерах остаётся короткое
 * название). children — SEO-текст «Читать далее» (серверный SeoText,
 * передаётся из серверной страницы), выводится под сеткой позиций внутри
 * <main>, как на странице категории.
 *
 * Крошки (components/Breadcrumbs.tsx): «Главная» и категория — ссылки
 * (страница категории есть, см. lib/categoryRoutes.ts), текущая
 * подкатегория — aria-current.
 * ------------------------------------------------------------------
 */

'use client';

import type { ReactNode } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import { getSubcategoryCategoryId, getSubcategoryData } from '@/lib/subcategoryRoutes';
import { Breadcrumbs, categoryCrumb } from './Breadcrumbs';
import { ItemCard } from './ItemCard';
import { LoyaltyCard } from './LoyaltyCard';

export function SubcategoryPage({ subId, children }: { subId: string; children?: ReactNode }) {
  const { t, lang } = useI18n();
  const sub = getSubcategoryData(subId);
  const categoryId = getSubcategoryCategoryId(subId);
  if (!sub || !categoryId) return null;

  const title = t(`subcategories.${subId}.title`);

  return (
    <main className="sub-page">
      <div className="container">
        <Breadcrumbs
          items={[categoryCrumb(t(`categories.${categoryId}`), categoryId), { label: title }]}
        />

        <header className="sub-page__header">
          <h1 className="sub-page__title">{t(`subcategorySeo.${subId}.h1`) || title}</h1>
          <p className="sub-page__desc">{t(`subcategories.${subId}.desc`)}</p>
        </header>

        <div className="items-grid">
          {sub.items.map((item) => (
            <ItemCard key={item.id} itemId={item.id} />
          ))}
          {subId === 'promo-permanent' ? <LoyaltyCard /> : null}
        </div>
      </div>
      {children}
    </main>
  );
}

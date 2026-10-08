/**
 * components/CategoryPage.tsx
 * ------------------------------------------------------------------
 * 08.10.2026. Страница категории меню (/drinks, /food, /promo). Серверная
 * обёртка — app/[lang]/[section]/page.tsx.
 *
 * Максимально просто (решение пользователя): Header и Footer общие из
 * layout, в <main> — ровно то, что показывает вкладка этой категории на
 * главной: заголовок с названием категории по центру и сетка баннеров
 * подкатегорий (те же SubcategoryBanner и те же классы .category-group__title
 * / .sub-grid, поэтому вид совпадает с вкладкой). Над заголовком — хлебные
 * крошки «Главная → Категория» (добавлены позже, 08.10.2026), описания нет.
 * Заголовок здесь — h1 (на главной тот же стиль у h3).
 *
 * 09.10.2026 (SEO этап 2): h1 — ключевой («Доставка напитков в Бельцах»,
 * i18n categorySeo.<id>.h1), в крошках и на вкладках остаётся короткое
 * название. children — SEO-текст «Читать далее» (серверный компонент SeoText,
 * передаётся из серверной страницы), выводится под сеткой, внутри <main>.
 *
 * 09.10.2026: под крошками — ряд пилюль разделов (CategoryNav) с подсвеченным
 * текущим разделом.
 * ------------------------------------------------------------------
 */

'use client';

import { useI18n } from '@/i18n/I18nProvider';
import { getCategorySubcategoryIds } from '@/lib/categoryRoutes';
import type { ReactNode } from 'react';
import { Breadcrumbs } from './Breadcrumbs';
import { CategoryNav } from './CategoryNav';
import { SubcategoryBanner } from './SubcategoryBanner';

export function CategoryPage({ categoryId, children }: { categoryId: string; children?: ReactNode }) {
  const { t } = useI18n();
  const subIds = getCategorySubcategoryIds(categoryId);
  if (subIds.length === 0) return null;

  return (
    <main className="sub-page category-page">
      <div className="container">
        <Breadcrumbs items={[{ label: t(`categories.${categoryId}`) }]} />
        {/* 09.10.2026: тот же ряд пилюль, что и на главной, — разделы переключаются
            как вкладки, но у каждого свой адрес. */}
        <CategoryNav activeId={categoryId} />
        <h1 className="category-group__title">{t(`categorySeo.${categoryId}.h1`) || t(`categories.${categoryId}`)}</h1>
        <div className="sub-grid">
          {subIds.map((subId) => (
            <SubcategoryBanner key={subId} subId={subId} />
          ))}
        </div>
      </div>
      {children}
    </main>
  );
}

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
 * ------------------------------------------------------------------
 */

'use client';

import { useI18n } from '@/i18n/I18nProvider';
import { getCategorySubcategoryIds } from '@/lib/categoryRoutes';
import { Breadcrumbs } from './Breadcrumbs';
import { SubcategoryBanner } from './SubcategoryBanner';

export function CategoryPage({ categoryId }: { categoryId: string }) {
  const { t } = useI18n();
  const subIds = getCategorySubcategoryIds(categoryId);
  if (subIds.length === 0) return null;

  return (
    <main className="sub-page category-page">
      <div className="container">
        <Breadcrumbs items={[{ label: t(`categories.${categoryId}`) }]} />
        <h1 className="category-group__title">{t(`categories.${categoryId}`)}</h1>
        <div className="sub-grid">
          {subIds.map((subId) => (
            <SubcategoryBanner key={subId} subId={subId} />
          ))}
        </div>
      </div>
    </main>
  );
}

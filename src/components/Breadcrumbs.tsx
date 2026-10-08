/**
 * components/Breadcrumbs.tsx
 * ------------------------------------------------------------------
 * 08.10.2026. Общие хлебные крошки страниц категории, подкатегории и
 * позиции (раньше разметка дублировалась в ItemPage и SubcategoryPage).
 * Последний пункт — текущая страница (aria-current, без ссылки); у
 * промежуточных есть ссылка, если задан href, иначе — обычный текст.
 * Разметка BreadcrumbList для поисковиков строится отдельно, на сервере
 * (lib/categorySeo.ts, lib/subcategorySeo.ts, lib/itemSeo.ts) и должна
 * повторять те же уровни.
 * ------------------------------------------------------------------
 */

'use client';

import Link from 'next/link';
import { useI18n } from '@/i18n/I18nProvider';
import { localizedPath } from '@/lib/i18nConfig';
import { getCategoryInternalPath } from '@/lib/categoryRoutes';

export interface BreadcrumbItem {
  label: string;
  /** Путь БЕЗ префикса языка ('/drinks') или undefined — пункт без ссылки. */
  path?: string;
}

/** Крошки «Главная → … → текущая страница»: items — всё, что между ними и сама страница. */
export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  const { t, lang } = useI18n();
  const all: BreadcrumbItem[] = [{ label: t('itemPage.home'), path: '/' }, ...items];
  return (
    <nav className="breadcrumbs" aria-label={t('itemPage.breadcrumbsLabel')}>
      <ol className="breadcrumbs__list">
        {all.map((item, index) => {
          const last = index === all.length - 1;
          return (
            <li key={`${index}-${item.label}`}>
              {last ? (
                <span className="breadcrumbs__current" aria-current="page">
                  {item.label}
                </span>
              ) : item.path ? (
                <Link href={localizedPath(lang, item.path)} className="breadcrumbs__link">
                  {item.label}
                </Link>
              ) : (
                <span>{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Пункт крошек для категории: со ссылкой на её страницу, если страница есть. */
export function categoryCrumb(label: string, categoryId: string): BreadcrumbItem {
  return { label, path: getCategoryInternalPath(categoryId) ?? undefined };
}

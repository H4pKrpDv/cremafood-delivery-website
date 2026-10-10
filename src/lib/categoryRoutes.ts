/**
 * lib/categoryRoutes.ts
 * ------------------------------------------------------------------
 * 08.10.2026. Адреса страниц КАТЕГОРИЙ меню (разделов): /drinks, /food,
 * /promo. Слаг раздела (SECTION_SLUGS в data/routes.ts) одинаков на всех
 * языках, поэтому и адрес один: ru /drinks, ro /ro/drinks, en /en/drinks
 * (редиректов «чужого» слага, как у подкатегорий, не нужно).
 *
 * Страница есть у категории, у которой есть слаг раздела и хотя бы одна
 * подкатегория со своей страницей (lib/subcategoryRoutes.ts). У категории
 * «Полное меню» страницы нет (одна плашка-ссылка на страницу /full-menu).
 *
 * Файл без React и без серверных API — его используют серверные
 * компоненты (страница категории, sitemap) и клиентские (Header —
 * переключатель языка, CategoryPage).
 * ------------------------------------------------------------------
 */

import { menuData } from '@/lib/data';
import { LANGS, isLang, localizedPath, type Lang } from '@/lib/i18nConfig';
import { SECTION_SLUGS } from '@/data/routes';
import { hasSubcategoryPage } from '@/lib/subcategoryRoutes';
import { isFullMenuSubcategory } from '@/types/menu';

/** id подкатегорий категории, у которых есть страница (в порядке меню). */
export function getCategorySubcategoryIds(categoryId: string): string[] {
  const category = menuData.categories.find((item) => item.id === categoryId);
  if (!category) return [];
  return category.subcategories
    .filter((sub) => !isFullMenuSubcategory(sub) && hasSubcategoryPage(sub.id))
    .map((sub) => sub.id);
}

/** Есть ли у категории своя страница. */
export function hasCategoryPage(categoryId: string): boolean {
  return Boolean(SECTION_SLUGS[categoryId]) && getCategorySubcategoryIds(categoryId).length > 0;
}

/** Внутренний путь БЕЗ префикса языка: '/drinks'. */
export function getCategoryInternalPath(categoryId: string): string | null {
  return hasCategoryPage(categoryId) ? `/${SECTION_SLUGS[categoryId]}` : null;
}

/** Публичный путь страницы категории: ru → '/drinks', ro → '/ro/drinks'. */
export function getCategoryPathname(lang: Lang, categoryId: string): string | null {
  const internal = getCategoryInternalPath(categoryId);
  return internal ? localizedPath(lang, internal) : null;
}

const CATEGORY_BY_SECTION: Record<string, string> = Object.fromEntries(
  Object.entries(SECTION_SLUGS).map(([categoryId, section]) => [section, categoryId])
);

export type CategoryResolution = { kind: 'ok'; categoryId: string } | { kind: 'notFound' };

/** Что делать с запросом /<lang>/<section>: страница категории или 404. */
export function resolveCategoryRoute(section: string): CategoryResolution {
  const categoryId = CATEGORY_BY_SECTION[section];
  return categoryId && hasCategoryPage(categoryId) ? { kind: 'ok', categoryId } : { kind: 'notFound' };
}

/**
 * id категории по адресу из браузера (usePathname) — для переключателя
 * языка в шапке. Префикс языка отбрасывается; адрес должен состоять ровно
 * из слага раздела.
 */
export function findCategoryIdByPathname(pathname: string): string | null {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length > 0 && isLang(segments[0])) segments.shift();
  if (segments.length !== 1) return null;
  const result = resolveCategoryRoute(segments[0]);
  return result.kind === 'ok' ? result.categoryId : null;
}

export interface CategoryPageParams {
  lang: Lang;
  section: string;
}

/** Все страницы категорий на всех языках — для generateStaticParams. */
export function listCategoryPageParams(): CategoryPageParams[] {
  const params: CategoryPageParams[] = [];
  for (const categoryId of listSitemapCategoryIds()) {
    for (const lang of LANGS) params.push({ lang, section: SECTION_SLUGS[categoryId] });
  }
  return params;
}

/** id категорий для sitemap.xml. */
export function listSitemapCategoryIds(): string[] {
  return Object.keys(SECTION_SLUGS).filter(hasCategoryPage);
}

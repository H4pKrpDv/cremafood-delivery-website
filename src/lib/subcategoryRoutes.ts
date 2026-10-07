/**
 * lib/subcategoryRoutes.ts
 * ------------------------------------------------------------------
 * 08.10.2026. Адреса страниц подкатегорий меню: сборка URL, разбор URL,
 * списки для generateStaticParams и sitemap. Слаги — те же таблицы
 * data/routes.ts (SECTION_SLUGS + SUBCATEGORY_SLUGS), что и в адресах
 * позиций (lib/itemRoutes.ts), поэтому адрес подкатегории — это ровно
 * «начало» адреса её позиций:
 *   ru: /drinks/kofe        ro: /ro/drinks/cafea        en: /en/drinks/coffee
 *   позиция: /drinks/kofe/latte
 *
 * Страницы есть только у подкатегорий с позициями (isSubRenderable, не
 * «карточка полного меню»): пустые заглушки (promo-new, пока нет позиций)
 * и категория «Полное меню» страниц не получают — ссылаться на них нельзя.
 *
 * Файл без React и без серверных API — его используют и серверные
 * компоненты (страница подкатегории, sitemap), и клиентские (баннеры на
 * главной, Header — переключатель языка).
 *
 * Страниц РАЗДЕЛОВ (/drinks, /food, /promo) пока нет — это отдельный этап
 * (хабы с SEO-текстом), поэтому в крошках раздел — обычный текст, а в
 * BreadcrumbList его уровня нет.
 * ------------------------------------------------------------------
 */

import { menuData } from '@/lib/data';
import { LANGS, isLang, localizedPath, type Lang } from '@/lib/i18nConfig';
import { SECTION_SLUGS, SUBCATEGORY_SLUGS } from '@/data/routes';
import { isFullMenuSubcategory, isSubRenderable, type MenuSubcategoryItems } from '@/types/menu';

// id подкатегории → id её категории (только отрисовываемые обычные подкатегории).
const CATEGORY_BY_SUBCATEGORY: Record<string, string> = (() => {
  const index: Record<string, string> = {};
  for (const category of menuData.categories) {
    for (const sub of category.subcategories) {
      if (isFullMenuSubcategory(sub) || !isSubRenderable(sub)) continue;
      index[sub.id] = category.id;
    }
  }
  return index;
})();

// id подкатегории → её данные из menu.json (баннер, позиции).
const SUBCATEGORY_DATA: Record<string, MenuSubcategoryItems> = (() => {
  const index: Record<string, MenuSubcategoryItems> = {};
  for (const category of menuData.categories) {
    for (const sub of category.subcategories) {
      if (!isFullMenuSubcategory(sub) && isSubRenderable(sub)) index[sub.id] = sub;
    }
  }
  return index;
})();

/** Данные подкатегории из menu.json (позиции, путь к баннеру) или null. */
export function getSubcategoryData(subId: string): MenuSubcategoryItems | null {
  return SUBCATEGORY_DATA[subId] ?? null;
}

/** Есть ли у подкатегории своя страница. */
export function hasSubcategoryPage(subId: string): boolean {
  const categoryId = CATEGORY_BY_SUBCATEGORY[subId];
  return Boolean(categoryId && SECTION_SLUGS[categoryId] && SUBCATEGORY_SLUGS[subId]);
}

/** id категории подкатегории (или null, если страницы нет). */
export function getSubcategoryCategoryId(subId: string): string | null {
  return hasSubcategoryPage(subId) ? CATEGORY_BY_SUBCATEGORY[subId] : null;
}

/** Внутренний путь БЕЗ префикса языка: '/drinks/cafea' (подставляется в localizedPath). */
export function getSubcategoryInternalPath(lang: Lang, subId: string): string | null {
  if (!hasSubcategoryPage(subId)) return null;
  return `/${SECTION_SLUGS[CATEGORY_BY_SUBCATEGORY[subId]]}/${SUBCATEGORY_SLUGS[subId][lang]}`;
}

/** Публичный путь страницы подкатегории: ru → '/drinks/kofe', ro → '/ro/drinks/cafea'. */
export function getSubcategoryPathname(lang: Lang, subId: string): string | null {
  const internal = getSubcategoryInternalPath(lang, subId);
  return internal ? localizedPath(lang, internal) : null;
}

/** Публичные пути страницы подкатегории на всех языках (переключатель языка, hreflang). */
export function getSubcategoryPathnames(subId: string): Record<Lang, string> | null {
  if (!hasSubcategoryPage(subId)) return null;
  const result = {} as Record<Lang, string>;
  for (const lang of LANGS) result[lang] = getSubcategoryPathname(lang, subId) as string;
  return result;
}

// ── Разбор адресов ────────────────────────────────────────────────

const CATEGORY_BY_SECTION: Record<string, string> = Object.fromEntries(
  Object.entries(SECTION_SLUGS).map(([categoryId, section]) => [section, categoryId])
);

// categoryId → (слаг любого языка → id подкатегории). Слаг ищется по ВСЕМ
// языкам, чтобы адрес с «чужим» слагом (/ro/drinks/coffee) перенаправить на
// правильный (/ro/drinks/cafea), а не отдать 404 — так же, как у позиций.
const SUBCATEGORY_BY_CATEGORY_AND_SLUG: Record<string, Record<string, string>> = (() => {
  const index: Record<string, Record<string, string>> = {};
  for (const subId of Object.keys(CATEGORY_BY_SUBCATEGORY)) {
    if (!hasSubcategoryPage(subId)) continue;
    const bucket = (index[CATEGORY_BY_SUBCATEGORY[subId]] ||= {});
    for (const lang of LANGS) bucket[SUBCATEGORY_SLUGS[subId][lang]] ||= subId;
  }
  return index;
})();

export type SubcategoryResolution =
  | { kind: 'ok'; subId: string }
  | { kind: 'redirect'; to: string }
  | { kind: 'notFound' };

/**
 * Что делать с запросом /<lang>/<section>/<slug>:
 *  ok       — адрес канонический, показываем страницу;
 *  redirect — подкатегория есть, но слаг чужого языка → постоянный редирект;
 *  notFound — такой подкатегории нет (404).
 */
export function resolveSubcategoryRoute(lang: Lang, section: string, slug: string): SubcategoryResolution {
  const categoryId = CATEGORY_BY_SECTION[section];
  if (!categoryId) return { kind: 'notFound' };
  const subId = SUBCATEGORY_BY_CATEGORY_AND_SLUG[categoryId]?.[slug];
  if (!subId) return { kind: 'notFound' };
  const canonical = getSubcategoryPathname(lang, subId) as string;
  const requested = localizedPath(lang, `/${section}/${slug}`);
  return canonical === requested ? { kind: 'ok', subId } : { kind: 'redirect', to: canonical };
}

/**
 * id подкатегории по адресу из браузера (usePathname) — для переключателя
 * языка в шапке. Префикс языка отбрасывается; адрес должен быть ТОЧНО
 * канонической страницей подкатегории на языке lang.
 */
export function findSubcategoryIdByPathname(pathname: string, lang: Lang): string | null {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length > 0 && isLang(segments[0])) segments.shift();
  if (segments.length !== 2) return null;
  const result = resolveSubcategoryRoute(lang, segments[0], segments[1]);
  return result.kind === 'ok' ? result.subId : null;
}

// ── Списки для generateStaticParams и sitemap ─────────────────────

export interface SubcategoryPageParams {
  lang: Lang;
  section: string;
  subcategory: string;
}

/** Все страницы подкатегорий на всех языках — для generateStaticParams. */
export function listSubcategoryPageParams(): SubcategoryPageParams[] {
  const params: SubcategoryPageParams[] = [];
  for (const subId of Object.keys(CATEGORY_BY_SUBCATEGORY)) {
    if (!hasSubcategoryPage(subId)) continue;
    for (const lang of LANGS) {
      params.push({
        lang,
        section: SECTION_SLUGS[CATEGORY_BY_SUBCATEGORY[subId]],
        subcategory: SUBCATEGORY_SLUGS[subId][lang]
      });
    }
  }
  return params;
}

/** id подкатегорий для sitemap.xml. */
export function listSitemapSubcategoryIds(): string[] {
  return Object.keys(CATEGORY_BY_SUBCATEGORY).filter(hasSubcategoryPage);
}

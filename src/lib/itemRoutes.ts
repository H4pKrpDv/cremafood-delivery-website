/**
 * lib/itemRoutes.ts
 * ------------------------------------------------------------------
 * 07.10.2026. Адреса страниц позиций меню: сборка URL, разбор URL,
 * статусы. Сами слаги и статусы — в data/routes.ts (единый источник),
 * редиректы — в data/redirects.ts.
 *
 * Файл без React и без обращения к серверным API — его используют и
 * серверные компоненты (страница позиции, sitemap), и клиентские
 * (ItemCard — ссылка на название, Header — переключатель языка).
 *
 * Схема адреса: /[lang?]/<раздел>/<подкатегория>/<позиция>
 *   ru: /drinks/kofe/latte   ro: /ro/drinks/cafea/latte   en: /en/drinks/coffee/latte
 * Раздел (drinks/food/promo) одинаков на всех языках, остальные
 * сегменты — свои на каждый язык (см. data/routes.ts).
 * ------------------------------------------------------------------
 */

import { itemMetaIndex } from '@/lib/data';
import { LANGS, isLang, localizedPath, type Lang } from '@/lib/i18nConfig';
import { SECTION_SLUGS, SUBCATEGORY_SLUGS, ITEM_SLUGS, ITEM_STATUS, type ItemStatus } from '@/data/routes';

// ── Статус позиции ────────────────────────────────────────────────

export interface ResolvedItemStatus {
  status: ItemStatus;
  replacedBy?: string;
}

/**
 * Статус позиции: явная запись в ITEM_STATUS, иначе 'unavailable' для
 * позиций с available:false в menu.json, иначе 'active'. Правила — в
 * комментарии к ITEM_STATUS (data/routes.ts).
 */
export function getItemStatus(itemId: string): ResolvedItemStatus {
  const explicit = ITEM_STATUS[itemId];
  if (explicit) return explicit;
  const base = itemMetaIndex[itemId];
  if (base && base.available === false) return { status: 'unavailable' };
  return { status: 'active' };
}

// ── Сборка адресов ────────────────────────────────────────────────

/** Есть ли у позиции страница (она описана в меню и для неё заданы слаги на всех языках). */
export function hasItemPage(itemId: string): boolean {
  const base = itemMetaIndex[itemId];
  if (!base) return false;
  return Boolean(SECTION_SLUGS[base.categoryId] && SUBCATEGORY_SLUGS[base.subcategoryId] && ITEM_SLUGS[itemId]);
}

/** Внутренний путь БЕЗ префикса языка: '/drinks/cafea/latte' (подставляется в localizedPath). */
export function getItemInternalPath(lang: Lang, itemId: string): string | null {
  if (!hasItemPage(itemId)) return null;
  const base = itemMetaIndex[itemId];
  return `/${SECTION_SLUGS[base.categoryId]}/${SUBCATEGORY_SLUGS[base.subcategoryId][lang]}/${ITEM_SLUGS[itemId][lang]}`;
}

/** Публичный путь страницы позиции на языке: ru → '/drinks/kofe/latte', ro → '/ro/drinks/cafea/latte'. */
export function getItemPathname(lang: Lang, itemId: string): string | null {
  const internal = getItemInternalPath(lang, itemId);
  return internal ? localizedPath(lang, internal) : null;
}

/** Публичные пути страницы позиции на всех языках (для hreflang и переключателя языка). */
export function getItemPathnames(itemId: string): Record<Lang, string> | null {
  if (!hasItemPage(itemId)) return null;
  const result = {} as Record<Lang, string>;
  for (const lang of LANGS) result[lang] = getItemPathname(lang, itemId) as string;
  return result;
}

// ── Разбор адресов ────────────────────────────────────────────────

const CATEGORY_BY_SECTION: Record<string, string> = Object.fromEntries(
  Object.entries(SECTION_SLUGS).map(([categoryId, section]) => [section, categoryId])
);

// categoryId → (слаг любого языка → id позиции). Слаг ищется по ВСЕМ языкам,
// чтобы адрес с «чужим» слагом (например /ro/drinks/coffee/latte) можно было
// перенаправить на правильный (а не отдать 404).
const ITEM_BY_CATEGORY_AND_SLUG: Record<string, Record<string, string>> = (() => {
  const index: Record<string, Record<string, string>> = {};
  for (const itemId of Object.keys(ITEM_SLUGS)) {
    const base = itemMetaIndex[itemId];
    if (!base) continue;
    const bucket = (index[base.categoryId] ||= {});
    for (const lang of LANGS) bucket[ITEM_SLUGS[itemId][lang]] ||= itemId;
  }
  return index;
})();

export type ItemResolution =
  | { kind: 'ok'; itemId: string }
  | { kind: 'redirect'; to: string }
  | { kind: 'gone' }
  | { kind: 'notFound' };

/**
 * Что делать с запросом /<lang>/<section>/<subcategory>/<slug>:
 *  ok       — адрес канонический, показываем страницу;
 *  redirect — позиция есть, но адрес не канонический (слаг/подкатегория
 *             другого языка, ошибка в сегменте) или позиция архивирована с
 *             заменой → постоянный редирект на правильный адрес;
 *  gone     — позиция архивирована без замены (410);
 *  notFound — такой позиции нет (404).
 */
export function resolveItemRoute(lang: Lang, section: string, subcategory: string, slug: string): ItemResolution {
  const categoryId = CATEGORY_BY_SECTION[section];
  if (!categoryId) return { kind: 'notFound' };
  const itemId = ITEM_BY_CATEGORY_AND_SLUG[categoryId]?.[slug];
  if (!itemId || !hasItemPage(itemId)) return { kind: 'notFound' };

  const { status, replacedBy } = getItemStatus(itemId);
  if (status === 'archived') {
    const target = replacedBy && replacedBy !== itemId && hasItemPage(replacedBy) ? getItemPathname(lang, replacedBy) : null;
    return target ? { kind: 'redirect', to: target } : { kind: 'gone' };
  }

  const canonical = getItemPathname(lang, itemId) as string;
  const requested = localizedPath(lang, `/${section}/${subcategory}/${slug}`);
  return canonical === requested ? { kind: 'ok', itemId } : { kind: 'redirect', to: canonical };
}

/**
 * id позиции по адресу из браузера (usePathname) — для переключателя языка
 * в шапке. Префикс языка (/ro, /en, а на всякий случай и /ru) отбрасывается;
 * адрес должен быть ТОЧНО канонической страницей позиции на языке lang.
 */
export function findItemIdByPathname(pathname: string, lang: Lang): string | null {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length > 0 && isLang(segments[0])) segments.shift();
  if (segments.length !== 3) return null;
  const result = resolveItemRoute(lang, segments[0], segments[1], segments[2]);
  return result.kind === 'ok' ? result.itemId : null;
}

// ── Списки для generateStaticParams и sitemap ─────────────────────

export interface ItemPageParams {
  lang: Lang;
  section: string;
  subcategory: string;
  item: string;
}

/** Все страницы позиций на всех языках (кроме архивных) — для generateStaticParams. */
export function listItemPageParams(): ItemPageParams[] {
  const params: ItemPageParams[] = [];
  for (const itemId of Object.keys(ITEM_SLUGS)) {
    if (!hasItemPage(itemId) || getItemStatus(itemId).status === 'archived') continue;
    const base = itemMetaIndex[itemId];
    for (const lang of LANGS) {
      params.push({
        lang,
        section: SECTION_SLUGS[base.categoryId],
        subcategory: SUBCATEGORY_SLUGS[base.subcategoryId][lang],
        item: ITEM_SLUGS[itemId][lang]
      });
    }
  }
  return params;
}

/** id позиций, которые должны попасть в sitemap.xml: active и unavailable (не archived). */
export function listSitemapItemIds(): string[] {
  return Object.keys(ITEM_SLUGS).filter((itemId) => hasItemPage(itemId) && getItemStatus(itemId).status !== 'archived');
}

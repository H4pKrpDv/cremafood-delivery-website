/**
 * lib/itemSeo.ts
 * ------------------------------------------------------------------
 * 07.10.2026. SEO страницы позиции меню: <title>/description/canonical/
 * hreflang/Open Graph (generateMetadata) и JSON-LD (Product + Offer,
 * BreadcrumbList). Только серверная логика — без React.
 *
 * Правила (решения пользователя, см. Context.md):
 *  - hreflang и индексация — по INDEXABLE_LANGS (lib/i18nConfig.ts): пока
 *    ro/en не переведены, их страницы позиций — noindex, follow и без
 *    hreflang (тот же механизм, что у главной).
 *  - BreadcrumbList в JSON-LD: «Главная → Категория → Подкатегория →
 *    Позиция» (уровни категории и подкатегории — когда у них есть
 *    страницы; ссылаться на несуществующие адреса нельзя). Повторяет
 *    видимые крошки (components/Breadcrumbs.tsx).
 *  - Статус позиции влияет на Offer.availability (unavailable → OutOfStock).
 * ------------------------------------------------------------------
 */

import type { Metadata } from 'next';
import { itemMetaIndex, publicImagePath } from '@/lib/data';
import { createTranslator } from '@/lib/i18nCore';
import { HREFLANG, INDEXABLE_LANGS, LANGS, OG_LOCALE, DEFAULT_LANG, isIndexableLang, type Lang } from '@/lib/i18nConfig';
import { BUSINESS, SITE_URL, absoluteUrl } from '@/lib/seo';
import { getItemInternalPath, getItemPathname, getItemStatus } from '@/lib/itemRoutes';
import { hasSubcategoryPage } from '@/lib/subcategoryRoutes';
import { hasCategoryPage } from '@/lib/categoryRoutes';
import { categoryUrl } from '@/lib/categorySeo';
import { subcategoryUrl } from '@/lib/subcategorySeo';

const DESCRIPTION_SNIPPET_MAX = 90;

// Обрезка по границе слова с многоточием — чтобы meta description не
// превышал ~160 символов (Google всё равно обрежет, но лучше обрезать
// самим и по слову).
function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:—-]+$/, '')}…`;
}

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? values[key] : match));
}

function itemUrl(lang: Lang, itemId: string): string {
  return absoluteUrl(lang, getItemInternalPath(lang, itemId) ?? '/');
}

function itemImageAbsolute(itemId: string): string {
  const base = itemMetaIndex[itemId];
  return base && base.hasImage ? `${SITE_URL}${publicImagePath(base.image)}` : `${SITE_URL}/img/og_default.png`;
}

/** hreflang-альтернативы позиции: только индексируемые языки + x-default (если языков больше одного). */
function buildItemAlternates(itemId: string): Record<string, string> | undefined {
  if (INDEXABLE_LANGS.length < 2) return undefined;
  const languages: Record<string, string> = {};
  for (const lang of INDEXABLE_LANGS) languages[HREFLANG[lang]] = itemUrl(lang, itemId);
  languages['x-default'] = itemUrl(DEFAULT_LANG, itemId);
  return languages;
}

export function buildItemMetadata(lang: Lang, itemId: string): Metadata {
  const t = createTranslator(lang);
  const base = itemMetaIndex[itemId];
  const name = t(`items.${itemId}.name`) || itemId;
  const desc = truncate(t(`items.${itemId}.desc`), DESCRIPTION_SNIPPET_MAX);
  const title = fill(t('itemPage.metaTitle'), { name });
  const description = fill(t('itemPage.metaDescription'), { name, desc, price: String(base.price) });
  const indexable = isIndexableLang(lang);
  const languages = indexable ? buildItemAlternates(itemId) : undefined;
  const ogImage = base.hasImage ? publicImagePath(base.image) : '/img/og_default.png';
  const imageAlt = t(`items.${itemId}.imageAlt`) || name;
  // Публичный путь страницы на этом языке (ru — без префикса): metadataBase
  // превратит его в абсолютный canonical.
  const canonicalPath = getItemPathname(lang, itemId) ?? undefined;

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    alternates: { ...(canonicalPath ? { canonical: canonicalPath } : {}), ...(languages ? { languages } : {}) },
    robots: indexable ? undefined : { index: false, follow: true },
    openGraph: {
      type: 'website',
      siteName: BUSINESS.name,
      title,
      description,
      url: canonicalPath,
      images: [{ url: ogImage, alt: imageAlt }],
      locale: OG_LOCALE[lang],
      alternateLocale: LANGS.filter((code) => code !== lang).map((code) => OG_LOCALE[code])
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [{ url: ogImage, alt: imageAlt }]
    }
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildItemJsonLd(lang: Lang, itemId: string): Record<string, any>[] {
  const t = createTranslator(lang);
  const base = itemMetaIndex[itemId];
  const name = t(`items.${itemId}.name`) || itemId;
  const url = itemUrl(lang, itemId);
  const { status } = getItemStatus(itemId);

  const product = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description: t(`items.${itemId}.desc`),
    image: [itemImageAbsolute(itemId)],
    sku: itemId,
    brand: { '@type': 'Brand', name: BUSINESS.name },
    category: `${t(`categories.${base.categoryId}`)} / ${t(`subcategories.${base.subcategoryId}.title`)}`,
    url,
    inLanguage: HREFLANG[lang],
    offers: {
      '@type': 'Offer',
      url,
      price: String(base.price),
      priceCurrency: 'MDL',
      availability: status === 'unavailable' ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
      seller: { '@type': 'Restaurant', name: BUSINESS.name, url: absoluteUrl(lang) }
    }
  };

  const crumbs: { name: string; item: string }[] = [{ name: t('itemPage.home'), item: absoluteUrl(lang) }];
  if (hasCategoryPage(base.categoryId)) {
    crumbs.push({ name: t(`categories.${base.categoryId}`), item: categoryUrl(lang, base.categoryId) });
  }
  if (hasSubcategoryPage(base.subcategoryId)) {
    crumbs.push({ name: t(`subcategories.${base.subcategoryId}.title`), item: subcategoryUrl(lang, base.subcategoryId) });
  }
  crumbs.push({ name, item: url });
  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({ '@type': 'ListItem', position: index + 1, ...crumb }))
  };

  return [product, breadcrumbs];
}

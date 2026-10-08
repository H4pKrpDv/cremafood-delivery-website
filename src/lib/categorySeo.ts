/**
 * lib/categorySeo.ts
 * ------------------------------------------------------------------
 * 08.10.2026. SEO страницы категории (/drinks, /food, /promo):
 * <title>/description/canonical/hreflang/Open Graph (generateMetadata) и
 * JSON-LD (CollectionPage со списком подкатегорий). Только серверная
 * логика — без React.
 *
 * Правила — те же, что у подкатегорий (lib/subcategorySeo.ts): hreflang и
 * индексация по INDEXABLE_LANGS (пока ro/en не переведены — noindex,
 * follow и без hreflang). BreadcrumbList: «Главная → Категория» — как и
 * видимые крошки на странице (components/Breadcrumbs.tsx).
 * ------------------------------------------------------------------
 */

import type { Metadata } from 'next';
import { createTranslator } from '@/lib/i18nCore';
import { HREFLANG, INDEXABLE_LANGS, LANGS, OG_LOCALE, DEFAULT_LANG, isIndexableLang, type Lang } from '@/lib/i18nConfig';
import { BUSINESS, SITE_URL, absoluteUrl } from '@/lib/seo';
import { getCategoryInternalPath, getCategoryPathname, getCategorySubcategoryIds } from '@/lib/categoryRoutes';
import { getSubcategoryInternalPath } from '@/lib/subcategoryRoutes';

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? values[key] : match));
}

export function categoryUrl(lang: Lang, categoryId: string): string {
  return absoluteUrl(lang, getCategoryInternalPath(categoryId) ?? '/');
}

function buildCategoryAlternates(categoryId: string): Record<string, string> | undefined {
  if (INDEXABLE_LANGS.length < 2) return undefined;
  const languages: Record<string, string> = {};
  for (const lang of INDEXABLE_LANGS) languages[HREFLANG[lang]] = categoryUrl(lang, categoryId);
  languages['x-default'] = categoryUrl(DEFAULT_LANG, categoryId);
  return languages;
}

export function buildCategoryMetadata(lang: Lang, categoryId: string): Metadata {
  const t = createTranslator(lang);
  const title = t(`categories.${categoryId}`) || categoryId;
  const list = getCategorySubcategoryIds(categoryId)
    .map((subId) => t(`subcategories.${subId}.title`))
    .join(', ');
  const metaTitle = fill(t('categoryPage.metaTitle'), { title });
  const metaDescription = fill(t('categoryPage.metaDescription'), { title, list });
  const indexable = isIndexableLang(lang);
  const languages = indexable ? buildCategoryAlternates(categoryId) : undefined;
  const canonicalPath = getCategoryPathname(lang, categoryId) ?? undefined;
  const ogImage = '/img/og_default.png';

  return {
    metadataBase: new URL(SITE_URL),
    title: metaTitle,
    description: metaDescription,
    alternates: { ...(canonicalPath ? { canonical: canonicalPath } : {}), ...(languages ? { languages } : {}) },
    robots: indexable ? undefined : { index: false, follow: true },
    openGraph: {
      type: 'website',
      siteName: BUSINESS.name,
      title: metaTitle,
      description: metaDescription,
      url: canonicalPath,
      images: [{ url: ogImage, alt: title }],
      locale: OG_LOCALE[lang],
      alternateLocale: LANGS.filter((code) => code !== lang).map((code) => OG_LOCALE[code])
    },
    twitter: {
      card: 'summary_large_image',
      title: metaTitle,
      description: metaDescription,
      images: [{ url: ogImage, alt: title }]
    }
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildCategoryJsonLd(lang: Lang, categoryId: string): Record<string, any>[] {
  const t = createTranslator(lang);
  const title = t(`categories.${categoryId}`) || categoryId;
  const subIds = getCategorySubcategoryIds(categoryId);

  const collection = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: title,
    url: categoryUrl(lang, categoryId),
    inLanguage: HREFLANG[lang],
    isPartOf: { '@type': 'WebSite', name: BUSINESS.name, url: absoluteUrl(lang) },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: subIds.length,
      itemListElement: subIds.map((subId, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: t(`subcategories.${subId}.title`) || subId,
        url: absoluteUrl(lang, getSubcategoryInternalPath(lang, subId) ?? '/')
      }))
    }
  };

  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: t('itemPage.home'), item: absoluteUrl(lang) },
      { '@type': 'ListItem', position: 2, name: title, item: categoryUrl(lang, categoryId) }
    ]
  };

  return [collection, breadcrumbs];
}

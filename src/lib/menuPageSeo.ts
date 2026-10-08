/**
 * lib/menuPageSeo.ts
 * ------------------------------------------------------------------
 * 09.10.2026. SEO страницы «Полное меню» (/menu): <title>/description/
 * canonical/hreflang/Open Graph (generateMetadata) и JSON-LD (CollectionPage
 * со списком разделов + BreadcrumbList «Главная → Меню»). Только серверная
 * логика. Правила те же, что у категорий (lib/categorySeo.ts): hreflang и
 * индексация по INDEXABLE_LANGS (пока ro/en не переведены — noindex, follow
 * и без hreflang).
 * ------------------------------------------------------------------
 */

import type { Metadata } from 'next';
import { createTranslator } from '@/lib/i18nCore';
import { HREFLANG, INDEXABLE_LANGS, LANGS, OG_LOCALE, DEFAULT_LANG, isIndexableLang, type Lang } from '@/lib/i18nConfig';
import { BUSINESS, RESTAURANT_ID, SITE_URL, absoluteUrl } from '@/lib/seo';
import { getCategoryInternalPath, listSitemapCategoryIds } from '@/lib/categoryRoutes';
import { MENU_PAGE_INTERNAL_PATH, getMenuPagePathname } from '@/lib/menuPageRoutes';

export function menuPageUrl(lang: Lang): string {
  return absoluteUrl(lang, MENU_PAGE_INTERNAL_PATH);
}

function buildMenuPageAlternates(): Record<string, string> | undefined {
  if (INDEXABLE_LANGS.length < 2) return undefined;
  const languages: Record<string, string> = {};
  for (const lang of INDEXABLE_LANGS) languages[HREFLANG[lang]] = menuPageUrl(lang);
  languages['x-default'] = menuPageUrl(DEFAULT_LANG);
  return languages;
}

export function buildMenuPageMetadata(lang: Lang): Metadata {
  const t = createTranslator(lang);
  const title = t('menuPage.metaTitle');
  const description = t('menuPage.metaDescription');
  const indexable = isIndexableLang(lang);
  const languages = indexable ? buildMenuPageAlternates() : undefined;
  const canonicalPath = getMenuPagePathname(lang);
  const ogImage = '/img/og_default.png';

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    alternates: { canonical: canonicalPath, ...(languages ? { languages } : {}) },
    robots: indexable ? undefined : { index: false, follow: true },
    openGraph: {
      type: 'website',
      siteName: BUSINESS.name,
      title,
      description,
      url: canonicalPath,
      images: [{ url: ogImage, alt: t('menuPage.crumb') }],
      locale: OG_LOCALE[lang],
      alternateLocale: LANGS.filter((code) => code !== lang).map((code) => OG_LOCALE[code])
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [{ url: ogImage, alt: t('menuPage.crumb') }]
    }
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildMenuPageJsonLd(lang: Lang): Record<string, any>[] {
  const t = createTranslator(lang);
  const categoryIds = listSitemapCategoryIds();

  const collection = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: t('menuPage.h1'),
    description: t('menuPage.metaDescription'),
    url: menuPageUrl(lang),
    inLanguage: HREFLANG[lang],
    isPartOf: { '@type': 'WebSite', name: BUSINESS.name, url: absoluteUrl(lang) },
    about: { '@id': RESTAURANT_ID },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: categoryIds.length,
      itemListElement: categoryIds.map((categoryId, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: t(`categories.${categoryId}`) || categoryId,
        url: absoluteUrl(lang, getCategoryInternalPath(categoryId) ?? '/')
      }))
    }
  };

  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: t('itemPage.home'), item: absoluteUrl(lang) },
      { '@type': 'ListItem', position: 2, name: t('menuPage.crumb'), item: menuPageUrl(lang) }
    ]
  };

  return [collection, breadcrumbs];
}

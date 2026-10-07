/**
 * lib/subcategorySeo.ts
 * ------------------------------------------------------------------
 * 08.10.2026. SEO страницы подкатегории: <title>/description/canonical/
 * hreflang/Open Graph (generateMetadata) и JSON-LD (CollectionPage с
 * ItemList позиций + BreadcrumbList). Только серверная логика — без React.
 *
 * Правила — те же, что у позиций (lib/itemSeo.ts):
 *  - hreflang и индексация — по INDEXABLE_LANGS: пока ro/en не переведены,
 *    их страницы — noindex, follow и без hreflang;
 *  - BreadcrumbList: «Главная → Подкатегория». Уровня раздела (Напитки/
 *    Блюда) нет — у раздела пока нет своей страницы, а в BreadcrumbList
 *    каждый пункт, кроме последнего, обязан иметь реальный URL. Когда
 *    появятся страницы разделов — вставить между ними.
 * ------------------------------------------------------------------
 */

import type { Metadata } from 'next';
import { publicImagePath, hasRealImage, itemMetaIndex } from '@/lib/data';
import { createTranslator } from '@/lib/i18nCore';
import { HREFLANG, INDEXABLE_LANGS, LANGS, OG_LOCALE, DEFAULT_LANG, isIndexableLang, type Lang } from '@/lib/i18nConfig';
import { BUSINESS, SITE_URL, absoluteUrl } from '@/lib/seo';
import { getItemInternalPath } from '@/lib/itemRoutes';
import { getSubcategoryData, getSubcategoryInternalPath, getSubcategoryPathname } from '@/lib/subcategoryRoutes';

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? values[key] : match));
}

export function subcategoryUrl(lang: Lang, subId: string): string {
  return absoluteUrl(lang, getSubcategoryInternalPath(lang, subId) ?? '/');
}

function subcategoryImageAbsolute(subId: string): string {
  const image = getSubcategoryData(subId)?.image;
  return image && hasRealImage(image) ? `${SITE_URL}${publicImagePath(image)}` : `${SITE_URL}/img/og_default.png`;
}

/** hreflang-альтернативы подкатегории: только индексируемые языки + x-default (если языков больше одного). */
function buildSubcategoryAlternates(subId: string): Record<string, string> | undefined {
  if (INDEXABLE_LANGS.length < 2) return undefined;
  const languages: Record<string, string> = {};
  for (const lang of INDEXABLE_LANGS) languages[HREFLANG[lang]] = subcategoryUrl(lang, subId);
  languages['x-default'] = subcategoryUrl(DEFAULT_LANG, subId);
  return languages;
}

export function buildSubcategoryMetadata(lang: Lang, subId: string): Metadata {
  const t = createTranslator(lang);
  const title = t(`subcategories.${subId}.title`) || subId;
  const desc = t(`subcategories.${subId}.desc`);
  const metaTitle = fill(t('subcategoryPage.metaTitle'), { title });
  const metaDescription = fill(t('subcategoryPage.metaDescription'), { title, desc });
  const indexable = isIndexableLang(lang);
  const languages = indexable ? buildSubcategoryAlternates(subId) : undefined;
  const canonicalPath = getSubcategoryPathname(lang, subId) ?? undefined;
  const image = getSubcategoryData(subId)?.image;
  const ogImage = image && hasRealImage(image) ? publicImagePath(image) : '/img/og_default.png';

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
export function buildSubcategoryJsonLd(lang: Lang, subId: string): Record<string, any>[] {
  const t = createTranslator(lang);
  const title = t(`subcategories.${subId}.title`) || subId;
  const url = subcategoryUrl(lang, subId);
  const items = (getSubcategoryData(subId)?.items ?? []).filter((item) => itemMetaIndex[item.id]);

  const collection = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: title,
    description: t(`subcategories.${subId}.desc`),
    url,
    inLanguage: HREFLANG[lang],
    image: subcategoryImageAbsolute(subId),
    isPartOf: { '@type': 'WebSite', name: BUSINESS.name, url: absoluteUrl(lang) },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: items.length,
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: t(`items.${item.id}.name`) || item.id,
        url: absoluteUrl(lang, getItemInternalPath(lang, item.id) ?? '/')
      }))
    }
  };

  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: t('itemPage.home'), item: absoluteUrl(lang) },
      { '@type': 'ListItem', position: 2, name: title, item: url }
    ]
  };

  return [collection, breadcrumbs];
}

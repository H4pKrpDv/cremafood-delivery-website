/**
 * app/sitemap.ts
 * ------------------------------------------------------------------
 * Next.js file-convention — App Router сам отдаёт результат этой функции
 * по адресу /sitemap.xml. Порт buildSitemapXml() из build/build.js
 * (нативная версия, Этап 1 п.2): сайт одностраничный, поэтому на каждый
 * язык ровно один URL — тот же changefreq/priority, что и раньше.
 * lastModified пересчитывается сам на каждый билд/запрос.
 *
 * 08.10.2026: добавлены страницы подкатегорий и категорий.
 *
 * 05.10.2026: страницы по языкам (/, /ro, /en). В карту попадают ТОЛЬКО
 * языки из INDEXABLE_LANGS (lib/i18nConfig.ts) — сейчас это один русский
 * (ro/en ещё не переведены и закрыты noindex). Когда их добавят в
 * INDEXABLE_LANGS, здесь автоматически появятся все три адреса, и у каждой
 * записи — hreflang-альтернативы (alternates.languages) + x-default.
 * ------------------------------------------------------------------
 */

import type { MetadataRoute } from 'next';
import { absoluteUrl, buildHreflangAlternates } from '@/lib/seo';
import { INDEXABLE_LANGS, HREFLANG, DEFAULT_LANG } from '@/lib/i18nConfig';
import { getItemInternalPath, listSitemapItemIds } from '@/lib/itemRoutes';
import { getSubcategoryInternalPath, listSitemapSubcategoryIds } from '@/lib/subcategoryRoutes';
import { getCategoryInternalPath, listSitemapCategoryIds } from '@/lib/categoryRoutes';

export default function sitemap(): MetadataRoute.Sitemap {
  const languages = buildHreflangAlternates();
  const lastModified = new Date();

  const home: MetadataRoute.Sitemap = INDEXABLE_LANGS.map((lang) => ({
    url: absoluteUrl(lang),
    lastModified,
    changeFrequency: 'weekly' as const,
    priority: 1,
    ...(languages ? { alternates: { languages } } : {})
  }));

  // 07.10.2026: страницы позиций меню. В карту попадают только позиции со
  // статусом active/unavailable (archived — нет, см. data/routes.ts) и только
  // индексируемые языки. У позиции свой слаг на каждом языке, поэтому
  // hreflang-альтернативы (когда индексируется больше одного языка)
  // собираются отдельно для каждой позиции.
  const itemUrl = (lang: (typeof INDEXABLE_LANGS)[number], itemId: string) =>
    absoluteUrl(lang, getItemInternalPath(lang, itemId) ?? '/');
  const items: MetadataRoute.Sitemap = listSitemapItemIds().flatMap((itemId) =>
    INDEXABLE_LANGS.map((lang) => {
      let itemLanguages: Record<string, string> | undefined;
      if (INDEXABLE_LANGS.length > 1) {
        itemLanguages = {};
        for (const code of INDEXABLE_LANGS) itemLanguages[HREFLANG[code]] = itemUrl(code, itemId);
        itemLanguages['x-default'] = itemUrl(DEFAULT_LANG, itemId);
      }
      return {
        url: itemUrl(lang, itemId),
        lastModified,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
        ...(itemLanguages ? { alternates: { languages: itemLanguages } } : {})
      };
    })
  );

  // 08.10.2026: страницы подкатегорий (у каждой — свой слаг на каждом языке,
  // hreflang собирается так же, как у позиций).
  const subUrl = (lang: (typeof INDEXABLE_LANGS)[number], subId: string) =>
    absoluteUrl(lang, getSubcategoryInternalPath(lang, subId) ?? '/');
  const subcategories: MetadataRoute.Sitemap = listSitemapSubcategoryIds().flatMap((subId) =>
    INDEXABLE_LANGS.map((lang) => {
      let subLanguages: Record<string, string> | undefined;
      if (INDEXABLE_LANGS.length > 1) {
        subLanguages = {};
        for (const code of INDEXABLE_LANGS) subLanguages[HREFLANG[code]] = subUrl(code, subId);
        subLanguages['x-default'] = subUrl(DEFAULT_LANG, subId);
      }
      return {
        url: subUrl(lang, subId),
        lastModified,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
        ...(subLanguages ? { alternates: { languages: subLanguages } } : {})
      };
    })
  );

  // 08.10.2026: страницы категорий (/drinks, /food, /promo).
  const catUrl = (lang: (typeof INDEXABLE_LANGS)[number], categoryId: string) =>
    absoluteUrl(lang, getCategoryInternalPath(categoryId) ?? '/');
  const categories: MetadataRoute.Sitemap = listSitemapCategoryIds().flatMap((categoryId) =>
    INDEXABLE_LANGS.map((lang) => {
      let catLanguages: Record<string, string> | undefined;
      if (INDEXABLE_LANGS.length > 1) {
        catLanguages = {};
        for (const code of INDEXABLE_LANGS) catLanguages[HREFLANG[code]] = catUrl(code, categoryId);
        catLanguages['x-default'] = catUrl(DEFAULT_LANG, categoryId);
      }
      return {
        url: catUrl(lang, categoryId),
        lastModified,
        changeFrequency: 'weekly' as const,
        priority: 0.9,
        ...(catLanguages ? { alternates: { languages: catLanguages } } : {})
      };
    })
  );

  return [...home, ...categories, ...subcategories, ...items];
}

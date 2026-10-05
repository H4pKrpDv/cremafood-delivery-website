/**
 * app/sitemap.ts
 * ------------------------------------------------------------------
 * Next.js file-convention — App Router сам отдаёт результат этой функции
 * по адресу /sitemap.xml. Порт buildSitemapXml() из build/build.js
 * (нативная версия, Этап 1 п.2): сайт одностраничный, поэтому на каждый
 * язык ровно один URL — тот же changefreq/priority, что и раньше.
 * lastModified пересчитывается сам на каждый билд/запрос.
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
import { INDEXABLE_LANGS } from '@/lib/i18nConfig';

export default function sitemap(): MetadataRoute.Sitemap {
  const languages = buildHreflangAlternates();
  const lastModified = new Date();

  return INDEXABLE_LANGS.map((lang) => ({
    url: absoluteUrl(lang),
    lastModified,
    changeFrequency: 'weekly' as const,
    priority: 1,
    ...(languages ? { alternates: { languages } } : {})
  }));
}

/**
 * app/sitemap.ts
 * ------------------------------------------------------------------
 * Next.js file-convention — App Router сам отдаёт результат этой функции
 * по адресу /sitemap.xml. Порт buildSitemapXml() из build/build.js
 * (нативная версия, Этап 1 п.2): сайт одностраничный, поэтому в карте
 * ровно один URL — тот же changefreq/priority, что и раньше. lastModified
 * пересчитывается сам на каждый билд/запрос (та же логика, что и у
 * `today` в нативной версии — не требует ручного обновления).
 * ------------------------------------------------------------------
 */

import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${SITE_URL}/`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1
    }
  ];
}

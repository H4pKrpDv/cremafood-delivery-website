/**
 * app/robots.ts
 * ------------------------------------------------------------------
 * Next.js file-convention — App Router сам отдаёт результат этой функции
 * по адресу /robots.txt. Порт buildRobotsTxt() из build/build.js
 * (нативная версия, Этап 1 п.2) — тот же контент (Allow: / + ссылка на
 * sitemap.xml), просто без ручной генерации статичного файла.
 * ------------------------------------------------------------------
 */

import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/'
    },
    sitemap: `${SITE_URL}/sitemap.xml`
  };
}

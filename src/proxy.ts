/**
 * proxy.ts — локализованные пути без префикса для языка по умолчанию
 * (05.10.2026).
 *
 * В Next.js 16 файл `middleware.ts` переименован в `proxy.ts` (старое имя
 * deprecated, и держать оба файла нельзя — прежний src/middleware.ts,
 * чинивший картинки, удалён как ненужный).
 *
 * Схема (см. lib/i18nConfig.ts):
 *   /          → внутри приложения отдаётся страница /ru  (REWRITE — адрес
 *                в браузере остаётся «чистым» /)
 *   /ru, /ru/x → 308 редирект на / , /x  (у русской версии не должно быть
 *                второго адреса — дубль для поисковиков)
 *   /ro, /en   → как есть
 *   /anything  → rewrite на /ru/anything (страницы нет → localized 404
 *                через app/[lang]/[...rest]/page.tsx, с шапкой и футером)
 *
 * Язык определяется ТОЛЬКО адресом: Accept-Language и сохранённый выбор не
 * учитываются (решение пользователя) — поэтому поисковый робот и человек по
 * одному адресу всегда видят одно и то же.
 *
 * matcher исключает /api/*, /_next/*, /_vercel/* и любые пути с точкой в
 * имени (img/logo.png, favicon.ico, robots.txt, sitemap.xml, full-menu.pdf
 * и т.д.) — статика и API локализации не касаются.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { DEFAULT_LANG, LANGS } from '@/lib/i18nConfig';
import { REDIRECTS, GONE } from '@/data/redirects';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const firstSegment = pathname.split('/')[1];

  // 07.10.2026: постоянные редиректы (301) и «удалено навсегда» (410) для
  // страниц позиций — единый список в data/redirects.ts. Проверяется ПЕРВЫМ,
  // по адресу ровно как в браузере (русский без префикса, ro/en с префиксом).
  const normalized = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  if (Object.prototype.hasOwnProperty.call(REDIRECTS, normalized)) {
    const url = request.nextUrl.clone();
    url.pathname = REDIRECTS[normalized];
    return NextResponse.redirect(url, 301);
  }
  if (GONE.includes(normalized)) {
    return new NextResponse(
      '<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><title>410</title><p>Страница удалена · Pagina a fost ștearsă · This page has been removed.</p>',
      { status: 410, headers: { 'content-type': 'text/html; charset=utf-8', 'x-robots-tag': 'noindex' } }
    );
  }

  // /ru и /ru/... — явный префикс языка по умолчанию: редирект на адрес без него.
  if (firstSegment === DEFAULT_LANG) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(`/${DEFAULT_LANG}`.length) || '/';
    return NextResponse.redirect(url, 308);
  }

  // /ro, /en (и вложенные пути) — уже локализованный адрес.
  if ((LANGS as readonly string[]).includes(firstSegment)) {
    return NextResponse.next();
  }

  // Всё остальное — язык по умолчанию без префикса: внутренний rewrite.
  const url = request.nextUrl.clone();
  url.pathname = `/${DEFAULT_LANG}${pathname === '/' ? '' : pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ['/((?!api(?:/|$)|_next/|_vercel/|.*\\..*).*)']
};

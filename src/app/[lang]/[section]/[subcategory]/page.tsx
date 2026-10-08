import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { isLang } from '@/lib/i18nConfig';
import { listSubcategoryPageParams, resolveSubcategoryRoute } from '@/lib/subcategoryRoutes';
import { buildSubcategoryJsonLd, buildSubcategoryMetadata } from '@/lib/subcategorySeo';
import { SubcategoryPage } from '@/components/SubcategoryPage';
import { SeoText } from '@/components/SeoText';

/**
 * app/[lang]/[section]/[subcategory]/page.tsx — страница подкатегории меню
 * (08.10.2026). Адреса: /drinks/kofe (ru, без префикса), /ro/drinks/cafea,
 * /en/drinks/coffee — слаги в data/routes.ts, разбор адреса —
 * lib/subcategoryRoutes.ts. Страницы всех подкатегорий на всех языках
 * собираются статически (generateStaticParams); «чужой» слаг (другого
 * языка) даёт постоянный редирект на канонический адрес, неизвестный — 404.
 *
 * Более длинный адрес /[section]/[subcategory]/[item] (страница позиции)
 * лежит в соседней папке и обрабатывается своим маршрутом.
 */

type SubcategoryParams = { params: Promise<{ lang: string; section: string; subcategory: string }> };

export function generateStaticParams() {
  return listSubcategoryPageParams();
}

export async function generateMetadata({ params }: SubcategoryParams): Promise<Metadata> {
  const { lang, section, subcategory } = await params;
  if (!isLang(lang)) return {};
  const resolution = resolveSubcategoryRoute(lang, section, subcategory);
  // Не канонический адрес — страница сама сделает redirect()/notFound().
  if (resolution.kind !== 'ok') return {};
  return buildSubcategoryMetadata(lang, resolution.subId);
}

export default async function SubcategoryRoutePage({ params }: SubcategoryParams) {
  const { lang, section, subcategory } = await params;
  if (!isLang(lang)) notFound();

  const resolution = resolveSubcategoryRoute(lang, section, subcategory);
  if (resolution.kind === 'redirect') permanentRedirect(resolution.to);
  if (resolution.kind !== 'ok') notFound();

  const jsonLd = buildSubcategoryJsonLd(lang, resolution.subId);

  return (
    <>
      {jsonLd.map((block, index) => (
        <script
          key={index}
          type="application/ld+json"
          // "<" экранируем: строка уходит в HTML внутри <script>, и "</script>"
          // в данных (названия/описания из i18n) закрыл бы тег раньше времени.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(block).replace(/</g, '\\u003c') }}
        />
      ))}
      <SubcategoryPage subId={resolution.subId}>
        <SeoText lang={lang} textKey={`sub:${resolution.subId}`} />
      </SubcategoryPage>
    </>
  );
}

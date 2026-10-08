import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLang } from '@/lib/i18nConfig';
import { listCategoryPageParams, resolveCategoryRoute } from '@/lib/categoryRoutes';
import { buildCategoryJsonLd, buildCategoryMetadata } from '@/lib/categorySeo';
import { CategoryPage } from '@/components/CategoryPage';

/**
 * app/[lang]/[section]/page.tsx — страница категории меню (08.10.2026).
 * Адреса: /drinks (ru, без префикса), /ro/drinks, /en/drinks; также /food и
 * /promo. Слаги — SECTION_SLUGS в data/routes.ts, разбор адреса —
 * lib/categoryRoutes.ts. Все страницы собираются статически
 * (generateStaticParams); неизвестный раздел — обычный 404.
 *
 * Адреса подкатегорий (/[section]/[subcategory]) и позиций
 * (/[section]/[subcategory]/[item]) — в соседних вложенных папках.
 */

type CategoryParams = { params: Promise<{ lang: string; section: string }> };

export function generateStaticParams() {
  return listCategoryPageParams();
}

export async function generateMetadata({ params }: CategoryParams): Promise<Metadata> {
  const { lang, section } = await params;
  if (!isLang(lang)) return {};
  const resolution = resolveCategoryRoute(section);
  if (resolution.kind !== 'ok') return {};
  return buildCategoryMetadata(lang, resolution.categoryId);
}

export default async function CategoryRoutePage({ params }: CategoryParams) {
  const { lang, section } = await params;
  if (!isLang(lang)) notFound();

  const resolution = resolveCategoryRoute(section);
  if (resolution.kind !== 'ok') notFound();

  const jsonLd = buildCategoryJsonLd(lang, resolution.categoryId);

  return (
    <>
      {jsonLd.map((block, index) => (
        <script
          key={index}
          type="application/ld+json"
          // "<" экранируем: строка уходит в HTML внутри <script>, и "</script>"
          // в данных (названия из i18n) закрыл бы тег раньше времени.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(block).replace(/</g, '\\u003c') }}
        />
      ))}
      <CategoryPage categoryId={resolution.categoryId} />
    </>
  );
}

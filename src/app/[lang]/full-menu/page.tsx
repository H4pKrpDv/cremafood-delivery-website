import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LANGS, isLang } from '@/lib/i18nConfig';
import { buildMenuPageJsonLd, buildMenuPageMetadata } from '@/lib/menuPageSeo';
import { MenuPage } from '@/components/MenuPage';
import { SeoText } from '@/components/SeoText';

/**
 * app/[lang]/full-menu/page.tsx — страница «Полное меню» (09.10.2026; с
 * 10.10.2026 адрес /full-menu вместо /menu).
 * Адреса: /full-menu (ru, без префикса), /ro/full-menu, /en/full-menu. Статический
 * сегмент `full-menu` имеет приоритет над динамическим [section] (/drinks, /food, /promo).
 * Все три языка собираются статически.
 */

type MenuPageParams = { params: Promise<{ lang: string }> };

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: MenuPageParams): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  return buildMenuPageMetadata(lang);
}

export default async function MenuRoutePage({ params }: MenuPageParams) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();

  const jsonLd = buildMenuPageJsonLd(lang);

  return (
    <>
      {jsonLd.map((block, index) => (
        <script
          key={index}
          type="application/ld+json"
          // "<" экранируем: строка уходит в HTML внутри <script>, и "</script>"
          // в данных закрыл бы тег раньше времени.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(block).replace(/</g, '\\u003c') }}
        />
      ))}
      <MenuPage>
        <SeoText lang={lang} textKey="page:full-menu" />
      </MenuPage>
    </>
  );
}

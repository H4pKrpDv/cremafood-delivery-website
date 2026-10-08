import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { isLang } from '@/lib/i18nConfig';
import { listItemPageParams, resolveItemRoute } from '@/lib/itemRoutes';
import { buildItemJsonLd, buildItemMetadata } from '@/lib/itemSeo';
import { ItemPage } from '@/components/ItemPage';
import { ItemSeoPlate } from '@/components/ItemSeoPlate';

/**
 * app/[lang]/[section]/[subcategory]/[item]/page.tsx — страница позиции меню
 * (07.10.2026). Адреса: /drinks/kofe/latte (ru, без префикса), /ro/drinks/
 * cafea/latte, /en/drinks/coffee/latte — слаги и правила в data/routes.ts,
 * разбор адреса — lib/itemRoutes.ts. Страницы всех позиций на всех языках
 * собираются статически (generateStaticParams); адрес, которого нет в этом
 * списке, всё равно проходит resolveItemRoute() — «чужой» слаг (другого
 * языка) или ошибка в сегменте подкатегории дают постоянный редирект на
 * канонический адрес, неизвестная позиция — обычный 404.
 *
 * Статус позиции (data/routes.ts → ITEM_STATUS): active/unavailable
 * отдают 200 (unavailable — с плашкой «Временно недоступно» внутри
 * ItemPage); archived с заменой → 301 на замену, без замены → 404 здесь,
 * а настоящий 410 отдаёт proxy.ts по списку GONE (data/redirects.ts).
 */

type ItemParams = { params: Promise<{ lang: string; section: string; subcategory: string; item: string }> };

export function generateStaticParams() {
  return listItemPageParams();
}

export async function generateMetadata({ params }: ItemParams): Promise<Metadata> {
  const { lang, section, subcategory, item } = await params;
  if (!isLang(lang)) return {};
  const resolution = resolveItemRoute(lang, section, subcategory, item);
  // Не канонический адрес — страница сама сделает redirect()/notFound();
  // метаданные для неё не нужны.
  if (resolution.kind !== 'ok') return {};
  return buildItemMetadata(lang, resolution.itemId);
}

export default async function ItemRoutePage({ params }: ItemParams) {
  const { lang, section, subcategory, item } = await params;
  if (!isLang(lang)) notFound();

  const resolution = resolveItemRoute(lang, section, subcategory, item);
  if (resolution.kind === 'redirect') permanentRedirect(resolution.to);
  if (resolution.kind !== 'ok') notFound();

  const jsonLd = buildItemJsonLd(lang, resolution.itemId);

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
      <ItemPage itemId={resolution.itemId}>
        <ItemSeoPlate lang={lang} itemId={resolution.itemId} />
      </ItemPage>
    </>
  );
}

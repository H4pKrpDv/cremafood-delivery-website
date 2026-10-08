/**
 * components/ItemSeoPlate.tsx
 * ------------------------------------------------------------------
 * 09.10.2026 (SEO этап 4), переделано 10.10.2026. SEO-плашка в самом низу
 * страницы позиции, перед футером (как у cappi.ua: «Ролл Эби Бонито —
 * заказать Ролл с доставкой Cappi»):
 *  - заголовок «{Название} — заказать с доставкой Crema Food в Бельцах»;
 *  - УНИКАЛЬНЫЙ текст позиции 40–60 слов со ссылками на сочетающиеся
 *    позиции (data/seo/items.ru.json, lib/seoTexts.ts → getItemSeoLine;
 *    если для позиции текста ещё нет — абзаца просто нет);
 *  - абзац с известными условиями заказа (доставка 60 MDL / бесплатно от
 *    399, оплата при получении, порция, часы бара/кухни, 18+);
 *  - ссылки на подкатегорию и категорию позиции.
 * Описание позиции сюда НЕ подставляется — оно уже в карточке выше.
 *
 * СЕРВЕРНЫЙ компонент (без 'use client'): весь текст и ссылки в HTML для
 * роботов, а JSON с текстами позиций не попадает в клиентский бандл.
 * Подключается как children из серверной страницы позиции в ItemPage.
 * ------------------------------------------------------------------
 */

import Link from 'next/link';
import { createTranslator } from '@/lib/i18nCore';
import { itemMetaIndex } from '@/lib/data';
import { localizedPath, type Lang } from '@/lib/i18nConfig';
import { getSubcategoryInternalPath } from '@/lib/subcategoryRoutes';
import { getCategoryInternalPath } from '@/lib/categoryRoutes';
import { getItemSeoLine, parseInline } from '@/lib/seoTexts';

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? values[key] : match));
}

export function ItemSeoPlate({ lang, itemId }: { lang: Lang; itemId: string }) {
  const t = createTranslator(lang);
  const base = itemMetaIndex[itemId];
  if (!base) return null;

  const name = t(`items.${itemId}.name`) || itemId;
  const weight = t(`items.${itemId}.weight`);
  const subTitle = t(`subcategories.${base.subcategoryId}.title`);
  const catTitle = t(`categories.${base.categoryId}`);

  const departments = Array.isArray(base.department) ? base.department : base.department ? [base.department] : [];
  const hasBar = departments.includes('bar');
  const hasKitchen = departments.includes('kitchen');
  const hours = hasBar && hasKitchen ? t('itemPage.seoHoursBoth') : hasBar ? t('itemPage.seoHoursBar') : hasKitchen ? t('itemPage.seoHoursKitchen') : '';

  const sentences = [
    fill(t('itemPage.seoOrder'), { name }),
    weight ? fill(t('itemPage.seoPortion'), { weight }) : '',
    hours,
    base.ageRestricted ? t('itemPage.seoAge') : ''
  ].filter(Boolean);

  const uniqueLine = getItemSeoLine(lang, itemId);
  const unique = uniqueLine ? parseInline(lang, uniqueLine) : null;

  const subInternal = getSubcategoryInternalPath(lang, base.subcategoryId);
  const catInternal = getCategoryInternalPath(base.categoryId);
  const [moreBefore, moreMid, moreAfter] = t('itemPage.seoMore').split(/\{sub\}|\{cat\}/);

  return (
    <section className="item-seo" aria-labelledby="item-seo-title">
      <h2 className="item-seo__title" id="item-seo-title">
        {fill(t('itemPage.seoTitle'), { name })}
      </h2>
      {unique ? (
        <p className="item-seo__text">
          {unique.map((part, index) =>
            part.href ? (
              <Link key={index} href={part.href} className="seo-text__link" prefetch={false}>
                {part.text}
              </Link>
            ) : (
              <span key={index}>{part.text}</span>
            )
          )}
        </p>
      ) : null}
      <p className="item-seo__text">{sentences.join(' ')}</p>
      {subInternal || catInternal ? (
        <p className="item-seo__text">
          {moreBefore}
          {subInternal ? (
            <Link href={localizedPath(lang, subInternal)} className="seo-text__link" prefetch={false}>
              {subTitle}
            </Link>
          ) : (
            subTitle
          )}
          {moreMid}
          {catInternal ? (
            <Link href={localizedPath(lang, catInternal)} className="seo-text__link" prefetch={false}>
              {catTitle}
            </Link>
          ) : (
            catTitle
          )}
          {moreAfter}
        </p>
      ) : null}
    </section>
  );
}

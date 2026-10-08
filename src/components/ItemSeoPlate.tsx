/**
 * components/ItemSeoPlate.tsx
 * ------------------------------------------------------------------
 * 09.10.2026 (SEO этап 4). Небольшая SEO-плашка в самом низу страницы
 * позиции, перед футером (как у cappi.ua: «Ролл Эби Бонито — заказать
 * Ролл с доставкой Cappi»): заголовок «{Название} — заказать с доставкой
 * Crema Food в Бельцах», абзац из описания позиции и известных условий
 * (доставка 60 MDL / бесплатно от 399, оплата при получении, часы
 * доставки бара/кухни, 18+ для алкоголя) и ссылки на подкатегорию и
 * категорию позиции. Только известные факты — тексты в i18n itemPage.seo*.
 *
 * Рендерится на сервере вместе со страницей (ItemPage — клиентский
 * компонент, но Next отдаёт его HTML в ответе), поэтому плашка и ссылки
 * видны поисковым роботам.
 * ------------------------------------------------------------------
 */

'use client';

import Link from 'next/link';
import { useI18n } from '@/i18n/I18nProvider';
import { itemMetaIndex } from '@/lib/data';
import { localizedPath } from '@/lib/i18nConfig';
import { getSubcategoryInternalPath } from '@/lib/subcategoryRoutes';
import { getCategoryInternalPath } from '@/lib/categoryRoutes';

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? values[key] : match));
}

/** Описание без завершающей точки/пробелов — чтобы подставить в предложение. */
function trimDesc(desc: string): string {
  return desc.trim().replace(/[.\s]+$/, '');
}

export function ItemSeoPlate({ itemId }: { itemId: string }) {
  const { t, lang } = useI18n();
  const base = itemMetaIndex[itemId];
  if (!base) return null;

  const name = t(`items.${itemId}.name`) || itemId;
  const desc = trimDesc(t(`items.${itemId}.desc`));
  const weight = t(`items.${itemId}.weight`);
  const subTitle = t(`subcategories.${base.subcategoryId}.title`);
  const catTitle = t(`categories.${base.categoryId}`);

  const departments = Array.isArray(base.department) ? base.department : base.department ? [base.department] : [];
  const hasBar = departments.includes('bar');
  const hasKitchen = departments.includes('kitchen');
  const hours = hasBar && hasKitchen ? t('itemPage.seoHoursBoth') : hasBar ? t('itemPage.seoHoursBar') : hasKitchen ? t('itemPage.seoHoursKitchen') : '';

  const sentences = [
    desc ? `${desc}.` : '',
    weight ? fill(t('itemPage.seoPortion'), { weight }) : '',
    fill(t('itemPage.seoOrder'), { name }),
    hours,
    base.ageRestricted ? t('itemPage.seoAge') : ''
  ].filter(Boolean);

  const subInternal = getSubcategoryInternalPath(lang, base.subcategoryId);
  const catInternal = getCategoryInternalPath(base.categoryId);
  const [moreBefore, moreMid, moreAfter] = t('itemPage.seoMore').split(/\{sub\}|\{cat\}/);

  return (
    <section className="item-seo" aria-labelledby="item-seo-title">
      <h2 className="item-seo__title" id="item-seo-title">
        {fill(t('itemPage.seoTitle'), { name })}
      </h2>
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

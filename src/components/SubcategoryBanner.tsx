/**
 * components/SubcategoryBanner.tsx
 * ------------------------------------------------------------------
 * 08.10.2026. Мини-баннер подкатегории на главной: плитка-ссылка на
 * страницу подкатегории (идея — cappi.ua/odesa). Фото (пока нет файла —
 * svg-заглушка через useImageFallback, как у остальных картинок) с
 * названием подкатегории прямо на изображении.
 *
 * Расположение подписи — три варианта (экспериментальный выбор,
 * 08.10.2026): пока у каждой категории свой, чтобы сравнить вживую.
 * Выбрав один, достаточно оставить в LABEL_VARIANT_BY_CATEGORY одно
 * значение для всех (или заменить на константу) — CSS остальных вариантов
 * можно удалить из globals.css (блок «SUBCATEGORY BANNERS»).
 *   chip  — светлая плашка в левом верхнем углу (как на cappi.ua);
 *   strip — полоса на всю ширину внизу, текст по центру;
 *   pill  — округлая плашка внизу по центру.
 *
 * Текст подписи лежит внутри ссылки — это и доступное имя ссылки (alt у
 * <img> пустой, чтобы название не читалось дважды).
 * ------------------------------------------------------------------
 */

'use client';

import Link from 'next/link';
import { useI18n } from '@/i18n/I18nProvider';
import { hasRealImage, publicImagePath } from '@/lib/data';
import { useImageFallback } from '@/lib/useImageFallback';
import { localizedPath } from '@/lib/i18nConfig';
import { getSubcategoryData, getSubcategoryInternalPath } from '@/lib/subcategoryRoutes';

export type BannerLabelVariant = 'chip' | 'strip' | 'pill';

const LABEL_VARIANT_BY_CATEGORY: Record<string, BannerLabelVariant> = {
  'special-offers': 'pill',
  cafe: 'chip',
  kitchen: 'strip'
};

export function SubcategoryBanner({ subId, categoryId }: { subId: string; categoryId: string }) {
  const { t, lang } = useI18n();
  const sub = getSubcategoryData(subId);
  const internal = getSubcategoryInternalPath(lang, subId);
  const img = useImageFallback(sub ? publicImagePath(sub.image) : '', sub ? hasRealImage(sub.image) : false);
  if (!sub || !internal) return null;

  const variant = LABEL_VARIANT_BY_CATEGORY[categoryId] ?? 'chip';

  return (
    <Link
      href={localizedPath(lang, internal)}
      className={`sub-banner sub-banner--${variant}`}
      prefetch={false}
      data-subcategory={subId}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={img.src}
        alt=""
        className={`sub-banner__img${img.imgClassName ? ` ${img.imgClassName}` : ''}`}
        loading="lazy"
        width={480}
        height={360}
        onError={img.onError}
      />
      <span className="sub-banner__label">{t(`subcategories.${subId}.title`)}</span>
    </Link>
  );
}

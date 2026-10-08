/**
 * components/SubcategoryBanner.tsx
 * ------------------------------------------------------------------
 * 08.10.2026. Мини-баннер подкатегории на главной: плитка-ссылка на
 * страницу подкатегории (идея — cappi.ua/odesa). Фото (пока нет файла —
 * svg-заглушка через useImageFallback, как у остальных картинок) с
 * названием подкатегории в светлой плашке в левом верхнем углу.
 *
 * Расположение подписи выбрано пользователем (08.10.2026) из трёх
 * экспериментальных вариантов — оставлен «chip» как на cappi.ua. Цвет
 * плашки зависит от темы (светлая — белая, тёмная — тёмное «стекло» с
 * золотистой рамкой), см. блок «SUBCATEGORY BANNERS» в globals.css.
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

export function SubcategoryBanner({ subId }: { subId: string }) {
  const { t, lang } = useI18n();
  const sub = getSubcategoryData(subId);
  const internal = getSubcategoryInternalPath(lang, subId);
  const img = useImageFallback(sub ? publicImagePath(sub.image) : '', sub ? hasRealImage(sub.image) : false);
  if (!sub || !internal) return null;

  return (
    <Link
      href={localizedPath(lang, internal)}
      className="sub-banner"
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

/**
 * components/PriceDiscount.tsx
 * ------------------------------------------------------------------
 * 16.10.2026. «Цена без акции»: зачёркнутая старая цена + бейдж с
 * процентом экономии. Рендерится ПЕРЕД основной ценой позиции и только
 * если в menu.json у позиции задан oldPrice (> price) — сейчас это комбо
 * «Кола + сэндвич» (50 → 40 MDL, −20%). Для остальных позиций ничего не
 * меняется. Процент считается из цен, руками его заводить не нужно.
 * Корзина и SEO (itemSeo.ts) продолжают использовать актуальную price.
 * ------------------------------------------------------------------
 */

'use client';

import { useI18n } from '@/i18n/I18nProvider';

export function discountPercent(price: number, oldPrice: number): number {
  return Math.round((1 - price / oldPrice) * 100);
}

export default function PriceDiscount({ price, oldPrice }: { price: number; oldPrice?: number }) {
  const { t } = useI18n();
  if (!oldPrice || oldPrice <= price) return null;
  const percent = discountPercent(price, oldPrice);
  return (
    <>
      <s className="price-old">
        <span className="price-sr">{t('common.oldPrice')}: </span>
        {oldPrice} MDL
      </s>
      <span className="price-badge">
        <span className="price-sr">{t('common.discount')}: </span>−{percent}%
      </span>
    </>
  );
}

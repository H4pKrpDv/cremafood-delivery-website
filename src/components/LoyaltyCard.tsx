/**
 * components/LoyaltyCard.tsx
 * ------------------------------------------------------------------
 * 08.10.2026. Плашка «карта лояльности» — вынесена из MenuSection.tsx:
 * позиции подкатегорий теперь показываются не на главной, а на их страницах
 * (SubcategoryPage), и плашка стоит последним элементом сетки позиций
 * подкатегории «Постоянные» (promo-permanent).
 * ------------------------------------------------------------------
 */

'use client';

import { useI18n } from '@/i18n/I18nProvider';

export function LoyaltyCard() {
  const { t } = useI18n();
  return (
    <div className="loyalty-card" id="loyalty-card">
      <span className="loyalty-card__badge">{t('specialOffers.loyaltyBadge')}</span>
      <h4 className="loyalty-card__title">{t('specialOffers.loyaltyTitle')}</h4>
      <p className="loyalty-card__text">{t('specialOffers.loyaltyText')}</p>
      <span className="loyalty-card__time">{t('specialOffers.loyaltyTime')}</span>
    </div>
  );
}

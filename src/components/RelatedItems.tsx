/**
 * components/RelatedItems.tsx
 * ------------------------------------------------------------------
 * 09.10.2026 (SEO этап 4). Блок «Похожие позиции» внизу страницы позиции:
 * до четырёх карточек (те же ItemCard, что в меню — со ссылкой на
 * страницу и кнопкой «Добавить»). Подбор — lib/relatedItems.ts.
 * Четвёртая карточка скрыта на планшетах (3 колонки сетки), чтобы в
 * последней строке не оставалось одиночной карточки (CSS .related-items).
 * ------------------------------------------------------------------
 */

'use client';

import { useI18n } from '@/i18n/I18nProvider';
import { getRelatedItemIds } from '@/lib/relatedItems';
import { ItemCard } from './ItemCard';

export function RelatedItems({ itemId }: { itemId: string }) {
  const { t } = useI18n();
  const ids = getRelatedItemIds(itemId, 4);
  if (ids.length === 0) return null;

  return (
    <section className="related-items" aria-labelledby="related-items-title">
      <h2 className="related-items__title" id="related-items-title">
        {t('itemPage.relatedTitle')}
      </h2>
      <div className="items-grid related-items__grid">
        {ids.map((id) => (
          <ItemCard key={id} itemId={id} />
        ))}
      </div>
    </section>
  );
}

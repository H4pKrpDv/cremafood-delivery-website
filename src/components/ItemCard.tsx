/**
 * components/ItemCard.tsx
 * ------------------------------------------------------------------
 * Порт renderItemCard() (build/build.js) + степпера и "ещё"/"свернуть"
 * (js/menu.js) на React. Метаданные (цена/доступность/группы модификаторов/
 * 18+/приборы/отдел) читаются из lib/data.ts (itemMetaIndex) — единый
 * источник правды, а не DOM-атрибуты, как в нативной версии (там карточка
 * уже была отрисована build.js, здесь она и есть тот же рендер).
 * Часы работы отдела (не known на этапе сборки) решаются в реальном
 * времени через lib/useItemMeta.ts — тот же принцип, что и в js/hours.js/
 * js/menu.js (updateHoursNotes): степпер или "Будет доступно с HH:MM".
 * ------------------------------------------------------------------
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import { useCartStore, useCartHydrated } from '@/store/cartStore';
import { useItemMeta } from '@/lib/useItemMeta';
import { itemMetaIndex, publicImagePath } from '@/lib/data';

export function ItemCard({ itemId }: { itemId: string }) {
  const { t, lang } = useI18n();
  const meta = useItemMeta(itemId);
  const base = itemMetaIndex[itemId];
  const hydrated = useCartHydrated();
  const qty = useCartStore((s) => (hydrated ? s.getItemQty(itemId) : 0));
  const setItemQty = useCartStore((s) => s.setItemQty);

  const [expanded, setExpanded] = useState(false);
  const [showToggle, setShowToggle] = useState(false);
  const descRef = useRef<HTMLParagraphElement>(null);

  const desc = t(`items.${itemId}.desc`);
  const name = t(`items.${itemId}.name`) || itemId;
  const weight = t(`items.${itemId}.weight`);
  const imageAlt = t(`items.${itemId}.imageAlt`) || name;

  // Кнопка "ещё" показывается, только если текст реально обрезан до 2 строк
  // (scrollHeight > clientHeight) — тот же приём, что checkDescOverflow() в
  // js/menu.js, пересчитывается при ресайзе и после смены языка (длина
  // перевода отличается).
  useEffect(() => {
    function recheck() {
      const el = descRef.current;
      if (!el) return;
      if (expanded) {
        setShowToggle(true);
        return;
      }
      setShowToggle(el.scrollHeight - el.clientHeight > 1);
    }
    recheck();
    let resizeTimer: number | null = null;
    function onResize() {
      if (resizeTimer) window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(recheck, 200);
    }
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      if (resizeTimer) window.clearTimeout(resizeTimer);
    };
  }, [expanded, lang, desc]);

  if (!base) return null;

  const cardClasses = ['item-card'];
  if (base.available === false) cardClasses.push('item-card--unavailable');
  if (base.available !== false && !meta.departmentOpen) cardClasses.push('item-card--closed-hours');

  return (
    <article className={cardClasses.join(' ')}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="item-card__img" src={publicImagePath(base.image)} alt={imageAlt} loading="lazy" width={600} height={450} />
      <div className="item-card__body">
        <h5 className="item-card__name">{name}</h5>
        <p ref={descRef} className={`item-card__desc${expanded ? ' item-card__desc--expanded' : ''}`}>
          {desc}
        </p>
        <button
          type="button"
          className="item-card__desc-toggle"
          aria-expanded={expanded}
          hidden={!showToggle}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? t('common.showLess') : t('common.readMore')}
        </button>
        <div className="item-card__meta">
          <span className="item-card__weight">{weight}</span>
          <span className="item-card__price">{base.price} MDL</span>
        </div>

        {base.available === false ? (
          <p className="item-card__unavailable-note">{t('cart.itemUnavailable')}</p>
        ) : !meta.departmentOpen ? (
          <p className="item-card__hours-note">{t('menu.availableFrom').replace('{time}', meta.departmentOpenLabel)}</p>
        ) : qty > 0 ? (
          <div className="item-card__stepper">
            <div className="stepper">
              <button type="button" className="stepper__btn" aria-label={t('common.decreaseQty')} onClick={() => setItemQty(itemId, qty - 1)}>
                −
              </button>
              <span className="stepper__qty" aria-label={t('common.quantityLabel')}>
                {qty}
              </span>
              <button type="button" className="stepper__btn" aria-label={t('common.increaseQty')} onClick={() => setItemQty(itemId, qty + 1)}>
                +
              </button>
            </div>
          </div>
        ) : (
          <div className="item-card__stepper">
            <button type="button" className="stepper__add" onClick={() => setItemQty(itemId, 1)}>
              {t('common.add')}
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

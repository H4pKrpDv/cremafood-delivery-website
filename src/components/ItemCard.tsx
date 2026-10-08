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
import { useImageFallback } from '@/lib/useImageFallback';
import Link from 'next/link';
import { itemMetaIndex, publicImagePath } from '@/lib/data';
import { localizedPath } from '@/lib/i18nConfig';
import { getItemInternalPath } from '@/lib/itemRoutes';

export function ItemCard({ itemId }: { itemId: string }) {
  const { t, lang } = useI18n();
  const meta = useItemMeta(itemId);
  const base = itemMetaIndex[itemId];
  const hydrated = useCartHydrated();
  const qty = useCartStore((s) => (hydrated ? s.getItemQty(itemId) : 0));
  const setItemQty = useCartStore((s) => s.setItemQty);
  // base может быть undefined (неизвестный itemId) — ниже есть ранний
  // return null, но хуки обязаны вызываться безусловно и в одном и том же
  // порядке на каждый рендер, поэтому передаём пустую строку, когда base
  // ещё не определён (безопасное значение-заглушка, компонент всё равно
  // сразу рендерит null в этом случае).
  const img = useImageFallback(base ? publicImagePath(base.image) : '', base?.hasImage ?? false);

  const [expanded, setExpanded] = useState(false);
  const [showToggle, setShowToggle] = useState(false);
  const descRef = useRef<HTMLParagraphElement>(null);

  const desc = t(`items.${itemId}.desc`);
  const name = t(`items.${itemId}.name`) || itemId;
  const weight = t(`items.${itemId}.weight`);
  const itemInternalPath = getItemInternalPath(lang, itemId);
  const imageAlt = t(`items.${itemId}.imageAlt`) || name;

  // Кнопка "ещё" показывается, только если текст реально обрезан до 2 строк
  // (scrollHeight > clientHeight) — тот же приём, что checkDescOverflow() в
  // js/menu.js, пересчитывается при смене языка (длина перевода отличается)
  // и при любом изменении РЕАЛЬНОГО размера самого элемента описания.
  //
  // 02.10.2026: раньше пересчёт запускался только на window 'resize' — этого
  // достаточно, только если карточка с самого начала видима. Но MenuSection
  // рендерит ВСЕ категории сразу (скрытые получают класс
  // .category-group--hidden, см. его комментарий), а не монтирует их по
  // требованию — значит карточки товаров из категории, которая не активна
  // при первой загрузке страницы (всё, кроме cafe — см.
  // DEFAULT_ACTIVE_CATEGORY), монтируются ВНУТРИ display:none-блока.
  // В этот момент scrollHeight/clientHeight элемента описания равны 0/0 (это
  // нормальное поведение скрытых через display:none элементов), поэтому
  // showToggle навсегда "залипал" в false — переключение вкладки лишь меняет
  // CSS-класс у родителя (сама карточка не перемонтируется), поэтому этот
  // эффект не перезапускался и реального пересчёта не происходило. Внешний
  // ресайз окна браузера — единственное, что раньше его триггерило, отсюда
  // и видимое "исправление" при изменении размера дисплея в dev tools.
  //
  // ResizeObserver, подключённый прямо к элементу описания, решает это: он
  // срабатывает на любое изменение РЕАЛЬНОГО размера бокса — в том числе
  // переход 0×0 → настоящая высота при снятии display:none с родителя при
  // переключении вкладки, — а не только на событие window 'resize'.
  useEffect(() => {
    const el = descRef.current;
    if (!el) return;

    function recheck() {
      if (!el) return;
      if (expanded) {
        setShowToggle(true);
        return;
      }
      setShowToggle(el.scrollHeight - el.clientHeight > 1);
    }

    recheck();

    if (typeof ResizeObserver === 'undefined') {
      // Очень старые браузеры без ResizeObserver — не наш основной случай
      // (на момент написания поддержка повсеместная), но на всякий случай
      // не остаёмся совсем без пересчёта: откатываемся на window 'resize'.
      window.addEventListener('resize', recheck);
      return () => window.removeEventListener('resize', recheck);
    }

    const observer = new ResizeObserver(() => recheck());
    observer.observe(el);
    return () => observer.disconnect();
  }, [expanded, lang, desc]);

  if (!base) return null;

  const cardClasses = ['item-card'];
  if (base.available === false) cardClasses.push('item-card--unavailable');
  if (base.available !== false && !meta.departmentOpen) cardClasses.push('item-card--closed-hours');

  return (
    <article className={cardClasses.join(' ')}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className={`item-card__img${img.imgClassName ? ` ${img.imgClassName}` : ''}`}
        src={img.src}
        alt={imageAlt}
        loading="lazy"
        width={600}
        height={450}
        onError={img.onError}
      />
      <div className="item-card__body">
        {/* 07.10.2026: название — ссылка на страницу позиции. 09.10.2026: по
            решению пользователя кликабельна вся карточка — ссылка растянута на
            неё CSS-приёмом (.item-card__name-link::after, см. globals.css), а
            кнопки степпера и «ещё» подняты над ней и на страницу не ведут.
            prefetch отключён: на странице ~70 таких ссылок, предзагружать все
            страницы позиций незачем. */}
        <h5 className="item-card__name">
          {itemInternalPath ? (
            <Link href={localizedPath(lang, itemInternalPath)} className="item-card__name-link" prefetch={false}>
              {name}
            </Link>
          ) : (
            name
          )}
        </h5>
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

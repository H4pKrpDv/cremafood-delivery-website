/**
 * components/CartModal.tsx
 * ------------------------------------------------------------------
 * Порт попапа корзины (js/cart.js + разметка .cart-overlay/.cart-modal
 * из build/template.html). Расчёт состава/суммы — useCartSummary()
 * (lib/useCartSummary.ts, обёртка над lib/cartSummary.ts computeSummary,
 * тем же кодом, что использует и форма чекаута, и сервер). Изоляция
 * попапа (блокировка прокрутки body, закрытие по Escape/клику по оверлею)
 * реализована на уровне layout — см. components/ModalScrollLock.tsx.
 * ------------------------------------------------------------------
 */

'use client';

import { useEffect, useRef } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import { useCartStore } from '@/store/cartStore';
import { useUIStore } from '@/store/uiStore';
import { useCartSummary } from '@/lib/useCartSummary';
import { FREE_DELIVERY_THRESHOLD, type CartLine } from '@/lib/cartSummary';

function formatMdl(amount: number): string {
  return `${Math.round(amount * 100) / 100} MDL`;
}

function CartItemRow({ line }: { line: CartLine }) {
  const { t } = useI18n();
  const setItemQty = useCartStore((s) => s.setItemQty);
  const setModifierQty = useCartStore((s) => s.setModifierQty);
  const setItemCutlery = useCartStore((s) => s.setItemCutlery);
  const meta = line.meta;
  const disabled = !meta.orderable;

  const groupsSeen = new Set<string>();

  return (
    <li className={`cart-item${disabled ? ' cart-item--unavailable' : ''}`}>
      <div className="cart-item__info">
        <span className="cart-item__name">{meta.name}</span>
        {!meta.available ? (
          <span className="cart-item__unavailable-note">{t('cart.itemUnavailable')}</span>
        ) : !meta.departmentOpen ? (
          <span className="cart-item__unavailable-note">
            {t('cart.itemClosedNow').replace('{time}', meta.departmentOpenLabel)}
          </span>
        ) : null}

        {line.modifiersDetail.length ? (
          <div className="cart-item__modifiers">
            {line.modifiersDetail.map((detail) => {
              const showLabel = !groupsSeen.has(detail.groupId);
              groupsSeen.add(detail.groupId);
              // Значение уже посчитано useCartSummary() из того же состояния
              // корзины, что и текущий рендер — отдельный поход в store не
              // нужен, detail.qty и есть актуальное количество.
              const currentQty = detail.qty;
              return (
                <div key={`${detail.groupId}-${detail.optionId}`}>
                  {showLabel ? (
                    <span className="cart-item__modifiers-label">{t(`modifiers.${detail.groupId}.groupLabel`)}</span>
                  ) : null}
                  <div className="cart-item__modifier-row">
                    <span>{t(`modifiers.${detail.optionId}.name`)}</span>
                    <span>(+{detail.price} MDL)</span>
                    <div className="stepper stepper--sm">
                      <button
                        type="button"
                        className="stepper__btn"
                        disabled={disabled}
                        onClick={() => setModifierQty(line.itemId, detail.groupId, detail.optionId, Math.max(0, currentQty - 1))}
                      >
                        −
                      </button>
                      <span className="stepper__qty">{currentQty}</span>
                      <button
                        type="button"
                        className="stepper__btn"
                        disabled={disabled}
                        onClick={() => setModifierQty(line.itemId, detail.groupId, detail.optionId, currentQty + 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {meta.cutleryEligible ? (
          <div className="cart-item__modifiers">
            <div className="cart-item__cutlery-row">
              <span className="cart-item__cutlery-left">
                <span className="cart-item__cutlery-label">{t('cart.cutlery')}</span>
                {line.cutleryCost > 0 ? (
                  <span className="cart-item__cutlery-extra">(+{formatMdl(line.cutleryCost)})</span>
                ) : null}
              </span>
              <div className="stepper stepper--sm">
                <button
                  type="button"
                  className="stepper__btn"
                  disabled={disabled}
                  onClick={() => setItemCutlery(line.itemId, Math.max(0, line.cutleryQty - 1))}
                >
                  −
                </button>
                <span className="stepper__qty">{line.cutleryQty}</span>
                <button
                  type="button"
                  className="stepper__btn"
                  disabled={disabled}
                  onClick={() => setItemCutlery(line.itemId, line.cutleryQty + 1)}
                >
                  +
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
      <div className="cart-item__side">
        <span className="cart-item__price">{formatMdl(line.lineTotal)}</span>
        <div className="stepper">
          <button type="button" className="stepper__btn" disabled={disabled} onClick={() => setItemQty(line.itemId, line.qty - 1)}>
            −
          </button>
          <span className="stepper__qty">{line.qty}</span>
          <button type="button" className="stepper__btn" disabled={disabled} onClick={() => setItemQty(line.itemId, line.qty + 1)}>
            +
          </button>
        </div>
      </div>
    </li>
  );
}

export function CartModal() {
  const { t } = useI18n();
  const cartOpen = useUIStore((s) => s.cartOpen);
  const closeCart = useUIStore((s) => s.closeCart);
  const goToCheckout = useUIStore((s) => s.goToCheckout);
  const ageConfirmed = useCartStore((s) => s.ageConfirmed);
  const setAgeConfirmed = useCartStore((s) => s.setAgeConfirmed);
  const summary = useCartSummary();
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (cartOpen) closeBtnRef.current?.focus();
  }, [cartOpen]);

  if (!cartOpen) return <div className="cart-overlay" hidden />;

  const deliveryPct = Math.min(100, Math.round((summary.subtotal / FREE_DELIVERY_THRESHOLD) * 100));

  return (
    <div
      className="cart-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeCart();
      }}
    >
      <div className="cart-modal" role="dialog" aria-modal="true" aria-labelledby="cartTitle">
        <button type="button" className="cart-modal__close" ref={closeBtnRef} aria-label={t('common.close')} onClick={closeCart}>
          ×
        </button>

        <h2 className="cart-modal__title" id="cartTitle">
          {t('cart.title')}
        </h2>
        <p className="cart-modal__subtitle">{t('cart.subtitle')}</p>

        <div className="cart-modal__empty" hidden={!summary.isEmpty}>
          <p>{t('cart.empty')}</p>
        </div>

        <div className="cart-modal__body" hidden={summary.isEmpty}>
          <ul className="cart-list">
            {summary.lines.map((line) => (
              <CartItemRow key={line.itemId} line={line} />
            ))}
          </ul>
        </div>

        {!summary.isEmpty && summary.hasAgeRestrictedLine ? (
          <div className="cart-modal__age-confirm">
            <label className="cart-modal__age-confirm-label">
              <input
                type="checkbox"
                className="cart-modal__age-checkbox"
                checked={ageConfirmed}
                onChange={(e) => setAgeConfirmed(e.target.checked)}
              />
              <span>{t('checkout.ageConfirm')}</span>
            </label>
            <span className="cart-modal__age-error" hidden={ageConfirmed}>
              {t('checkout.validation.ageConfirmRequired')}
            </span>
          </div>
        ) : null}

        {!summary.isEmpty ? (
          <div className="cart-modal__delivery">
            <p className={`cart-modal__delivery-text${summary.freeDeliveryReached ? ' cart-modal__delivery-text--reached' : ''}`}>
              {summary.freeDeliveryReached
                ? t('cart.freeDeliveryReached')
                : t('cart.freeDeliveryHint').replace('{amount}', String(summary.deliveryRemaining))}
            </p>
            <div className="cart-modal__delivery-bar">
              <div
                className="cart-modal__delivery-bar-fill"
                style={{ width: `${summary.freeDeliveryReached ? 100 : deliveryPct}%` }}
              />
            </div>
          </div>
        ) : null}

        {!summary.isEmpty ? (
          <div className="cart-modal__total">
            <span>{t('cart.total')}</span>
            <span className="cart-modal__total-amount">{formatMdl(summary.total)}</span>
          </div>
        ) : null}

        <div className="cart-modal__actions">
          <button type="button" className="btn btn--secondary" onClick={closeCart}>
            {t('cart.backToMenu')}
          </button>
          <button type="button" className="btn btn--primary" hidden={summary.isEmpty} disabled={!summary.canCheckout} onClick={goToCheckout}>
            {t('cart.checkout')}
          </button>
        </div>
      </div>
    </div>
  );
}
